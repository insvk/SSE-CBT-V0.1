from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, List
from datetime import datetime, timezone
import uuid

router = APIRouter()

# In-memory mock DB for V0.1 local development
mock_exam_state = {
    "start_time": datetime.now(timezone.utc).timestamp(),
    "duration_minutes": 180,
    "status": "active"
}
mock_responses = {}

@router.get("/")
def get_exams():
    return [{"id": "EX-1001", "title": "JEE Main Mock A", "state": "active"}]

@router.get("/{exam_id}/session")
def get_exam_session(exam_id: str):
    """Returns server-authoritative time and exam state."""
    current_time = datetime.now(timezone.utc).timestamp()
    end_time = mock_exam_state["start_time"] + (mock_exam_state["duration_minutes"] * 60)
    time_remaining = max(0, int(end_time - current_time))
    
    return {
        "exam_id": exam_id,
        "status": mock_exam_state["status"],
        "server_time": current_time,
        "time_remaining_seconds": time_remaining
    }

@router.post("/{exam_id}/responses")
def save_response(
    exam_id: str, 
    payload: Dict[str, Any] = Body(...)
):
    """Saves a response durably with idempotency."""
    # Ensure exam is active
    if mock_exam_state["status"] != "active":
        raise HTTPException(status_code=403, detail="Exam is not active")

    q_id = payload.get("question_id")
    answer = payload.get("answer")
    state = payload.get("state")
    idempotency_key = payload.get("idempotency_key")

    if not q_id or not idempotency_key:
        raise HTTPException(status_code=400, detail="Missing question_id or idempotency_key")

    # Idempotent write logic (mocked)
    existing = mock_responses.get(q_id)
    if existing and existing["idempotency_key"] == idempotency_key:
        # Already saved this exact request, return success safely
        return {"status": "success", "saved": True, "message": "Already synced"}

    # Save to "DB"
    mock_responses[q_id] = {
        "answer": answer,
        "state": state,
        "idempotency_key": idempotency_key,
        "timestamp": datetime.now(timezone.utc).timestamp()
    }
    
    return {"status": "success", "saved": True}

@router.post("/{exam_id}/submit")
def submit_exam(exam_id: str):
    """Final authoritative submission."""
    if mock_exam_state["status"] == "submitted":
        return {"status": "success", "message": "Already submitted."}
        
    mock_exam_state["status"] = "submitted"
    return {
        "status": "success", 
        "message": "Exam submitted successfully.",
        "reference": str(uuid.uuid4())[:8].upper()
    }
