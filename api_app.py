import os
import sys

# CRITICAL: Vercel runs this from the repo root, so we add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SIMATS CBT Platform API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health")
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "SIMATS CBT Backend is running."}

# ------------------------------------------------------------------
# Candidate routes
# ------------------------------------------------------------------
from fastapi import APIRouter
import uuid

candidates_router = APIRouter()
MOCK_CANDIDATES: dict = {}

@candidates_router.get("/")
def list_candidates(x_tenant_id: str = "default"):
    tenant_data = MOCK_CANDIDATES.get(x_tenant_id, [])
    return tenant_data

@candidates_router.post("/")
def create_candidate(candidate: dict, x_tenant_id: str = "default"):
    if x_tenant_id not in MOCK_CANDIDATES:
        MOCK_CANDIDATES[x_tenant_id] = []
    # Generate register number
    slot = candidate.get("slot", "A").upper()
    seq = len(MOCK_CANDIDATES[x_tenant_id]) + 1
    reg_number = f"SSEC-{slot}-CBT-{seq:04d}"
    candidate["reg_number"] = reg_number
    candidate["id"] = str(uuid.uuid4())
    MOCK_CANDIDATES[x_tenant_id].append(candidate)
    return candidate

app.include_router(candidates_router, prefix="/api/v1/candidates")

# ------------------------------------------------------------------
# Exam routes
# ------------------------------------------------------------------
exams_router = APIRouter()
MOCK_EXAM_STATE: dict = {
    "EX-1001": {
        "time_remaining_seconds": 10800,
        "status": "active"
    }
}

@exams_router.get("/{exam_id}/session")
def get_session(exam_id: str):
    state = MOCK_EXAM_STATE.get(exam_id, {"time_remaining_seconds": 10800, "status": "active"})
    return state

@exams_router.post("/{exam_id}/responses")
def save_response(exam_id: str, response: dict):
    return {"status": "saved", "exam_id": exam_id}

@exams_router.post("/{exam_id}/submit")
def submit_exam(exam_id: str):
    return {"status": "submitted", "exam_id": exam_id, "score": 0}

app.include_router(exams_router, prefix="/api/v1/exams")
