import { describe, expect, it } from "bun:test";
import { PROJECT_REPORT_REASONS, projectReportSchema } from "../src/lib/project-reports";

describe("project report validation", () => {
  it("accepts exactly the five report reasons requested", () => {
    expect(PROJECT_REPORT_REASONS).toEqual([
      "Spam",
      "Fake project",
      "Inappropriate content",
      "Duplicate project",
      "Other",
    ]);
  });

  it("requires a valid project id and a recognized reason", () => {
    const result = projectReportSchema.safeParse({ projectId: "not-a-uuid", reason: "Something else" });
    expect(result.success).toBe(false);
  });

  it("limits additional report details to 1,000 characters", () => {
    const result = projectReportSchema.safeParse({
      projectId: "33333333-3333-4333-8333-333333333333",
      reason: "Other",
      details: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});