import type { UserSettings } from "@/backend";
import { RequireSignIn, SignInButton } from "@/components/InternetIdentity";
import { AccountSection } from "@/components/settings/AccountSection";
import {
  AppearanceSection,
  useAppliedTheme,
} from "@/components/settings/AppearanceSection";
import { DockManager } from "@/components/settings/DockManager";
import { ReportBugSection } from "@/components/settings/ReportBugSection";
import { SettingsSkeleton } from "@/components/settings/SettingsSkeleton";
import {
  WorkspacePreferencesSection,
  useAppliedMotion,
} from "@/components/settings/WorkspacePreferencesSection";
import { useSettings, useUpdateSettings } from "@/hooks/useQueries";
import { AlertTriangle, Settings as SettingsIcon } from "lucide-react";

/** The signed-out state: settings are private to a signed-in identity. */
function SignedOutSettings() {
  return (
    <section data-ocid="settings.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Manage your workspace and identity.
        </p>
      </header>

      <div
        data-ocid="settings.signed_out_state"
        className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
      >
        <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-primary text-primary-foreground">
          <SettingsIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Sign in to manage settings
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your preferences and dock are private to your Internet Identity.
        </p>
        <SignInButton className="rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </div>
    </section>
  );
}

/** The authenticated settings body, backed by the persisted settings API. */
function SettingsContent() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();

  const settings = settingsQuery.data;

  useAppliedTheme(settings?.theme ?? "system");
  useAppliedMotion(settings?.reduceMotion ?? false);

  const handleUpdate = (next: UserSettings) => {
    updateSettings.mutate(next);
  };

  return (
    <section data-ocid="settings.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Manage your workspace and identity.
        </p>
      </header>

      {settingsQuery.isPending && <SettingsSkeleton />}

      {settingsQuery.isError && (
        <div
          data-ocid="settings.error_state"
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-card px-5 py-4 text-sm text-destructive shadow-subtle"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Could not load your settings.</p>
            <button
              type="button"
              data-ocid="settings.retry_button"
              onClick={() => void settingsQuery.refetch()}
              className="mt-1 font-medium underline underline-offset-2 hover:text-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {settings && (
        <div className="space-y-6">
          <AccountSection />
          <AppearanceSection
            settings={settings}
            onUpdate={handleUpdate}
            isSaving={updateSettings.isPending}
          />
          <WorkspacePreferencesSection
            settings={settings}
            onUpdate={handleUpdate}
            isSaving={updateSettings.isPending}
          />
          <DockManager />
          <ReportBugSection />
          {updateSettings.isError && (
            <p
              data-ocid="settings.save_error"
              className="text-xs text-destructive"
            >
              Could not save your changes. Please try again.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Settings — account and session information, appearance and workspace
 * preferences, and dock management, all persisted per signed-in principal.
 */
export default function SettingsPage() {
  return (
    <RequireSignIn fallback={<SignedOutSettings />}>
      <SettingsContent />
    </RequireSignIn>
  );
}
