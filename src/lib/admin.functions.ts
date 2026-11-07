import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const adminSearchSchema = z.object({ search: z.string().trim().max(120).default("") });
const adminUserActionSchema = z.object({ userId: z.string().uuid(), blocked: z.boolean() });
const adminProjectActionSchema = z.object({ projectId: z.string().uuid(), hidden: z.boolean() });
const adminReportActionSchema = z.object({ reportId: z.string().uuid(), decision: z.enum(["dismiss", "hide"]) });

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&").toLowerCase();
}

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(adminSearchSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Administrator access is required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const search = escapeLike(data.search);
    const [studentsResult, projectsResult, activeResult, completedResult, applicationsResult, membershipsResult,
      profilesResult, projectsListResult, applicationsListResult, reportsResult] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("projects").select("id", { count: "exact", head: true }).neq("status", "Completed"),
      supabaseAdmin.from("projects").select("id", { count: "exact", head: true }).eq("status", "Completed"),
      supabaseAdmin.from("project_applications").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("project_members").select("project_id"),
      supabaseAdmin.from("profiles").select("id, full_name, email, college, course, semester, bio, created_at").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("projects").select("id, title, description, category, status, created_at, owner_id, is_hidden").order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("project_applications").select("id, applicant_id, project_id, status, created_at").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("project_reports").select("id, project_id, reporter_id, reason, details, status, created_at").order("created_at", { ascending: false }).limit(300),
    ]);

    const failures = [studentsResult, projectsResult, activeResult, completedResult, applicationsResult,
      membershipsResult, profilesResult, projectsListResult, applicationsListResult, reportsResult];
    if (failures.some((result) => result.error)) throw new Error("Dashboard data could not be loaded.");

    const profiles = profilesResult.data ?? [];
    const projects = projectsListResult.data ?? [];
    const applications = applicationsListResult.data ?? [];
    const reports = reportsResult.data ?? [];
    const allPeopleIds = [...new Set([
      ...applications.map((application) => application.applicant_id),
      ...reports.map((report) => report.reporter_id),
    ])];
    const allProjectIds = [...new Set([
      ...applications.map((application) => application.project_id),
      ...reports.map((report) => report.project_id),
    ])];
    const [peopleResult, projectNamesResult] = await Promise.all([
      allPeopleIds.length
        ? supabaseAdmin.from("profiles").select("id, full_name, email").in("id", allPeopleIds)
        : Promise.resolve({ data: [], error: null }),
      allProjectIds.length
        ? supabaseAdmin.from("projects").select("id, title").in("id", allProjectIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (peopleResult.error || projectNamesResult.error) throw new Error("Dashboard details could not be loaded.");

    const peopleById = new Map((peopleResult.data ?? []).map((person) => [person.id, person]));
    const projectsById = new Map((projectNamesResult.data ?? []).map((project) => [project.id, project]));
    const queryMatches = (value: string | null | undefined) => !search || (value ?? "").toLowerCase().includes(search);
    const matchingProfiles = profiles.filter((person) => queryMatches(person.full_name) || queryMatches(person.email));
    const matchingProjects = projects.filter((project) =>
      queryMatches(project.title) || queryMatches(project.description) || queryMatches(project.category),
    );
    const matchingApplications = applications.filter((application) =>
      queryMatches(peopleById.get(application.applicant_id)?.full_name)
        || queryMatches(peopleById.get(application.applicant_id)?.email)
        || queryMatches(projectsById.get(application.project_id)?.title)
        || queryMatches(application.status),
    );
    const matchingReports = reports.filter((report) =>
      queryMatches(projectsById.get(report.project_id)?.title)
        || queryMatches(peopleById.get(report.reporter_id)?.full_name)
        || queryMatches(report.reason)
        || queryMatches(report.status),
    );

    const selectedUserIds = new Set(matchingProfiles.slice(0, 50).map((person) => person.id));
    const bannedUserIds = new Set<string>();
    for (let page = 1; selectedUserIds.size > 0 && page <= 1000; page += 1) {
      const { data: authPage, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error("Account status could not be loaded.");
      for (const authUser of authPage.users) {
        if (authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now()) {
          bannedUserIds.add(authUser.id);
        }
        selectedUserIds.delete(authUser.id);
      }
      if (selectedUserIds.size === 0 || authPage.users.length < 1000) break;
    }

    const memberProjectCount = new Set((membershipsResult.data ?? []).map((member) => member.project_id)).size;
    return {
      stats: {
        students: studentsResult.count ?? 0,
        projects: projectsResult.count ?? 0,
        activeProjects: activeResult.count ?? 0,
        completedProjects: completedResult.count ?? 0,
        applications: applicationsResult.count ?? 0,
        teams: memberProjectCount,
      },
      users: matchingProfiles.slice(0, 50).map((person) => ({
        ...person,
        blocked: bannedUserIds.has(person.id),
      })),
      projects: matchingProjects.slice(0, 50),
      applications: matchingApplications.slice(0, 50).map((application) => ({
        ...application,
        applicant: peopleById.get(application.applicant_id)?.full_name ?? "Student",
        projectTitle: projectsById.get(application.project_id)?.title ?? "Project",
      })),
      reports: matchingReports.slice(0, 50).map((report) => ({
        ...report,
        reporter: peopleById.get(report.reporter_id)?.full_name ?? "Student",
        projectTitle: projectsById.get(report.project_id)?.title ?? "Project",
      })),
    };
  });

export const setAdminUserBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(adminUserActionSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !isAdmin) throw new Error("Administrator access is required.");
    if (data.userId === context.userId && data.blocked) throw new Error("You cannot block your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.blocked ? "876000h" : "none",
    });
    if (updateError) throw new Error("This account could not be updated.");
    return { ok: true };
  });

export const setAdminProjectHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(adminProjectActionSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !isAdmin) throw new Error("Administrator access is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin
      .from("projects")
      .update({ is_hidden: data.hidden })
      .eq("id", data.projectId);
    if (updateError) throw new Error("This project could not be updated.");
    return { ok: true };
  });

export const decideAdminProjectReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(adminReportActionSchema)
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error || !isAdmin) throw new Error("Administrator access is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: report, error: reportError } = await supabaseAdmin
      .from("project_reports")
      .select("project_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (reportError || !report) throw new Error("This report could not be found.");
    if (data.decision === "hide") {
      const { error: hideError } = await supabaseAdmin
        .from("projects")
        .update({ is_hidden: true })
        .eq("id", report.project_id);
      if (hideError) throw new Error("The project could not be hidden.");
    }
    const { error: decisionError } = await supabaseAdmin
      .from("project_reports")
      .update({ status: data.decision === "hide" ? "Resolved" : "Dismissed", reviewed_at: new Date().toISOString() })
      .eq("id", data.reportId);
    if (decisionError) throw new Error("This report could not be updated.");
    return { ok: true };
  });