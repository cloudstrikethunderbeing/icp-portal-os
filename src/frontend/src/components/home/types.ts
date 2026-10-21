import type {
  AppRegistryEntry as BackendAppEntry,
  Id,
  Shortcut,
} from "@/backend";
import type { AppLaunchType } from "@/types";
import type { LucideIcon } from "lucide-react";

/**
 * The availability state a home or directory entry presents to the user.
 *
 * - `installed`   — present on the user's Home screen.
 * - `available`   — launchable and can be added to Home.
 * - `coming-soon` — not ready yet; labelled and never launched.
 */
export type HomeEntryState = "installed" | "available" | "coming-soon";

/**
 * A home-screen entry. Installed apps and personal shortcuts share one shape so
 * the grid, folders, favourites and dock render and manage them identically.
 *
 * - `kind: "app"`      — an installed registry app; `installedId` is its layout id.
 * - `kind: "shortcut"` — a personal shortcut or website link; `shortcutId` is its id.
 */
export interface HomeApp {
  kind: "app" | "shortcut";
  /** Installed-app id — the identity used by every layout mutation. */
  installedId: Id;
  /** Shortcut id, present only when `kind` is `"shortcut"`. */
  shortcutId?: Id;
  /** Registry id of the underlying app, or the shortcut's own id as text. */
  appId: Id;
  name: string;
  description: string;
  launchType: AppLaunchType;
  /**
   * Availability state shown on the tile and in the directory. Optional so
   * existing callers that only know an entry is installed keep compiling; the
   * visual helpers always populate it.
   */
  state?: HomeEntryState;
  icon: LucideIcon;
  gradient: string;
  route?: string;
  href?: string;
  /** Persisted icon key for a shortcut; absent for installed apps. */
  iconKey?: string;
  /** Persisted colour key for a shortcut; absent for installed apps. */
  colorKey?: string;
  favourite: boolean;
  folderId?: Id;
  position: bigint;
}

/** A named folder on the home screen. */
export interface HomeFolderView {
  id: Id;
  name: string;
  position: bigint;
  apps: HomeApp[];
}

/** A grid cell: either a loose app or a folder. */
export type HomeCell =
  | { kind: "app"; app: HomeApp }
  | { kind: "folder"; folder: HomeFolderView };

/**
 * A stable string identity for a home entry, used for drag state and dock
 * membership. Installed apps and shortcuts live in separate id spaces, so the
 * kind is part of the key.
 */
export function homeEntryKey(entry: HomeApp): string {
  return entry.kind === "shortcut"
    ? `shortcut:${entry.shortcutId?.toString() ?? ""}`
    : `app:${entry.installedId.toString()}`;
}

/**
 * Encode a home entry as a dock id. Installed apps keep their raw non-negative
 * id; shortcuts are encoded as `-(id + 1)` so the two id spaces never collide
 * inside the backend's single `Id[]` dock list.
 */
export function toDockId(entry: HomeApp): Id {
  if (entry.kind === "shortcut" && entry.shortcutId !== undefined) {
    return -(entry.shortcutId + 1n);
  }
  return entry.installedId;
}

/** Decode a dock id back into the entry kind and its raw id. */
export function fromDockId(id: Id): { kind: "app" | "shortcut"; id: Id } {
  return id < 0n ? { kind: "shortcut", id: -id - 1n } : { kind: "app", id };
}

export type { BackendAppEntry, Id, Shortcut };
