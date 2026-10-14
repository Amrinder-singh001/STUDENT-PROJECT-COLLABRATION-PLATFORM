CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can view project skills" ON public.project_skills FOR SELECT TO anon USING (true);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT ON public.project_skills TO anon;
GRANT SELECT ON public.skills TO anon;

CREATE OR REPLACE FUNCTION public.get_project_owners(_ids uuid[])
RETURNS TABLE(id uuid, full_name text, college text, course text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.college, p.course FROM public.profiles p
  WHERE p.id = ANY(_ids) AND EXISTS (SELECT 1 FROM public.projects pr WHERE pr.owner_id = p.id)
$$;
GRANT EXECUTE ON FUNCTION public.get_project_owners(uuid[]) TO anon, authenticated;

CREATE TABLE public.project_bookmarks (
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
GRANT SELECT, INSERT, DELETE ON public.project_bookmarks TO authenticated;
GRANT ALL ON public.project_bookmarks TO service_role;
ALTER TABLE public.project_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookmarks" ON public.project_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own bookmarks" ON public.project_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own bookmarks" ON public.project_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);