import { LAUNCH_TYPE_LABEL } from "@/lib/appRegistry";
import { cn } from "@/lib/utils";
import type { AppRegistryEntry } from "@/types";

const LAUNCH_TYPE_STYLES: Record<AppRegistryEntry["launchType"], string> = {
  native: "bg-primary/10 text-primary",
  "icp-service": "bg-accent/15 text-accent-foreground",
  "external-web": "bg-muted text-muted-foreground",
  "coming-soon": "border border-warning/50 text-warning",
};

/** Small pill describing how an app launches. */
export function LaunchTypeBadge({
  launchType,
  className,
}: {
  launchType: AppRegistryEntry["launchType"];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        LAUNCH_TYPE_STYLES[launchType],
        className,
      )}
    >
      {LAUNCH_TYPE_LABEL[launchType]}
    </span>
  );
}

/**
 * A single app tile rendered from a registry entry. Native apps navigate inside
 * the shell; external apps open their real target; Coming Soon apps are labelled
 * and never open a fake experience.
 */
export function AppTile({
  app,
  index,
  onLaunch,
}: {
  app: AppRegistryEntry;
  index: number;
  onLaunch: (app: AppRegistryEntry) => void;
}) {
  const Icon = app.icon;
  const isComingSoon = app.launchType === "coming-soon";

  return (
    <button
      type="button"
      data-ocid={`home.app_tile.${index + 1}`}
      aria-label={`${app.name} — ${LAUNCH_TYPE_LABEL[app.launchType]}`}
      disabled={isComingSoon}
      onClick={() => onLaunch(app)}
      className={cn(
        "group flex w-full flex-col items-center gap-2 rounded-2xl p-2 text-center transition-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isComingSoon
          ? "cursor-not-allowed opacity-60"
          : "hover:-translate-y-0.5 active:scale-95",
      )}
    >
      <span
        className={cn(
          "app-tile flex h-16 w-16 items-center justify-center bg-gradient-to-br text-white transition-smooth md:h-[4.5rem] md:w-[4.5rem]",
          app.gradient,
          !isComingSoon && "group-hover:shadow-elevated",
        )}
      >
        <Icon className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
      </span>
      <span className="w-full truncate text-xs font-medium text-foreground">
        {app.name}
      </span>
      {isComingSoon && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
          Soon
        </span>
      )}
    </button>
  );
}
