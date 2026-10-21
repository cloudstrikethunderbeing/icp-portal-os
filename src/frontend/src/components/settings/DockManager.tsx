import type { AppRegistryEntry, InstalledApp } from "@/backend";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAppRegistry,
  useDock,
  useInstalledApps,
  useSetDock,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Plus, Star } from "lucide-react";

const DOCK_SKELETON_IDS = Array.from(
  { length: 4 },
  (_, index) => `dock-skeleton-${index}`,
);

function DockRow({
  app,
  inDock,
  disabled,
  onToggle,
}: {
  app: AppRegistryEntry;
  inDock: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        aria-hidden="true"
        className="app-tile flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-to-br from-primary to-accent text-lg"
      >
        {app.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {app.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {app.description}
        </p>
      </div>
      <button
        type="button"
        data-ocid={`settings.dock.toggle.${app.id}`}
        aria-pressed={inDock}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          inDock
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        {inDock ? (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            In dock
          </>
        ) : (
          <>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </>
        )}
      </button>
    </li>
  );
}

/**
 * Manage the dock contents. Lists every installed app and lets the user add or
 * remove it from the dock; changes persist through the backend dock API.
 */
export function DockManager() {
  const installedQuery = useInstalledApps();
  const registryQuery = useAppRegistry();
  const dockQuery = useDock();
  const setDock = useSetDock();

  const isLoading =
    installedQuery.isLoading || registryQuery.isLoading || dockQuery.isLoading;
  const isError =
    installedQuery.isError || registryQuery.isError || dockQuery.isError;

  const registry = registryQuery.data ?? [];
  const dockIds = dockQuery.data?.appIds ?? [];

  const installedApps: AppRegistryEntry[] = (installedQuery.data ?? [])
    .map((installed: InstalledApp) =>
      registry.find((entry) => entry.id === installed.appId),
    )
    .filter((entry): entry is AppRegistryEntry => entry !== undefined);

  const toggleDock = (appId: bigint) => {
    const next = dockIds.includes(appId)
      ? dockIds.filter((id) => id !== appId)
      : [...dockIds, appId];
    setDock.mutate(next);
  };

  return (
    <SettingsSection
      id="dock"
      title="Dock & installed apps"
      description="Choose which of your installed apps sit in the dock."
      icon={Star}
    >
      {isLoading && (
        <ul
          data-ocid="settings.dock.loading_state"
          className="divide-y divide-border"
        >
          {DOCK_SKELETON_IDS.map((id) => (
            <li key={id} className="flex items-center gap-3 px-5 py-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-44" />
              </div>
              <Skeleton className="h-7 w-16 rounded-full" />
            </li>
          ))}
        </ul>
      )}

      {isError && (
        <div
          data-ocid="settings.dock.error_state"
          className="flex items-start gap-3 px-5 py-4 text-sm text-destructive"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium">Could not load your installed apps.</p>
            <button
              type="button"
              data-ocid="settings.dock.retry_button"
              onClick={() => {
                void installedQuery.refetch();
                void registryQuery.refetch();
                void dockQuery.refetch();
              }}
              className="mt-1 font-medium underline underline-offset-2 hover:text-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && installedApps.length === 0 && (
        <div
          data-ocid="settings.dock.empty_state"
          className="px-5 py-8 text-center text-sm text-muted-foreground"
        >
          No apps are installed yet. Install apps from the App Directory to add
          them to your dock.
        </div>
      )}

      {!isLoading && !isError && installedApps.length > 0 && (
        <ul data-ocid="settings.dock.list" className="divide-y divide-border">
          {installedApps.map((app) => (
            <DockRow
              key={app.id.toString()}
              app={app}
              inDock={dockIds.includes(app.id)}
              disabled={setDock.isPending}
              onToggle={() => toggleDock(app.id)}
            />
          ))}
        </ul>
      )}

      {setDock.isError && (
        <p
          data-ocid="settings.dock.save_error"
          className="px-5 py-3 text-xs text-destructive"
        >
          Could not save your dock changes. Please try again.
        </p>
      )}
    </SettingsSection>
  );
}
