import time
import uuid
import csv
import json
import io
import re
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import Response, StreamingResponse
from app.core.security import get_tenant_user, require_admin_user
from app.core.db import get_db
from app.core.tenant import ensure_tenant_exists
from app.core.ws_manager import ws_manager
from app.schemas import QuestionCreate, QuestionResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# Staged import jobs for dry-run validation before committing
STAGED_IMPORTS: Dict[str, Dict[str, Any]] = {}


class PasteImportRequest(BaseModel):
    text: str
    default_subject: Optional[str] = "General"
    default_difficulty: Optional[str] = "Medium"
    dry_run: Optional[bool] = False


class BulkImportRequest(BaseModel):
    questions: List[Dict[str, Any]]


def validate_question_row(row: dict, index: int) -> tuple[bool, str]:
    """Validates a single question row strictly based on CBT rules."""
    stmt = row.get("statement")
    if not stmt or not str(stmt).strip():
        if isinstance(row.get("content"), dict) and row["content"].get("statement"):
            stmt = row["content"]["statement"]
            row["statement"] = stmt
        elif row.get("question_text"):
            stmt = row.get("question_text")
            row["statement"] = stmt
        elif row.get("text"):
            stmt = row.get("text")
            row["statement"] = stmt
        else:
            return False, f"Row {index}: Missing required field 'statement'"

    # Normalize options: support either opt_a...opt_d OR options array
    opts = row.get("options")
    if isinstance(opts, list) and len(opts) >= 2:
        if "opt_a" not in row or not str(row["opt_a"]).strip():
            row["opt_a"] = opts[0] if len(opts) > 0 else ""
        if "opt_b" not in row or not str(row["opt_b"]).strip():
            row["opt_b"] = opts[1] if len(opts) > 1 else ""
        if "opt_c" not in row or not str(row["opt_c"]).strip():
            row["opt_c"] = opts[2] if len(opts) > 2 else ""
        if "opt_d" not in row or not str(row["opt_d"]).strip():
            row["opt_d"] = opts[3] if len(opts) > 3 else ""

    required_options = ["opt_a", "opt_b"]
    for req in required_options:
        if req not in row or not str(row[req]).strip():
            return False, f"Row {index}: Missing required option '{req}'"

    ans = str(row.get("correct_answer", "")).strip().upper()
    if not ans:
        return False, f"Row {index}: Missing required field 'correct_answer'"
    if ans in ["1", "2", "3", "4"]:
        ans = chr(64 + int(ans))
        row["correct_answer"] = ans
    if ans not in ["A", "B", "C", "D", "BONUS"]:
        return False, f"Row {index}: correct_answer must be A, B, C, or D (got '{ans}')"

    if "marks" in row and row["marks"]:
        try:
            float(row["marks"])
        except ValueError:
            return False, f"Row {index}: marks must be a valid number"

    return True, ""


def _row_to_db_payload(row: dict, tenant_id: str) -> dict:
    """Converts a question row into the database question_bank schema."""
    opts = row.get("options")
    if not isinstance(opts, list) or len(opts) < 4:
        opts = [
            str(row.get("opt_a", "")).strip(),
            str(row.get("opt_b", "")).strip(),
            str(row.get("opt_c", "")).strip(),
            str(row.get("opt_d", "")).strip(),
        ]
    stmt = str(row.get("statement", "")).strip()
    if not stmt and isinstance(row.get("content"), dict):
        stmt = str(row["content"].get("statement", "")).strip()

    return {
        "tenant_id": tenant_id,
        "type": str(row.get("type") or row.get("question_type") or "mcq_single"),
        "content": {"statement": stmt},
        "options": opts,
        "correct_answer": str(row.get("correct_answer", "")).strip().upper(),
        "difficulty": str(row.get("difficulty", "Medium")).strip() or "Medium",
        "subject": str(row.get("subject", "General")).strip() or "General",
        "status": "approved",
    }


def _format_question_response(q: dict) -> dict:
    content = q.get("content") or {}
    statement = ""
    if isinstance(content, dict):
        statement = content.get("statement") or content.get("text") or ""
    elif isinstance(content, str):
        statement = content
    if not statement:
        statement = q.get("statement") or q.get("text") or q.get("question_text") or ""

    opts = q.get("options") or []
    if not opts or not isinstance(opts, list):
        if isinstance(content, dict) and content.get("options"):
            opts = content.get("options")
        elif any(q.get(k) for k in ("opt_a", "opt_b", "opt_c", "opt_d")):
            opts = [q.get("opt_a", ""), q.get("opt_b", ""), q.get("opt_c", ""), q.get("opt_d", "")]
        else:
            opts = []

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


def parse_raw_question_text(
    raw_text: str,
    default_subject: str = "General",
    default_difficulty: str = "Medium"
) -> tuple[List[dict], List[dict]]:
    """
    Intelligent NLP / Regex parser for questions pasted from Word, ChatGPT, Gemini, or paper copies.
    Handles multiple numbering styles (1., Q1., Question 1), option notations (A), (A), A.),
    and answers (Answer: A, Ans: B, Key: C).
    """
    if not raw_text or not raw_text.strip():
        return [], []

    text = raw_text.strip()
    split_pattern = r'(?:^|\r?\n)\s*(?:Q(?:uestion)?\s*[\#\.]?\s*\d+[\.\:\)]?|\b\d+[\.\)\]]|\#\s*\d+[\.\:]?)\s*'
    chunks = [c.strip() for c in re.split(split_pattern, text) if c.strip()]

    # If splitting by numbered questions yielded nothing or only 1 big block without numbering
    if not chunks:
        chunks = [text]

    parsed_questions: List[dict] = []
    errors: List[dict] = []

    for idx, chunk in enumerate(chunks, 1):
        try:
            # 1. Look for options pattern: A) ... B) ... C) ... D)
            opt_pat = r'(?:^|\r?\n)\s*[\(\[]?([A-Da-d])[\)\]\.\:]\s*(.*?)(?=(?:\r?\n\s*[\(\[]?[A-Da-d][\)\]\.\:]|\r?\n\s*(?:Ans(?:wer)?|Correct(?:\s*Answer)?|Key)|$))'
            opt_matches = re.findall(opt_pat, chunk, re.DOTALL)

            # 2. Extract statement: everything before option A
            stmt_parts = re.split(r'(?:^|\r?\n)\s*[\(\[]?[A-Da-d][\)\]\.\:]', chunk)
            stmt = stmt_parts[0].strip() if stmt_parts else ""

            # 3. Extract answer
            ans_m = re.search(r'(?:Ans(?:wer)?|Correct(?:\s*Answer)?|Key)\s*[\:\-]?\s*[\(\[]?([A-Da-d1-4])[\)\]]?', chunk, re.IGNORECASE)
            ans = ""
            if ans_m:
                raw_ans = ans_m.group(1).upper()
                if raw_ans in ("1", "2", "3", "4"):
                    ans = chr(ord('A') + int(raw_ans) - 1)
                else:
                    ans = raw_ans

            # 4. Extract subject
            subj_m = re.search(r'Subject\s*[\:\-]\s*([^\r\n]+)', chunk, re.IGNORECASE)
            subj = subj_m.group(1).strip() if subj_m else default_subject

            # 5. Extract difficulty
            diff_m = re.search(r'Difficulty\s*[\:\-]\s*([^\r\n]+)', chunk, re.IGNORECASE)
            diff = diff_m.group(1).strip() if diff_m else default_difficulty

            # 6. Extract marks
            marks_m = re.search(r'Marks\s*[\:\-]\s*([0-9\.]+)', chunk, re.IGNORECASE)
            marks = float(marks_m.group(1)) if marks_m else 4.0

            # Clean options into a map
            opts_map = {}
            for label, val in opt_matches:
                clean_label = label.upper()
                # Clean any trailing Answer line from the last option
                clean_val = re.split(r'(?:^|\r?\n)\s*(?:Ans(?:wer)?|Correct(?:\s*Answer)?|Key|Subject|Difficulty|Marks)', val, flags=re.IGNORECASE)[0].strip()
                opts_map[clean_label] = clean_val

            opt_a = opts_map.get("A", "")
            opt_b = opts_map.get("B", "")
            opt_c = opts_map.get("C", "")
            opt_d = opts_map.get("D", "")

            # Validation
            if not stmt:
                errors.append({"item": idx, "message": "Could not identify question statement"})
                continue
            if not opt_a or not opt_b:
                errors.append({"item": idx, "message": "At least Option A and Option B are required"})
                continue
            if not ans or ans not in ["A", "B", "C", "D"]:
                # Default to A if not specified to prevent loss of parsed questions
                ans = "A"

            parsed_questions.append({
                "statement": stmt,
                "opt_a": opt_a,
                "opt_b": opt_b,
                "opt_c": opt_c or "None of the above",
                "opt_d": opt_d or "All of the above",
                "correct_answer": ans,
                "subject": subj or "General",
                "difficulty": diff or "Medium",
                "marks": marks,
                "question_type": "mcq_single",
            })
        except Exception as e:
            errors.append({"item": idx, "message": f"Parsing exception: {str(e)}"})

    return parsed_questions, errors


@router.get("/count")
def get_questions_count(user_context: dict = Depends(get_tenant_user)):
    """Returns question count metric without exposing question content or answer keys."""
    tid = user_context["tenant_id"]
    db = get_db()
    try:
        res = db.table("question_bank").select("id").eq("tenant_id", tid).execute()
        return {"status": "success", "count": len(res.data or [])}
    except Exception:
        return {"status": "success", "count": 0}


@router.get("/")
@router.get("")
def get_question_bank(
    subject: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    user_context: dict = Depends(require_admin_user),
):
    """Fetch user-uploaded / inputted questions from Supabase Cloud DB with optional subject/status filters."""
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
@router.post("", status_code=201)
def create_question(question: QuestionCreate, user_context: dict = Depends(require_admin_user)):
    """Creates a single user-inputted question and persists it to Cloud DB (Admin Only)."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    payload = {
        "tenant_id": tid,
        "type": question.question_type or "mcq_single",
        "content": {"statement": question.statement.strip()},
        "options": [
            question.opt_a.strip() if question.opt_a else "",
            question.opt_b.strip() if question.opt_b else "",
            question.opt_c.strip() if question.opt_c else "",
            question.opt_d.strip() if question.opt_d else "",
        ],
        "correct_answer": question.correct_answer.strip().upper(),
        "difficulty": question.difficulty or "Medium",
        "subject": question.subject or "General",
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


@router.post("/import/paste-text")
def import_pasted_text(
    payload: PasteImportRequest,
    user_context: dict = Depends(require_admin_user)
):
    """
    IMPORT OPTION: AI / Plain Text / Word Bulk Paste.
    Parses unstructured text into CBT questions.
    Returns preview if dry_run=True, or saves directly to Cloud DB if dry_run=False.
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    parsed_questions, parse_errors = parse_raw_question_text(
        payload.text,
        default_subject=payload.default_subject or "General",
        default_difficulty=payload.default_difficulty or "Medium",
    )

    if not parsed_questions and parse_errors:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse any valid questions. Please verify format. ({parse_errors[0]['message']})"
        )

    if payload.dry_run:
        return {
            "status": "preview",
            "total_detected": len(parsed_questions) + len(parse_errors),
            "valid_count": len(parsed_questions),
            "invalid_count": len(parse_errors),
            "errors": parse_errors,
            "questions": parsed_questions,
        }

    # Direct Cloud DB commit
    db_payloads = [_row_to_db_payload(q, tid) for q in parsed_questions]
    try:
        res = db.table("question_bank").insert(db_payloads).execute()
        inserted_count = len(res.data) if res.data else len(db_payloads)
        return {
            "status": "success",
            "message": f"Successfully imported {inserted_count} questions into Cloud DB",
            "count": inserted_count,
            "errors": parse_errors,
            "questions": [_format_question_response(r) for r in (res.data or [])],
        }
    except Exception as e:
        logger.error("Failed to commit pasted questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")


@router.post("/import/bulk")
def import_bulk_json(
    payload: BulkImportRequest,
    user_context: dict = Depends(require_admin_user)
):
    """
    IMPORT OPTION: Direct JSON Array Bulk Insert.
    Takes a list of question objects and inserts them directly into Cloud DB.
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    if not payload.questions:
        raise HTTPException(status_code=400, detail="Empty questions list")

    db_payloads = []
    errors = []
    for i, q in enumerate(payload.questions, 1):
        # Support both flat format and nested content/options format
        if "content" in q and isinstance(q["content"], dict):
            stmt = q["content"].get("statement", "")
            opts = q.get("options") or []
            flat_row = {
                "statement": stmt,
                "opt_a": opts[0] if len(opts) > 0 else "",
                "opt_b": opts[1] if len(opts) > 1 else "",
                "opt_c": opts[2] if len(opts) > 2 else "",
                "opt_d": opts[3] if len(opts) > 3 else "",
                "correct_answer": q.get("correct_answer", "A"),
                "subject": q.get("subject", "General"),
                "difficulty": q.get("difficulty", "Medium"),
                "marks": q.get("marks", 4.0),
            }
        else:
            flat_row = q

        is_valid, err_msg = validate_question_row(flat_row, i)
        if is_valid:
            db_payloads.append(_row_to_db_payload(flat_row, tid))
        else:
            errors.append({"row": i, "message": err_msg})

    if not db_payloads:
        raise HTTPException(status_code=400, detail=f"No valid questions found: {errors}")

    try:
        res = db.table("question_bank").insert(db_payloads).execute()
        count = len(res.data) if res.data else len(db_payloads)
        return {
            "status": "success",
            "message": f"Imported {count} questions directly into Cloud DB",
            "count": count,
            "errors": errors,
        }
    except Exception as e:
        logger.error("Failed to bulk insert questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")


@router.post("/import/dry-run")
async def dry_run_import(
    file: UploadFile = File(...),
    format: str = Form("csv"),
    user_context: dict = Depends(require_admin_user),
):
    """
    IMPORT OPTION: CSV / JSON File Dry Run.
    Validates uploaded files and generates a staged preview before committing.
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
            data = json.loads(contents.decode("utf-8"))
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of question objects")
            for item in data:
                if "content" in item and isinstance(item["content"], dict):
                    opts = item.get("options") or []
                    parsed_rows.append({
                        "statement": item["content"].get("statement", ""),
                        "opt_a": opts[0] if len(opts) > 0 else "",
                        "opt_b": opts[1] if len(opts) > 1 else "",
                        "opt_c": opts[2] if len(opts) > 2 else "",
                        "opt_d": opts[3] if len(opts) > 3 else "",
                        "correct_answer": item.get("correct_answer", "A"),
                        "subject": item.get("subject", "General"),
                        "difficulty": item.get("difficulty", "Medium"),
                        "marks": item.get("marks", 4.0),
                    })
                else:
                    parsed_rows.append(item)
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
    """Commits a validated dry-run job into Supabase Cloud DB (Admin Only)."""
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
        del STAGED_IMPORTS[job_id]
        return {
            "status": "success",
            "message": f"Successfully imported {inserted_count} questions into Cloud DB",
            "count": inserted_count,
        }
    except Exception as e:
        logger.error("Failed to commit imported questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database commit error: {str(e)}")


@router.get("/template/csv")
def download_csv_template():
    """Generates and streams a downloadable sample CSV template with pre-filled question examples."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["statement", "opt_a", "opt_b", "opt_c", "opt_d", "correct_answer", "subject", "difficulty", "marks"])
    writer.writerow([
        "What is the SI unit of electric charge?",
        "Coulomb",
        "Ampere",
        "Volt",
        "Ohm",
        "A",
        "Physics",
        "Easy",
        "4.0"
    ])
    writer.writerow([
        "Which of the following is an inert noble gas?",
        "Oxygen",
        "Helium",
        "Nitrogen",
        "Hydrogen",
        "B",
        "Chemistry",
        "Easy",
        "4.0"
    ])
    writer.writerow([
        "What is the derivative of sin(x) with respect to x?",
        "cos(x)",
        "-cos(x)",
        "tan(x)",
        "-sin(x)",
        "A",
        "Mathematics",
        "Medium",
        "4.0"
    ])
    writer.writerow([
        "In Python, which keyword is used to define an asynchronous coroutine?",
        "async def",
        "def async",
        "coroutine",
        "thread",
        "A",
        "Computer Science",
        "Medium",
        "4.0"
    ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="question_bank_template.csv"'
        }
    )


@router.get("/template/json")
def download_json_template():
    """Generates and streams a downloadable sample JSON template."""
    samples = [
        {
            "statement": "What is the SI unit of electric charge?",
            "opt_a": "Coulomb",
            "opt_b": "Ampere",
            "opt_c": "Volt",
            "opt_d": "Ohm",
            "correct_answer": "A",
            "subject": "Physics",
            "difficulty": "Easy",
            "marks": 4.0
        },
        {
            "statement": "Which of the following is an inert noble gas?",
            "opt_a": "Oxygen",
            "opt_b": "Helium",
            "opt_c": "Nitrogen",
            "opt_d": "Hydrogen",
            "correct_answer": "B",
            "subject": "Chemistry",
            "difficulty": "Easy",
            "marks": 4.0
        },
        {
            "statement": "What is the derivative of sin(x) with respect to x?",
            "opt_a": "cos(x)",
            "opt_b": "-cos(x)",
            "opt_c": "tan(x)",
            "opt_d": "-sin(x)",
            "correct_answer": "A",
            "subject": "Mathematics",
            "difficulty": "Medium",
            "marks": 4.0
        }
    ]
    json_data = json.dumps(samples, indent=2)
    return Response(
        content=json_data,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="question_bank_template.json"'
        }
    )


@router.get("/export/csv")
def export_question_bank_csv(user_context: dict = Depends(require_admin_user)):
    """Exports all questions from Cloud DB into a downloadable CSV spreadsheet."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    res = db.table("question_bank").select("*").eq("tenant_id", tid).order("created_at", desc=True).execute()
    rows = res.data or []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "statement", "opt_a", "opt_b", "opt_c", "opt_d", "correct_answer", "subject", "difficulty", "type", "status", "created_at"])

    for r in rows:
        content = r.get("content") or {}
        stmt = content.get("statement", "") if isinstance(content, dict) else str(content)
        opts = r.get("options") or []
        writer.writerow([
            str(r.get("id", "")),
            stmt,
            opts[0] if len(opts) > 0 else "",
            opts[1] if len(opts) > 1 else "",
            opts[2] if len(opts) > 2 else "",
            opts[3] if len(opts) > 3 else "",
            r.get("correct_answer", ""),
            r.get("subject", "General"),
            r.get("difficulty", "Medium"),
            r.get("type", "mcq_single"),
            r.get("status", "approved"),
            r.get("created_at", ""),
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="cloud_question_bank_export.csv"'
        }
    )


def _cascade_delete_responses_for_question(db, question_id: str) -> None:
    """Safely cascades deletion of any candidate responses referencing question_id to satisfy foreign key constraints."""
    try:
        db.table("responses").delete().eq("question_id", question_id).execute()
    except Exception as e:
        logger.warning("Failed to cascade delete responses for question %s: %s", question_id, e)


def _cascade_delete_responses_for_questions(db, question_ids: list) -> None:
    """Batch cascades deletion of candidate responses referencing any of the provided question IDs."""
    if not question_ids:
        return
    for i in range(0, len(question_ids), 40):
        chunk = question_ids[i:i + 40]
        try:
            db.table("responses").delete().in_("question_id", chunk).execute()
        except Exception as e:
            logger.warning("Batch cascade delete of responses failed: %s", e)


@router.delete("/purge/seeds")
def purge_seed_questions(user_context: dict = Depends(require_admin_user)):
    """
    PURGE CONTROL: Deletes all hardcoded / seeded mock questions from Cloud DB
    (e.g., IDs starting with '00000000-0000-0000-0000-0000000000' or balloon question).
    """
    db = get_db()
    try:
        # Fetch all questions
        res = db.table("question_bank").select("id, content").execute()
        all_q = res.data or []

        deleted_ids = []
        for q in all_q:
            qid = str(q.get("id", ""))
            content_str = str(q.get("content", ""))
            if qid.startswith("00000000-0000-0000-0000-0000000000") or "balloon with constant acceleration" in content_str:
                _cascade_delete_responses_for_question(db, qid)
                db.table("question_bank").delete().eq("id", qid).execute()
                deleted_ids.append(qid)

        return {
            "status": "success",
            "message": f"Successfully purged {len(deleted_ids)} hardcoded seed questions from Cloud DB.",
            "purged_count": len(deleted_ids),
            "purged_ids": deleted_ids,
        }
    except Exception as e:
        logger.error("Failed to purge seed questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database purge error: {str(e)}")


@router.delete("/purge/all")
def purge_all_questions(user_context: dict = Depends(require_admin_user)):
    """
    PURGE CONTROL: Wipes all questions for this tenant from Cloud DB so the admin can start 100% fresh.
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    try:
        # 1. Fetch all question IDs for this tenant
        q_res = db.table("question_bank").select("id").eq("tenant_id", tid).execute()
        all_q_ids = [str(q["id"]) for q in (q_res.data or []) if q.get("id")]

        # 2. Cascade delete all responses under tenant
        try:
            db.table("responses").delete().eq("tenant_id", tid).execute()
        except Exception as t_err:
            logger.warning("Tenant responses cleanup error: %s", t_err)

        # 3. Explicitly cascade delete responses referencing any of these question IDs
        for qid in all_q_ids:
            try:
                db.table("responses").delete().eq("question_id", qid).execute()
            except Exception:
                pass

        # 4. Perform question bank deletion
        res = db.table("question_bank").delete().eq("tenant_id", tid).execute()
        count = len(res.data) if res.data else len(all_q_ids)
        return {
            "status": "success",
            "message": f"Question bank completely purged for tenant {tid}.",
            "purged_count": count,
        }
    except Exception as e:
        err_msg = str(e)
        # Automatic recovery if any residual foreign key constraint is encountered
        if "responses_question_id_fkey" in err_msg or "23503" in err_msg:
            try:
                import re
                match = re.search(r"Key \(id\)=\(([^)]+)\)", err_msg)
                if match:
                    bad_id = match.group(1)
                    _cascade_delete_responses_for_question(db, bad_id)
                # Retry deletion
                res = db.table("question_bank").delete().eq("tenant_id", tid).execute()
                count = len(res.data) if res.data else 0
                return {
                    "status": "success",
                    "message": f"Question bank completely purged for tenant {tid}.",
                    "purged_count": count,
                }
            except Exception as retry_err:
                logger.error("Retry purge failed: %s", retry_err)

        logger.error("Failed to purge all questions: %s", e)
        raise HTTPException(status_code=500, detail=f"Database purge error: {str(e)}")


@router.delete("/{question_id}")
async def delete_question(question_id: str, user_context: dict = Depends(require_admin_user)):
    """Deletes an individual question from Supabase Cloud DB (Admin Only)."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    try:
        # Pre-emptively cascade any candidate responses referencing this question
        _cascade_delete_responses_for_question(db, question_id)

        res = db.table("question_bank").delete().eq("id", question_id).execute()

        await ws_manager.broadcast_all({
            "type": "QUESTION_DELETED",
            "question_id": question_id,
            "timestamp": time.time(),
            "message": f"Question {question_id} deleted from Cloud DB."
        })

        return {
            "status": "success",
            "message": f"Question {question_id} deleted successfully from Cloud DB.",
        }
    except Exception as e:
        if "responses_question_id_fkey" in str(e) or "23503" in str(e):
            try:
                _cascade_delete_responses_for_question(db, question_id)
                res = db.table("question_bank").delete().eq("id", question_id).execute()
                await ws_manager.broadcast_all({
                    "type": "QUESTION_DELETED",
                    "question_id": question_id,
                    "timestamp": time.time(),
                    "message": f"Question {question_id} deleted from Cloud DB."
                })
                return {
                    "status": "success",
                    "message": f"Question {question_id} deleted successfully from Cloud DB.",
                }
            except Exception as retry_e:
                logger.error("Retry delete failed for question %s: %s", question_id, retry_e)

        logger.error("Failed to delete question %s: %s", question_id, e)
        raise HTTPException(status_code=500, detail=f"Database delete error: {str(e)}")


@router.put("/{question_id}")
async def update_question(
    question_id: str,
    payload: Dict[str, Any],
    user_context: dict = Depends(get_tenant_user),
):
    """Examination Directorate Tool: Updates question content, statement, options, or answer key and broadcasts live."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    update_data = {}
    content_dict = {}
    if "statement" in payload:
        content_dict["statement"] = str(payload["statement"]).strip()
    if "section" in payload:
        content_dict["section"] = str(payload["section"]).strip()
    if content_dict:
        update_data["content"] = content_dict
    if "options" in payload:
        update_data["options"] = payload["options"]
    if "correct_answer" in payload:
        update_data["correct_answer"] = payload["correct_answer"].strip().upper()
    if "subject" in payload:
        update_data["subject"] = payload["subject"]
    if "difficulty" in payload:
        update_data["difficulty"] = payload["difficulty"]

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
            "section": payload.get("section"),
            "timestamp": time.time(),
            "message": "Question updated by Administrator."
        })

        return {"status": "success", "message": "Question updated successfully and pushed live via WebSockets."}
    except Exception as e:
        logger.error("Failed to update question: %s", e)
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")


@router.post("/{question_id}/adjudicate")
async def adjudicate_question(
    question_id: str,
    payload: Dict[str, Any],
    user_context: dict = Depends(require_admin_user),
):
    """
    Examination Directorate Post-Exam Adjudication Tool (Authoritative CBT Standard):
    - action='drop_bonus': Flags question as dropped due to ambiguity/error and awards +4 bonus marks to all test-takers.
    - action='correct_key': Overrides authoritative answer key across all candidate evaluations.
    Broadcasts live to all connected consoles and updates database.
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    action = payload.get("action", "drop_bonus").lower()
    reason = payload.get("reason", "Authoritative Adjudication by Examination Directorate")

    update_data = {}
    if action == "drop_bonus":
        update_data["correct_answer"] = "BONUS"
    elif action == "correct_key":
        new_key = str(payload.get("correct_answer", "A")).strip().upper()
        update_data["correct_answer"] = new_key
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported adjudication action: {action}")

    try:
        db.table("question_bank").update(update_data).eq("id", question_id).execute()

        await ws_manager.broadcast_all({
            "type": "QUESTION_ADJUDICATED",
            "question_id": question_id,
            "action": action,
            "correct_answer": update_data.get("correct_answer"),
            "reason": reason,
            "timestamp": time.time(),
            "message": f"Question {question_id} adjudicated: {action.upper()} ({reason})"
        })

        return {
            "status": "success",
            "action": action,
            "question_id": question_id,
            "correct_answer": update_data.get("correct_answer"),
            "reason": reason,
            "message": "Question adjudication applied and broadcast live."
        }
    except Exception as e:
        logger.error("Failed to adjudicate question: %s", e)
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")
