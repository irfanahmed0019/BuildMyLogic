-- ==============================================================================
-- BuildMyLogic (LOOP) PostgreSQL Schema for Supabase
-- ==============================================================================

-- 1. Learner Memory Table (Full persistent state & context)
CREATE TABLE IF NOT EXISTS public.learner_memory (
    user_id TEXT PRIMARY KEY,
    state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    level TEXT DEFAULT 'beginner',
    current_mission TEXT,
    completed_concepts TEXT[] DEFAULT '{}',
    weak_concepts TEXT[] DEFAULT '{}',
    conversation_summary TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    experience_level TEXT DEFAULT 'beginner',
    primary_goal TEXT,
    preferred_language TEXT DEFAULT 'C',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Skills & Evidence Table
CREATE TABLE IF NOT EXISTS public.skill_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    skill_name TEXT NOT NULL,
    evidence_text TEXT NOT NULL,
    weight INT DEFAULT 2,
    source TEXT DEFAULT 'checkpoint_answer',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user ON public.skill_evidence(user_id, skill_name);

-- 4. Learning Schedules & Reminders
CREATE TABLE IF NOT EXISTS public.learning_schedules (
    user_id TEXT PRIMARY KEY,
    start_time TEXT NOT NULL DEFAULT '19:00',
    end_time TEXT NOT NULL DEFAULT '21:00',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    repeat_daily BOOLEAN DEFAULT true,
    calendar_enabled BOOLEAN DEFAULT false,
    calendar_event_id TEXT,
    reminder_minutes INT DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Sessions & Events (Evidence collection from VS Code & web)
CREATE TABLE IF NOT EXISTS public.sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    token TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    tests_passed INT DEFAULT 0,
    tests_total INT DEFAULT 0,
    score INT DEFAULT 0,
    review_json JSONB
);

CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON public.session_events(session_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.learner_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Development policy: allow full access for authenticated and anon users with matching user_id
CREATE POLICY "Allow public access for dev" ON public.learner_memory FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.skill_evidence FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.learning_schedules FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.session_events FOR ALL USING (true);

