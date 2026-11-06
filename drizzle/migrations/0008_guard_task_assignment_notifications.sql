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
  is_new_assignment boolean := false;
BEGIN
  SELECT p.title, p.owner_id INTO project_title, owner_user FROM public.projects p WHERE p.id = NEW.project_id;
  IF TG_OP = 'INSERT' THEN
    is_new_assignment := NEW.assignee_id IS NOT NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    is_new_assignment := NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM OLD.assignee_id;
  END IF;
  IF is_new_assignment AND NEW.assignee_id IS DISTINCT FROM actor THEN
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