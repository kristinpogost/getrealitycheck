
-- People (relationship threads)
CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own people select" ON public.people FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own people insert" ON public.people FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own people update" ON public.people FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own people delete" ON public.people FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_people_user ON public.people(user_id, updated_at DESC);

-- Entries (analyses)
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'situation',
  user_input TEXT NOT NULL DEFAULT '',
  images JSONB,
  result JSONB NOT NULL,
  flag TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own entries select" ON public.entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own entries insert" ON public.entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own entries update" ON public.entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own entries delete" ON public.entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_entries_person ON public.entries(person_id, created_at ASC);
CREATE INDEX idx_entries_user ON public.entries(user_id, created_at DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER people_touch BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Bump person.updated_at when a new entry is added
CREATE OR REPLACE FUNCTION public.bump_person_on_entry()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.people SET updated_at = now() WHERE id = NEW.person_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER entries_bump_person AFTER INSERT ON public.entries
  FOR EACH ROW EXECUTE FUNCTION public.bump_person_on_entry();
