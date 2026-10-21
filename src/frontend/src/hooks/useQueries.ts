import { ReportStatus, createActor } from "@/backend";
import type {
  AppRegistryEntry,
  BugReport,
  Dock,
  InstalledApp,
  UserSettings,
} from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Shared backend hooks. Every screen reads workspace data through these hooks so
 * loading, empty and error states stay consistent across the shell.
 *
 * The backend exposes the OQL query surface (`execute` / `schema`) plus the
 * access-control role methods; these hooks wrap exactly those methods.
 */

/**
 * Lifecycle status of a bug report, set by the workspace admin. Re-exported
 * from the generated backend binding so the UI and the canister share one
 * definition.
 */

/** The human-readable label for each report status. */
export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  [ReportStatus.open]: "Open",
  [ReportStatus.inProgress]: "In progress",
  [ReportStatus.resolved]: "Resolved",
  [ReportStatus.closed]: "Closed",
};

/** The ordered statuses shown in the admin inbox filter and status control. */
export const REPORT_STATUSES: ReportStatus[] = [
  ReportStatus.open,
  ReportStatus.inProgress,
  ReportStatus.resolved,
  ReportStatus.closed,
];

/** The caller's role in the workspace access-control system. */
export function useCallerRole() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Whether the caller holds the admin role. */
export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

/** The backend's OQL schema description, used by the AI Agent and Directory. */
export function useBackendSchema() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["backendSchema"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.schema();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Run an OQL query against the workspace data. */
export function useExecuteQuery(qJson: string, enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["execute", qJson],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.execute(qJson);
    },
    enabled: !!actor && !isFetching && enabled && qJson.length > 0,
  });
}

/** Run an OQL query on demand (for the AI Agent's submit action). */
export function useExecuteMutation() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (qJson: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.execute(qJson);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["execute"] });
    },
  });
}

/** The signed-in user's persisted workspace settings. */
export function useSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Whether the signed-in user has the wallpaper enabled. Gated on the signed-in
 * identity because `getSettings` traps for anonymous callers, and the shell
 * renders on signed-out routes too. Shares the `["settings"]` query key so the
 * Settings toggle and the shell background stay in sync.
 */
export function useWallpaperEnabled() {
  const { actor, isFetching } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const signedIn = !!identity && !identity.getPrincipal().isAnonymous();
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getSettings();
    },
    enabled: signedIn && !!actor && !isFetching,
    select: (settings) => settings.wallpaperEnabled,
  });
}

/** Persist the caller's workspace settings. */
export function useUpdateSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateSettings(settings);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

/** The caller's dock contents. */
export function useDock() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["dock"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.getDock();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Replace the caller's dock contents. */
export function useSetDock() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appIds: bigint[]) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setDock(appIds);
    },
    onSuccess: (dock: Dock) => {
      queryClient.setQueryData(["dock"], dock);
      void queryClient.invalidateQueries({ queryKey: ["dock"] });
      void queryClient.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

/** The apps installed on the caller's home screen. */
export function useInstalledApps() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["installedApps"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.listInstalledApps();
    },
    enabled: !!actor && !isFetching,
  });
}

/** The full application registry, used to resolve installed app names and icons. */
export function useAppRegistry() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["appRegistry"],
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.listAppRegistry();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Submit a bug report. The backend captures the reporting principal and the
 * timestamps; the caller supplies only the description.
 */
export function useSubmitBugReport() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (description: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.submitBugReport({ description });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bugReports"] });
    },
  });
}

/**
 * The admin bug report inbox. Only the workspace admin can read it; the query
 * is gated on the caller holding the admin role so a non-admin never issues the
 * call.
 */
export function useBugReports(enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["bugReports"],
    queryFn: async (): Promise<BugReport[]> => {
      if (!actor) return [];
      return actor.listBugReports();
    },
    enabled: !!actor && !isFetching && enabled,
  });
}

/** Change a bug report's status. Admin-only on the backend. */
export function useSetBugReportStatus() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: bigint;
      status: ReportStatus;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setBugReportStatus(id, status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bugReports"] });
    },
  });
}

export type { AppRegistryEntry, BugReport, InstalledApp, UserSettings };
export { ReportStatus };
