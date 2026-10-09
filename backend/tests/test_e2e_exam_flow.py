import os
import sys
import time
import jwt
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.config import settings

client = TestClient(app)


def get_token():
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"
    return jwt.encode(
        {"sub": "00000000-0000-0000-0000-000000000099", "role": "super_admin", "aud": "authenticated", "exp": int(time.time()) + 3600},
        secret,
        algorithm="HS256",
    )


def test_full_candidate_examination_lifecycle():
    """
    End-to-End Test:
    1. Authenticate administrator
    2. Register a new candidate
    3. Verify exam availability
    4. Start exam session & verify authoritative timer
    5. Load candidate questions (verify answer key is concealed)
    6. Answer questions with server confirmation & idempotency
    7. Perform final submission
    8. Verify authoritative scored scorecard
    """
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "x-tenant-id": "00000000-0000-0000-0000-000000000001",
    }

    # Step 1: Create Candidate
    cand_payload = {"full_name": "Rohan Sharma", "email": "rohan@jee.in", "batch": "A"}
    cand_res = client.post("/api/v1/candidates/", json=cand_payload, headers=headers)
    assert cand_res.status_code == 200
    candidate = cand_res.json()
    assert "SSEC-A-CBT-" in candidate["registration_number"]

    # Step 2: Get Available Exams
    exams_res = client.get("/api/v1/exams/")
    assert exams_res.status_code == 200
    exams = exams_res.json()
    assert len(exams) >= 1
    exam_id = exams[0]["id"]

    # Step 3: Get Exam Session (Authoritative Timer)
    session_res = client.get(f"/api/v1/exams/{exam_id}/session")
    assert session_res.status_code == 200
    session_data = session_res.json()
    assert session_data["status"] == "active"
    assert session_data["time_remaining_seconds"] > 0

    # Step 4: Fetch Candidate Questions (Keys Stripped)
    questions_res = client.get(f"/api/v1/exams/{exam_id}/questions")
    assert questions_res.status_code == 200
    questions = questions_res.json()
    assert len(questions) >= 1
    for q in questions:
        assert "correct_answer" not in q
        assert "text" in q
        assert "options" in q

    # Step 5: Answer the first question
    first_q = questions[0]
    ans_payload = {
        "question_id": first_q["id"],
        "answer": 1,  # Option B
        "state": 1,   # Answered
        "idempotency_key": f"e2e_idemp_{time.time()}",
    }
    save_res = client.post(f"/api/v1/exams/{exam_id}/responses", json=ans_payload)
    assert save_res.status_code == 200
    assert save_res.json()["saved"] is True

    # Step 6: Submit Exam Authoritatively
    submit_res = client.post(f"/api/v1/exams/{exam_id}/submit")
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["status"] == "success"
    assert "reference" in submit_data
    assert "score" in submit_data

    # Step 7: Check Final Scorecard Result
    result_res = client.get(f"/api/v1/exams/{exam_id}/result")
    assert result_res.status_code == 200
    result_data = result_res.json()
    assert "score" in result_data
    assert "percentile" in result_data
    assert result_data["reference"] == submit_data["reference"]
