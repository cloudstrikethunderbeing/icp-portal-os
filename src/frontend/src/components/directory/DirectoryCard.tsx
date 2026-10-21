import { LaunchType } from "@/backend";
import type { DirectoryEntry } from "@/backend";
import { LaunchTypeBadge } from "@/components/AppTile";
import { CATEGORY_LABEL } from "@/components/directory/DirectoryFilters";
import { cn } from "@/lib/utils";
import type { AppLaunchType } from "@/types";
import {
  Bot,
  Boxes,
  Calculator,
  Check,
  Coins,
  Gamepad2,
  Globe,
  LayoutGrid,
  Lock,
  type LucideIcon,
  MessageCircle,
  Music,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trash2,
} from "lucide-react";

/** Map a backend icon key to a lucide icon, with a neutral fallback. */
const ICON_MAP: Record<string, LucideIcon> = {
  bot: Bot,
  ai: Bot,
  calculator: Calculator,
  coins: Coins,
  finance: Coins,
  gamepad: Gamepad2,
  gaming: Gamepad2,
  globe: Globe,
  grid: LayoutGrid,
  chat: MessageCircle,
  social: MessageCircle,
  music: Music,
  media: Music,
  shield: ShieldCheck,
  governance: ShieldCheck,
  terminal: Terminal,
  developer: Terminal,
  boxes: Boxes,
  business: Boxes,
  sparkles: Sparkles,
};

function resolveIcon(icon: string): LucideIcon {
  return ICON_MAP[icon.toLowerCase()] ?? LayoutGrid;
}

/** The launch type as the shared badge expects it. */
const BADGE_LAUNCH_TYPE: Record<LaunchType, AppLaunchType> = {
  [LaunchType.native]: "native",
  [LaunchType.icpService]: "icp-service",
  [LaunchType.externalWeb]: "external-web",
  [LaunchType.comingSoon]: "coming-soon",
};

function toBadgeLaunchType(launchType: LaunchType): AppLaunchType {
  return BADGE_LAUNCH_TYPE[launchType];
}

/**
 * A single directory entry. Shows the full registry metadata, its clear
 * availability state (Installed / Available / Coming Soon) and the per-user
 * actions: favourite, add-to-home and remove-from-home. Coming Soon entries are
 * labelled and never launch.
 */
export function DirectoryCard({
  entry,
  index,
  signedIn,
  onLaunch,
  onToggleFavourite,
  onAddToHome,
  onRemoveFromHome,
  favouritePending,
  addPending,
  removePending,
}: {
  entry: DirectoryEntry;
  index: number;
  signedIn: boolean;
  onLaunch: (entry: DirectoryEntry) => void;
  onToggleFavourite: (entry: DirectoryEntry) => void;
  onAddToHome: (entry: DirectoryEntry) => void;
  onRemoveFromHome: (entry: DirectoryEntry) => void;
  favouritePending: boolean;
  addPending: boolean;
  removePending: boolean;
}) {
  const { app } = entry;
  const Icon = resolveIcon(app.icon);
  const isComingSoon = app.launchType === "comingSoon";
  const badgeType = toBadgeLaunchType(app.launchType);
  const canLaunch = !isComingSoon;
  const isInstalled = entry.installed;

  return (
    <article
      data-ocid={`directory.card.${index + 1}`}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-subtle transition-smooth hover:shadow-elevated"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "app-tile flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-br text-white",
            isComingSoon ? "from-muted to-secondary" : "from-primary to-accent",
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold text-foreground">
              {app.name}
            </h3>
            {entry.favourite && (
              <Star
                className="h-4 w-4 shrink-0 fill-warning text-warning"
                aria-label="Favourite"
              />
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {CATEGORY_LABEL[app.category]}
          </p>
        </div>
        <LaunchTypeBadge launchType={badgeType} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          data-ocid={`directory.state.${index + 1}`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isInstalled
              ? "pill-installed"
              : isComingSoon
                ? "pill-coming-soon"
                : "pill-available",
          )}
        >
          {isInstalled ? (
            <Check className="h-3 w-3" aria-hidden="true" />
          ) : isComingSoon ? (
            <Sparkles className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Plus className="h-3 w-3" aria-hidden="true" />
          )}
          {isInstalled
            ? "Installed"
            : isComingSoon
              ? "Coming Soon"
              : "Available"}
        </span>
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">
        {app.description}
      </p>

      <dl className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">Version</dt>
          <dd className="truncate font-mono text-foreground">{app.version}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="w-20 shrink-0 text-muted-foreground">Auth</dt>
          <dd className="flex items-center gap-1 text-foreground">
            {app.requiresAuth ? (
              <>
                <Lock className="h-3 w-3" aria-hidden="true" />
                Sign-in required
              </>
            ) : (
              "Open access"
            )}
          </dd>
        </div>
        {app.canisterId && (
          <div className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">Canister</dt>
            <dd className="truncate font-mono text-foreground">
              {app.canisterId}
            </dd>
          </div>
        )}
        {app.url.length > 0 && (
          <div className="flex items-start gap-2">
            <dt className="w-20 shrink-0 text-muted-foreground">URL</dt>
            <dd className="min-w-0 flex-1">
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-primary underline-offset-2 hover:underline"
              >
                {app.url}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {app.permissions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {app.permissions.map((permission) => (
            <span
              key={permission}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {permission}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          data-ocid={`directory.launch_button.${index + 1}`}
          disabled={!canLaunch}
          onClick={() => onLaunch(entry)}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            canLaunch
              ? "bg-gradient-primary text-primary-foreground hover:shadow-elevated"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          {isComingSoon ? "Coming Soon" : "Open"}
        </button>

        <button
          type="button"
          data-ocid={`directory.favourite_button.${index + 1}`}
          aria-pressed={entry.favourite}
          disabled={!signedIn || favouritePending}
          title={signedIn ? undefined : "Sign in to save favourites"}
          onClick={() => onToggleFavourite(entry)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
            entry.favourite
              ? "bg-warning/15 text-warning"
              : "bg-card text-foreground hover:bg-accent/15",
          )}
        >
          <Star
            className={cn("h-4 w-4", entry.favourite && "fill-warning")}
            aria-hidden="true"
          />
          {entry.favourite ? "Saved" : "Favourite"}
        </button>

        {isInstalled ? (
          <button
            type="button"
            data-ocid={`directory.remove_home_button.${index + 1}`}
            disabled={!signedIn || removePending}
            title={signedIn ? undefined : "Sign in to manage your Home screen"}
            onClick={() => onRemoveFromHome(entry)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove from Home
          </button>
        ) : (
          <button
            type="button"
            data-ocid={`directory.add_home_button.${index + 1}`}
            disabled={!signedIn || isComingSoon || addPending}
            title={
              signedIn
                ? isComingSoon
                  ? "Not available yet"
                  : undefined
                : "Sign in to add to Home"
            }
            onClick={() => onAddToHome(entry)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add to Home
          </button>
        )}
      </div>
    </article>
  );
}
