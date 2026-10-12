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
    roll_number: Optional[str] = None
    category: Optional[str] = "General"
    gender: Optional[str] = "Male"
    is_pwd: Optional[bool] = False
    has_scribe: Optional[bool] = False
    disability_type: Optional[str] = None
    compensatory_minutes: Optional[int] = 0
    assigned_terminal: Optional[str] = None


class CandidateResponse(BaseModel):
    id: str
    full_name: str
    registration_number: str
    roll_number: Optional[str] = None
    status: str = "active"
    batch: str = "A"
    email: Optional[str] = None
    password: Optional[str] = None
    tenant_id: Optional[str] = None
    # Enterprise Candidate Dossier & Biometrics
    category: Optional[str] = "General"
    gender: Optional[str] = "Male"
    is_pwd: Optional[bool] = False
    has_scribe: Optional[bool] = False
    disability_type: Optional[str] = None
    compensatory_minutes: Optional[int] = 0
    assigned_terminal: Optional[str] = None
    biometric_status: Optional[str] = "verified"
    biometric_score: Optional[float] = 98.4
    exam_status: Optional[str] = "assigned"
    debar_reason: Optional[str] = None
    ip_address: Optional[str] = "10.0.4.12"
    reporting_time_ist: Optional[str] = None
    slot_timing_ist: Optional[str] = None
    created_at_ist: Optional[str] = None
    photo_url: Optional[str] = None


class SlotReallocateRequest(BaseModel):
    slot: str  # "A", "B", "C", "D"
    reason: Optional[str] = "Administrative Slot Reallocation"


class AccommodationsUpdateRequest(BaseModel):
    is_pwd: bool
    has_scribe: bool = False
    disability_type: Optional[str] = None
    compensatory_minutes: int = 0


class DebarCandidateRequest(BaseModel):
    reason: str
    debarred_by: Optional[str] = "Examination Controller"


class BulkReallocateRequest(BaseModel):
    candidate_ids: List[str]
    slot: str
    reason: Optional[str] = "Bulk Shift Reallocation"


class EmergencyCredentialsResponse(BaseModel):
    status: str
    candidate_id: str
    registration_number: str
    roll_number: str
    temporary_pin: str
    generated_at_ist: str
    expires_at_ist: str


class AdmitCardStructure(BaseModel):
    institution_name: Optional[str] = "SSE CBT PLATFORM"
    examination_title: Optional[str] = "MCQ ASSESSMENT [ SSE CBT 2026 ]"
    header_subtitle: Optional[str] = "PROVISIONAL ADMIT CARD / HALL TICKET • COMPUTER BASED TEST (CBT)"
    watermark_text: Optional[str] = "CONFIDENTIAL"
    test_venue_name: Optional[str] = "SSE Digital Assessment Hub, Campus Block-A, Chennai - 602105"
    test_center_code: Optional[str] = "SSEC-TN-042"
    default_lab_room: Optional[str] = "LAB-01 (Block-A)"
    terminal_prefix: Optional[str] = "T-A-"
    controller_name: Optional[str] = "Prof. Dr. M. Shanmugam"
    controller_designation: Optional[str] = "Controller of Examinations"
    instructions_text: Optional[str] = "1. Government photo ID card mandatory for physical entrance.\n2. Electronic devices, smartwatches, and calculators strictly prohibited.\n3. Continuous webcam biometric tracking and screen proctoring active.\n4. Candidates must report at the allocated test center prior to gate closure."
    show_barcode: Optional[bool] = True
    show_photo: Optional[bool] = True
    show_biometric_badge: Optional[bool] = True
    show_slot_timings: Optional[bool] = True
    show_venue_details: Optional[bool] = True
    show_instructions: Optional[bool] = True
    show_signature_block: Optional[bool] = True


class ScorecardStructure(BaseModel):
    institution_name: Optional[str] = "SSE CBT PLATFORM"
    document_title: Optional[str] = "MCQ ASSESSMENT [ SSE CBT 2026 ] : Official Score Card"
    subhead_status_text: Optional[str] = "Status: Authenticated & Cloud Verified"
    controller_name: Optional[str] = "Prof. Dr. M. Shanmugam"
    controller_designation: Optional[str] = "Controller of Examinations"
    test_venue_name: Optional[str] = "SSE Digital Assessment Hub Node 01"
    footer_disclaimer: Optional[str] = "© 2026 Saveetha School of Engineering • CBT Examination Directorate. All rights reserved."
    show_score_banner: Optional[bool] = True
    show_percentage: Optional[bool] = True
    show_accuracy: Optional[bool] = True
    show_metrics_grid: Optional[bool] = True
    show_subject_breakdown: Optional[bool] = True
    show_question_review: Optional[bool] = True
    show_time_analytics: Optional[bool] = True
    show_signature_block: Optional[bool] = True
    show_seal: Optional[bool] = True


class AdmitCardResponse(BaseModel):
    status: str
    admit_card_number: str
    candidate_id: str
    full_name: str
    registration_number: str
    roll_number: str
    category: str
    gender: str
    slot: str
    slot_timing_ist: str
    reporting_time_ist: str
    gate_closure_ist: str
    test_center_name: str
    test_center_code: str
    lab_number: str
    assigned_terminal: str
    is_pwd: bool
    has_scribe: bool
    compensatory_minutes: int
    authorized_signature_title: str
    controller_name: Optional[str] = "Prof. Dr. M. Shanmugam"
    controller_designation: Optional[str] = "Controller of Examinations"
    institution_name: Optional[str] = "SSE CBT PLATFORM"
    examination_title: Optional[str] = "MCQ ASSESSMENT [ SSE CBT 2026 ]"
    generated_at_ist: str
    barcode_data: str
    watermark_text: Optional[str] = "CONFIDENTIAL"
    header_subtitle: Optional[str] = "PROVISIONAL ADMIT CARD / HALL TICKET • COMPUTER BASED TEST (CBT)"
    instructions_text: Optional[str] = None
    show_barcode: Optional[bool] = True
    show_photo: Optional[bool] = True
    show_biometric_badge: Optional[bool] = True
    show_slot_timings: Optional[bool] = True
    show_venue_details: Optional[bool] = True
    show_instructions: Optional[bool] = True
    show_signature_block: Optional[bool] = True


class ExamCenterSettings(BaseModel):
    institution_name: Optional[str] = "SSE CBT PLATFORM"
    examination_title: Optional[str] = "MCQ ASSESSMENT [ SSE CBT 2026 ]"
    controller_name: Optional[str] = "Prof. Dr. M. Shanmugam"
    controller_designation: Optional[str] = "Controller of Examinations"
    test_venue_name: Optional[str] = "SSE Digital Assessment Hub, Campus Block-A, Chennai - 602105"
    test_center_code: Optional[str] = "SSEC-TN-042"
    default_lab_room: Optional[str] = "LAB-01 (Block-A)"
    terminal_prefix: Optional[str] = "T-A-"
    admit_card: Optional[AdmitCardStructure] = None
    scorecard: Optional[ScorecardStructure] = None


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


class CandidateInterventionRequest(BaseModel):
    action: str  # "extend_time", "pause_session", "resume_session", "reseat_terminal", "direct_warning", "lock_terminal", "unlock_terminal"
    reg_no: Optional[str] = "ALL"
    extra_minutes: Optional[int] = 15
    reason: Optional[str] = None
    target_terminal: Optional[str] = None
    message: Optional[str] = None


class ExamPhaseAdvanceRequest(BaseModel):
    target_phase: str  # "staged", "admissions_open", "paper_decrypted", "active_concurrency", "concluded", "tabulated_sealed"
    authorizing_controller: Optional[str] = "Prof. M. Shanmugam (Chief Examination Controller)"
    notes: Optional[str] = "Phase transition authorized under National CBT Standard Operating Procedures."


class PaperDecryptionRequest(BaseModel):
    custody_key: str
    controller_id: Optional[str] = "admin@sse.cbt.in"


class AdmissionsCheckInRequest(BaseModel):
    registration_number: Optional[str] = None
    roll_number: Optional[str] = None
    biometric_match_score: Optional[float] = 98.6
    frisking_cleared: Optional[bool] = True
    metal_detector_status: Optional[str] = "CLEARED"
    assigned_terminal: Optional[str] = None
    invigilator_remarks: Optional[str] = "Biometrics Verified & Metal Detector Cleared"


class DisasterHoldRequest(BaseModel):
    reason: str = "Precautionary Hall Evacuation / Infrastructure Drill"
    freeze_all_timers: bool = True
    evacuation_protocol: Optional[str] = "Protocol 9-B (Standby at Assigned Nodes)"


class InfrastructureAuditResponse(BaseModel):
    status: str
    audit_id: str
    timestamp_ist: str
    ntp_source: str = "time.google.com"
    ntp_jitter_ms: float = 1.84
    ntp_offset_ms: float = 0.04
    nodes_total: int = 42
    nodes_online: int = 42
    nodes_health_score: float = 100.0
    cctv_channels_total: int = 16
    cctv_channels_online: int = 16
    ups_mains_voltage_v: float = 230.5
    ups_battery_charge_pct: float = 98.4
    generator_backup_ready: bool = True
    audit_certificate_sha256: str
    certified_by: str = "SSE CBT Technical Evaluation Directorate"


class ClosingReportResponse(BaseModel):
    status: str
    report_reference: str
    form_code: str = "FORM 24-B (OFFICIAL EXAMINATION CLOSING DOSSIER)"
    timestamp_ist: str
    center_code: str = "SSEC-TN-042"
    center_name: str = "SSE Digital Assessment Hub, Chennai"
    total_registered: int
    total_appeared: int
    total_absent: int
    total_debarred: int
    compensatory_minutes_granted: int
    average_score: float
    integrity_digest_sha256: str
    sealed_by: str = "Prof. M. Shanmugam"
    designation: str = "Chief Examination Controller"


class ExamCreateAdvanced(BaseModel):
    title: str
    exam_code: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: int = 180
    state: str = "scheduled"  # scheduled, active, paused, concluded
    start_time: Optional[str] = None      # ISO string e.g. "2026-10-15T09:00:00Z"
    end_time: Optional[str] = None        # ISO string e.g. "2026-10-15T12:00:00Z"
    start_time_ist: Optional[str] = None  # e.g. "11-Oct-2026 16:30:00 IST"
    end_time_ist: Optional[str] = None    # e.g. "11-Oct-2026 19:30:00 IST"
    auto_submit_on_expiry: bool = True
    question_ids: Optional[List[str]] = []
    correct_marks: float = 4.0
    negative_marks: float = 1.0
    ai_camera_enabled: Optional[bool] = True
    sections: Optional[Union[List[str], List[Dict[str, Any]]]] = None
    assigned_candidate_ids: Optional[List[str]] = []
    assigned_batches: Optional[List[str]] = []
    config: Optional[Dict[str, Any]] = None


class ExamUpdateAdvanced(BaseModel):
    title: Optional[str] = None
    exam_code: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    state: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    start_time_ist: Optional[str] = None
    end_time_ist: Optional[str] = None
    auto_submit_on_expiry: Optional[bool] = None
    question_ids: Optional[List[str]] = None
    correct_marks: Optional[float] = None
    negative_marks: Optional[float] = None
    ai_camera_enabled: Optional[bool] = None
    sections: Optional[Union[List[str], List[Dict[str, Any]]]] = None
    assigned_candidate_ids: Optional[List[str]] = None
    assigned_batches: Optional[List[str]] = None
    config: Optional[Dict[str, Any]] = None


class CandidateSelfRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    mobile: Optional[str] = None
    category: Optional[str] = "General"
    gender: Optional[str] = "Male"
    is_pwd: Optional[bool] = False
    has_scribe: Optional[bool] = False
    disability_type: Optional[str] = None
    preferred_slot: Optional[str] = "A"
    exam_id: Optional[str] = None


class CandidateSelfRegisterResponse(BaseModel):
    status: str
    message: str
    candidate_id: str
    full_name: str
    registration_number: str
    roll_number: str
    email: str
    assigned_exam_id: Optional[str] = None
    exam_title: Optional[str] = None
    access_token: str
    token_type: str = "bearer"
    redirect_url: str



