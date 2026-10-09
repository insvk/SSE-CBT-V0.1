# GOD MAXX MASTER PROMPT — ENTERPRISE ACCOUNT & CANDIDATE MANAGEMENT SYSTEM

MASTER ENGINEERING PROMPT: SECURE MULTI-TENANT CRUD & CANDIDATE ORCHESTRATION

## 1. ROLE AND MISSION
Act as a Principal Software Architect, Senior Full-Stack Engineer, Security Engineer, and Database Architect. 

Build a complete, enterprise-grade **Account Management and Candidate Management System** for the existing CBT platform. This system must handle strict multi-tenant isolation, Role-Based Access Control (RBAC), bulk candidate operations, and secure API boundaries.

**CRITICAL REQUIREMENTS:**
* Audit the existing Supabase schema and FastAPI backend before making changes.
* Preserve all existing examination features and Row-Level Security (RLS) policies.
* Do not deliver a static UI mockup. Every table, form, modal, and button must execute real API calls and persist data to PostgreSQL.
* All data access must be strictly scoped to the active `tenant_id`. Cross-tenant data leakage is a critical security failure.

## 2. TENANT & INSTITUTION MANAGEMENT (SUPER ADMIN ONLY)
Build the foundational SaaS layer for onboarding and managing institutions.
* **Create Tenant**: Onboard a new institution (Name, Domain, Quotas, Subscription Status).
* **Read Tenant**: Paginated list of all tenants with active candidate counts.
* **Update Tenant**: Modify quotas, branding (logo/colors), and active status.
* **Deactivate/Archive Tenant**: Soft-delete or suspend a tenant, instantly blocking all their staff and candidates from accessing the system.
* **Tenant Switching**: Allow Super Admins to securely assume a tenant context for support purposes.

## 3. STAFF & RBAC MANAGEMENT
Build the administrative workforce management layer.
* **Roles**: Owner, Admin, Exam Controller, Teacher, Invigilator, Auditor.
* **Invite Staff**: Send secure email invitations (or mock email generation in dev) to join a specific tenant with a specific role.
* **Manage Staff**: List, search, and filter staff by role or active status.
* **Edit Permissions**: Upgrade or downgrade staff roles (e.g., Teacher to Exam Controller).
* **Revoke Access**: Instantly suspend a staff member's access.
* **Audit Trail**: Every staff creation or role change must be securely logged in the `audit_logs` table.

## 4. CANDIDATE MANAGEMENT SYSTEM (THE CORE)
Build an uncompromising, highly scalable candidate orchestration UI and API.

### A. Candidate CRUD
* **Create**: Single candidate registration form (Full Name, Reg Number, DOB, Email, Assigned Batch).
* **Read**: High-performance data table. Must include server-side pagination, sorting, and debounced search by Name/Reg Number.
* **Update**: Edit candidate details and reset passwords.
* **Delete/Deactivate**: Soft-delete candidates or suspend them for malpractice.

### B. Bulk Operations (Performance Critical)
* **CSV Bulk Import**: Implement a secure CSV upload interface. The backend must parse, validate (checking for duplicate Reg Numbers), and insert thousands of candidates efficiently.
* **Bulk Assignment**: Select multiple candidates (via checkboxes) and assign them to a specific Exam or Batch in one atomic transaction.
* **Export**: Export filtered candidate lists and their exam statuses to CSV/Excel.

### C. Candidate Verification Workflow
* **Profile Management**: Upload candidate photos and signatures to Supabase Storage.
* **Eligibility Dashboard**: View a candidate's complete history—exams assigned, attempts utilized, active suspensions, and total scores.

## 5. API ARCHITECTURE & SECURITY
* **Middleware**: Every API route must utilize the `get_tenant_user` FastAPI dependency.
* **Validation**: Use Pydantic schemas strictly. Reject any payload containing unauthorized fields.
* **RLS Policies**: Verify that the Supabase `candidates` and `tenant_memberships` tables have bulletproof RLS preventing Tenant A from viewing Tenant B's candidates.
* **Idempotency**: Bulk operations must be idempotent and safe to retry on network failure.

## 6. FRONTEND IMPLEMENTATION (ADMIN DASHBOARD)
Create a professional, responsive React/Vue/Vanilla JS interface (matching the existing tech stack).
* **Layout**: Expand the existing Admin Sidebar to include `Institutions`, `Staff`, and `Candidates`.
* **Data Tables**: Use a professional table design with sticky headers, loading skeletons, and empty states.
* **Modals**: Use accessible modals for Create/Edit forms and destructive actions (e.g., "Are you sure you want to suspend this candidate?").
* **Notifications**: Use toast notifications (Success/Error) linked directly to API HTTP response codes.

## 7. FINAL DELIVERABLES
* Fully functional `candidates.py` and `tenants.py` FastAPI routers.
* Integrated Supabase Storage buckets for candidate media.
* Updated `admin.html` and corresponding JavaScript controllers for the Data Tables and Modals.
* Real-world bulk import CSV template and parsing logic.
* Updated API documentation for the new CRUD endpoints.

FINAL COMMAND:
Begin by analyzing the current `tenant_memberships` and `candidates` tables. Then, incrementally build the backend API, securing every route. Finally, build the frontend administrative screens, linking every button to the live database. Do not stop until I can successfully bulk-import 1,000 candidates and assign them to an exam via the UI.
