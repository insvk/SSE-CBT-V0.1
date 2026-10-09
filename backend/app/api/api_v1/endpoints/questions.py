import time
import uuid
import csv
import json
import io
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from app.core.security import get_tenant_user, require_admin_user
from app.core.db import get_db
from app.core.tenant import ensure_tenant_exists
from app.core.ws_manager import ws_manager
from app.schemas import QuestionCreate, QuestionResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Staged import jobs for dry-run validation before committing
STAGED_IMPORTS: Dict[str, Dict[str, Any]] = {}


def validate_question_row(row: dict, index: int) -> tuple[bool, str]:
    """Validates a single question row strictly based on CBT rules."""
    required = ["statement", "opt_a", "opt_b", "opt_c", "opt_d", "correct_answer"]
    for req in required:
        if req not in row or not str(row[req]).strip():
            return False, f"Row {index}: Missing required field '{req}'"

    ans = str(row["correct_answer"]).strip().upper()
    if ans not in ["A", "B", "C", "D"]:
        return False, f"Row {index}: correct_answer must be A, B, C, or D (got '{ans}')"

    if "marks" in row and row["marks"]:
        try:
            float(row["marks"])
        except ValueError:
            return False, f"Row {index}: marks must be a valid number"

    return True, ""


def _row_to_db_payload(row: dict, tenant_id: str) -> dict:
    """Converts a flat question row into the database question_bank schema."""
    opts = [
        str(row.get("opt_a", "")).strip(),
        str(row.get("opt_b", "")).strip(),
        str(row.get("opt_c", "")).strip(),
        str(row.get("opt_d", "")).strip(),
    ]
    return {
        "tenant_id": tenant_id,
        "type": "mcq_single",
        "content": {"statement": str(row.get("statement", "")).strip()},
        "options": opts,
        "correct_answer": str(row.get("correct_answer", "")).strip().upper(),
        "difficulty": str(row.get("difficulty", "Medium")).strip() or "Medium",
        "subject": str(row.get("subject", "General")).strip() or "General",
        "status": "approved",
    }


def _format_question_response(q: dict) -> dict:
    content = q.get("content") or {}
    statement = content.get("statement", "") if isinstance(content, dict) else str(content)
    opts = q.get("options") or []
    return {
        "id": str(q["id"]),
        "statement": statement,
        "options": opts,
        "correct_answer": q.get("correct_answer"),
        "difficulty": q.get("difficulty", "Medium"),
        "subject": q.get("subject", "General"),
        "type": q.get("type", "mcq_single"),
        "status": q.get("status", "draft"),
        "created_at": q.get("created_at"),
    }


@router.get("/")
def get_question_bank(
    subject: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user_context: dict = Depends(get_tenant_user),
):
    """Fetch questions from the real database with optional subject and status filters."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    try:
        query = db.table("question_bank").select("*").eq("tenant_id", tid)
        if subject and subject.lower() not in ("all", "all subjects"):
            query = query.eq("subject", subject)
        if status_filter and status_filter.lower() not in ("all", "all statuses"):
            query = query.eq("status", status_filter.lower())

        res = query.order("created_at", desc=True).execute()
        return [_format_question_response(q) for q in (res.data or [])]
    except Exception as e:
        logger.error("Failed to query question bank: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/", status_code=201)
def create_question(question: QuestionCreate, user_context: dict = Depends(require_admin_user)):
    """Creates a single question and persists it to the question bank (Admin Only)."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    payload = {
        "tenant_id": tid,
        "type": question.question_type or "mcq_single",
        "content": {"statement": question.statement.strip()},
        "options": [question.opt_a or "", question.opt_b or "", question.opt_c or "", question.opt_d or ""],
        "correct_answer": question.correct_answer.strip().upper(),
        "difficulty": question.difficulty,
        "subject": question.subject,
        "status": "approved",
    }

    try:
        res = db.table("question_bank").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save question")
        return _format_question_response(res.data[0])
    except Exception as e:
        logger.error("Failed to insert question: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/import/dry-run")
async def dry_run_import(
    file: UploadFile = File(...),
    format: str = Form("csv"),
    user_context: dict = Depends(require_admin_user),
):
    """
    UNIVERSAL BULK QUESTION IMPORT - DRY RUN
    Validates CSV or JSON files strictly without committing them to the live bank.
    """
    tid = user_context["tenant_id"]
    contents = await file.read()

    parsed_rows = []
    errors = []

    if format.lower() == "csv":
        try:
            text = contents.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                parsed_rows.append(row)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV Parsing Error: {str(e)}")

    elif format.lower() == "json":
        try:
            parsed_rows = json.loads(contents.decode("utf-8"))
            if not isinstance(parsed_rows, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of question objects")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"JSON Parsing Error: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv' or 'json'")

    valid_count = 0
    staged_payloads = []

    for i, row in enumerate(parsed_rows, start=1):
        is_valid, err_msg = validate_question_row(row, i)
        if is_valid:
            valid_count += 1
            staged_payloads.append(_row_to_db_payload(row, tid))
        else:
            errors.append({"row": i, "message": err_msg, "raw_data": row})

    job_id = f"job-{uuid.uuid4()}"
    STAGED_IMPORTS[job_id] = {
        "tenant_id": tid,
        "questions": staged_payloads,
        "valid_count": valid_count,
        "errors": errors,
    }

    return {
        "job_id": job_id,
        "total_detected": len(parsed_rows),
        "valid_count": valid_count,
        "invalid_count": len(errors),
        "errors": errors,
        "ready_to_import": valid_count > 0,
    }


@router.post("/import/commit/{job_id}")
def commit_import(job_id: str, user_context: dict = Depends(require_admin_user)):
    """Commits a validated dry-run job into the live database question bank (Admin Only)."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    if job_id not in STAGED_IMPORTS:
        raise HTTPException(status_code=404, detail="Import job not found or expired")

    job = STAGED_IMPORTS[job_id]
    if job["tenant_id"] != tid:
        raise HTTPException(status_code=403, detail="Unauthorized job access")

    payloads = job["questions"]
    if not payloads:
        raise HTTPException(status_code=400, detail="No valid questions to commit")

    try:
        res = db.table("question_bank").insert(payloads).execute()
        inserted_count = len(res.data) if res.data else len(payloads)
        del STAGED_IMPORTS[job_id]  # Cleanup
        return {
            "status": "success",
            "message": f"Successfully imported {inserted_count} questions into the database",
            "count": inserted_count,
        }
    except Exception as e:
        logger.error("Failed to commit imported questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")


@router.put("/{question_id}")
async def update_question(
    question_id: str,
    payload: Dict[str, Any],
    user_context: dict = Depends(get_tenant_user),
):
    """God MAXX Tool: Updates question content, statement, options, or answer key and broadcasts live."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    update_data = {}
    if "statement" in payload:
        update_data["content"] = {"statement": payload["statement"].strip()}
    if "options" in payload:
        update_data["options"] = payload["options"]
    if "correct_answer" in payload:
        update_data["correct_answer"] = payload["correct_answer"].strip().upper()
    if "subject" in payload:
        update_data["subject"] = payload["subject"]

    try:
        db.table("question_bank").update(update_data).eq("id", question_id).execute()

        # Real-time WebSocket push across all exam sessions and command centre
        await ws_manager.broadcast_all({
            "type": "QUESTION_UPDATED",
            "question_id": question_id,
            "statement": payload.get("statement"),
            "options": payload.get("options"),
            "correct_answer": payload.get("correct_answer"),
            "subject": payload.get("subject"),
            "timestamp": time.time(),
            "message": f"Question updated by Administrator."
        })

        return {"status": "success", "message": "Question updated successfully and pushed live via WebSockets."}
    except Exception as e:
        logger.error("Failed to update question: %s", e)
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
