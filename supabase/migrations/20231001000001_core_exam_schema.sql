-- Migration: 00002_core_exam_schema.sql
-- Description: Schema for Candidates, Questions, Exams, and Responses

-- 4. Candidates
CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    registration_number TEXT NOT NULL,
    full_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, registration_number)
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- 5. Question Bank
CREATE TYPE question_type_enum AS ENUM ('mcq_single', 'mcq_multi', 'numerical', 'descriptive');
CREATE TYPE question_status_enum AS ENUM ('draft', 'review', 'approved', 'archived');

CREATE TABLE public.question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    type question_type_enum NOT NULL,
    content JSONB NOT NULL, -- The text, images, math formulas
    options JSONB, -- For MCQs
    correct_answer JSONB,
    difficulty TEXT,
    subject TEXT,
    status question_status_enum DEFAULT 'draft',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

-- 6. Exams (Blueprints and Scheduled)
CREATE TYPE exam_state_enum AS ENUM ('draft', 'approved', 'scheduled', 'active', 'completed', 'published');

CREATE TABLE public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    state exam_state_enum DEFAULT 'draft',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_minutes INT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb, -- sections, negative marking rules
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 7. Exam Attempts
CREATE TYPE attempt_status_enum AS ENUM ('assigned', 'active', 'submitted', 'invalidated');

CREATE TABLE public.exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status attempt_status_enum DEFAULT 'assigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(exam_id, candidate_id)
);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- 8. Responses (Critical table with idempotency support)
CREATE TYPE response_status_enum AS ENUM ('answered', 'marked_review', 'answered_marked_review', 'cleared');

CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.question_bank(id),
    response_data JSONB,
    status response_status_enum NOT NULL,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- 9. Audit Logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
