import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const PROJECT_REPORT_REASONS = [
  "Spam",
  "Fake project",
  "Inappropriate content",
  "Duplicate project",
  "Other",
] as const;

export const projectReportSchema = z.object({
  projectId: z.string().uuid(),
  reason: z.enum(PROJECT_REPORT_REASONS),
  details: z.string().trim().max(1000, "Please keep additional details under 1,000 characters").default(""),
});

export type ProjectReportInput = z.infer<typeof projectReportSchema>;

export async function submitProjectReport(reporterId: string, input: ProjectReportInput) {
  const report = projectReportSchema.parse(input);
  const { error } = await supabase.from("project_reports").insert({
    project_id: report.projectId,
    reporter_id: reporterId,
    reason: report.reason,
    details: report.details,
  });
  if (error?.code === "23505") {
    throw new Error("You already have a report awaiting review for this project.");
  }
  if (error) throw new Error("Your report could not be sent. Please try again.");
}