CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('application_received', 'application_accepted', 'application_rejected', 'team_joined', 'task_assigned', 'task_status_updated', 'project_status_changed')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.notify_application_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title text;
  target_user uuid;
  kind text;
  body text;
BEGIN
  SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;
  IF TG_OP = 'INSERT' THEN
    SELECT owner_id INTO target_user FROM public.projects WHERE id = NEW.project_id;
    kind := 'application_received';
    body := 'New application received for "' || COALESCE(project_title, 'your project') || '".';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('Accepted', 'Rejected') THEN
    target_user := NEW.applicant_id;
    kind := CASE WHEN NEW.status = 'Accepted' THEN 'application_accepted' ELSE 'application_rejected' END;
    body := CASE WHEN NEW.status = 'Accepted' THEN 'Your application to "' || COALESCE(project_title, 'a project') || '" was accepted.' ELSE 'Your application to "' || COALESCE(project_title, 'a project') || '" was rejected.' END;
  ELSE
    RETURN NEW;
  END IF;
  IF target_user IS NOT NULL AND target_user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, project_id, event_type, message)
    VALUES (target_user, NEW.project_id, kind, body);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_application_notifications
AFTER INSERT OR UPDATE OF status ON public.project_applications
FOR EACH ROW EXECUTE FUNCTION public.notify_application_event();

CREATE OR REPLACE FUNCTION public.notify_team_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE project_title text;
BEGIN
  SELECT title INTO project_title FROM public.projects WHERE id = NEW.project_id;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, project_id, event_type, message)
    VALUES (NEW.user_id, NEW.project_id, 'team_joined', 'You joined the team for "' || COALESCE(project_title, 'a project') || '".');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_member_join_notifications
AFTER INSERT ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.notify_team_joined();

CREATE OR REPLACE FUNCTION public.notify_task_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title text;
  owner_user uuid;
  actor uuid := auth.uid();
BEGIN
  SELECT p.title, p.owner_id INTO project_title, owner_user FROM public.projects p WHERE p.id = NEW.project_id;
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS DISTINCT FROM actor THEN
    INSERT INTO public.notifications (user_id, project_id, event_type, message)
    VALUES (NEW.assignee_id, NEW.project_id, 'task_assigned', 'You were assigned "' || NEW.title || '" in "' || COALESCE(project_title, 'a project') || '".');
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF owner_user IS NOT NULL AND owner_user IS DISTINCT FROM actor THEN
      INSERT INTO public.notifications (user_id, project_id, event_type, message)
      VALUES (owner_user, NEW.project_id, 'task_status_updated', 'Task "' || NEW.title || '" moved to ' || NEW.status || ' in "' || COALESCE(project_title, 'a project') || '".');
    END IF;
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM actor AND NEW.assignee_id IS DISTINCT FROM owner_user THEN
      INSERT INTO public.notifications (user_id, project_id, event_type, message)
      VALUES (NEW.assignee_id, NEW.project_id, 'task_status_updated', 'Task "' || NEW.title || '" moved to ' || NEW.status || ' in "' || COALESCE(project_title, 'a project') || '".');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_task_notifications
AFTER INSERT OR UPDATE OF assignee_id, status ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_events();

CREATE OR REPLACE FUNCTION public.notify_project_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE recipient uuid;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    FOR recipient IN
      SELECT NEW.owner_id
      UNION
      SELECT m.user_id FROM public.project_members m WHERE m.project_id = NEW.id
    LOOP
      IF recipient IS NOT NULL AND recipient IS DISTINCT FROM auth.uid() THEN
        INSERT INTO public.notifications (user_id, project_id, event_type, message)
        VALUES (recipient, NEW.id, 'project_status_changed', 'Project "' || NEW.title || '" status changed to ' || NEW.status || '.');
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_status_notifications
AFTER UPDATE OF status ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.notify_project_status_change();