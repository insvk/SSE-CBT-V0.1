-- Migration: 20231001000002_exam_attempts_scoring_columns.sql
-- Description: Add score and total_questions columns to exam_attempts, and establish comprehensive RLS policies

-- 1. Add score and total_questions columns to exam_attempts
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS total_questions INTEGER DEFAULT 0;

-- 2. RLS Policies for users table
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Super admins can manage all users"
    ON public.users FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.global_role IN ('super_admin', 'admin')
        )
    );

-- 3. RLS Policies for candidates table
CREATE POLICY "Candidates can view their own profile"
    ON public.candidates FOR SELECT
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = candidates.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller', 'invigilator')
        )
    );

-- 4. RLS Policies for exams table
CREATE POLICY "Candidates can view active/published exams"
    ON public.exams FOR SELECT
    USING (
        state IN ('active', 'published', 'scheduled') OR
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = exams.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller')
        )
    );

-- 5. RLS Policies for exam_attempts table
CREATE POLICY "Candidates can view their own exam attempts"
    ON public.exam_attempts FOR SELECT
    USING (
        candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = exam_attempts.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller', 'invigilator')
        )
    );

CREATE POLICY "Candidates can insert and update their own exam attempts"
    ON public.exam_attempts FOR INSERT
    WITH CHECK (
        candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = exam_attempts.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller')
        )
    );

CREATE POLICY "Candidates can update their own exam attempts"
    ON public.exam_attempts FOR UPDATE
    USING (
        candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = exam_attempts.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller')
        )
    );

-- 6. RLS Policies for responses table
CREATE POLICY "Candidates can view their own responses"
    ON public.responses FOR SELECT
    USING (
        attempt_id IN (
            SELECT ea.id FROM public.exam_attempts ea
            JOIN public.candidates c ON ea.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            JOIN public.tenant_memberships tm ON ea.tenant_id = tm.tenant_id
            WHERE ea.id = responses.attempt_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller', 'invigilator')
        )
    );

CREATE POLICY "Candidates can manage their own responses"
    ON public.responses FOR ALL
    USING (
        attempt_id IN (
            SELECT ea.id FROM public.exam_attempts ea
            JOIN public.candidates c ON ea.candidate_id = c.id
            WHERE c.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.exam_attempts ea
            JOIN public.tenant_memberships tm ON ea.tenant_id = tm.tenant_id
            WHERE ea.id = responses.attempt_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller')
        )
    );

-- 7. RLS Policies for question_bank table
CREATE POLICY "Admins and instructors can manage question bank"
    ON public.question_bank FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tenant_memberships tm
            WHERE tm.tenant_id = question_bank.tenant_id 
              AND tm.user_id = auth.uid() 
              AND tm.role IN ('owner', 'admin', 'exam_controller', 'teacher')
        )
    );
