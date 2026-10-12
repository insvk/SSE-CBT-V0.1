import os
import sys
import pytest

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.db import get_db
from app.core.tenant import DEFAULT_TENANT_ID

TEST_EXAM_ID = "00000000-0000-0000-0000-000000000101"

@pytest.fixture(scope="session", autouse=True)
def setup_test_exam_environment():
    """Session-scoped fixture providing test exam isolation for automated tests."""
    db = get_db()
    
    # 1. Ensure test exam exists for test run
    exam_payload = {
        "id": TEST_EXAM_ID,
        "tenant_id": DEFAULT_TENANT_ID,
        "title": "SSE CBT NATIONAL ASSESSMENT EXAMINATION (SHIFT-1)",
        "duration_minutes": 180,
        "state": "active",
        "config": {
            "exam_code": "AIMT-2026-M1",
            "correct_marks": 4,
            "negative_marks": 1,
            "ai_camera_enabled": True,
            "sections": [
                {"name": "MATH-1", "enabled": True},
                {"name": "MATH-2", "enabled": True},
                {"name": "PHYSICS", "enabled": True},
                {"name": "CHEMISTRY", "enabled": True}
            ],
            "test_venue_name": "Saveetha Engineering College, Chennai - 602105",
            "test_center_code": "TN-CHE-001",
            "default_lab_room": "Lab 4",
            "terminal_prefix": "NODE-L4-C",
            "slot_batch": "Shift 1"
        }
    }
    
    try:
        db.table("exams").upsert(exam_payload).execute()
    except Exception as e:
        print(f"[Warning] Failed to insert test exam fixture: {e}")

    yield

    # 2. Teardown: Clean up test fixtures created specifically for test run
    try:
        db.table("exam_attempts").delete().eq("exam_id", TEST_EXAM_ID).execute()
    except Exception:
        pass
    try:
        db.table("exams").delete().eq("id", TEST_EXAM_ID).execute()
    except Exception:
        pass
    try:
        db.table("candidates").delete().like("full_name", "TEST%").execute()
        db.table("candidates").delete().like("full_name", "Candidate%").execute()
        db.table("candidates").delete().eq("full_name", "Scorecard Test Candidate").execute()
    except Exception:
        pass

