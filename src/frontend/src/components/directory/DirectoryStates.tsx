import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, SearchX } from "lucide-react";

const SKELETON_IDS = Array.from(
  { length: 6 },
  (_, index) => `directory-skeleton-${index}`,
);

/** Layout-matched loading skeleton for the directory grid. */
export function DirectoryLoading() {
  return (
    <div
      data-ocid="directory.loading_state"
      aria-busy="true"
      aria-live="polite"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-subtle"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Empty state shown when a filter or search matches nothing. */
export function DirectoryEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      data-ocid="directory.empty_state"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
    >
      <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-chart-4 to-chart-3 text-white">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">
        {title}
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/** Error state with a retry action. */
export function DirectoryError({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div
      data-ocid="directory.error_state"
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-card px-6 py-16 text-center shadow-subtle"
    >
      <span className="app-tile flex h-14 w-14 items-center justify-center bg-destructive text-destructive-foreground">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">
        Couldn&apos;t load the directory
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        The registry didn&apos;t respond. Check your connection and try again.
      </p>
      <button
        type="button"
        data-ocid="directory.retry_button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-1 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60"
      >
        {isRetrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
