CREATE TABLE public.project_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  motivation text NOT NULL,
  relevant_skills text NOT NULL,
  contribution text NOT NULL,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Accepted','Rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, applicant_id),
  CHECK (char_length(motivation) BETWEEN 10 AND 2000),
  CHECK (char_length(relevant_skills) BETWEEN 2 AND 500),
  CHECK (char_length(contribution) BETWEEN 10 AND 2000)
);
GRANT SELECT, INSERT ON public.project_applications TO authenticated;
GRANT ALL ON public.project_applications TO service_role;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'Other' CHECK (role IN ('Frontend Developer','Backend Developer','Database Developer','UI/UX Designer','Tester','Researcher','Other')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);
GRANT SELECT ON public.project_members TO anon, authenticated;
GRANT UPDATE (role), DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND owner_id = _user_id)
$$;

CREATE POLICY "Applicants view own applications" ON public.project_applications FOR SELECT TO authenticated
  USING (auth.uid() = applicant_id OR public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "Students apply for themselves" ON public.project_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_id AND status = 'Pending');

CREATE POLICY "Anyone can view team members" ON public.project_members FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners update member roles" ON public.project_members FOR UPDATE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid())) WITH CHECK (public.is_project_owner(project_id, auth.uid()));
CREATE POLICY "Owners remove members" ON public.project_members FOR DELETE TO authenticated
  USING (public.is_project_owner(project_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; cnt int;
BEGIN
  SELECT * INTO p FROM public.projects WHERE id = NEW.project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;
  IF p.owner_id = NEW.applicant_id THEN RAISE EXCEPTION 'You cannot apply to your own project'; END IF;
  SELECT count(*) INTO cnt FROM public.project_members WHERE project_id = NEW.project_id;
  IF cnt + 1 >= p.team_size THEN RAISE EXCEPTION 'This team is already full'; END IF;
  IF EXISTS (SELECT 1 FROM public.project_members WHERE project_id = NEW.project_id AND user_id = NEW.applicant_id) THEN
    RAISE EXCEPTION 'You are already on this team'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_application BEFORE INSERT ON public.project_applications
  FOR EACH ROW EXECUTE FUNCTION public.validate_application();

CREATE OR REPLACE FUNCTION public.decide_application(_application_id uuid, _accept boolean, _role text DEFAULT 'Other')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; p record; cnt int;
BEGIN
  SELECT * INTO a FROM public.project_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  SELECT * INTO p FROM public.projects WHERE id = a.project_id FOR UPDATE;
  IF p.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the project owner can do this'; END IF;
  IF a.status <> 'Pending' THEN RAISE EXCEPTION 'This application was already decided'; END IF;
  IF _accept THEN
    SELECT count(*) INTO cnt FROM public.project_members WHERE project_id = a.project_id;
    IF cnt + 1 >= p.team_size THEN RAISE EXCEPTION 'The team is already full'; END IF;
    INSERT INTO public.project_members(project_id, user_id, role) VALUES (a.project_id, a.applicant_id, _role);
    UPDATE public.project_applications SET status = 'Accepted', updated_at = now() WHERE id = a.id;
  ELSE
    UPDATE public.project_applications SET status = 'Rejected', updated_at = now() WHERE id = a.id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.decide_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_application(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_applicants(_project_id uuid)
RETURNS TABLE(id uuid, applicant_id uuid, motivation text, relevant_skills text, contribution text, status text, created_at timestamptz,
  full_name text, course text, semester text, college text, bio text, github_url text, portfolio_url text, skills text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.applicant_id, a.motivation, a.relevant_skills, a.contribution, a.status, a.created_at,
    pr.full_name, pr.course, pr.semester, pr.college, pr.bio, pr.github_url, pr.portfolio_url,
    COALESCE((SELECT array_agg(s.name ORDER BY s.name) FROM public.student_skills ss JOIN public.skills s ON s.id = ss.skill_id WHERE ss.user_id = a.applicant_id), '{}')
  FROM public.project_applications a LEFT JOIN public.profiles pr ON pr.id = a.applicant_id
  WHERE a.project_id = _project_id AND public.is_project_owner(_project_id, auth.uid())
  ORDER BY a.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.get_project_applicants(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_project_applicants(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_project_team(_project_id uuid)
RETURNS TABLE(user_id uuid, full_name text, course text, college text, role text, joined_at timestamptz, is_owner boolean, skills text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.uid, pr.full_name, pr.course, pr.college, x.role, x.joined, x.is_owner,
    COALESCE((SELECT array_agg(s.name ORDER BY s.name) FROM public.student_skills ss JOIN public.skills s ON s.id = ss.skill_id WHERE ss.user_id = x.uid), '{}')
  FROM (
    SELECT p.owner_id AS uid, 'Project Owner'::text AS role, p.created_at AS joined, true AS is_owner FROM public.projects p WHERE p.id = _project_id
    UNION ALL
    SELECT m.user_id, m.role, m.joined_at, false FROM public.project_members m WHERE m.project_id = _project_id
  ) x LEFT JOIN public.profiles pr ON pr.id = x.uid
  ORDER BY x.is_owner DESC, x.joined
$$;
GRANT EXECUTE ON FUNCTION public.get_project_team(uuid) TO anon, authenticated;