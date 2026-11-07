ALTER TABLE public.projects ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "Signed-in users can view projects" ON public.projects;
CREATE POLICY "Public can view visible projects" ON public.projects
  FOR SELECT TO anon USING (is_hidden = false);
CREATE POLICY "Students and admins can view available projects" ON public.projects
  FOR SELECT TO authenticated
  USING (is_hidden = false OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE UPDATE ON public.projects FROM authenticated;
GRANT UPDATE (owner_id, title, description, category, team_size, difficulty, duration, status, image_path, additional_info, updated_at) ON public.projects TO authenticated;

CREATE TABLE public.project_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('Spam', 'Fake project', 'Inappropriate content', 'Duplicate project', 'Other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT ON public.project_reports TO authenticated;
GRANT UPDATE (status, reviewed_at) ON public.project_reports TO authenticated;
GRANT ALL ON public.project_reports TO service_role;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view their own project reports" ON public.project_reports
  FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Students report projects as themselves" ON public.project_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Admins review project reports" ON public.project_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update project reports" ON public.project_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE UNIQUE INDEX project_reports_one_pending_per_reporter
  ON public.project_reports (project_id, reporter_id) WHERE status = 'Pending';
CREATE INDEX project_reports_status_created_at_idx
  ON public.project_reports (status, created_at DESC);