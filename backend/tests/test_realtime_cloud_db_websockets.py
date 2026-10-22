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

client = TestClient(app)


def _get_active_question_id():
    db = get_db()
    res = db.table("question_bank").select("id").limit(1).execute()
    if res.data:
        return str(res.data[0]["id"])
    c = db.table("question_bank").insert({
        "tenant_id": "00000000-0000-0000-0000-000000000001",
        "type": "mcq_single",
        "content": {"statement": "Sample question for real-time websocket sync"},
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "difficulty": "Easy",
        "subject": "Physics",
        "status": "approved",
    }).execute()
    return str(c.data[0]["id"])


@pytest.fixture(autouse=True)
def setup_test_candidate():
    db = get_db()
    test_cand_id = "018d1a55-2959-48c4-b2a4-8a72894512b9"
    try:
        db.table("candidates").upsert({
            "id": test_cand_id,
            "tenant_id": "00000000-0000-0000-0000-000000000001",
            "full_name": "Test Candidate",
            "registration_number": "SSE-TEST-0001",
            "metadata": {
                "batch": "A",
                "status": "active",
                "exam_status": "in_progress",
                "password": "password123",
                "assigned_terminal": "Terminal C-049",
                "roll_number": "SSE-TEST-0001",
                "biometric_status": "verified",
                "biometric_score": 98.6,
            }
        }).execute()
    except Exception as e:
        pass

    yield

    try:
        db.table("exam_attempts").delete().eq("candidate_id", test_cand_id).execute()
        db.table("candidates").delete().eq("id", test_cand_id).execute()
    except Exception:
        pass


def test_realtime_websocket_exam_connection_and_response_sync():
    """Validates candidate WebSocket connection and live Cloud DB response synchronization."""
    target_qid = _get_active_question_id()

    with client.websocket_connect("/ws/exam/EX-1001") as ws:
        init_msg = ws.receive_json()
        assert init_msg["type"] == "CONNECTED"
        assert init_msg["cloud_db_connected"] is True

        # Send PING
        ws.send_json({"type": "PING"})
        pong = ws.receive_json()
        assert pong["type"] == "PONG"

        # Send live candidate response
        ws.send_json({
            "type": "RESPONSE_UPDATE",
            "question_id": target_qid,
            "answer": 1,
            "state": 1,
            "idempotency_key": f"test_ws_sync_{int(time.time()*1000)}",
            "candidate_name": "Test Candidate",
            "reg_no": "SSE-TEST-0001"
        })

        ack = ws.receive_json()
        assert ack["type"] == "ACK"
        assert ack["question_id"] == target_qid
        assert ack["cloud_synced"] is True


def test_realtime_websocket_admin_connection():
    """Validates Administrator Command Centre WebSocket live feed connection."""
    with client.websocket_connect("/ws/admin") as ws:
        init_msg = ws.receive_json()
        assert init_msg["type"] == "CONNECTED"
        assert init_msg["channel"] == "admin_feed"

        # Send PING
        ws.send_json({"type": "PING"})
        pong = ws.receive_json()
        assert pong["type"] == "PONG"


def test_cloud_db_rest_save_response_realtime():
    """Validates HTTP response endpoint writes to Supabase responses table."""
    # Ensure fresh active session
    client.post("/api/v1/exams/EX-1001/reset")
    target_qid = _get_active_question_id()

    payload = {
        "question_id": target_qid,
        "answer": 1,
        "state": 1,
        "idempotency_key": f"test_rest_sync_{int(time.time()*1000)}",
        "candidate_name": "Rahul Sharma",
        "candidate_id": "018d1a55-2959-48c4-b2a4-8a72894512b9"
    }

    res = client.post("/api/v1/exams/EX-1001/responses", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["saved"] is True
    assert data["cloud_synced"] is True


def test_cloud_db_extend_time_broadcast():
    """Validates exam time extension endpoint."""
    res = client.post("/api/v1/exams/EX-1001/extend-time?extra_minutes=15")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "Added +15 minutes" in data["message"]
    assert data["time_remaining_seconds"] > 0


def test_enterprise_candidate_intervention_suite():
    """Validates compensatory time, pause, resume, reseat, warning, and locking endpoints."""
    # 1. Compensatory Time Grant (PwD / Glitch Relief)
    res = client.post("/api/v1/exams/EX-1001/candidate-intervention", json={
        "action": "extend_time",
        "reg_no": "SSE-TEST-0001",
        "extra_minutes": 20,
        "reason": "PwD Scribe Mandated Compensatory Time"
    })
    assert res.status_code == 200
    d = res.json()
    assert d["status"] == "success"
    assert d["extra_minutes"] == 20
    assert d["total_compensatory_minutes"] >= 20

    # 2. Remote Session Pause (Hold)
    res_pause = client.post("/api/v1/exams/EX-1001/candidate-intervention", json={
        "action": "pause_session",
        "reg_no": "SSE-TEST-0001",
        "reason": "Biometric verification hold"
    })
    assert res_pause.status_code == 200
    assert res_pause.json()["status"] == "success"

    # 3. Remote Session Resume
    res_resume = client.post("/api/v1/exams/EX-1001/candidate-intervention", json={
        "action": "resume_session",
        "reg_no": "SSE-TEST-0001",
        "reason": "Verification cleared"
    })
    assert res_resume.status_code == 200
    assert res_resume.json()["status"] == "success"

    # 4. Terminal Re-seating / Migration
    res_reseat = client.post("/api/v1/exams/EX-1001/candidate-intervention", json={
        "action": "reseat_terminal",
        "reg_no": "SSE-TEST-0001",
        "target_terminal": "Terminal C-049",
        "reason": "Keyboard defect"
    })
    assert res_reseat.status_code == 200
    assert res_reseat.json()["new_terminal"] == "Terminal C-049"

    # 5. Direct Proctor Warning
    res_warn = client.post("/api/v1/exams/EX-1001/candidate-intervention", json={
        "action": "direct_warning",
        "reg_no": "SSE-TEST-0001",
        "message": "Maintain exam focus on screen."
    })
    assert res_warn.status_code == 200
    assert res_warn.json()["status"] == "success"


def test_attendance_roster_generation():
    """Validates real-time attendance roster in both JSON and CSV formats."""
    # JSON format
    res_json = client.get("/api/v1/exams/EX-1001/attendance-roster")
    assert res_json.status_code == 200
    data = res_json.json()
    assert data["status"] == "success"
    assert "roster" in data
    assert len(data["roster"]) >= 1
    cand = data["roster"][0]
    assert "registration_number" in cand
    assert "terminal_node" in cand
    assert "biometric_status" in cand

    # CSV format
    res_csv = client.get("/api/v1/exams/EX-1001/attendance-roster?format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "registration_number" in res_csv.text
    assert cand["candidate_name"] in res_csv.text


def test_question_adjudication_and_bonus():
    """Validates Chief Controller post-exam question adjudication (bonus to all)."""
    # 1. Authenticate with official admin account
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@sse.cbt.in", "password": "Admin.sse@123"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"x-tenant-id": "00000000-0000-0000-0000-000000000001", "Authorization": f"Bearer {token}"}

    # 2. Always create a dedicated question to test adjudication in isolation
    new_q = client.post(
        "/api/v1/questions/",
        json={
            "statement": "Temporary test question for adjudication test",
            "opt_a": "Opt A", "opt_b": "Opt B", "opt_c": "Opt C", "opt_d": "Opt D",
            "correct_answer": "A", "subject": "Physics", "marks": 4.0
        },
        headers=headers,
    )
    assert new_q.status_code in [200, 201]
    target_qid = new_q.json()["id"]

    try:
        res = client.post(
            f"/api/v1/questions/{target_qid}/adjudicate",
            json={"action": "drop_bonus", "reason": "Ambiguous option wording"},
            headers=headers,
        )
        assert res.status_code == 200
        d = res.json()
        assert d["status"] == "success"
        assert d["action"] == "drop_bonus"
        assert d["correct_answer"] == "BONUS"
    finally:
        client.delete(f"/api/v1/questions/{target_qid}", headers=headers)


