CREATE TABLE public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  deadline date,
  status text NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do','In Progress','Completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX project_tasks_project_idx ON public.project_tasks (project_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_tasks TO authenticated;
GRANT ALL ON public.project_tasks TO service_role;

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project_id AND p.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = _project_id AND m.user_id = _user_id
  )
$$;

CREATE POLICY "Project team can view tasks"
ON public.project_tasks
FOR SELECT
TO authenticated
USING (is_project_member(project_id, auth.uid()) OR assignee_id = auth.uid());

CREATE POLICY "Owners create tasks"
ON public.project_tasks
FOR INSERT
TO authenticated
WITH CHECK (is_project_owner(project_id, auth.uid()));

CREATE POLICY "Owners and assignees update tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (is_project_owner(project_id, auth.uid()) OR assignee_id = auth.uid())
WITH CHECK (is_project_owner(project_id, auth.uid()) OR assignee_id = auth.uid());

CREATE POLICY "Owners delete tasks"
ON public.project_tasks
FOR DELETE
TO authenticated
USING (is_project_owner(project_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_task_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_project_owner(NEW.project_id, auth.uid()) THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.assignee_id IS DISTINCT FROM OLD.assignee_id
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.deadline IS DISTINCT FROM OLD.deadline
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
    THEN
      RAISE EXCEPTION 'Only the project owner can change task details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_tasks_scope
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.enforce_task_update_scope();

CREATE TRIGGER project_tasks_updated_at
BEFORE UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.get_project_task_stats(_ids uuid[])
RETURNS TABLE(_project_id uuid, _total bigint, _completed bigint, _active bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.project_id,
         count(*)::bigint,
         count(*) FILTER (WHERE t.status = 'Completed')::bigint,
         count(*) FILTER (WHERE t.status <> 'To Do')::bigint
  FROM public.project_tasks t
  WHERE t.project_id = ANY(_ids)
  GROUP BY t.project_id
$$;

CREATE OR REPLACE FUNCTION public.sync_project_workflow(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur text;
  idx int;
  target_idx int;
  total bigint;
  comp bigint;
  active bigint;
BEGIN
  SELECT status INTO cur FROM public.projects WHERE id = _project_id;
  IF cur IS NULL THEN RETURN; END IF;
  idx := CASE cur
    WHEN 'Recruiting' THEN 0
    WHEN 'Team Formed' THEN 1
    WHEN 'In Progress' THEN 2
    WHEN 'Completed' THEN 3
    ELSE 0
  END;
  SELECT count(*),
         count(*) FILTER (WHERE status = 'Completed'),
         count(*) FILTER (WHERE status <> 'To Do')
    INTO total, comp, active
    FROM public.project_tasks WHERE project_id = _project_id;
  target_idx := idx;
  IF total > 0 AND comp = total THEN
    target_idx := 3;
  ELSIF active > 0 THEN
    target_idx := GREATEST(idx, 2);
  END IF;
  IF target_idx > idx THEN
    UPDATE public.projects
    SET status = CASE target_idx WHEN 1 THEN 'Team Formed' WHEN 2 THEN 'In Progress' ELSE 'Completed' END,
        updated_at = now()
    WHERE id = _project_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_project_member(uuid, uuid),
  public.get_project_task_stats(uuid[]), public.sync_project_workflow(uuid) TO authenticated;
