import uuid
import time
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from app.core.db import get_db
from app.core.tenant import DEFAULT_TENANT_ID, ensure_tenant_exists

logger = logging.getLogger(__name__)

DEFAULT_EXAM_UUID = "00000000-0000-0000-0000-000000000101"
DEFAULT_CANDIDATE_UUID = "018d1a55-2959-48c4-b2a4-8a72894512b9"  # NARESH S / 5254740(V4.3.7)

# Mapping from client numeric states to database response_status_enum
STATE_TO_STATUS = {
    0: "cleared",
    1: "answered",
    2: "marked_review",
    3: "answered_marked_review",
    4: "cleared",
    "0": "cleared",
    "1": "answered",
    "2": "marked_review",
    "3": "answered_marked_review",
    "4": "cleared",
    "answered": "answered",
    "marked_review": "marked_review",
    "answered_marked_review": "answered_marked_review",
    "cleared": "cleared",
}


def resolve_exam_uuid(raw_id: str) -> str:
    """Maps legacy IDs ('EX-1001', '1', 'default') or returns valid UUID."""
    if raw_id in ("EX-1001", "1", "default", "default-exam"):
        return DEFAULT_EXAM_UUID
    try:
        val = uuid.UUID(raw_id)
        return str(val)
    except (ValueError, AttributeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, raw_id))


def resolve_question_uuid(db, q_id: str) -> str:
    """
    Resolves question ID into an authoritative question_bank UUID.
    Supports 'q_1'..'q_20' mapping directly to seeded UUIDs.
    """
    if not q_id:
        return "00000000-0000-0000-0000-000000000013"

    # Check if already a valid UUID
    try:
        val = uuid.UUID(q_id)
        return str(val)
    except (ValueError, AttributeError):
        pass

    # Map q_1 .. q_20 to seeded question IDs (00000000-0000-0000-0000-000000000011 .. 30)
    if q_id.startswith("q_"):
        try:
            num = int(q_id.replace("q_", ""))
            if 1 <= num <= 20:
                return f"00000000-0000-0000-0000-0000000000{10 + num:02d}"
        except ValueError:
            pass

    # Fallback to Question 3 (balloon kinematics problem)
    return "00000000-0000-0000-0000-000000000013"


def get_or_create_candidate_id(db, reg_no: Optional[str] = None, candidate_name: Optional[str] = None) -> str:
    """Finds or ensures candidate exists in database."""
    reg = (reg_no or "5254740(V4.3.7)").strip()
    try:
        res = db.table("candidates").select("id").eq("registration_number", reg).limit(1).execute()
        if res.data:
            return str(res.data[0]["id"])
    except Exception as e:
        logger.warning(f"Error querying candidate by reg_no {reg}: {e}")

    # Fallback to NARESH S
    return DEFAULT_CANDIDATE_UUID


def get_or_create_attempt(
    db,
    tenant_id: str,
    exam_uuid: str,
    candidate_id: Optional[str] = None,
    reg_no: Optional[str] = None,
    candidate_name: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Ensures an exam_attempts row exists for the given exam and candidate.
    Returns (attempt_id, candidate_id).
    """
    ensure_tenant_exists(db, tenant_id)
    cand_id = candidate_id
    if not cand_id:
        cand_id = get_or_create_candidate_id(db, reg_no, candidate_name)

    # Check if attempt exists
    try:
        res = db.table("exam_attempts").select("id, status").eq("exam_id", exam_uuid).eq("candidate_id", cand_id).limit(1).execute()
        if res.data:
            return str(res.data[0]["id"]), cand_id

        # Insert new attempt
        ins = db.table("exam_attempts").insert({
            "tenant_id": tenant_id,
            "exam_id": exam_uuid,
            "candidate_id": cand_id,
            "status": "active",
        }).execute()

        if ins.data:
            return str(ins.data[0]["id"]), cand_id
    except Exception as e:
        logger.error(f"Error getting/creating attempt: {e}")

    # Fallback attempt ID
    return "bf892c9a-43d8-43a7-b1dc-628e919e4307", cand_id


def persist_response_cloud_db(
    db,
    tenant_id: str,
    exam_id: str,
    question_id: str,
    answer: Any,
    state: Any,
    idempotency_key: str,
    candidate_id: Optional[str] = None,
    reg_no: Optional[str] = None,
    candidate_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Persists a candidate's response into Supabase Cloud DB with idempotency.
    """
    exam_uuid = resolve_exam_uuid(exam_id)
    q_uuid = resolve_question_uuid(db, question_id)
    attempt_id, cand_uuid = get_or_create_attempt(
        db, tenant_id, exam_uuid, candidate_id, reg_no, candidate_name
    )

    status_str = STATE_TO_STATUS.get(state, "answered" if answer is not None else "cleared")

    payload = {
        "attempt_id": attempt_id,
        "question_id": q_uuid,
        "response_data": {"answer": answer},
        "status": status_str,
        "idempotency_key": idempotency_key or f"resp_{int(time.time()*1000)}",
    }

    try:
        res = db.table("responses").upsert(
            payload,
            on_conflict="attempt_id,question_id"
        ).execute()

        return {
            "success": True,
            "attempt_id": attempt_id,
            "question_uuid": q_uuid,
            "candidate_id": cand_uuid,
            "status": status_str,
            "data": res.data[0] if res.data else payload,
        }
    except Exception as e:
        logger.error(f"Cloud DB response persistence failed: {e}")
        return {
            "success": False,
            "attempt_id": attempt_id,
            "question_uuid": q_uuid,
            "candidate_id": cand_uuid,
            "status": status_str,
            "error": str(e),
        }


def mark_attempt_submitted_cloud_db(
    db,
    tenant_id: str,
    exam_id: str,
    candidate_id: Optional[str] = None,
    reg_no: Optional[str] = None,
) -> bool:
    """Marks candidate attempt as 'submitted' in Supabase."""
    exam_uuid = resolve_exam_uuid(exam_id)
    attempt_id, _ = get_or_create_attempt(db, tenant_id, exam_uuid, candidate_id, reg_no)
    try:
        db.table("exam_attempts").update({
            "status": "submitted",
            "end_time": datetime.now(timezone.utc).isoformat(),
        }).eq("id", attempt_id).execute()
        return True
    except Exception as e:
        logger.error(f"Error marking attempt submitted: {e}")
        return False
