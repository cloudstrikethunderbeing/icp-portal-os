import {
  type FileEntry,
  type FileRef,
  type Folder,
  type Id,
  type ListingItem,
  type SortKey,
  type SortOrder,
  type StorageSection,
  createActor,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Files domain hooks. Every read and write for the Files app goes through these
 * hooks so the browser, search and sort surfaces share one cache and one
 * invalidation strategy.
 */

/** The query key prefix for every folder listing. */
const FILES_KEY = "files";

/** List the direct children of a folder in a storage section. */
export function useFolderListing(parentId: Id | null, section: StorageSection) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [FILES_KEY, "listing", section, parentId?.toString() ?? "root"],
    queryFn: async (): Promise<ListingItem[]> => {
      if (!actor) return [];
      return actor.listFolder(parentId, section);
    },
    enabled: !!actor && !isFetching,
  });
}

/** List a folder's children sorted by the backend's sort contract. */
export function useSortedFolder(
  parentId: Id | null,
  section: StorageSection,
  key: SortKey,
  order: SortOrder,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [
      FILES_KEY,
      "sorted",
      section,
      parentId?.toString() ?? "root",
      key,
      order,
    ],
    queryFn: async (): Promise<ListingItem[]> => {
      if (!actor) return [];
      return actor.sortFolder(parentId, section, key, order);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Search files by name across the caller's workspace. */
export function useFileSearch(term: string) {
  const { actor, isFetching } = useActor(createActor);
  const trimmed = term.trim();
  return useQuery({
    queryKey: [FILES_KEY, "search", trimmed],
    queryFn: async (): Promise<ListingItem[]> => {
      if (!actor) return [];
      return actor.searchFiles(trimmed);
    },
    enabled: !!actor && !isFetching && trimmed.length > 0,
  });
}

/** Create a folder in a section, optionally nested under a parent. */
export function useCreateFolder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      parentId: Id | null;
      section: StorageSection;
    }): Promise<Folder> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createFolder(input.name, input.parentId, input.section);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Upload a file: store its bytes, then record its metadata. */
export function useUploadFile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      parentId: Id | null;
      section: StorageSection;
      ref: FileRef;
    }): Promise<FileEntry> => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addFile(
        input.name,
        input.parentId,
        input.section,
        input.ref,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Rename a file. */
export function useRenameFile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: Id; name: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.renameFile(input.id, input.name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Rename a folder. */
export function useRenameFolder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: Id; name: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.renameFolder(input.id, input.name);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Move a file into a new parent folder (or the section root). */
export function useMoveFile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: Id; parentId: Id | null }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.moveFile(input.id, input.parentId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Move a folder into a new parent folder (or the section root). */
export function useMoveFolder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: Id; parentId: Id | null }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.moveFolder(input.id, input.parentId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Copy a file into a new parent folder (or the section root). */
export function useCopyFile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: Id; parentId: Id | null }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.copyFile(input.id, input.parentId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Delete a file. */
export function useDeleteFile() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteFile(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}

/** Delete a folder. */
export function useDeleteFolder() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: Id) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteFolder(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [FILES_KEY] });
    },
  });
}
