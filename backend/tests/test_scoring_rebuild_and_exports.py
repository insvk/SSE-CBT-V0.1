import os
import sys
import time
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.services.scoring import ScoringEngine

client = TestClient(app)



def test_scoring_engine_accuracy_and_details():
    """Verify ScoringEngine calculates accuracy, percentage, details without percentile."""
    questions_map = {
        "q1": {"id": "q1", "correct_answer": "B", "options": ["X", "Y", "Z"], "subject": "Physics", "marks": 4, "negative_marks": 1},
        "q2": {"id": "q2", "correct_answer": "C", "options": ["P", "Q", "R"], "subject": "Chemistry", "marks": 4, "negative_marks": 1},
        "q3": {"id": "q3", "correct_answer": "A", "options": ["M", "N", "O"], "subject": "Mathematics", "marks": 4, "negative_marks": 1},
        "q4": {"id": "q4", "correct_answer": "BONUS", "options": ["1", "2"], "subject": "Physics", "marks": 4, "negative_marks": 1},
    }
    responses = [
        {"question_id": "q1", "response_data": 1},   # Option B -> Correct (+4)
        {"question_id": "q2", "response_data": 0},   # Option A -> Incorrect (-1)
        {"question_id": "q3", "response_data": None},# Unanswered (0)
        # q4 is BONUS -> awarded +4
    ]

    res = ScoringEngine.calculate_score(responses, questions_map)
    # Total Score: +4 -1 +0 +4 = 7.0
    assert res["total_score"] == 7.0
    assert res["max_possible_score"] == 16.0
    assert res["percentage"] == 43.75
    # Attempted: 2 (q1, q2). Correct: 2 (q1, q4 bonus). Accuracy: 2 / 2 * 100 = 100.0%
    assert res["correct_count"] == 2
    assert res["incorrect_count"] == 1
    assert res["unanswered_count"] == 1
    assert res["attempted_count"] == 2
    assert res["accuracy"] == 100.0
    assert res["accuracy_display"] == "100.0%"
    assert "percentile" not in res or res.get("percentile") is None

    # Check question-level details array
    assert len(res["details"]) == 4
    q1_detail = next(d for d in res["details"] if d["question_id"] == "q1")
    assert q1_detail["status"] == "correct"
    assert q1_detail["marks_awarded"] == 4.0

    q2_detail = next(d for d in res["details"] if d["question_id"] == "q2")
    assert q2_detail["status"] == "incorrect"
    assert q2_detail["marks_awarded"] == -1.0

    q3_detail = next(d for d in res["details"] if d["question_id"] == "q3")
    assert q3_detail["status"] == "unanswered"
    assert q3_detail["marks_awarded"] == 0.0


def test_scoring_engine_negative_marking_toggle_off():
    """Verify that when negative marking is disabled, incorrect answers incur 0 penalty."""
    questions_map = {
        "q1": {"id": "q1", "correct_answer": "B", "options": ["X", "Y"], "subject": "Physics", "marks": 4, "negative_marks": 1},
        "q2": {"id": "q2", "correct_answer": "A", "options": ["X", "Y"], "subject": "Physics", "marks": 4, "negative_marks": 2},
    }
    responses = [
        {"question_id": "q1", "response_data": 1},   # Option B -> Correct (+4)
        {"question_id": "q2", "response_data": 1},   # Option B -> Incorrect (0 penalty because negative_marking_enabled=False)
    ]

    res = ScoringEngine.calculate_score(responses, questions_map, negative_marking_enabled=False)
    assert res["total_score"] == 4.0
    assert res["correct_count"] == 1
    assert res["incorrect_count"] == 1
    assert res["negative_marking_enabled"] is False

    q2_detail = next(d for d in res["details"] if d["question_id"] == "q2")
    assert q2_detail["status"] == "incorrect"
    assert q2_detail["marks_awarded"] == 0.0


def test_scoring_engine_zero_attempts():
    """Verify that when 0 questions are attempted, accuracy is None (N/A)."""
    questions_map = {
        "q1": {"id": "q1", "correct_answer": "A", "subject": "Physics", "marks": 4, "negative_marks": 1},
    }
    responses = []
    res = ScoringEngine.calculate_score(responses, questions_map)
    assert res["total_score"] == 0.0
    assert res["attempted_count"] == 0
    assert res["accuracy"] is None
    assert res["accuracy_display"] == "N/A"


def test_monitoring_endpoint():
    """Verify /{exam_id}/monitoring endpoint returns overview counts and student roster."""
    res = client.get("/api/v1/exams/EX-1001/monitoring")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "total_assigned" in data
    assert "active" in data
    assert "submitted" in data
    assert "students" in data
    assert isinstance(data["students"], list)
    if data["students"]:
        st = data["students"][0]
        assert "candidate_name" in st
        assert "registration_number" in st
        assert "status" in st
        assert "progress_pct" in st
        assert "violations_count" in st


def test_results_csv_export():
    """Verify CSV export contains accurate columns, formula protection, and no percentile."""
    res = client.get("/api/v1/exams/EX-1001/results-export?format=csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    text = res.content.decode("utf-8")
    # Verify header columns
    lines = text.strip().splitlines()
    header = lines[0]
    assert "rank" in header
    assert "registration_number" in header
    assert "total_score" in header or "score" in header
    assert "accuracy" in header
    assert "percentage" in header
    assert "percentile" not in header


def test_responses_csv_export():
    """Verify question responses CSV export contains question statements and candidate answers."""
    res = client.get("/api/v1/exams/EX-1001/export/responses")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    text = res.content.decode("utf-8")
    lines = text.strip().splitlines()
    assert len(lines) >= 1
    header = lines[0]
    assert "registration_number" in header
    assert "question_statement" in header
    assert "candidate_response" in header
    assert "marks_awarded" in header


def test_exam_results_normal_and_advanced_view():
    """Verify /{exam_id}/results returns dynamic marking scheme and structured results."""
    # Test normal view
    res_normal = client.get("/api/v1/exams/EX-1001/results?view_mode=normal")
    assert res_normal.status_code == 200
    data_norm = res_normal.json()
    assert data_norm["status"] == "success"
    assert "marking_scheme" in data_norm
    assert "total_marks" in data_norm["marking_scheme"]
    assert "analytics" in data_norm
    assert "results" in data_norm
    assert isinstance(data_norm["results"], list)

    # Test advanced view
    res_adv = client.get("/api/v1/exams/EX-1001/results?view_mode=advanced")
    assert res_adv.status_code == 200
    data_adv = res_adv.json()
    assert data_adv["status"] == "success"
    assert data_adv["view_mode"] == "advanced"
    assert "marking_scheme" in data_adv
    assert "negative_marking_enabled" in data_adv["marking_scheme"]


def test_recalculate_exam_results():
    """Verify authoritative recalculation endpoint processes without error."""
    res = client.post("/api/v1/exams/EX-1001/recalculate-results")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "recalculated_count" in data
    assert "marking_applied" in data
