import type {
  AppRegistryEntry as BackendAppEntry,
  DirectoryEntry,
  LaunchType,
  Shortcut,
} from "@/backend";
import { Availability } from "@/backend";
import type { HomeApp, HomeEntryState } from "@/components/home/types";
import {
  APP_REGISTRY,
  getShortcutGradient,
  getShortcutIcon,
} from "@/lib/appRegistry";
import type { AppLaunchType } from "@/types";
import {
  Bot,
  Calculator,
  FileText,
  FolderOpen,
  Globe,
  Image,
  LayoutGrid,
  type LucideIcon,
  NotebookPen,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * Visual layer for backend registry entries. The backend owns identity, launch
 * type and target; the frontend owns how each app looks. Entries are matched to
 * the frontend registry by name so a single visual definition serves both the
 * static shell and the persisted home layout.
 */

interface AppVisual {
  icon: LucideIcon;
  gradient: string;
  route?: string;
}

const VISUALS_BY_NAME: Record<string, AppVisual> = {
  Files: {
    icon: FolderOpen,
    gradient: "from-primary to-accent",
    route: "/files",
  },
  Notes: {
    icon: NotebookPen,
    gradient: "from-accent to-primary",
    route: "/notes",
  },
  Calculator: {
    icon: Calculator,
    gradient: "from-chart-3 to-accent",
    route: "/calculator",
  },
  Settings: {
    icon: Settings,
    gradient: "from-muted-foreground to-foreground",
    route: "/settings",
  },
  "App Directory": {
    icon: LayoutGrid,
    gradient: "from-chart-4 to-chart-3",
    route: "/directory",
  },
  "Internet Identity": {
    icon: Sparkles,
    gradient: "from-accent to-chart-3",
  },
  NNS: { icon: ShieldCheck, gradient: "from-primary to-chart-5" },
  OpenChat: { icon: Bot, gradient: "from-chart-5 to-primary" },
  Wallet: { icon: Wallet, gradient: "from-chart-4 to-chart-3" },
  "AI Agent": { icon: Bot, gradient: "from-chart-5 to-primary" },
  Documents: { icon: FileText, gradient: "from-chart-2 to-primary" },
  Spreadsheet: { icon: Table2, gradient: "from-chart-3 to-accent" },
  Media: { icon: Image, gradient: "from-chart-5 to-chart-2" },
  Browser: { icon: Globe, gradient: "from-chart-2 to-primary" },
  Developer: { icon: Wrench, gradient: "from-muted-foreground to-foreground" },
};

const FALLBACK_VISUAL: AppVisual = {
  icon: Globe,
  gradient: "from-primary to-accent",
};

/** Resolve the icon, gradient and native route for a backend registry entry. */
export function getAppVisual(entry: BackendAppEntry): AppVisual {
  const byName = VISUALS_BY_NAME[entry.name];
  if (byName) return byName;
  const byRegistry = APP_REGISTRY.find((app) => app.name === entry.name);
  if (byRegistry) {
    return {
      icon: byRegistry.icon,
      gradient: byRegistry.gradient,
      route: byRegistry.route,
    };
  }
  return FALLBACK_VISUAL;
}

/** Map the backend launch-type enum onto the frontend launch-type union. */
export function toFrontendLaunchType(launchType: LaunchType): AppLaunchType {
  switch (launchType) {
    case "native":
      return "native";
    case "icpService":
      return "icp-service";
    case "externalWeb":
      return "external-web";
    case "comingSoon":
      return "coming-soon";
    default:
      return "coming-soon";
  }
}

/** Map the backend availability enum onto the frontend entry state. */
export function toHomeEntryState(availability: Availability): HomeEntryState {
  switch (availability) {
    case Availability.installed:
      return "installed";
    case Availability.comingSoon:
      return "coming-soon";
    case Availability.available:
      return "available";
    default:
      return "available";
  }
}

/**
 * Join a backend shortcut with its visual layer. The persisted `icon` field
 * carries the icon key; the colour key is derived from the same value so a
 * shortcut keeps a stable look across reloads. A shortcut is always installed
 * on the user's own Home screen, so its state is `installed`.
 */
export function toShortcutHomeApp(shortcut: Shortcut): HomeApp {
  return {
    kind: "shortcut",
    installedId: shortcut.id,
    shortcutId: shortcut.id,
    appId: shortcut.id,
    name: shortcut.name,
    description: shortcut.url,
    launchType: toFrontendLaunchType(shortcut.launchType),
    state: "installed",
    icon: getShortcutIcon(shortcut.icon),
    gradient: getShortcutGradient(shortcut.icon),
    href: shortcut.url.length > 0 ? shortcut.url : undefined,
    iconKey: shortcut.icon,
    colorKey: shortcut.icon,
    favourite: shortcut.favourite,
    folderId: shortcut.folderId,
    position: shortcut.position,
  };
}

/**
 * Join a directory entry with its visual layer so a directory card carries the
 * same launch type, availability state and icon as the Home grid.
 */
export function toDirectoryHomeApp(entry: DirectoryEntry): HomeApp {
  const visual = getAppVisual(entry.app);
  return {
    kind: "app",
    installedId: entry.app.id,
    appId: entry.app.id,
    name: entry.app.name,
    description: entry.app.description,
    launchType: toFrontendLaunchType(entry.app.launchType),
    state: toHomeEntryState(entry.availability),
    icon: visual.icon,
    gradient: visual.gradient,
    route: visual.route,
    href: entry.app.url.length > 0 ? entry.app.url : undefined,
    favourite: entry.favourite,
    position: 0n,
  };
}
