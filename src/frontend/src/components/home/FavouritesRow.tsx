import type { HomeApp } from "@/components/home/types";
import { homeEntryKey } from "@/components/home/types";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * The favourites row — a horizontal strip of the user's starred apps. Renders
 * nothing when no app is favourited so the grid keeps its rhythm.
 */
export function FavouritesRow({
  apps,
  onLaunch,
  onOpenMenu,
}: {
  apps: HomeApp[];
  onLaunch: (app: HomeApp) => void;
  onOpenMenu: (app: HomeApp, x: number, y: number) => void;
}) {
  if (apps.length === 0) return null;

  return (
    <section data-ocid="home.favourites_section" className="space-y-3">
      <div className="flex items-center gap-2">
        <Star
          className="h-4 w-4 fill-warning text-warning"
          aria-hidden="true"
        />
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Favourites
        </h2>
      </div>
      <ul
        data-ocid="home.favourites_list"
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1"
      >
        {apps.map((app, index) => {
          const Icon = app.icon;
          const isComingSoon = app.launchType === "coming-soon";
          return (
            <li key={homeEntryKey(app)} className="shrink-0">
              <button
                type="button"
                data-ocid={`home.favourite_item.${index + 1}`}
                aria-label={`Launch ${app.name}`}
                disabled={isComingSoon}
                onClick={() => onLaunch(app)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  onOpenMenu(app, event.clientX, event.clientY);
                }}
                className={cn(
                  "flex w-20 flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isComingSoon
                    ? "cursor-not-allowed"
                    : "hover:-translate-y-0.5",
                )}
              >
                <span
                  className={cn(
                    "app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br text-white",
                    app.gradient,
                    isComingSoon && "opacity-55 saturate-50",
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="w-full truncate text-center text-[11px] font-medium text-foreground">
                  {app.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
