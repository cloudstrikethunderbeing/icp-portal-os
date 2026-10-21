import type {
  AppRegistryEntry,
  ShortcutColorKey,
  ShortcutIconKey,
} from "@/types";
import {
  Bolt,
  BookOpen,
  Bookmark,
  Bot,
  Calculator,
  Camera,
  Cloud,
  Code,
  Compass,
  FolderOpen,
  Gamepad2,
  Globe,
  Heart,
  LayoutGrid,
  Link2,
  type LucideIcon,
  MessageCircle,
  Music,
  NotebookPen,
  Rocket,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Video,
  Wallet,
} from "lucide-react";

/**
 * The workspace app registry — the single source of truth for every launchable
 * app. Adding a future application means adding one entry here; the Home screen,
 * dock, directory and navigation all read from this table.
 *
 * External and ICP-service targets are verified addresses: Internet Identity
 * points at its current official domain (`https://id.ai`) rather than the legacy
 * `identity.ic0.app`, and MULTI/DEX at `https://multidex.ai`.
 */
export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    id: "files",
    name: "Files",
    description: "Browse and manage your workspace files.",
    launchType: "native",
    icon: FolderOpen,
    gradient: "from-primary to-accent",
    route: "/files",
    dock: true,
    favourite: true,
  },
  {
    id: "notes",
    name: "Notes",
    description: "Capture quick notes and ideas.",
    launchType: "native",
    icon: NotebookPen,
    gradient: "from-accent to-primary",
    route: "/notes",
    dock: true,
    favourite: true,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Everyday arithmetic with history.",
    launchType: "native",
    icon: Calculator,
    gradient: "from-chart-3 to-accent",
    route: "/calculator",
    dock: true,
    favourite: true,
  },
  {
    id: "ai-agent",
    name: "AI Agent",
    description: "Ask questions about your workspace.",
    launchType: "native",
    icon: Bot,
    gradient: "from-chart-5 to-primary",
    route: "/ai-agent",
    dock: true,
    favourite: true,
  },
  {
    id: "directory",
    name: "App Directory",
    description: "Discover ICP services and web apps.",
    launchType: "native",
    icon: LayoutGrid,
    gradient: "from-chart-4 to-chart-3",
    route: "/directory",
    dock: true,
  },
  {
    id: "settings",
    name: "Settings",
    description: "Manage your workspace and identity.",
    launchType: "native",
    icon: Settings,
    gradient: "from-muted-foreground to-foreground",
    route: "/settings",
    dock: true,
  },
  {
    id: "icp-dashboard",
    name: "ICP Dashboard",
    description: "Official Internet Computer network dashboard.",
    launchType: "icp-service",
    icon: Globe,
    gradient: "from-primary to-chart-5",
    href: "https://dashboard.internetcomputer.org",
  },
  {
    id: "icp-identity",
    name: "Internet Identity",
    description: "Manage your Internet Identity anchors.",
    launchType: "icp-service",
    icon: Sparkles,
    gradient: "from-accent to-chart-3",
    href: "https://id.ai",
  },
  {
    id: "icp-explorer",
    name: "IC Explorer",
    description:
      "Explore Internet Computer canisters, transactions and blocks.",
    launchType: "external-web",
    icon: Globe,
    gradient: "from-chart-2 to-primary",
    href: "https://www.icexplorer.io/",
  },
  {
    id: "multidex",
    name: "MULTI/DEX",
    description: "Verifiable on-chain order-book exchange.",
    launchType: "external-web",
    icon: Rocket,
    gradient: "from-chart-5 to-chart-2",
    href: "https://multidex.ai",
  },
  {
    id: "caffeine",
    name: "Caffeine",
    description: "Build and host apps on the Internet Computer.",
    launchType: "external-web",
    icon: Sparkles,
    gradient: "from-primary to-accent",
    href: "https://caffeine.ai",
  },
  {
    id: "openchat",
    name: "OpenChat",
    description: "Decentralised messaging on the IC.",
    launchType: "coming-soon",
    icon: Bot,
    gradient: "from-muted to-secondary",
  },
];

/** Look up a registry entry by its stable id. */
export function getAppById(id: string): AppRegistryEntry | undefined {
  return APP_REGISTRY.find((app) => app.id === id);
}

/** Native apps that render inside the shell. */
export const NATIVE_APPS: AppRegistryEntry[] = APP_REGISTRY.filter(
  (app) => app.launchType === "native",
);

/** Apps pinned to the dock by default. */
export const DOCK_APPS: AppRegistryEntry[] = APP_REGISTRY.filter(
  (app) => app.dock,
);

/** Human-readable label for each launch type. */
export const LAUNCH_TYPE_LABEL: Record<AppRegistryEntry["launchType"], string> =
  {
    native: "Native",
    "icp-service": "ICP Service",
    "external-web": "External Web",
    "coming-soon": "Coming Soon",
  };

/** The curated icon set offered by the shortcut icon picker. */
export const SHORTCUT_ICONS: Record<ShortcutIconKey, LucideIcon> = {
  globe: Globe,
  link: Link2,
  star: Star,
  bookmark: Bookmark,
  rocket: Rocket,
  bolt: Bolt,
  heart: Heart,
  music: Music,
  video: Video,
  shopping: ShoppingBag,
  wallet: Wallet,
  code: Code,
  book: BookOpen,
  camera: Camera,
  gamepad: Gamepad2,
  message: MessageCircle,
  cloud: Cloud,
  compass: Compass,
};

/** The ordered icon keys shown in the picker. */
export const SHORTCUT_ICON_KEYS = Object.keys(
  SHORTCUT_ICONS,
) as ShortcutIconKey[];

/** The curated colour set offered by the shortcut icon picker. */
export const SHORTCUT_COLORS: Record<ShortcutColorKey, string> = {
  primary: "from-primary to-accent",
  accent: "from-accent to-primary",
  emerald: "from-chart-3 to-accent",
  amber: "from-chart-4 to-chart-3",
  rose: "from-chart-5 to-primary",
  violet: "from-chart-5 to-chart-2",
  sky: "from-chart-2 to-primary",
  slate: "from-muted-foreground to-foreground",
};

/** The ordered colour keys shown in the picker. */
export const SHORTCUT_COLOR_KEYS = Object.keys(
  SHORTCUT_COLORS,
) as ShortcutColorKey[];

/** The default icon key for a new shortcut. */
export const DEFAULT_SHORTCUT_ICON: ShortcutIconKey = "globe";

/** The default colour key for a new shortcut. */
export const DEFAULT_SHORTCUT_COLOR: ShortcutColorKey = "primary";

/** Resolve an icon key to its lucide icon, falling back to the globe. */
export function getShortcutIcon(key: string): LucideIcon {
  return SHORTCUT_ICONS[key as ShortcutIconKey] ?? Globe;
}

/** Resolve a colour key to its gradient classes, falling back to primary. */
export function getShortcutGradient(key: string): string {
  return SHORTCUT_COLORS[key as ShortcutColorKey] ?? SHORTCUT_COLORS.primary;
}
