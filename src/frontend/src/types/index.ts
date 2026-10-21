import type { LucideIcon } from "lucide-react";

/**
 * How an app in the registry is launched.
 *
 * - `native`      — renders inside the shell at its own route.
 * - `icp-service` — opens a real ICP service at an external URL.
 * - `external-web`— opens a real external website at an external URL.
 * - `coming-soon` — not ready yet; clearly labelled and never opens a fake experience.
 */
export type AppLaunchType =
  | "native"
  | "icp-service"
  | "external-web"
  | "coming-soon";

/** A single launchable entry in the workspace app registry. */
export interface AppRegistryEntry {
  /** Stable identity, also used as the route segment for native apps. */
  id: string;
  /** Display name shown on the tile and in navigation. */
  name: string;
  /** One-line description used on tiles and in the directory. */
  description: string;
  /** Launch behaviour for this entry. */
  launchType: AppLaunchType;
  /** Icon rendered on the tile. */
  icon: LucideIcon;
  /** Tailwind gradient classes for the tile background. */
  gradient: string;
  /** Native route path. Required when `launchType` is `native`. */
  route?: string;
  /** External target URL. Required for `icp-service` and `external-web`. */
  href?: string;
  /** Whether the app is pinned to the dock by default. */
  dock?: boolean;
  /** Whether the app is a favourite by default. */
  favourite?: boolean;
}

/**
 * A curated icon key a personal shortcut or link can choose. The key is the
 * stable string persisted on the backend; the visual layer maps it to a lucide
 * icon and a gradient.
 */
export type ShortcutIconKey =
  | "globe"
  | "link"
  | "star"
  | "bookmark"
  | "rocket"
  | "bolt"
  | "heart"
  | "music"
  | "video"
  | "shopping"
  | "wallet"
  | "code"
  | "book"
  | "camera"
  | "gamepad"
  | "message"
  | "cloud"
  | "compass";

/** A curated colour key a personal shortcut or link can choose. */
export type ShortcutColorKey =
  | "primary"
  | "accent"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "sky"
  | "slate";

/** A navigation destination rendered in the sidebar and bottom navigation. */
export interface NavDestination {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
}

/** The signed-in user's workspace identity summary. */
export interface WorkspaceIdentity {
  principal: string;
  shortPrincipal: string;
  role: string;
  isAdmin: boolean;
}
