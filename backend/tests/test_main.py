import os
import sys
import time
import jwt
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.config import settings
from app.services.scoring import ScoringEngine

client = TestClient(app)

# Generate a cryptographically valid Supabase JWT for authorized testing
def get_auth_headers(role: str = "super_admin") -> dict:
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"
    token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000099",
            "role": role,
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        },
        secret,
        algorithm="HS256",
    )
    return {
        "Authorization": f"Bearer {token}",
        "x-tenant-id": "00000000-0000-0000-0000-000000000001",
    }


def test_health_check():
    """Verify backend health check returns status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "SIMATS CBT Backend is running."}


def test_get_exams():
    """Verify listing available exams."""
    response = client.get("/api/v1/exams/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "id" in data[0]
    assert "title" in data[0]


def test_exam_session_timer():
    """Verify server-authoritative timer endpoint."""
    client.post("/api/v1/exams/EX-1001/reset")
    response = client.get("/api/v1/exams/EX-1001/session")
    assert response.status_code == 200
    data = response.json()
    assert data["exam_id"] == "EX-1001"
    assert "time_remaining_seconds" in data
    assert data["time_remaining_seconds"] > 0
    assert "server_time" in data
    assert data["status"] in ("active", "expired")


def test_exam_questions_strip_correct_answers():
    """Verify candidate question fetch hides answer keys."""
    response = client.get("/api/v1/exams/EX-1001/questions")
    assert response.status_code == 200
    questions = response.json()
    assert isinstance(questions, list)
    assert len(questions) >= 1
    for q in questions:
        assert "text" in q
        assert "options" in q
        # CRITICAL: correct_answer must NEVER be exposed to candidate
        assert "correct_answer" not in q


def test_save_response_idempotent():
    """Verify candidate answer saving is durable and idempotent."""
    client.post("/api/v1/exams/EX-1001/reset")
    payload = {
        "question_id": "00000000-0000-0000-0000-000000000011",
        "answer": 1,
        "state": 1,
        "idempotency_key": "idemp_test_key_12345",
    }
    # First save
    res1 = client.post("/api/v1/exams/EX-1001/responses", json=payload)
    assert res1.status_code == 200
    assert res1.json()["saved"] is True

    # Duplicate save with same idempotency key
    res2 = client.post("/api/v1/exams/EX-1001/responses", json=payload)
    assert res2.status_code == 200
    assert res2.json()["saved"] is True
    assert res2.json()["message"] == "Already synced"


def test_submit_exam():
    """Verify authoritative exam submission returns reference and score."""
    response = client.post("/api/v1/exams/EX-1001/submit")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "reference" in data
    assert len(data["reference"]) >= 4
    assert "score" in data


def test_scorecard_result_endpoint():
    """Verify authoritative scorecard endpoint returns calculated result."""
    response = client.get("/api/v1/exams/EX-1001/result")
    assert response.status_code == 200
    data = response.json()
    assert "score" in data
    assert "percentile" in data
    assert "registration_number" in data


def test_scoring_engine_unit():
    """Unit test for ScoringEngine calculation logic (+4, -1, 0)."""
    questions_map = {
        "q1": {"correct_answer": "B", "subject": "Physics", "type": "mcq_single"},
        "q2": {"correct_answer": "C", "subject": "Chemistry", "type": "mcq_single"},
        "q3": {"correct_answer": "A", "subject": "Mathematics", "type": "mcq_single"},
    }
    responses = [
        {"question_id": "q1", "response_data": 1},   # Index 1 -> 'B' (correct: +4)
        {"question_id": "q2", "response_data": 0},   # Index 0 -> 'A' (incorrect: -1)
        {"question_id": "q3", "response_data": None},# Unanswered (0)
    ]

    result = ScoringEngine.calculate_score(responses, questions_map, {"correct_marks": 4, "negative_marks": 1})
    assert result["total_score"] == 3.0
    assert result["correct_count"] == 1
    assert result["incorrect_count"] == 1
    assert result["unanswered_count"] == 1
    assert result["max_possible_score"] == 12.0


def test_candidate_endpoints_persistence():
    """Verify candidate creation and listing via authenticated endpoints."""
    headers = get_auth_headers()
    # List candidates
    res_list = client.get("/api/v1/candidates/", headers=headers)
    assert res_list.status_code == 200
    assert isinstance(res_list.json(), list)

    # Create candidate
    new_cand = {
        "full_name": "Test Candidate Alpha",
        "email": "alpha@test.com",
        "batch": "C",
    }
    res_create = client.post("/api/v1/candidates/", json=new_cand, headers=headers)
    assert res_create.status_code == 200
    created = res_create.json()
    assert created["full_name"] == "Test Candidate Alpha"
    assert created["batch"] == "C"
    assert "SSEC-C-CBT-" in created["registration_number"]


def test_bulk_assign_request_body():
    """Verify bulk assign endpoint handles JSON body payload without 422 error."""
    headers = get_auth_headers()
    payload = {
        "candidate_ids": ["cand-1", "cand-2"],
        "exam_id": "EX-1001",
    }
    res = client.post("/api/v1/candidates/bulk-assign", json=payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "success"


def test_question_bank_endpoints():
    """Verify question bank listing and creation in real DB."""
    headers = get_auth_headers()
    res = client.get("/api/v1/questions/", headers=headers)
    assert res.status_code == 200
    questions = res.json()
    assert isinstance(questions, list)

    # Create a new question
    new_q = {
        "statement": "What is the speed of light in vacuum?",
        "opt_a": "3 x 10^8 m/s",
        "opt_b": "3 x 10^6 m/s",
        "opt_c": "1.5 x 10^8 m/s",
        "opt_d": "3 x 10^10 m/s",
        "correct_answer": "A",
        "marks": 4.0,
        "negative_marks": 1.0,
        "subject": "Physics",
        "difficulty": "Easy",
        "question_type": "mcq_single",
    }
    create_res = client.post("/api/v1/questions/", json=new_q, headers=headers)
    assert create_res.status_code == 201
    created_q = create_res.json()
    assert created_q["statement"] == "What is the speed of light in vacuum?"
    assert created_q["subject"] == "Physics"


def test_tenants_endpoint():
    """Verify tenants retrieval."""
    headers = get_auth_headers()
    res = client.get("/api/v1/tenants/", headers=headers)
    assert res.status_code == 200
    tenants = res.json()
    assert isinstance(tenants, list)
    assert len(tenants) >= 1
    assert tenants[0]["name"] == "SIMATS Engineering"
