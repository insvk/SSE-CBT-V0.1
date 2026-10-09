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


def test_realtime_websocket_exam_connection_and_response_sync():
    """Validates candidate WebSocket connection and live Cloud DB response synchronization."""
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
            "question_id": "00000000-0000-0000-0000-000000000013",
            "answer": 1,
            "state": 1,
            "idempotency_key": f"test_ws_sync_{int(time.time()*1000)}",
            "candidate_name": "NARESH S",
            "reg_no": "5254740(V4.3.7)"
        })

        ack = ws.receive_json()
        assert ack["type"] == "ACK"
        assert ack["question_id"] == "00000000-0000-0000-0000-000000000013"
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

    payload = {
        "question_id": "00000000-0000-0000-0000-000000000013",
        "answer": 1,
        "state": 1,
        "idempotency_key": f"test_rest_sync_{int(time.time()*1000)}",
        "candidate_name": "NARESH S",
        "candidate_id": "018d1a55-2959-48c4-b2a4-8a72894512b9"
    }

    res = client.post("/api/v1/exams/EX-1001/responses", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["saved"] is True
    assert data["cloud_synced"] is True


def test_cloud_db_extend_time_broadcast():
    """Validates God MAXX time extension endpoint."""
    res = client.post("/api/v1/exams/EX-1001/extend-time?extra_minutes=15")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "Added +15 minutes" in data["message"]
    assert data["time_remaining_seconds"] > 0
