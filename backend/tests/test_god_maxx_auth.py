import pytest
from fastapi.testclient import TestClient
from main import app
from app.core.config import settings
from app.core.tenant import DEFAULT_TENANT_ID

client = TestClient(app)


def test_god_maxx_admin_hardcoded_login():
    """
    Validates that the single authoritative God MAXX Super Admin account:
    admin@sse,cbt.in with password Admin@sse
    is strictly authenticated and issued unrestricted god_mode privileges.
    """
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@sse,cbt.in", "password": "Admin@sse"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "access_token" in data
    user = data["user"]
    assert user["email"] == "admin@sse,cbt.in"
    assert user["role"] == "super_admin"
    assert user["god_mode"] is True
    assert "*" in user["permissions"]

    token = data["access_token"]

    # Verify /api/v1/auth/me verifies God MAXX privileges
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["god_mode"] is True
    assert me_data["role"] == "super_admin"
    assert "GOD MAXX" in me_data["access_level"]


def test_god_maxx_rejects_wrong_password():
    """Validates that incorrect admin passwords or unauthorized accounts are rejected with 401."""
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@sse,cbt.in", "password": "WrongPassword123"},
    )
    assert res.status_code == 401


def test_god_maxx_create_and_authenticate_candidate_account():
    """
    Tests legitimate God MAXX account creation committed to Supabase,
    followed by direct candidate authentication using issued credentials.
    """
    # 1. Login as God MAXX Admin
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@sse,cbt.in", "password": "Admin@sse"},
    )
    admin_token = admin_login.json()["access_token"]

    # 2. God MAXX creates a legitimate candidate account with custom PIN
    candidate_name = "GodMaxx Test Candidate"
    custom_pin = "GodMaxx@99"
    create_payload = {
        "full_name": candidate_name,
        "role": "candidate",
        "batch_or_slot": "B",
        "initial_password": custom_pin,
        "email": "godmaxx_cand@ssecbt.in",
    }

    create_res = client.post(
        "/api/v1/auth/create-account",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=create_payload,
    )
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["status"] == "success"
    cand_info = created["account"]
    assert cand_info["full_name"] == candidate_name
    assert cand_info["password"] == custom_pin
    reg_number = cand_info["registration_number"]
    assert reg_number.startswith("SSEC-B-CBT-")

    # 3. Candidate logs in using issued Registration Number and PIN
    cand_login = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": reg_number, "password": custom_pin},
    )
    assert cand_login.status_code == 200
    cand_data = cand_login.json()
    assert cand_data["status"] == "success"
    assert cand_data["user"]["registration_number"] == reg_number
    assert cand_data["user"]["role"] == "candidate"
    assert cand_data["user"]["god_mode"] is False


def test_god_maxx_emergency_controls():
    """Validates God MAXX time extension and session lockout unlock."""
    # Extend time
    ext_res = client.post("/api/v1/exams/EX-1001/extend-time?extra_minutes=15")
    assert ext_res.status_code == 200
    assert ext_res.json()["status"] == "success"
    assert "Added +15 minutes" in ext_res.json()["message"]

    # Unlock sessions
    unlock_res = client.post("/api/v1/exams/EX-1001/unlock-sessions")
    assert unlock_res.status_code == 200
    assert unlock_res.json()["status"] == "success"
