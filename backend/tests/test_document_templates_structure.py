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


def test_get_document_templates_settings():
    """Verify GET /api/v1/exams/settings returns admit_card and scorecard templates."""
    res = client.get("/api/v1/exams/settings", headers=ADMIN_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert "admit_card" in data
    assert "scorecard" in data
    assert data["admit_card"] is not None
    assert data["scorecard"] is not None

    # Check structural toggles exist
    admit = data["admit_card"]
    assert "show_photo" in admit
    assert "show_barcode" in admit
    assert "show_slot_timings" in admit
    assert "show_venue_details" in admit
    assert "show_instructions" in admit
    assert "show_signature_block" in admit
    assert "watermark_text" in admit
    assert "instructions_text" in admit

    sc = data["scorecard"]
    assert "show_score_banner" in sc
    assert "show_metrics_grid" in sc
    assert "show_subject_breakdown" in sc
    assert "show_question_review" in sc
    assert "show_signature_block" in sc
    assert "show_seal" in sc
    assert "document_title" in sc


def test_update_document_templates_settings():
    """Verify POST /api/v1/exams/settings updates and persists custom structures."""
    payload = {
        "institution_name": "SAVEETHA DIGITAL TESTING AUTHORITY",
        "examination_title": "NATIONAL CBT MERIT TEST 2026",
        "controller_name": "Dr. S. K. Narayanan",
        "controller_designation": "Examination Directorate",
        "test_venue_name": "SSE High-Tech Supercomputing Lab, Block-B, Chennai",
        "test_center_code": "SSEC-TEST-999",
        "default_lab_room": "LAB-09",
        "terminal_prefix": "T-LAB9-",
        "admit_card": {
            "institution_name": "SAVEETHA DIGITAL TESTING AUTHORITY",
            "examination_title": "NATIONAL CBT MERIT TEST 2026",
            "header_subtitle": "CONFIDENTIAL ENTRANCE HALL TICKET & EXAM BADGE",
            "watermark_text": "OFFICIAL COPY",
            "instructions_text": "1. Carry valid Aadhar or Passport.\n2. Arrive 45 mins prior to test commencement.",
            "show_photo": True,
            "show_barcode": True,
            "show_slot_timings": False,
            "show_venue_details": True,
            "show_instructions": True,
            "show_signature_block": True,
        },
        "scorecard": {
            "institution_name": "SAVEETHA DIGITAL TESTING AUTHORITY",
            "document_title": "OFFICIAL AUDITED SCORECARD [ NATIONAL CBT 2026 ]",
            "subhead_status_text": "Status: Verified & Cryptographically Signed",
            "footer_disclaimer": "© 2026 Saveetha Testing Directorate. Verification hash active.",
            "show_score_banner": True,
            "show_metrics_grid": True,
            "show_subject_breakdown": True,
            "show_question_review": False,
            "show_signature_block": True,
            "show_seal": True,
        }
    }

    post_res = client.post("/api/v1/exams/settings", json=payload, headers=ADMIN_HEADERS)
    assert post_res.status_code == 200
    updated = post_res.json()
    assert updated["controller_name"] == "Dr. S. K. Narayanan"
    assert updated["admit_card"]["watermark_text"] == "OFFICIAL COPY"
    assert updated["admit_card"]["show_slot_timings"] is False
    assert updated["scorecard"]["show_question_review"] is False
    assert updated["scorecard"]["subhead_status_text"] == "Status: Verified & Cryptographically Signed"

    # Verify retrieval preserves the updated values
    get_res = client.get("/api/v1/exams/settings", headers=ADMIN_HEADERS)
    assert get_res.status_code == 200
    retrieved = get_res.json()
    assert retrieved["admit_card"]["watermark_text"] == "OFFICIAL COPY"
    assert retrieved["admit_card"]["show_slot_timings"] is False
    assert retrieved["scorecard"]["show_question_review"] is False
