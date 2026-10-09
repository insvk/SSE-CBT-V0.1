from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime


class TenantCreate(BaseModel):
    name: str
    domain: str


class TenantResponse(BaseModel):
    id: str
    name: str
    domain: str
    status: str = "active"
    candidate_count: int = 0


class CandidateCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    batch: str = "A"  # Slot / Batch (A, B, C, D)
    password: Optional[str] = "12345678"
    registration_number: Optional[str] = None


class CandidateResponse(BaseModel):
    id: str
    full_name: str
    registration_number: str
    status: str = "active"
    batch: str = "A"
    email: Optional[str] = None
    password: Optional[str] = None
    tenant_id: Optional[str] = None


class BulkAssignRequest(BaseModel):
    candidate_ids: List[str]
    exam_id: str


class QuestionOption(BaseModel):
    id: str
    text: str


class QuestionContent(BaseModel):
    statement: str
    images: Optional[List[str]] = []


class QuestionCreate(BaseModel):
    statement: str
    opt_a: Optional[str] = None
    opt_b: Optional[str] = None
    opt_c: Optional[str] = None
    opt_d: Optional[str] = None
    correct_answer: str
    marks: float = 4.0
    negative_marks: float = 1.0
    subject: str = "General"
    difficulty: str = "Medium"
    question_type: str = "mcq_single"


class QuestionResponse(BaseModel):
    id: str
    statement: str
    options: List[str] = []
    correct_answer: Optional[str] = None
    subject: str = "General"
    difficulty: str = "Medium"
    type: str = "mcq_single"
    status: str = "draft"
    marks: float = 4.0


class ExamCreate(BaseModel):
    title: str
    duration_minutes: int = 180
    state: str = "active"
    config: Optional[Dict[str, Any]] = None


class ExamResponse(BaseModel):
    id: str
    title: str
    state: str = "active"
    duration_minutes: int = 180
    config: Optional[Dict[str, Any]] = None


class ExamSessionResponse(BaseModel):
    exam_id: str
    status: str
    server_time: float
    time_remaining_seconds: int
    duration_minutes: int = 180


class ResponsePayload(BaseModel):
    question_id: str
    answer: Optional[Union[int, str, List[Any], float]] = None
    state: Optional[Union[int, str]] = 0
    idempotency_key: str
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    section: Optional[str] = None


class ResponseAck(BaseModel):
    status: str
    saved: bool
    cloud_synced: bool = True
    question_id: Optional[str] = None
    message: Optional[str] = None


class ExamSubmitResponse(BaseModel):
    status: str
    message: str
    reference: str
    score: Optional[float] = None
    total_questions: Optional[int] = None
    attempt_id: Optional[str] = None
