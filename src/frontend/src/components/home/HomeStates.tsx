import { AppTile } from "@/components/AppTile";
import { APP_REGISTRY } from "@/lib/appRegistry";
import type { AppRegistryEntry } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { AlertTriangle, LayoutGrid, Loader2 } from "lucide-react";

/** Skeleton grid shown while the home layout loads. */
export function HomeLoadingState() {
  const ids = Array.from({ length: 8 }, (_, i) => `home-skeleton-${i}`);
  return (
    <div
      data-ocid="home.loading_state"
      aria-busy="true"
      aria-label="Loading your home screen"
      className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6 md:gap-x-3 md:gap-y-5"
    >
      {ids.map((id) => (
        <div key={id} className="flex flex-col items-center gap-2">
          <span className="app-tile h-16 w-16 motion-safe:animate-pulse bg-muted md:h-[4.5rem] md:w-[4.5rem]" />
          <span className="h-3 w-12 motion-safe:animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

/** Error state with a retry action. */
export function HomeErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      data-ocid="home.error_state"
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
    >
      <span className="app-tile flex h-14 w-14 items-center justify-center bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">
        We couldn&apos;t load your home screen
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        data-ocid="home.retry_button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Loader2 className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

/** Empty state shown when the user has no installed apps or shortcuts. */
export function HomeEmptyState({
  onBrowse,
  onAddShortcut,
}: {
  onBrowse: () => void;
  onAddShortcut: () => void;
}) {
  return (
    <div
      data-ocid="home.empty_state"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
    >
      <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-chart-4 to-chart-3 text-white">
        <LayoutGrid className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">
        Your home screen is empty
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Install an app from the directory, or add a website link of your own.
      </p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          data-ocid="home.browse_directory_button"
          onClick={onBrowse}
          className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Browse the directory
        </button>
        <button
          type="button"
          data-ocid="home.empty_add_shortcut_button"
          onClick={onAddShortcut}
          className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-smooth hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Add a shortcut
        </button>
      </div>
    </div>
  );
}

/** Empty state shown when a search matches no installed apps. */
export function HomeNoResultsState({ query }: { query: string }) {
  return (
    <div
      data-ocid="home.no_results_state"
      className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center"
    >
      <p className="font-display text-base font-semibold text-foreground">
        No apps match “{query}”
      </p>
      <p className="text-sm text-muted-foreground">
        Try a different name or clear the search.
      </p>
    </div>
  );
}

/**
 * The signed-out Home body. A visitor who is not signed in still sees the app
 * registry as a browsable grid plus a clear sign-in entry point, instead of an
 * error state. Launching a native app is deferred to the sign-in action.
 */
export function SignedOutHome({
  onLaunch,
}: {
  onLaunch: (app: AppRegistryEntry) => void;
}) {
  const { login, isInitializing, isLoggingIn } = useInternetIdentity();
  return (
    <div data-ocid="home.signed_out_state" className="space-y-6">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card px-5 py-6 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Sign in to make this workspace yours
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Browse the apps below. Sign in with Internet Identity to install
            apps, save favourites and keep your layout across devices.
          </p>
        </div>
        <button
          type="button"
          data-ocid="home.sign_in_button"
          disabled={isInitializing || isLoggingIn}
          onClick={() => login()}
          className="shrink-0 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {isLoggingIn ? "Signing in…" : "Sign in with Internet Identity"}
        </button>
      </div>

      <div
        data-ocid="home.signed_out_grid"
        className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6 md:gap-x-3 md:gap-y-5"
      >
        {APP_REGISTRY.map((app, index) => (
          <AppTile key={app.id} app={app} index={index} onLaunch={onLaunch} />
        ))}
      </div>
    </div>
  );
}
