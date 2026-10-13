CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 4000),
  category text NOT NULL CHECK (category IN ('Web Development','Mobile Development','AI/ML','Data Science','Cybersecurity','IoT','Software Development','Game Development','UI/UX','Other')),
  team_size integer NOT NULL CHECK (team_size BETWEEN 1 AND 20),
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  duration text NOT NULL CHECK (char_length(duration) BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'Recruiting' CHECK (status IN ('Recruiting','Team Formed','In Progress','Completed')),
  image_path text,
  additional_info text CHECK (additional_info IS NULL OR char_length(additional_info) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_owner_idx ON public.projects(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update projects" ON public.projects FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete projects" ON public.projects FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.project_skills (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, skill_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_skills TO authenticated;
GRANT ALL ON public.project_skills TO service_role;
ALTER TABLE public.project_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can view project skills" ON public.project_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners add project skills" ON public.project_skills FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));
CREATE POLICY "Owners remove project skills" ON public.project_skills FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));