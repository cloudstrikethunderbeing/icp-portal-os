import { createActor } from "@/backend";
import type { AppCategory, DirectoryEntry, Id } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Directory data hooks. The registry itself is global, but favourites and
 * home-screen installs are scoped to the signed-in principal by the backend, so
 * every write invalidates the directory, favourites and home queries together.
 */

const DIRECTORY_KEY = ["directory"] as const;

/** Every query key a directory write can affect, so Home and the grid refresh. */
function invalidateDirectoryAndHome(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: DIRECTORY_KEY });
  void queryClient.invalidateQueries({ queryKey: ["home"] });
  void queryClient.invalidateQueries({ queryKey: ["homeItems"] });
  void queryClient.invalidateQueries({ queryKey: ["installedApps"] });
}

/** Browse the registry, optionally filtered by category. */
export function useDirectory(category: AppCategory | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [...DIRECTORY_KEY, category ?? "all"],
    queryFn: async (): Promise<DirectoryEntry[]> => {
      if (!actor) return [];
      return actor.listDirectory(category);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Search the registry by name or description. */
export function useDirectorySearch(term: string) {
  const { actor, isFetching } = useActor(createActor);
  const trimmed = term.trim();
  return useQuery({
    queryKey: [...DIRECTORY_KEY, "search", trimmed],
    queryFn: async (): Promise<DirectoryEntry[]> => {
      if (!actor) return [];
      return actor.searchDirectory(trimmed);
    },
    enabled: !!actor && !isFetching && trimmed.length > 0,
  });
}

/** The caller's favourited directory apps. */
export function useDirectoryFavourites() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [...DIRECTORY_KEY, "favourites"],
    queryFn: async (): Promise<DirectoryEntry[]> => {
      if (!actor) return [];
      return actor.listFavourites();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Map each installed registry app id to its home-layout id. The directory only
 * knows the registry id, but removal targets the layout id, so the two are
 * joined here.
 */
export function useInstalledAppIds() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["installedApps"],
    queryFn: async (): Promise<Map<string, Id>> => {
      if (!actor) return new Map();
      const installed = await actor.listInstalledApps();
      return new Map(installed.map((app) => [app.appId.toString(), app.id]));
    },
    enabled: !!actor && !isFetching,
  });
}

/** Favourite or unfavourite a registered app. */
export function useSetDirectoryFavourite() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appId,
      favourite,
    }: {
      appId: bigint;
      favourite: boolean;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setDirectoryFavourite(appId, favourite);
    },
    onSuccess: () => {
      invalidateDirectoryAndHome(queryClient);
    },
  });
}

/** Add a registered app to the caller's home screen. */
export function useAddToHomeScreen() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appId: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addToHomeScreen(appId);
    },
    onSuccess: () => {
      invalidateDirectoryAndHome(queryClient);
    },
  });
}

/** Remove an installed app from the caller's home screen. */
export function useRemoveFromHome() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (installedId: Id) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.uninstallApp(installedId);
    },
    onSuccess: () => {
      invalidateDirectoryAndHome(queryClient);
    },
  });
}
