DROP POLICY IF EXISTS "Students report projects as themselves" ON public.project_reports;
CREATE POLICY "Students report visible projects as themselves" ON public.project_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'Pending'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_reports.project_id AND p.is_hidden = false
    )
  );