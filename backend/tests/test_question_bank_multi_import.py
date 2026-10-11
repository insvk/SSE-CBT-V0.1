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

import jwt
from app.core.config import settings

client = TestClient(app)

def get_auth_headers(role: str = "super_admin") -> dict:
    secret = settings.SUPABASE_JWT_SECRET or "super-secret-jwt-token-with-at-least-32-characters-long"
    token = jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000099",
            "role": role,
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


def test_download_templates():
    """Verify CSV and JSON question bank templates can be downloaded."""
    # CSV template
    csv_res = client.get("/api/v1/questions/template/csv")
    assert csv_res.status_code == 200
    assert "statement,opt_a,opt_b,opt_c,opt_d,correct_answer" in csv_res.text
    assert "question_bank_template.csv" in csv_res.headers.get("content-disposition", "")

    # JSON template
    json_res = client.get("/api/v1/questions/template/json")
    assert json_res.status_code == 200
    assert "question_bank_template.json" in json_res.headers.get("content-disposition", "")
    items = json_res.json()
    assert isinstance(items, list)
    assert len(items) >= 2
    assert "statement" in items[0]


def test_export_question_bank_csv():
    """Verify downloading live question bank export as CSV."""
    res = client.get("/api/v1/questions/export/csv", headers=get_auth_headers())
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "id,statement,opt_a,opt_b,opt_c,opt_d,correct_answer" in res.text


def test_nlp_paste_text_import_dry_run_and_commit():
    """Verify unstructured AI / text paste import parser."""
    raw_text = """
    1. Which element has the chemical symbol Fe?
    A) Fluorine
    B) Iron
    C) Francium
    D) Fermium
    Answer: B
    Subject: Chemistry
    Difficulty: Easy

    Q2. In classical mechanics, kinetic energy is expressed as:
    (A) 0.5 * m * v^2
    (B) m * g * h
    (C) F * d
    (D) m * v
    Ans: A
    Subject: Physics
    Difficulty: Medium
    """

    # 1. Dry run preview
    preview_res = client.post(
        "/api/v1/questions/import/paste-text",
        json={"text": raw_text, "default_subject": "General", "dry_run": True},
        headers=get_auth_headers(),
    )
    assert preview_res.status_code == 200
    preview = preview_res.json()
    assert preview["status"] == "preview"
    assert preview["valid_count"] == 2
    assert len(preview["questions"]) == 2
    assert "chemical symbol Fe" in preview["questions"][0]["statement"]
    assert preview["questions"][0]["correct_answer"] == "B"
    assert preview["questions"][1]["correct_answer"] == "A"

    # 2. Live commit
    commit_res = client.post(
        "/api/v1/questions/import/paste-text",
        json={"text": raw_text, "default_subject": "General", "dry_run": False},
        headers=get_auth_headers(),
    )
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["status"] == "success"
    assert commit_data["count"] >= 2

    # Cleanup created questions
    created_ids = [q["id"] for q in commit_data.get("questions", [])]
    for qid in created_ids:
        del_res = client.delete(f"/api/v1/questions/{qid}", headers=get_auth_headers())
        assert del_res.status_code == 200


def test_bulk_json_import():
    """Verify bulk JSON array import."""
    payload = {
        "questions": [
            {
                "statement": "What does HTTP stand for in networking?",
                "opt_a": "HyperText Transfer Protocol",
                "opt_b": "High Tech Transmission Program",
                "opt_c": "Hyper Transfer Text Path",
                "opt_d": "None of the above",
                "correct_answer": "A",
                "subject": "Computer Science",
                "difficulty": "Easy",
                "marks": 4.0
            }
        ]
    }
    res = client.post("/api/v1/questions/import/bulk", json=payload, headers=get_auth_headers())
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["count"] == 1
