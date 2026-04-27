-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tags" ON public.tags
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tags" ON public.tags
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tags" ON public.tags
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tags" ON public.tags
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('timer','stopwatch')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  target_seconds INTEGER,
  pause_events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX sessions_user_start_idx ON public.sessions (user_id, start_time DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Session-Tag join
CREATE TABLE public.session_tags (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, tag_id)
);

ALTER TABLE public.session_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own session_tags" ON public.session_tags
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users insert own session_tags" ON public.session_tags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );
CREATE POLICY "Users delete own session_tags" ON public.session_tags
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

CREATE INDEX session_tags_tag_idx ON public.session_tags (tag_id);