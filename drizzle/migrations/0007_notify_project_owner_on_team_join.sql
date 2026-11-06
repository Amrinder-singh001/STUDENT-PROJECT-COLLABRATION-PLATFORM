CREATE OR REPLACE FUNCTION public.notify_team_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title text;
  project_owner uuid;
  member_name text;
BEGIN
  SELECT p.title, p.owner_id INTO project_title, project_owner FROM public.projects p WHERE p.id = NEW.project_id;
  SELECT full_name INTO member_name FROM public.profiles WHERE id = NEW.user_id;
  IF NEW.user_id IS DISTINCT FROM project_owner THEN
    INSERT INTO public.notifications (user_id, project_id, event_type, message)
    VALUES (NEW.user_id, NEW.project_id, 'team_joined', 'You joined the team for "' || COALESCE(project_title, 'a project') || '".');
  END IF;
  IF project_owner IS NOT NULL AND project_owner IS DISTINCT FROM auth.uid() AND project_owner IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications (user_id, project_id, event_type, message)
    VALUES (project_owner, NEW.project_id, 'team_joined', COALESCE(member_name, 'A student') || ' joined the team for "' || COALESCE(project_title, 'your project') || '".');
  END IF;
  RETURN NEW;
END;
$$;