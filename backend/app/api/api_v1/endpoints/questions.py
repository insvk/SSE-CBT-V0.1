from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.core.security import get_tenant_user
import uuid
import csv
import json
import io

router = APIRouter()

class QuestionImportReport(BaseModel):
    job_id: str
    total_detected: int
    valid_count: int
    invalid_count: int
    errors: List[Dict[str, Any]]
    ready_to_import: bool

# Temporary staging area for DRY-RUN imports (Memory for v0.1)
STAGED_IMPORTS = {}
MOCK_QUESTION_BANK = {}

def validate_question_row(row: dict, index: int) -> tuple[bool, str]:
    """Validates a single question row strictly based on CBT rules."""
    required = ["statement", "opt_a", "opt_b", "opt_c", "opt_d", "correct_answer", "marks"]
    for req in required:
        if req not in row or not row[req].strip():
            return False, f"Row {index}: Missing required field '{req}'"
    
    ans = row["correct_answer"].strip().upper()
    if ans not in ["A", "B", "C", "D"]:
        return False, f"Row {index}: correct_answer must be A, B, C, or D"
        
    try:
        float(row["marks"])
    except ValueError:
        return False, f"Row {index}: marks must be a number"
        
    return True, ""

@router.post("/import/dry-run", response_model=QuestionImportReport)
async def dry_run_import(
    file: UploadFile = File(...),
    format: str = Form(...),
    user_context: dict = Depends(get_tenant_user)
):
    """
    UNIVERSAL BULK QUESTION IMPORT - DRY RUN
    Validates CSV or JSON files strictly without committing them to the live bank.
    """
    tid = user_context["tenant_id"]
    contents = await file.read()
    
    parsed_rows = []
    errors = []
    
    if format.lower() == "csv":
        try:
            text = contents.decode("utf-8")
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                parsed_rows.append(row)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"CSV Parsing Error: {str(e)}")
            
    elif format.lower() == "json":
        try:
            parsed_rows = json.loads(contents)
            if not isinstance(parsed_rows, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of objects")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"JSON Parsing Error: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'csv' or 'json'")

    valid_count = 0
    staged_questions = []

    for i, row in enumerate(parsed_rows, start=1):
        is_valid, err_msg = validate_question_row(row, i)
        if is_valid:
            valid_count += 1
            staged_questions.append({
                "id": str(uuid.uuid4()),
                "data": row
            })
        else:
            errors.append({"row": i, "message": err_msg, "raw_data": row})
            
    job_id = f"job-{uuid.uuid4()}"
    STAGED_IMPORTS[job_id] = {
        "tenant_id": tid,
        "questions": staged_questions,
        "ready": len(errors) == 0
    }
    
    return {
        "job_id": job_id,
        "total_detected": len(parsed_rows),
        "valid_count": valid_count,
        "invalid_count": len(errors),
        "errors": errors,
        "ready_to_import": len(errors) == 0
    }

@router.post("/import/commit/{job_id}")
def commit_import(job_id: str, user_context: dict = Depends(get_tenant_user)):
    """Commits a successfully validated dry-run job into the live question bank."""
    tid = user_context["tenant_id"]
    
    if job_id not in STAGED_IMPORTS:
        raise HTTPException(status_code=404, detail="Import job not found or expired")
        
    job = STAGED_IMPORTS[job_id]
    if job["tenant_id"] != tid:
        raise HTTPException(status_code=403, detail="Unauthorized job access")
        
    if tid not in MOCK_QUESTION_BANK:
        MOCK_QUESTION_BANK[tid] = []
        
    # Commit
    MOCK_QUESTION_BANK[tid].extend(job["questions"])
    del STAGED_IMPORTS[job_id] # Cleanup
    
    return {"status": "success", "message": f"Successfully imported {len(job['questions'])} questions"}

@router.get("/")
def get_question_bank(user_context: dict = Depends(get_tenant_user)):
    tid = user_context["tenant_id"]
    return MOCK_QUESTION_BANK.get(tid, [])
