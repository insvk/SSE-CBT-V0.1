# Security Model

## 1. Authentication
- All access (except public landing pages) requires a valid Supabase Auth JWT.
- JWTs are short-lived.
- Passwords are never handled by our backend directly; Supabase handles secure hashing and storage.

## 2. Authorization (Backend & Database)
- **Database Row Level Security (RLS)**: Every query to Supabase from the frontend goes through RLS policies filtering by `tenant_id` and the user's role mapped via JWT claims or `tenant_memberships` lookups.
- **Backend API**: The FastAPI backend acts as a trusted client. It validates the user's token, extracts their identity, and enforces business logic (e.g., "Is this candidate allowed to submit an answer for this exam right now?").
- **Strict Tenant Isolation**: Cross-tenant data access is strictly forbidden at the RLS level.

## 3. Exam Integrity
- **Authoritative Timing**: Time remaining is calculated server-side. The client just displays a synchronized clock.
- **Idempotency**: Answer submissions use idempotency keys/versioning to prevent duplicate saves or race conditions.
- **State Machine Enforcement**: An exam attempt can only transition states in a defined order (active -> submitted). Once submitted, no further response saves are permitted.

## 4. Threat Modeling Mitigations
- **Broken Access Control**: Enforced via RLS and backend middleware.
- **SQL Injection**: Handled by Supabase's PostgREST and parameterized FastAPI queries (SQLAlchemy / raw asyncpg with parameters).
- **CSRF / XSS**: Modern JS frameworks / Vanilla JS textContent prevents XSS. APIs use Bearer tokens mitigating standard CSRF.
