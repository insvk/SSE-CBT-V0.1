# Audit & Gap Analysis Report (TCS iON JEE-Style Upgrade)

## PHASE 1: DISCOVERY (Feature-Preservation Map)
We audited the existing MCQ platform (PROJECT APEX OMEGA) currently located in the repository.

**Existing Working Features to Preserve:**
1. **Frontend Architecture**: Vite-based SPA with `index.html`, `exam.html`, `admin.html`, `scorecard.html`, and `question_bank.html`.
2. **Backend Architecture**: FastAPI backend structured under `backend/app/` with modular routing (`api/api_v1`).
3. **Database Schema**: Supabase PostgreSQL schemas for `tenants`, `users`, `candidates`, `question_bank`, `exams`, `exam_attempts`, and `responses` (with RLS enabled).
4. **Security Middleware**: `get_tenant_user` dependency in `security.py`.
5. **C Utilities**: Bulk parser in `c_utils/bulk_parser.c`.
6. **Core Design System**: CSS variables and JEE-style layout found in `style.css`.

## PHASE 2: GAP ANALYSIS
Comparing the existing platform against the "GOD MAXX MASTER PROMPT" requirements reveals the following gaps that need to be addressed in the integration:

### 1. Candidate Authentication & Instructions (Gap)
- **Current**: No login UI or pre-exam instruction screen.
- **Required**: Secure login, OTP workflows, candidate verification, system readiness checklist, and full-screen enforcement.

### 2. Frontend-Backend Persistence Integration (Gap)
- **Current**: `exam.ts` uses mock API calls (`console.log('Cloud API Call')`).
- **Required**: Real HTTP calls to the FastAPI backend to persist responses, handling network failures, debouncing, and offline queueing.

### 3. Examination Submission Workflow (Gap)
- **Current**: Simple "Submit" button click.
- **Required**: Pre-submission confirmation dialog summarizing counts (Answered, Unanswered, Marked for Review, etc.) and server-authoritative submission freezing.

### 4. Advanced Question Types & MathJax (Gap)
- **Current**: Basic text-based MCQs.
- **Required**: MathJax/LaTeX rendering, Numerical/Integer type questions, passage-based groups.

### 5. Exam Timer & Session Engine (Gap)
- **Current**: Frontend-only mock countdown timer (`setInterval`).
- **Required**: Server-authoritative timer. Frontend must sync with backend timestamps.

### 6. Automated Testing Suite Expansion (Gap)
- **Current**: Basic health-check tests in `test_main.py`.
- **Required**: Testing for timer enforcement, duplicate submission attempts, concurrent answer updates, and scoring validation.

## NEXT STEPS (Implementation Plan)
1. **API Integration**: Upgrade `exam.ts` to execute real `fetch()` calls to the FastAPI endpoint for saving answers securely.
2. **Backend Exam Controller**: Implement `POST /api/v1/exams/{id}/responses` with idempotency.
3. **Timer Sync**: Build the server-authoritative time endpoint.
4. **Pre-Submission Dialog**: Build the UI for the submission summary.
5. **Auth & Instructions**: Build the candidate login and rules confirmation screen.
