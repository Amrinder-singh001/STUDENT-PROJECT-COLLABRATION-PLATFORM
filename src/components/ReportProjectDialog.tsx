import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/Modal";
import { PROJECT_REPORT_REASONS, projectReportSchema, submitProjectReport } from "@/lib/project-reports";

export function ReportProjectDialog({ projectId }: { projectId: string }) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof PROJECT_REPORT_REASONS)[number]>("Spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  if (!user || role !== "student") return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = projectReportSchema.safeParse({ projectId, reason, details });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the report details and try again.");
      return;
    }
    setSending(true);
    try {
      await submitProjectReport(user.id, parsed.data);
      toast.success("Your report was sent for review.");
      setDetails("");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Your report could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title="Report this project"
      description="Choose the reason that best describes your concern. Our team will review it."
      trigger={(
        <Button type="button" variant="ghost" className="w-full">
          <Flag className="h-4 w-4" aria-hidden="true" />
          Report project
        </Button>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project-report-reason">Reason</Label>
          <select
            id="project-report-reason"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reason}
            onChange={(event) => setReason(event.target.value as (typeof PROJECT_REPORT_REASONS)[number])}
          >
            {PROJECT_REPORT_REASONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-report-details">Additional details (optional)</Label>
          <Textarea
            id="project-report-details"
            maxLength={1000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Share anything that may help with the review."
          />
          <p className="text-right text-xs text-muted-foreground">{details.length}/1,000</p>
        </div>
        <Button type="submit" disabled={sending} className="w-full">
          {sending ? "Sending report…" : "Send report"}
        </Button>
      </form>
    </Modal>
  );
}