import type { NavDestination } from "@/types";
import {
  Bot,
  Calculator,
  FolderOpen,
  Home,
  LayoutGrid,
  NotebookPen,
  Settings,
  ShieldAlert,
} from "lucide-react";

/**
 * The route table — every screen the shell can render. Page tasks consume these
 * paths; the router in App.tsx registers a component for each.
 */
export const ROUTES = {
  home: "/",
  files: "/files",
  notes: "/notes",
  calculator: "/calculator",
  directory: "/directory",
  settings: "/settings",
  aiAgent: "/ai-agent",
  adminReports: "/admin/reports",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Primary navigation destinations shown in the sidebar and bottom navigation. */
export const NAV_DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Home", icon: Home, to: ROUTES.home },
  { id: "files", label: "Files", icon: FolderOpen, to: ROUTES.files },
  { id: "notes", label: "Notes", icon: NotebookPen, to: ROUTES.notes },
  {
    id: "calculator",
    label: "Calculator",
    icon: Calculator,
    to: ROUTES.calculator,
  },
  {
    id: "ai-agent",
    label: "AI Agent",
    icon: Bot,
    to: ROUTES.aiAgent,
  },
  {
    id: "directory",
    label: "Directory",
    icon: LayoutGrid,
    to: ROUTES.directory,
  },
  { id: "settings", label: "Settings", icon: Settings, to: ROUTES.settings },
];

/**
 * The admin-only bug report inbox destination. It is deliberately kept out of
 * `NAV_DESTINATIONS` so it never appears in the primary navigation; the layout
 * renders it only for a caller holding the admin role.
 */
export const ADMIN_NAV_DESTINATION: NavDestination = {
  id: "admin-reports",
  label: "Bug reports",
  icon: ShieldAlert,
  to: ROUTES.adminReports,
};
