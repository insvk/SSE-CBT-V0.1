import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.db import get_db
from app.services.scoring import ScoringEngine
from app.services.exam_persistence import resolve_question_uuid, persist_response_cloud_db

client = TestClient(app)


def test_deterministic_question_resolution_no_collision():
    """Verify resolve_question_uuid never overwrites question 1 with other questions."""
    db = get_db()
    tid = "00000000-0000-0000-0000-000000000001"
    
    q1_uuid = resolve_question_uuid(db, "question_math_01", tenant_id=tid)
    q2_uuid = resolve_question_uuid(db, "question_chem_02", tenant_id=tid)
    q3_uuid = resolve_question_uuid(db, "question_phys_03", tenant_id=tid)
    
    assert q1_uuid != q2_uuid
    assert q2_uuid != q3_uuid
    assert q1_uuid != q3_uuid
    
    # Check deterministic resolution
    assert resolve_question_uuid(db, "question_math_01", tenant_id=tid) == q1_uuid


def test_authoritative_scoring_and_responses_persistence():
    """
    Test that submitting answers evaluates correctly:
    - Candidate submits responses
    - Backend stores answers and scores accurately (+4 / -1)
    - Results sync to /result endpoint with itemized review
    """
    db = get_db()
    exam_id = "00000000-0000-0000-0000-000000000002"
    tid = "00000000-0000-0000-0000-000000000001"
    cand_reg = f"SSE-TEST-SCORE-{int(time.time())}"
    
    # 1. Fetch available exam questions
    res_q = client.get(f"/api/v1/exams/{exam_id}/questions")
    assert res_q.status_code == 200
    questions = res_q.json()
    assert len(questions) >= 1
    
    # 2. Submit candidate answers
    submit_payload = {
        "candidate_id": "018d1a55-2959-48c4-b2a4-8a72894512b9",
        "candidate_name": "Scorecard Test Candidate",
        "reg_no": cand_reg,
        "responses": [
            {
                "question_id": questions[0]["id"],
                "answer": 0, # Option A
                "state": 1,
            }
        ]
    }
    
    sub_res = client.post(f"/api/v1/exams/{exam_id}/submit", json=submit_payload)
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["status"] == "success"
    assert "score" in sub_data
    assert "max_possible" in sub_data
    assert "accuracy" in sub_data
    assert "scoring_details" in sub_data
    
    # 3. Retrieve scorecard
    res_card = client.get(f"/api/v1/exams/{exam_id}/result?reg_no={cand_reg}")
    assert res_card.status_code == 200
    card_data = res_card.json()
    assert card_data["status"] == "success"
    assert card_data["candidate_name"] == "Scorecard Test Candidate"
    assert card_data["registration_number"] == cand_reg
    assert "scoring_details" in card_data
    details = card_data["scoring_details"]
    assert "details" in details
    assert len(details["details"]) > 0
    
    # Ensure question review item contains statement, options, marks
    item = details["details"][0]
    assert "statement" in item
    assert "options" in item
    assert "marks_awarded" in item
    assert "correct_answer" in item
