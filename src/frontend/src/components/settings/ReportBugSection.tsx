import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitBugReport } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bug, Check, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";

const MAX_DESCRIPTION_LENGTH = 2000;

/**
 * The bug report form. Captures the user's description and submits it to the
 * backend, which records the reporting principal and the submission timestamp.
 * The optional AI assistance step is offered but clearly marked unavailable in
 * this build; submitting works fully without it.
 */
function ReportBugDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const submitReport = useSubmitBugReport();
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);

  const trimmed = description.trim();
  const canSubmit = trimmed.length > 0 && !submitReport.isPending;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSent(false);
      submitReport.reset();
    }
    onOpenChange(next);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    const captured = trimmed;
    // Clear the draft synchronously so a fast second report starts empty.
    setDescription("");
    submitReport.mutate(captured, {
      onSuccess: () => setSent(true),
      onError: () => {
        setDescription((current) => (current === "" ? captured : current));
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        data-ocid="report_bug.dialog"
        className="rounded-2xl border-border bg-card shadow-elevated sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold tracking-tight text-foreground">
            Report a bug
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Tell us what went wrong. Your report is sent to the workspace admin
            with your identity and the time it was submitted.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div
            data-ocid="report_bug.success_state"
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-5 py-8 text-center"
          >
            <span className="app-tile flex h-12 w-12 items-center justify-center bg-gradient-primary text-primary-foreground">
              <Check className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="font-display text-base font-semibold text-foreground">
              Thanks — your report was sent
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The workspace admin can review it in the bug report inbox.
            </p>
            <button
              type="button"
              data-ocid="report_bug.close_button"
              onClick={() => handleOpenChange(false)}
              className="mt-1 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="report-bug-description"
                className="block text-sm font-medium text-foreground"
              >
                What happened?
              </label>
              <Textarea
                id="report-bug-description"
                data-ocid="report_bug.textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={MAX_DESCRIPTION_LENGTH}
                rows={5}
                placeholder="Describe the problem, what you expected, and what you saw instead."
                className="min-h-28 resize-y rounded-xl"
              />
              <p className="text-right text-xs text-muted-foreground">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </p>
            </div>

            <div
              data-ocid="report_bug.ai_help"
              className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3"
            >
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  AI assistance
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Optional AI categorisation and summarising is not available in
                  this build. You can still submit your report as-is.
                </p>
              </div>
            </div>

            {submitReport.isError && (
              <p
                data-ocid="report_bug.error_state"
                className="flex items-start gap-2 text-sm text-destructive"
              >
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Could not send your report. Please try again.
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-end">
              <button
                type="button"
                data-ocid="report_bug.cancel_button"
                onClick={() => handleOpenChange(false)}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-ocid="report_bug.submit_button"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <Bug className="h-4 w-4" aria-hidden="true" />
                {submitReport.isPending ? "Sending…" : "Send report"}
              </button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The "Report a bug" entry point. Renders a trigger button that opens the short
 * report form. Used in Settings and in the desktop menu so the option is small
 * but noticeable in both places.
 */
export function ReportBugSection({
  variant = "section",
  className,
}: {
  variant?: "section" | "menu";
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      data-ocid="report_bug.open_button"
      onClick={() => setOpen(true)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Bug className="h-4 w-4" aria-hidden="true" />
      Report a bug
    </button>
  );

  if (variant === "menu") {
    return (
      <>
        {trigger}
        <ReportBugDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <SettingsSection
        id="report-bug"
        title="Report a bug"
        description="Found something broken? Send a report to the workspace admin."
        icon={Bug}
      >
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-sm text-muted-foreground">
            Your report includes your identity and the time it was submitted.
          </p>
          {trigger}
        </div>
      </SettingsSection>
      <ReportBugDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
