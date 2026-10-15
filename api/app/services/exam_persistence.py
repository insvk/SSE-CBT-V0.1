import uuid
import time
import logging
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from app.core.db import get_db
from app.core.tenant import DEFAULT_TENANT_ID, ensure_tenant_exists

logger = logging.getLogger(__name__)

DEFAULT_EXAM_UUID = "00000000-0000-0000-0000-000000000101"

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


def resolve_question_uuid(db, q_id: str, tenant_id: str = "00000000-0000-0000-0000-000000000001") -> str:
    """
    Resolves question ID into an authoritative question_bank UUID.
    Guarantees that each question has its own distinct UUID and guarantees foreign key integrity
    in public.responses by ensuring a record exists in question_bank without ever overwriting
    other questions.
    """
    if not q_id:
        return ""

    try:
        val = uuid.UUID(str(q_id))
        target_uuid = str(val)
    except Exception:
        target_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(q_id)))

    # Check if this exact UUID exists in question_bank
    try:
        chk = db.table("question_bank").select("id").eq("id", target_uuid).limit(1).execute()
        if chk.data:
            return target_uuid
    except Exception:
        pass

    # Ensure question exists in question_bank so foreign key in public.responses is satisfied
    try:
        db.table("question_bank").upsert({
            "id": target_uuid,
            "tenant_id": tenant_id,
            "type": "mcq_single",
            "content": {"statement": f"Assessment Question {q_id}"},
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "difficulty": "Medium",
            "subject": "General",
            "status": "approved",
        }).execute()
        return target_uuid
    except Exception as e:
        logger.warning(f"Could not upsert question_bank record for {target_uuid}: {e}")

    return target_uuid


def ensure_candidate_exists(
    db,
    tenant_id: str,
    candidate_id: str,
    reg_no: Optional[str] = None,
    candidate_name: Optional[str] = None,
) -> str:
    """Ensures candidate row exists in public.candidates table."""
    ensure_tenant_exists(db, tenant_id)
    reg = (reg_no or f"SSE-A-CBT-{uuid.uuid4().hex[:4].upper()}").strip()
    name = (candidate_name or f"Candidate {reg}").strip()
    try:
        chk = db.table("candidates").select("id").eq("id", candidate_id).limit(1).execute()
        if chk.data:
            return str(chk.data[0]["id"])
    except Exception:
        pass

    try:
        chk_reg = db.table("candidates").select("id").eq("registration_number", reg).limit(1).execute()
        if chk_reg.data:
            return str(chk_reg.data[0]["id"])
    except Exception:
        pass

    try:
        db.table("candidates").upsert({
            "id": candidate_id,
            "tenant_id": tenant_id,
            "full_name": name,
            "registration_number": reg,
            "metadata": {
                "batch": "A",
                "status": "active",
                "exam_status": "in_progress",
                "password": "password123",
                "assigned_terminal": "Terminal C-049",
                "roll_number": reg,
                "biometric_status": "verified",
                "biometric_score": 98.6,
            }
        }).execute()
        return candidate_id
    except Exception as e:
        logger.warning(f"Error ensuring candidate exists: {e}")
    return candidate_id


def get_or_create_candidate_id(db, reg_no: Optional[str] = None, candidate_name: Optional[str] = None) -> str:
    """Finds or ensures candidate exists in database dynamically."""
    reg = (reg_no or "").strip()
    if not reg:
        reg = f"SSE-A-CBT-{uuid.uuid4().hex[:4].upper()}"
    try:
        res = db.table("candidates").select("id").eq("registration_number", reg).limit(1).execute()
        if res.data:
            return str(res.data[0]["id"])
    except Exception as e:
        logger.warning(f"Error querying candidate by reg_no {reg}: {e}")

    # Generate deterministic candidate UUID from registration number
    cand_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, reg))
    return ensure_candidate_exists(db, DEFAULT_TENANT_ID, cand_id, reg_no=reg, candidate_name=candidate_name)


def ensure_exam_exists(db, tenant_id: str, exam_uuid: str, title: str = "MCQ ASSESSMENT [ SSE CBT 2026 ]") -> str:
    """Ensures an exam record exists in public.exams so foreign keys in exam_attempts are satisfied."""
    ensure_tenant_exists(db, tenant_id)
    try:
        chk = db.table("exams").select("id").eq("id", exam_uuid).limit(1).execute()
        if not chk.data:
            db.table("exams").upsert({
                "id": exam_uuid,
                "tenant_id": tenant_id,
                "title": title,
                "state": "active",
                "duration_minutes": 180,
                "config": {"correct_marks": 4, "negative_marks": 1, "negative_marking_enabled": True}
            }).execute()
    except Exception as e:
        logger.warning(f"Could not ensure exam exists: {e}")
    return exam_uuid


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
    ensure_exam_exists(db, tenant_id, exam_uuid)
    cand_id = candidate_id
    if not cand_id:
        cand_id = get_or_create_candidate_id(db, reg_no, candidate_name)
    else:
        cand_id = ensure_candidate_exists(db, tenant_id, cand_id, reg_no=reg_no, candidate_name=candidate_name)

    # Check if attempt exists
    try:
        res = db.table("exam_attempts").select("id, status").eq("exam_id", exam_uuid).eq("candidate_id", cand_id).limit(1).execute()
        if res.data:
            return str(res.data[0]["id"]), cand_id

        # Insert new attempt with deterministic UUID to prevent race conditions
        det_attempt_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{exam_uuid}:{cand_id}"))
        ins = db.table("exam_attempts").upsert({
            "id": det_attempt_id,
            "tenant_id": tenant_id,
            "exam_id": exam_uuid,
            "candidate_id": cand_id,
            "status": "active",
        }).execute()

        if ins.data:
            return str(ins.data[0]["id"]), cand_id
        return det_attempt_id, cand_id
    except Exception as e:
        logger.error(f"Error getting/creating attempt: {e}")
        det_attempt_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{exam_uuid}:{cand_id}"))
        try:
            db.table("exam_attempts").upsert({
                "id": det_attempt_id,
                "tenant_id": tenant_id,
                "exam_id": exam_uuid,
                "candidate_id": cand_id,
                "status": "active",
            }).execute()
        except Exception:
            pass
        return det_attempt_id, cand_id


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
    q_uuid = resolve_question_uuid(db, question_id, tenant_id=tenant_id)
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
    scoring_result: Optional[Dict[str, Any]] = None,
    is_disqualified: bool = False,
    disqualification_reason: Optional[str] = None,
) -> bool:
    """
    Marks candidate attempt as 'submitted' or 'invalidated' in Supabase Cloud DB.
    Persists authoritative scores and disqualification metadata directly into Cloud DB.
    """
    exam_uuid = resolve_exam_uuid(exam_id)
    attempt_id, cand_uuid = get_or_create_attempt(db, tenant_id, exam_uuid, candidate_id, reg_no)
    now_iso = datetime.now(timezone.utc).isoformat()
    status_str = "invalidated" if is_disqualified else "submitted"

    # 1. Update public.exam_attempts
    try:
        att_update = {
            "status": status_str,
            "end_time": now_iso,
        }
        if scoring_result:
            att_update["score"] = float(scoring_result.get("total_score", 0.0))
            att_update["total_questions"] = int(scoring_result.get("total_questions", 0))
        elif is_disqualified:
            att_update["score"] = 0.0
        db.table("exam_attempts").update(att_update).eq("id", attempt_id).execute()
    except Exception as e:
        logger.error(f"Error marking attempt {status_str}: {e}")

    # 2. Update public.candidates metadata in Supabase Cloud DB
    try:
        c_res = db.table("candidates").select("metadata").eq("id", cand_uuid).limit(1).execute()
        meta = (c_res.data[0].get("metadata") or {}) if (c_res.data and len(c_res.data) > 0) else {}

        if is_disqualified:
            meta.update({
                "exam_status": "invalidated",
                "disqualified": True,
                "disqualification_reason": disqualification_reason or "4 Security Violations Exceeded",
                "score": 0.0,
                "percentage": 0.0,
                "accuracy": 0.0,
                "accuracy_display": "0.0%",
                "percentile": None,
                "result_status": "Disqualified (Security Malpractice)",
                "disqualified_at": now_iso,
            })
        elif scoring_result:
            meta.update({
                "exam_status": "submitted",
                "disqualified": False,
                "score": float(scoring_result.get("total_score", 0.0)),
                "max_possible": float(scoring_result.get("max_possible_score", 0.0)),
                "percentage": float(scoring_result.get("percentage", 0.0)),
                "accuracy": scoring_result.get("accuracy"),
                "accuracy_display": scoring_result.get("accuracy_display", "N/A"),
                "correct_count": int(scoring_result.get("correct_count", 0)),
                "incorrect_count": int(scoring_result.get("incorrect_count", 0)),
                "unanswered_count": int(scoring_result.get("unanswered_count", 0)),
                "attempted_count": int(scoring_result.get("attempted_count", 0)),
                "marked_for_review_count": int(scoring_result.get("marked_for_review_count", 0)),
                "bonus_count": int(scoring_result.get("bonus_count", 0)),
                "total_questions": int(scoring_result.get("total_questions", 0)),
                "marks_before_penalty": float(scoring_result.get("marks_before_penalty", 0.0)),
                "penalty_deducted": float(scoring_result.get("penalty_deducted", 0.0)),
                "bonus_marks": float(scoring_result.get("bonus_marks", 0.0)),
                "subject_breakdown": scoring_result.get("subject_breakdown", {}),
                "submission_reference": scoring_result.get("reference", ""),
                "submitted_at": now_iso,
                "percentile": None,
            })
        db.table("candidates").update({"metadata": meta}).eq("id", cand_uuid).execute()
    except Exception as e:
        logger.error(f"Error updating candidate metadata in Cloud DB: {e}")

    return True

