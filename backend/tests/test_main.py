from fastapi.testclient import TestClient
import sys
import os

# Add backend to path for tests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "SIMATS CBT Backend is running."}

def test_get_exams():
    response = client.get("/api/v1/exams/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_submit_exam():
    # Attempting to submit without auth should theoretically fail
    # but the mock router doesn't strictly have auth on the exam submit yet in the minimal setup
    response = client.post("/api/v1/exams/1/submit")
    assert response.status_code == 200
    assert response.json() == {"status": "success", "message": "Exam 1 submitted."}
