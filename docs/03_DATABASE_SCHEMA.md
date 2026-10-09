# Database Schema (Logical Baseline)

## Schema Overview
- Strict multi-tenancy utilizing `tenant_id` on almost all tables.
- Row Level Security (RLS) enforced across the board.

### Core Entities

**1. tenants**
- `id` (UUID) PK
- `name` (String)
- `domain` (String, unique)
- `created_at` (Timestamp)

**2. users (maps to auth.users)**
- `id` (UUID) PK
- `email` (String)
- `full_name` (String)
- `global_role` (Enum: super_admin, null)

**3. tenant_memberships**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `user_id` (UUID) FK -> users
- `role` (Enum: owner, admin, exam_controller, teacher, invigilator, candidate)

**4. candidates**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `user_id` (UUID) FK -> users
- `registration_number` (String)
- `metadata` (JSONB)

**5. question_bank**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `question_type` (Enum: mcq, numerical, descriptive)
- `content` (JSONB)
- `options` (JSONB)
- `correct_answer` (JSONB)
- `difficulty` (Enum)
- `subject` (String)
- `status` (Enum: draft, review, approved)
- `version` (Int)

**6. exams**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `title` (String)
- `state` (Enum: draft, approved, scheduled, active, completed, published)
- `start_time` (Timestamp)
- `end_time` (Timestamp)
- `duration_minutes` (Int)
- `config` (JSONB)

**7. exam_attempts**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `exam_id` (UUID) FK -> exams
- `candidate_id` (UUID) FK -> candidates
- `start_time` (Timestamp)
- `end_time` (Timestamp)
- `status` (Enum: active, submitted, invalidated)

**8. responses (Critical table)**
- `id` (UUID) PK
- `attempt_id` (UUID) FK -> exam_attempts
- `question_id` (UUID) FK -> question_bank
- `response_data` (JSONB)
- `status` (Enum: answered, marked_review, answered_marked_review)
- `updated_at` (Timestamp)

**9. audit_logs**
- `id` (UUID) PK
- `tenant_id` (UUID) FK -> tenants
- `user_id` (UUID) FK -> users
- `action` (String)
- `resource_type` (String)
- `resource_id` (UUID)
- `details` (JSONB)
- `created_at` (Timestamp)
