import { RequireSignIn, SignInButton } from "@/components/InternetIdentity";
import {
  type BugReport,
  REPORT_STATUSES,
  REPORT_STATUS_LABEL,
  ReportStatus,
  useBugReports,
  useIsCallerAdmin,
  useSetBugReportStatus,
} from "@/hooks/useQueries";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Inbox,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";

/** Convert a backend nanosecond timestamp into a readable local date-time. */
function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** The tinted pill styling for each report status. */
const STATUS_PILL: Record<ReportStatus, string> = {
  [ReportStatus.open]: "pill-available",
  [ReportStatus.inProgress]: "pill-coming-soon",
  [ReportStatus.resolved]: "pill-installed",
  [ReportStatus.closed]: "bg-muted text-muted-foreground",
};

/** The signed-out state: the inbox is private to the workspace admin. */
function SignedOutReports() {
  return (
    <section data-ocid="admin_reports.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Bug reports
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Review reports submitted by your workspace members.
        </p>
      </header>

      <div
        data-ocid="admin_reports.signed_out_state"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
      >
        <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-primary text-primary-foreground">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Sign in to view bug reports
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          The report inbox is visible only to the workspace admin.
        </p>
        <SignInButton className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </div>
    </section>
  );
}

/** A single report row with its status control and timestamps. */
function ReportCard({
  report,
  index,
  onStatusChange,
  isUpdating,
}: {
  report: BugReport;
  index: number;
  onStatusChange: (id: bigint, status: ReportStatus) => void;
  isUpdating: boolean;
}) {
  const position = index + 1;
  const hasAiResult = report.category !== null || report.summary !== null;

  return (
    <article
      data-ocid={`admin_reports.item.${position}`}
      className="rounded-2xl border border-border bg-card p-5 shadow-subtle transition-smooth hover:shadow-elevated"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="app-tile flex h-9 w-9 shrink-0 items-center justify-center bg-secondary text-secondary-foreground">
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted-foreground">
              {report.reporter.toText()}
            </p>
            <p className="text-xs text-muted-foreground">
              Report #{report.id.toString()}
            </p>
          </div>
        </div>

        <span
          data-ocid={`admin_reports.status.${position}`}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[report.status]}`}
        >
          {REPORT_STATUS_LABEL[report.status]}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
        {report.description}
      </p>

      {hasAiResult && (
        <div
          data-ocid={`admin_reports.ai.${position}`}
          className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/60 p-3"
        >
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI assistance
          </p>
          {report.category !== null && (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Category: </span>
              {report.category}
            </p>
          )}
          {report.summary !== null && (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Summary: </span>
              {report.summary}
            </p>
          )}
        </div>
      )}

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Submitted</dt>
          <dd>Submitted {formatTimestamp(report.createdAt)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <dt className="sr-only">Last updated</dt>
          <dd>Updated {formatTimestamp(report.updatedAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <label
          htmlFor={`report-status-${report.id.toString()}`}
          className="text-xs font-medium text-muted-foreground"
        >
          Status
        </label>
        <select
          id={`report-status-${report.id.toString()}`}
          data-ocid={`admin_reports.status_select.${position}`}
          value={report.status}
          disabled={isUpdating}
          onChange={(event) =>
            onStatusChange(report.id, event.target.value as ReportStatus)
          }
          className="rounded-full border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {REPORT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {REPORT_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

/** The admin inbox body: the report list with status controls. */
function AdminReportsContent() {
  const reportsQuery = useBugReports();
  const setStatus = useSetBugReportStatus();
  const [filter, setFilter] = useState<ReportStatus | "all">("all");

  const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data]);

  const visible = useMemo(
    () =>
      filter === "all"
        ? reports
        : reports.filter((report) => report.status === filter),
    [reports, filter],
  );

  const handleStatusChange = (id: bigint, status: ReportStatus) => {
    setStatus.mutate({ id, status });
  };

  return (
    <section data-ocid="admin_reports.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Bug reports
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Review reports submitted by your workspace members.
        </p>
      </header>

      <div
        data-ocid="admin_reports.filter.tab"
        role="tablist"
        aria-label="Filter reports by status"
        className="flex flex-wrap gap-2"
      >
        {(["all", ...REPORT_STATUSES] as const).map((value) => {
          const active = filter === value;
          const label = value === "all" ? "All" : REPORT_STATUS_LABEL[value];
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              data-ocid={`admin_reports.filter.${value}`}
              onClick={() => setFilter(value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-quick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                  ? "bg-gradient-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {reportsQuery.isPending && (
        <div
          data-ocid="admin_reports.loading_state"
          className="space-y-4"
          aria-busy="true"
        >
          {Array.from({ length: 3 }, (_, i) => `report-skeleton-${i}`).map(
            (id) => (
              <div
                key={id}
                className="h-40 animate-pulse rounded-2xl border border-border bg-card"
              />
            ),
          )}
        </div>
      )}

      {reportsQuery.isError && (
        <div
          data-ocid="admin_reports.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card px-5 py-4 text-sm text-destructive shadow-subtle"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Could not load bug reports.</p>
            <button
              type="button"
              data-ocid="admin_reports.retry_button"
              onClick={() => void reportsQuery.refetch()}
              className="mt-1 font-medium underline underline-offset-2 hover:text-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!reportsQuery.isPending &&
        !reportsQuery.isError &&
        reports.length === 0 && (
          <div
            data-ocid="admin_reports.empty_state"
            className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center shadow-subtle"
          >
            <span className="app-tile flex h-14 w-14 items-center justify-center bg-secondary text-secondary-foreground">
              <Inbox className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              No bug reports yet
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Reports submitted from Settings will appear here with their status
              and timestamps.
            </p>
          </div>
        )}

      {!reportsQuery.isPending &&
        !reportsQuery.isError &&
        reports.length > 0 &&
        visible.length === 0 && (
          <div
            data-ocid="admin_reports.filter_empty_state"
            className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center shadow-subtle"
          >
            <p className="font-display text-base font-semibold text-foreground">
              No reports with this status
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a different filter to see other reports.
            </p>
          </div>
        )}

      {!reportsQuery.isPending &&
        !reportsQuery.isError &&
        visible.length > 0 && (
          <div data-ocid="admin_reports.list" className="space-y-4">
            {visible.map((report, index) => (
              <ReportCard
                key={report.id.toString()}
                report={report}
                index={index}
                onStatusChange={handleStatusChange}
                isUpdating={setStatus.isPending}
              />
            ))}
          </div>
        )}

      {setStatus.isError && (
        <p
          data-ocid="admin_reports.status_error"
          className="flex items-center gap-1.5 text-xs text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Could not update the report status. Please try again.
        </p>
      )}

      {setStatus.isSuccess && (
        <p
          data-ocid="admin_reports.status_success"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Report status updated.
        </p>
      )}
    </section>
  );
}

/** Gate the inbox body on the caller holding the admin role. */
function AdminReportsGate() {
  const { data: isAdmin, isPending } = useIsCallerAdmin();

  if (isPending) {
    return (
      <section data-ocid="admin_reports.page" className="space-y-6">
        <output
          data-ocid="admin_reports.loading_state"
          className="block text-sm text-muted-foreground"
        >
          Checking your access…
        </output>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section data-ocid="admin_reports.page" className="space-y-6">
        <header className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Bug reports
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Review reports submitted by your workspace members.
          </p>
        </header>
        <div
          data-ocid="admin_reports.forbidden_state"
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
        >
          <span className="app-tile flex h-14 w-14 items-center justify-center bg-muted text-muted-foreground">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="font-display text-lg font-semibold text-foreground">
            Admin access required
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Only the workspace admin can view the bug report inbox.
          </p>
        </div>
      </section>
    );
  }

  return <AdminReportsContent />;
}

/**
 * The admin bug report inbox — lists submitted reports with their description,
 * status and timestamps, and lets the workspace admin change a report's status.
 * AI categories and summaries are shown when present; the inbox works fully
 * without them.
 */
export default function AdminReportsPage() {
  return (
    <RequireSignIn fallback={<SignedOutReports />}>
      <AdminReportsGate />
    </RequireSignIn>
  );
}
