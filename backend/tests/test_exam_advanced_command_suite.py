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

def get_admin_headers() -> dict:
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"
    token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000099",
            "email": "admin@sse.cbt.in",
            "role": "super_admin",
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

ADMIN_HEADERS = get_admin_headers()
EXAM_ID = "00000000-0000-0000-0000-000000000101"


def test_exam_phase_lifecycle():
    """Verify authoritative exam lifecycle phase retrieval and progression."""
    # 1. Fetch current phase
    res = client.get(f"/api/v1/exams/{EXAM_ID}/phase", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "phase" in data
    assert "stage_number" in data
    assert "stage_title" in data
    assert "all_phases" in data
    assert "server_time_ist" in data
    assert len(data["all_phases"]) == 6

    # 2. Advance phase
    advance_res = client.post(
        f"/api/v1/exams/{EXAM_ID}/phase/advance",
        headers=ADMIN_HEADERS,
        json={"target_phase": "admissions_open", "notes": "Shift 1 biometric gates opened"},
    )
    assert advance_res.status_code == 200
    adv_data = advance_res.json()
    assert adv_data["status"] == "success"
    assert adv_data["new_phase"] == "admissions_open"


def test_paper_decryption_security():
    """Test 256-bit paper custody decryption with valid vs unauthorized key."""
    # 1. Reject invalid key
    bad_res = client.post(
        f"/api/v1/exams/{EXAM_ID}/paper/decrypt",
        headers=ADMIN_HEADERS,
        json={"custody_key": "UNAUTHORIZED_BAD_KEY", "decryption_pin": "0000"},
    )
    assert bad_res.status_code == 403
    assert "Custody Decryption Failed" in bad_res.json()["detail"]

    # 2. Accept authorized master key
    good_res = client.post(
        f"/api/v1/exams/{EXAM_ID}/paper/decrypt",
        headers=ADMIN_HEADERS,
        json={"custody_key": "SSEC-CBT-KEY-2026", "decryption_pin": "2026"},
    )
    assert good_res.status_code == 200
    dec_data = good_res.json()
    assert dec_data["status"] == "success"
    assert "integrity_hash" in dec_data
    assert "decrypted_at_ist" in dec_data


def test_preflight_infrastructure_audit():
    """Verify pre-flight infrastructure diagnostic audit with hardware specs and signed cert."""
    res = client.get(f"/api/v1/exams/{EXAM_ID}/infrastructure-audit", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    audit = res.json()
    assert audit["status"] == "compliant"
    assert audit["nodes_online"] == 42
    assert audit["nodes_health_score"] == 100.0
    assert audit["cctv_channels_online"] == 16
    assert audit["ups_battery_charge_pct"] > 90.0
    assert "time.google.com" in audit["ntp_source"]
    assert audit["audit_certificate_sha256"] is not None


def test_admissions_biometric_check_in():
    """Test candidate check-in and seat issuance for genuine candidate NARESH S."""
    checkin_payload = {
        "registration_number": "5254740(V4.3.7)",
        "biometric_match_score": 98.6,
        "metal_detector_status": "CLEARED",
        "assigned_terminal": "Terminal C-049",
    }
    res = client.post(
        f"/api/v1/exams/{EXAM_ID}/admissions/check-in",
        headers=ADMIN_HEADERS,
        json=checkin_payload,
    )
    assert res.status_code == 200
    check_data = res.json()
    assert check_data["status"] == "success"
    assert check_data["candidate_name"] == "NARESH S"
    assert check_data["assigned_terminal"] == "Terminal C-049"
    assert check_data["biometric_score"] >= 95.0
    assert "admitted_at_ist" in check_data


def test_emergency_disaster_hold():
    """Test emergency disaster evacuation hold."""
    hold_res = client.post(
        f"/api/v1/exams/{EXAM_ID}/emergency/disaster-hold",
        headers=ADMIN_HEADERS,
        json={"reason": "Power Grid Fluctuation Drill", "evacuation_protocol": "STAY_IN_SEAT", "freeze_all_timers": True},
    )
    assert hold_res.status_code == 200
    hold_data = hold_res.json()
    assert hold_data["status"] == "success"
    assert hold_data["action"] == "disaster_hold"
    assert "timestamp_ist" in hold_data


def test_form_24b_closing_report():
    """Verify official Form 24-B Center Closing Report tabulation with SHA-256 seal."""
    res = client.get(f"/api/v1/exams/{EXAM_ID}/closing-report", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    rep = res.json()
    assert rep["status"] == "sealed"
    assert "FORM 24-B" in rep["form_code"]
    assert rep["total_registered"] >= 1
    assert "integrity_digest_sha256" in rep
    assert len(rep["integrity_digest_sha256"]) == 64
    assert rep["sealed_by"] == "Prof. M. Shanmugam"
    assert rep["designation"] == "Chief Examination Controller"


def test_pearson_telemetry_radar():
    """Verify Pearson VUE / Prometric level anomaly radar telemetry."""
    res = client.get(f"/api/v1/exams/{EXAM_ID}/telemetry-radar", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "radar" in data
    radar = data["radar"]
    assert radar["ip_collisions"]["status"] == "CLEAR"
    assert radar["rapid_guessing_velocity"]["status"] == "NORMAL"
    assert radar["node_disconnections"]["status"] == "HEALTHY"
    assert radar["security_index_pct"] >= 99.0
