import os
import sys
import pytest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from app.core.master_clock import get_master_clock_payload, get_current_ist_datetime

client = TestClient(app)


def get_admin_headers():
    res = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@sse.cbt.in",
        "password": "Admin.sse@123",
    })
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "x-tenant-id": "00000000-0000-0000-0000-000000000001",
    }


def test_authoritative_master_clock_system_endpoints():
    """Validates authoritative master clock synced with time.google.com in IST."""
    res = client.get("/api/v1/system/time")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    clock = data["clock"]
    assert "time.google.com" in clock["source"]
    assert clock["timezone"] == "IST (UTC+05:30)"
    assert "ist_formatted" in clock
    assert "IST" in clock["ist_formatted"]
    assert "unix_timestamp" in clock

    # Test clock sync trigger
    sync_res = client.post("/api/v1/system/sync-clock")
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["status"] == "success"
    assert "sync_result" in sync_data


def test_candidate_management_full_lifecycle():
    """Validates enterprise candidate dossier, slot reallocation, accommodations, admit card & debarment."""
    headers = get_admin_headers()

    # 1. Create a candidate
    create_payload = {
        "full_name": "TEST CANDIDATE PRO",
        "batch": "A",
        "category": "OBC-NCL",
        "gender": "Female",
        "is_pwd": True,
        "has_scribe": True,
        "disability_type": "Locomotor",
        "compensatory_minutes": 60,
    }
    create_res = client.post("/api/v1/candidates/", json=create_payload, headers=headers)
    assert create_res.status_code == 200
    cand = create_res.json()
    cand_id = cand["id"]
    assert cand["full_name"] == "TEST CANDIDATE PRO"
    assert cand["batch"] == "A"
    assert cand["is_pwd"] is True
    assert cand["has_scribe"] is True
    assert cand["compensatory_minutes"] == 60
    assert "IST" in (cand["created_at_ist"] or "")
    assert "IST" in (cand["reporting_time_ist"] or "")

    # 2. Reallocate slot from Slot A -> Slot C
    realloc_res = client.patch(
        f"/api/v1/candidates/{cand_id}/reallocate-slot",
        json={"slot": "C", "reason": "Administrative Rescheduling to Afternoon Shift"},
        headers=headers,
    )
    assert realloc_res.status_code == 200
    realloc_cand = realloc_res.json()
    assert realloc_cand["batch"] == "C"
    assert "16:30" in realloc_cand["slot_timing_ist"]
    assert "15:30" in realloc_cand["reporting_time_ist"]

    # 3. Update Accommodations
    acc_res = client.patch(
        f"/api/v1/candidates/{cand_id}/accommodations",
        json={
            "is_pwd": True,
            "has_scribe": False,
            "disability_type": "Low Vision",
            "compensatory_minutes": 40,
        },
        headers=headers,
    )
    assert acc_res.status_code == 200
    acc_cand = acc_res.json()
    assert acc_cand["is_pwd"] is True
    assert acc_cand["has_scribe"] is False
    assert acc_cand["compensatory_minutes"] == 40

    # 4. Emergency Credentials PIN Regeneration
    pin_res = client.post(f"/api/v1/candidates/{cand_id}/regenerate-credentials", headers=headers)
    assert pin_res.status_code == 200
    pin_data = pin_res.json()
    assert pin_data["status"] == "success"
    assert len(pin_data["temporary_pin"]) == 6
    assert "IST" in pin_data["generated_at_ist"]

    # 5. Official Admit Card Generation
    admit_res = client.get(f"/api/v1/candidates/{cand_id}/admit-card", headers=headers)
    assert admit_res.status_code == 200
    admit_card = admit_res.json()
    assert admit_card["status"] == "success"
    assert "AC-2026-C" in admit_card["admit_card_number"]
    assert admit_card["slot"] == "Slot C"
    assert "IST" in admit_card["reporting_time_ist"]
    assert "IST" in admit_card["gate_closure_ist"]
    assert "barcode_data" in admit_card
    assert admit_card["test_center_code"] == "SSEC-TN-042"

    # 6. Bulk Reallocate
    bulk_realloc_res = client.post(
        "/api/v1/candidates/bulk-reallocate",
        json={"candidate_ids": [cand_id], "slot": "B", "reason": "Mass Shift Adjustment"},
        headers=headers,
    )
    assert bulk_realloc_res.status_code == 200
    assert bulk_realloc_res.json()["reallocated_count"] == 1
    assert bulk_realloc_res.json()["target_slot"] == "B"

    # 7. Debar Candidate
    debar_res = client.post(
        f"/api/v1/candidates/{cand_id}/debar",
        json={"reason": "Possession of Unauthorized Electronic Equipment"},
        headers=headers,
    )
    assert debar_res.status_code == 200
    assert "debarred" in debar_res.json()["message"]
    assert "IST" in debar_res.json()["timestamp_ist"]

    # Clean up test candidate
    client.delete(f"/api/v1/candidates/{cand_id}", headers=headers)
