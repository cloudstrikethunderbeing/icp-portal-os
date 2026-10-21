import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/lib/routes";
import AdminReportsPage from "@/pages/AdminReportsPage";
import AiAgentPage from "@/pages/AiAgentPage";
import CalculatorPage from "@/pages/CalculatorPage";
import DirectoryPage from "@/pages/DirectoryPage";
import FilesPage from "@/pages/FilesPage";
import HomePage from "@/pages/HomePage";
import NotesPage from "@/pages/NotesPage";
import SettingsPage from "@/pages/SettingsPage";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.home,
  component: HomePage,
});

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.files,
  component: FilesPage,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.notes,
  component: NotesPage,
});

const calculatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.calculator,
  component: CalculatorPage,
});

const directoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.directory,
  component: DirectoryPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.settings,
  component: SettingsPage,
});

const aiAgentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.aiAgent,
  component: AiAgentPage,
});

const adminReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: ROUTES.adminReports,
  component: AdminReportsPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  filesRoute,
  notesRoute,
  calculatorRoute,
  directoryRoute,
  settingsRoute,
  aiAgentRoute,
  adminReportsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
