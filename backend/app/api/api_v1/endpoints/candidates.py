import time
import uuid
import csv
import io
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.core.security import get_tenant_user
from app.core.db import get_db
from app.core.tenant import ensure_tenant_exists
from app.core.ws_manager import ws_manager
from app.schemas import CandidateCreate, CandidateResponse, BulkAssignRequest

logger = logging.getLogger(__name__)
router = APIRouter()


def _format_candidate_response(row: dict) -> CandidateResponse:
    metadata = row.get("metadata") or {}
    reg_no = row.get("registration_number", "")
    return CandidateResponse(
        id=str(row["id"]),
        full_name=row["full_name"],
        registration_number=reg_no,
        status=metadata.get("status", "active"),
        batch=metadata.get("batch", "A"),
        email=metadata.get("email") or f"{reg_no.lower()}@ssecbt.in",
        password=metadata.get("password") or "12345678",
        tenant_id=str(row.get("tenant_id", "")),
    )


def _generate_reg_number(db, tenant_id: str, slot: str) -> str:
    """Generates next available registration number: SSEC-{SLOT}-CBT-{SEQ:04d}"""
    slot_clean = slot.strip().upper() or "A"
    try:
        res = db.table("candidates").select("registration_number").eq("tenant_id", tenant_id).execute()
        existing = res.data or []
        slot_prefix = f"SSEC-{slot_clean}-CBT-"
        matching_seqs = []
        for c in existing:
            reg = c.get("registration_number", "")
            if reg.startswith(slot_prefix):
                try:
                    seq_num = int(reg.replace(slot_prefix, ""))
                    matching_seqs.append(seq_num)
                except ValueError:
                    pass
        next_seq = max(matching_seqs, default=0) + 1
        return f"{slot_prefix}{next_seq:04d}"
    except Exception as e:
        logger.error("Error generating registration number: %s", e)
        # Fallback with random suffix if sequence calculation fails
        return f"SSEC-{slot_clean}-CBT-{uuid.uuid4().hex[:4].upper()}"


@router.get("/", response_model=List[CandidateResponse])
def get_candidates(user_context: dict = Depends(get_tenant_user)):
    """Fetch candidates for the authorized tenant."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    try:
        res = db.table("candidates").select("*").eq("tenant_id", tid).order("created_at", desc=False).execute()
        return [_format_candidate_response(row) for row in (res.data or [])]
    except Exception as e:
        logger.error("Failed to query candidates from Supabase: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query failed: {str(e)}",
        )


@router.post("/", response_model=CandidateResponse)
async def create_candidate(cand: CandidateCreate, user_context: dict = Depends(get_tenant_user)):
    """Create a single candidate and persist to the database."""
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    slot = cand.batch.strip().upper() or "A"
    reg_number = cand.registration_number.strip() if cand.registration_number else _generate_reg_number(db, tid, slot)
    pwd = cand.password.strip() if cand.password else "12345678"
    email = cand.email.strip() if cand.email else f"{reg_number.lower()}@ssecbt.in"

    candidate_data = {
        "tenant_id": tid,
        "registration_number": reg_number,
        "full_name": cand.full_name.strip(),
        "metadata": {
            "batch": slot,
            "status": "active",
            "email": email,
            "password": pwd,
        },
    }

    try:
        res = db.table("candidates").insert(candidate_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to insert candidate record")
        
        cand_resp = _format_candidate_response(res.data[0])

        # Real-time WebSocket push to admin command centre
        await ws_manager.broadcast("admin_feed", {
            "type": "CANDIDATE_CREATED",
            "candidate": cand_resp.model_dump(),
            "timestamp": time.time(),
        })

        return cand_resp
    except Exception as e:
        logger.error("Failed to insert candidate: %s", e)
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")


@router.post("/bulk-import")
async def bulk_import_candidates(
    file: UploadFile = File(...),
    user_context: dict = Depends(get_tenant_user),
):
    """
    Parses a CSV upload and bulk inserts candidates into Supabase.
    Expected CSV columns: FullName, Slot (or Name, Slot / batch)
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    contents = await file.read()
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty")

    header = [h.strip().lower() for h in rows[0]]
    name_idx = -1
    slot_idx = -1

    for i, col in enumerate(header):
        if col in ("fullname", "full_name", "name", "candidate_name"):
            name_idx = i
        elif col in ("slot", "batch", "slot/batch"):
            slot_idx = i

    # Fallback to column 0 for name and column 1 for slot if header not found
    if name_idx == -1:
        name_idx = 0
    if slot_idx == -1 and len(rows[0]) > 1:
        slot_idx = 1

    imported_candidates = []
    skipped_count = 0

    # Start from row 1 if header exists
    start_row = 1 if any(h in header for h in ("name", "fullname", "slot", "batch")) else 0

    for row in rows[start_row:]:
        if not row or not any(row):
            continue
        full_name = row[name_idx].strip() if len(row) > name_idx else ""
        if not full_name:
            skipped_count += 1
            continue

        slot = (row[slot_idx].strip().upper() if slot_idx != -1 and len(row) > slot_idx else "A") or "A"
        reg_number = _generate_reg_number(db, tid, slot)

        item = {
            "tenant_id": tid,
            "registration_number": reg_number,
            "full_name": full_name,
            "metadata": {
                "batch": slot,
                "status": "active",
            },
        }
        imported_candidates.append(item)

    if not imported_candidates:
        return {"status": "success", "imported": 0, "skipped": skipped_count}

    try:
        # Batch insert into Supabase
        res = db.table("candidates").insert(imported_candidates).execute()
        count = len(res.data) if res.data else len(imported_candidates)
        return {
            "status": "success",
            "imported": count,
            "skipped": skipped_count,
            "total_processed": len(imported_candidates) + skipped_count,
        }
    except Exception as e:
        logger.error("Bulk candidate import failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to persist imported candidates: {str(e)}")


@router.post("/bulk-assign")
def bulk_assign(
    payload: BulkAssignRequest,
    user_context: dict = Depends(get_tenant_user),
):
    """
    Assigns multiple candidates to an exam in Supabase.
    Accepts JSON body: { "candidate_ids": [...], "exam_id": "..." }
    """
    tid = user_context["tenant_id"]
    db = get_db()
    ensure_tenant_exists(db, tid)

    exam_id = payload.exam_id
    candidate_ids = payload.candidate_ids

    if not candidate_ids:
        return {"status": "success", "message": "No candidates provided"}

    # Ensure exam exists or check attempt records
    assigned_count = 0
    for cand_id in candidate_ids:
        try:
            # Upsert into exam_attempts
            attempt_data = {
                "tenant_id": tid,
                "exam_id": exam_id,
                "candidate_id": cand_id,
                "status": "assigned",
            }
            db.table("exam_attempts").upsert(
                attempt_data,
                on_conflict="exam_id,candidate_id",
            ).execute()
            assigned_count += 1
        except Exception as e:
            logger.warning("Could not assign candidate %s to exam %s: %s", cand_id, exam_id, e)

    return {
        "status": "success",
        "message": f"Assigned {len(candidate_ids)} candidates to exam {exam_id}",
        "assigned_count": assigned_count,
    }


@router.delete("/{candidate_id}")
def suspend_candidate(candidate_id: str, user_context: dict = Depends(get_tenant_user)):
    """Suspends a candidate in the database."""
    tid = user_context["tenant_id"]
    db = get_db()

    try:
        # Check if candidate exists
        res = db.table("candidates").select("*").eq("tenant_id", tid).eq("id", candidate_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Candidate not found")

        curr = res.data[0]
        meta = curr.get("metadata") or {}
        meta["status"] = "suspended"

        db.table("candidates").update({"metadata": meta}).eq("id", candidate_id).execute()
        return {"status": "success", "message": "Candidate suspended"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to suspend candidate: %s", e)
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")


@router.patch("/{candidate_id}/toggle-status")
async def toggle_candidate_status(candidate_id: str, user_context: dict = Depends(get_tenant_user)):
    """God MAXX Tool: Toggles candidate status between active and suspended."""
    tid = user_context["tenant_id"]
    db = get_db()

    try:
        res = db.table("candidates").select("*").eq("tenant_id", tid).eq("id", candidate_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Candidate not found")

        curr = res.data[0]
        meta = curr.get("metadata") or {}
        new_status = "suspended" if meta.get("status") == "active" else "active"
        meta["status"] = new_status

        db.table("candidates").update({"metadata": meta}).eq("id", candidate_id).execute()

        # Real-time WebSocket push
        await ws_manager.broadcast("admin_feed", {
            "type": "CANDIDATE_STATUS_CHANGED",
            "candidate_id": candidate_id,
            "status": new_status,
            "timestamp": time.time(),
        })

        return {"status": "success", "new_status": new_status, "message": f"Candidate status updated to {new_status}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to toggle status: %s", e)
        raise HTTPException(status_code=500, detail=f"Database update failed: {str(e)}")


@router.post("/{candidate_id}/reset-attempt")
async def reset_candidate_attempt(candidate_id: str, user_context: dict = Depends(get_tenant_user)):
    """God MAXX Tool: Resets candidate exam attempt for immediate re-take."""
    tid = user_context["tenant_id"]
    db = get_db()

    try:
        db.table("exam_attempts").delete().eq("tenant_id", tid).eq("candidate_id", candidate_id).execute()

        # Real-time WebSocket push
        await ws_manager.broadcast("admin_feed", {
            "type": "CANDIDATE_ATTEMPT_RESET",
            "candidate_id": candidate_id,
            "timestamp": time.time(),
        })

        return {"status": "success", "message": "Candidate exam attempt wiped. Candidate can now re-test cleanly."}
    except Exception as e:
        logger.error("Failed to reset candidate attempt: %s", e)
        raise HTTPException(status_code=500, detail=f"Database reset failed: {str(e)}")
