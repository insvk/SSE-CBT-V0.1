# PROJECT APEX OMEGA — MAXX-LEVEL DEFECT REGISTER & AUDIT

## CURRENT STACK & HOSTING CONSTRAINTS
- **Frontend**: HTML5, CSS3, Vanilla TypeScript/JS, Vite (Serverless deployment compatible).
- **Backend**: Python 3, FastAPI, Uvicorn.
- **Database**: PostgreSQL (Supabase) with RLS schemas defined.
- **Constraints**: Currently operating with in-memory mock data dictionaries in FastAPI (`MOCK_TENANTS`, `MOCK_CANDIDATES`, `mock_exam_state`) because the Supabase Python Client SDK is not fully wired to the endpoints. Vercel deployment has 10s execution limits for serverless functions.

## DEFECT REGISTER (PHASE 1 AUDIT)

| ID | Severity | Module | Description | Root Cause | Proposed Fix |
|---|---|---|---|---|---|
| DEF-01 | CRITICAL | Backend APIs | Mock Data Persistence | FastAPI routes use in-memory dicts. Data wipes on server restart. | Wire Supabase Python Client to all CRUD endpoints. |
| DEF-02 | CRITICAL | Security | Mock Auth Tokens | `get_tenant_user` dependency accepts mock tokens and hardcodes `tenant-1`. | Implement real JWT verification against Supabase Auth. |
| DEF-03 | HIGH | Exam Engine | Single Exam Mock | `exams.py` hardcodes `EX-1001` state. | Create generic `exams` table CRUD and session state tracking. |
| DEF-04 | HIGH | Question Bank | Missing Universal Import | C bulk parser is too basic and hard to integrate with Python API. | Build a robust Python-based Question Import Engine supporting CSV, JSON, and DRY RUN validations. |
| DEF-05 | MEDIUM | Exam UI | Browser Tab Duplication | No duplicate session detection in `exam.ts`. | Add session tokens and heartbeat logic to prevent dual-tab exams. |

## MAXX-LEVEL IMPLEMENTATION PLAN

### Phase 2: Critical Repairs (In Progress)
- Wire up the actual Supabase DB client to the FastAPI routes to remove all mock data.
- Enforce strict JWT-based tenant isolation.

### Phase 3: Universal Bulk Question Import Foundation
- Create `questions.py` API.
- Implement the "Dry-Run" import validation workflow.
- Support CSV and JSON upload adapters with explicit schema mapping.

### Phase 4: Advanced Question Management UI
- Create `question_bank.html` and `question_bank.ts`.
- Implement the "Import Centre" dashboard with conflict resolution and validation error displays.
