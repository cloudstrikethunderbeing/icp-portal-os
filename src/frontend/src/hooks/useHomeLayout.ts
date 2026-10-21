import { createActor } from "@/backend";
import type {
  AppRegistryEntry as BackendAppEntry,
  Dock,
  HomeFolder,
  HomeItem,
  Id,
  InstalledApp,
  LaunchType,
  Shortcut,
} from "@/backend";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Home-screen layout hooks. Every read and write of the user's installed apps,
 * folders, favourites, dock and personal shortcuts goes through the backend so
 * the layout is persisted per principal and survives reloads and devices.
 */

const HOME_KEY = ["home"] as const;

/** The full home-screen payload: registry, installed apps, shortcuts, folders and dock. */
export interface HomeLayoutData {
  registry: BackendAppEntry[];
  installed: InstalledApp[];
  shortcuts: Shortcut[];
  items: HomeItem[];
  dock: Dock;
}

/**
 * The actor surface the home layout reads. `listShortcuts` is optional so the
 * layout still loads against a backend that predates personal shortcuts.
 */
interface HomeLayoutActor {
  listAppRegistry: () => Promise<BackendAppEntry[]>;
  listInstalledApps: () => Promise<InstalledApp[]>;
  listHomeItems: () => Promise<HomeItem[]>;
  getDock: () => Promise<Dock>;
  listShortcuts?: () => Promise<Shortcut[]>;
}

async function loadHomeLayout(actor: HomeLayoutActor): Promise<HomeLayoutData> {
  const [registry, installed, items, dock, shortcuts] = await Promise.all([
    actor.listAppRegistry(),
    actor.listInstalledApps(),
    actor.listHomeItems(),
    actor.getDock(),
    typeof actor.listShortcuts === "function"
      ? actor.listShortcuts()
      : Promise.resolve<Shortcut[]>([]),
  ]);
  return { registry, installed, shortcuts, items, dock };
}

/** Read the whole home-screen layout in one query. */
export function useHomeLayout() {
  const { actor, isFetching } = useActor(createActor);
  const { identity } = useInternetIdentity();
  const signedIn = !!identity && !identity.getPrincipal().isAnonymous();
  return useQuery({
    queryKey: HOME_KEY,
    queryFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return loadHomeLayout(actor as unknown as HomeLayoutActor);
    },
    enabled: signedIn && !!actor && !isFetching,
  });
}

function useInvalidateHome() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: HOME_KEY });
  };
}

/** Persist a new app order for the home grid. */
export function useReorderApps() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async (orderedIds: Id[]) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.reorderApps(orderedIds);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Move an installed app into a folder, or back to the grid with `null`. */
export function useMoveAppToFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({
      installedId,
      folderId,
    }: {
      installedId: Id;
      folderId: Id | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.moveAppToFolder(installedId, folderId);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Create a named folder on the home screen. */
export function useCreateHomeFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createHomeFolder(name);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Rename an existing home folder. */
export function useRenameHomeFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({ id, name }: { id: Id; name: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.renameHomeFolder(id, name);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Delete a home folder; its apps return to the grid. */
export function useDeleteHomeFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteHomeFolder(id);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Toggle an installed app's favourite state. */
export function useSetAppFavourite() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({
      installedId,
      favourite,
    }: {
      installedId: Id;
      favourite: boolean;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setAppFavourite(installedId, favourite);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Replace the dock's pinned entry list. */
export function useSetDock() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async (appIds: Id[]) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setDock(appIds);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Create a personal shortcut or website link on the home screen. */
export function useCreateShortcut() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({
      name,
      url,
      icon,
      launchType,
    }: {
      name: string;
      url: string;
      icon: string;
      launchType: LaunchType;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createShortcut(name, url, icon, launchType);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Rename one of the caller's own shortcuts. */
export function useRenameShortcut() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({ id, name }: { id: Id; name: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.renameShortcut(id, name);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Change the icon of one of the caller's own shortcuts. */
export function useSetShortcutIcon() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({ id, icon }: { id: Id; icon: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setShortcutIcon(id, icon);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Change the target URL of one of the caller's own shortcuts. */
export function useSetShortcutUrl() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({ id, url }: { id: Id; url: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setShortcutUrl(id, url);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Favourite or unfavourite one of the caller's own shortcuts. */
export function useSetShortcutFavourite() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({
      id,
      favourite,
    }: {
      id: Id;
      favourite: boolean;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setShortcutFavourite(id, favourite);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Move one of the caller's own shortcuts into a folder, or back to the grid. */
export function useMoveShortcutToFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async ({
      id,
      folderId,
    }: {
      id: Id;
      folderId: Id | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.moveShortcutToFolder(id, folderId);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

/** Remove one of the caller's own shortcuts. */
export function useRemoveShortcut() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateHome();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.removeShortcut(id);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export type {
  BackendAppEntry,
  Dock,
  HomeFolder,
  HomeItem,
  Id,
  InstalledApp,
  LaunchType,
  Shortcut,
};
