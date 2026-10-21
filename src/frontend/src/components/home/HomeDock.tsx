import type { HomeApp } from "@/components/home/types";
import { homeEntryKey } from "@/components/home/types";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";
import { useState } from "react";

/**
 * The customizable dock pinned at the bottom of the home screen. Holds the
 * user's chosen apps; apps can be added from a picker and removed individually.
 */
export function HomeDock({
  dockApps,
  availableApps,
  onLaunch,
  onAdd,
  onRemove,
  onOpenMenu,
}: {
  dockApps: HomeApp[];
  availableApps: HomeApp[];
  onLaunch: (app: HomeApp) => void;
  onAdd: (app: HomeApp) => void;
  onRemove: (app: HomeApp) => void;
  onOpenMenu: (app: HomeApp, x: number, y: number) => void;
}) {
  const [picking, setPicking] = useState(false);
  const dockIds = new Set(dockApps.map((app) => homeEntryKey(app)));
  const addable = availableApps.filter(
    (app) => !dockIds.has(homeEntryKey(app)),
  );

  return (
    <div
      data-ocid="home.dock"
      className="fixed inset-x-0 bottom-16 z-40 flex flex-col-reverse px-4 pb-2 md:bottom-0 md:left-64 md:px-8 md:pb-3"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-3xl border border-border surface-raised p-2 shadow-floating animate-dock-rise">
        <ul className="flex flex-1 items-center gap-1 overflow-x-auto">
          {dockApps.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              Your dock is empty — add an app.
            </li>
          ) : (
            dockApps.map((app, index) => {
              const Icon = app.icon;
              const isComingSoon = app.launchType === "coming-soon";
              return (
                <li key={homeEntryKey(app)} className="group relative">
                  <button
                    type="button"
                    data-ocid={`home.dock_item.${index + 1}`}
                    aria-label={`Launch ${app.name}`}
                    disabled={isComingSoon}
                    onClick={() => onLaunch(app)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      onOpenMenu(app, event.clientX, event.clientY);
                    }}
                    className={cn(
                      "app-tile flex h-12 w-12 items-center justify-center bg-gradient-to-br text-white transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      app.gradient,
                      isComingSoon
                        ? "cursor-not-allowed opacity-55 saturate-50"
                        : "hover:-translate-y-1",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    data-ocid={`home.dock_remove_button.${index + 1}`}
                    aria-label={`Remove ${app.name} from dock`}
                    onClick={() => onRemove(app)}
                    className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-subtle group-hover:flex focus-visible:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <button
          type="button"
          data-ocid="home.dock_add_button"
          aria-label="Add an app to the dock"
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground transition-smooth hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {picking && (
        <div
          data-ocid="home.dock_picker"
          className="mx-auto mb-2 max-w-2xl rounded-2xl border border-border surface-raised p-3 shadow-floating animate-scale-in"
        >
          {addable.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              Every installed app is already in your dock.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {addable.map((app, index) => {
                const Icon = app.icon;
                return (
                  <li key={homeEntryKey(app)}>
                    <button
                      type="button"
                      data-ocid={`home.dock_picker_item.${index + 1}`}
                      onClick={() => {
                        onAdd(app);
                        setPicking(false);
                      }}
                      className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-smooth hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br text-white",
                          app.gradient,
                        )}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                      </span>
                      {app.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
