# Admin Dashboard and ProjectConnect Polish

## What will change

- Add a signed-in, admin-only `/admin` workspace with live counts for students, projects, active/completed projects, applications, and teams.
- Provide searchable student and project review, application monitoring, and report review. Admin-only server actions will verify the caller's stored admin role before using privileged account or moderation operations.
- Add student project reports with the requested reasons and a safe, reviewable submission flow. Inappropriate projects will be hidden from public discovery rather than permanently deleted, preserving application and team history.
- Add a conditional admin navigation entry without changing the existing student experience.
- Review the existing app's key flows, forms, links, empty/loading/error/success states, responsive layouts, and accessibility basics; make focused fixes only, then run available tests and inspect preview diagnostics.

## Technical details

- Add a `project_reports` table with constrained reasons/status, authenticated reporter ownership policies, grants, and a one-pending-report-per-student/project safeguard. Add a default-visible moderation flag to projects and update public read policies so hidden projects disappear from student discovery while owners/admins retain appropriate visibility.
- Keep protected operations in authenticated TanStack server functions; verify `has_role(..., 'admin')` on every call before loading the privileged client. Validate all submitted IDs, filters, report fields, and moderation inputs.
- Use the existing shadcn controls, auth context, design tokens, toasts, and confirmation dialog patterns.

## Verification

- Confirm the schema and policy changes applied, inspect the newest build diagnostics, run existing tests, and test the public report and admin screens in the preview where available.
- If no authenticated admin test session is available, verify the guarded UI and server-side authorization paths from code and report that limitation clearly.
