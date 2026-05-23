-- Run this ONCE in Supabase: SQL Editor → New query → Paste → Run
-- Project: oypqvnjtpfrbjqxmncyf

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  age INT,
  gender TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, patient_id, name, age, gender)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'patient_id', 'P-' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'age','')::int,
    NEW.raw_user_meta_data->>'gender'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.bradykinesia_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tap_count INT NOT NULL,
  tapping_speed NUMERIC NOT NULL,
  reaction_time NUMERIC NOT NULL,
  missed_taps INT NOT NULL DEFAULT 0,
  tap_consistency NUMERIC NOT NULL,
  avg_interval NUMERIC NOT NULL,
  score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bradykinesia_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brady select" ON public.bradykinesia_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own brady insert" ON public.bradykinesia_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tremor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tremor_frequency NUMERIC NOT NULL,
  tremor_amplitude NUMERIC NOT NULL,
  motion_variability NUMERIC NOT NULL,
  samples INT NOT NULL,
  score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tremor_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tremor select" ON public.tremor_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tremor insert" ON public.tremor_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.rigidity_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_score NUMERIC NOT NULL,
  range_of_motion NUMERIC NOT NULL,
  smoothness NUMERIC NOT NULL,
  stiffness_score NUMERIC NOT NULL,
  score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rigidity_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rigid select" ON public.rigidity_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own rigid insert" ON public.rigidity_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.prediction_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bradykinesia_score NUMERIC,
  tremor_score NUMERIC,
  rigidity_score NUMERIC,
  composite_score NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prediction_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pred select" ON public.prediction_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own pred insert" ON public.prediction_data FOR INSERT WITH CHECK (auth.uid() = user_id);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
