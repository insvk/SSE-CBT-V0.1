import os
import sys
import pytest
from fastapi.testclient import TestClient

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from app.core.db import get_db

client = TestClient(app)

def test_registration_and_roll_number_format_for_all_slots():
    """
    Verifies the strict format:
    SSE-(THAT SLOT CHOSEN WHICH IS A/B/C/D)-CBT-000x
    Examples: SSE-B-CBT-0001, SSE-D-CBT-0002
    Both Registration Number and Roll Number strictly adhere to the specification.
    """
    db = get_db()
    
    # Test slots A, B, C, D
    slots_to_test = ["A", "B", "C", "D"]
    created_ids = []

    try:
        for slot in slots_to_test:
            # Self-registration endpoint
            payload = {
                "full_name": f"Candidate Slot {slot} Test",
                "email": f"cand_{slot.lower()}_test_{slot}@example.com",
                "password": "Password123",
                "preferred_slot": slot,
                "category": "General",
                "gender": "Female",
            }
            res = client.post("/api/v1/auth/register-candidate", json=payload)
            assert res.status_code == 200, res.text
            data = res.json()
            assert data["status"] == "success"
            
            reg_no = data["registration_number"]
            roll_no = data["roll_number"]
            cid = data["candidate_id"]
            created_ids.append(cid)

            # Assert format SSE-{SLOT}-CBT-{SEQ:04d}
            expected_prefix = f"SSE-{slot}-CBT-"
            assert reg_no.startswith(expected_prefix), f"Reg no {reg_no} does not start with {expected_prefix}"
            assert roll_no.startswith(expected_prefix), f"Roll no {roll_no} does not start with {expected_prefix}"
            
            # Verify seq is 4 digits
            seq_part = reg_no[len(expected_prefix):]
            assert len(seq_part) == 4, f"Sequence part {seq_part} is not 4 digits"
            assert seq_part.isdigit(), f"Sequence part {seq_part} is not numeric"

            # Check that Admit Card reflects identical format
            from app.api.api_v1.endpoints.auth import generate_jwt_token
            token = generate_jwt_token(user_id=cid, email=payload["email"], role="candidate")
            admit_res = client.get(
                f"/api/v1/candidates/{cid}/admit-card",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert admit_res.status_code == 200
            admit_data = admit_res.json()
            assert admit_data["registration_number"] == reg_no
            assert admit_data["roll_number"] == roll_no
            assert admit_data["slot"] == f"Slot {slot}"
            assert f"SSE*2026*{roll_no}*{reg_no}" == admit_data["barcode_data"]

    finally:
        # Clean up created test candidates
        for cid in created_ids:
            try:
                db.table("candidates").delete().eq("id", cid).execute()
            except Exception:
                pass
