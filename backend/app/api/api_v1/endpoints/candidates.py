from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.core.security import get_tenant_user
import uuid

router = APIRouter()

class CandidateCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    batch: str  # Batch represents the SLOT (A, B, C, D)

class CandidateResponse(BaseModel):
    id: str
    full_name: str
    registration_number: str
    status: str
    batch: str

# Mock Database isolated by tenant
MOCK_CANDIDATES = {
    "tenant-1": [
        {"id": "cand-1", "full_name": "Jane Doe", "registration_number": "SSEC-A-CBT-0001", "status": "active", "batch": "A"},
        {"id": "cand-2", "full_name": "John Smith", "registration_number": "SSEC-B-CBT-0001", "status": "active", "batch": "B"}
    ]
}

def generate_registration_number(tenant_candidates: list, slot: str) -> str:
    """
    Generates a format like: SSEC-{SLOT}-CBT-{SEQUENCE}
    Example: SSEC-A-CBT-0001
    """
    # Filter candidates in the same slot
    slot_candidates = [c for c in tenant_candidates if c.get("batch") == slot]
    next_seq = len(slot_candidates) + 1
    # Pad sequence to 4 digits
    return f"SSEC-{slot.upper()}-CBT-{next_seq:04d}"

@router.get("/", response_model=List[CandidateResponse])
def get_candidates(user_context: dict = Depends(get_tenant_user)):
    tid = user_context["tenant_id"]
    return MOCK_CANDIDATES.get(tid, [])

@router.post("/", response_model=CandidateResponse)
def create_candidate(cand: CandidateCreate, user_context: dict = Depends(get_tenant_user)):
    tid = user_context["tenant_id"]
    
    if tid not in MOCK_CANDIDATES:
        MOCK_CANDIDATES[tid] = []
        
    # Auto-generate registration number
    reg_number = generate_registration_number(MOCK_CANDIDATES[tid], cand.batch)
            
    new_cand = {
        "id": f"cand-{str(uuid.uuid4())[:8]}",
        "full_name": cand.full_name,
        "registration_number": reg_number,
        "status": "active",
        "batch": cand.batch.upper()
    }
    MOCK_CANDIDATES[tid].append(new_cand)
    return new_cand

@router.post("/bulk-import")
async def bulk_import_candidates(
    file: UploadFile = File(...), 
    user_context: dict = Depends(get_tenant_user)
):
    """
    Parses a CSV upload and bulk inserts candidates.
    CSV Format expected: FullName, Slot (e.g., A, B, C, D)
    Registration number is auto-assigned based on the Slot sequence.
    """
    tid = user_context["tenant_id"]
    if tid not in MOCK_CANDIDATES:
        MOCK_CANDIDATES[tid] = []
        
    contents = await file.read()
    lines = contents.decode("utf-8").splitlines()
    
    success_count = 0
    # Basic parse (FullName, Slot)
    for line in lines[1:]: # Skip header
        parts = line.split(",")
        if len(parts) >= 2:
            full_name = parts[0].strip()
            slot = parts[1].strip().upper()
            
            if not slot:
                slot = "A" # Default fallback
                
            reg_number = generate_registration_number(MOCK_CANDIDATES[tid], slot)
            
            MOCK_CANDIDATES[tid].append({
                "id": f"cand-{str(uuid.uuid4())[:8]}",
                "full_name": full_name,
                "registration_number": reg_number,
                "status": "active",
                "batch": slot
            })
            success_count += 1
            
    return {"status": "success", "imported": success_count}

@router.post("/bulk-assign")
def bulk_assign(
    candidate_ids: List[str], 
    exam_id: str, 
    user_context: dict = Depends(get_tenant_user)
):
    """Assigns multiple candidates to an exam."""
    return {"status": "success", "message": f"Assigned {len(candidate_ids)} candidates to exam {exam_id}"}

@router.delete("/{candidate_id}")
def suspend_candidate(candidate_id: str, user_context: dict = Depends(get_tenant_user)):
    tid = user_context["tenant_id"]
    for c in MOCK_CANDIDATES.get(tid, []):
        if c["id"] == candidate_id:
            c["status"] = "suspended"
            return {"status": "success", "message": "Candidate suspended"}
    raise HTTPException(status_code=404, detail="Candidate not found")
