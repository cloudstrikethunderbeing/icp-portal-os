import { createActor } from "@/backend";
import type { FileRef, Note, NoteFolder } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Notes data layer. Every read and write goes through the per-principal notes
 * API on the backend; React Query owns caching, loading and error state.
 *
 * `folderId` is `null` for the "All notes" view and a folder id otherwise.
 */

const NOTES_KEY = "notes";
const FOLDERS_KEY = "noteFolders";

/** All notes in the caller's workspace, optionally scoped to a folder. */
export function useNotes(folderId: bigint | null) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [NOTES_KEY, folderId === null ? "all" : folderId.toString()],
    queryFn: async () => {
      if (!actor) return [] as Note[];
      return actor.listNotes(folderId);
    },
    enabled: !!actor && !isFetching,
  });
}

/** Notes matching a search term across title and body. */
export function useSearchNotes(term: string) {
  const { actor, isFetching } = useActor(createActor);
  const trimmed = term.trim();
  return useQuery({
    queryKey: [NOTES_KEY, "search", trimmed],
    queryFn: async () => {
      if (!actor) return [] as Note[];
      return actor.searchNotes(trimmed);
    },
    enabled: !!actor && !isFetching && trimmed.length > 0,
  });
}

/** The caller's note folders. */
export function useNoteFolders() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: [FOLDERS_KEY],
    queryFn: async () => {
      if (!actor) return [] as NoteFolder[];
      return actor.listNoteFolders();
    },
    enabled: !!actor && !isFetching,
  });
}

function useInvalidateNotes() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [FOLDERS_KEY] });
  };
}

export function useCreateNote() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      folderId: bigint | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createNote(input.title, input.body, input.folderId);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useUpdateNote() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: {
      id: bigint;
      title: string;
      body: string;
      folderId: bigint | null;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.updateNote(
        input.id,
        input.title,
        input.body,
        input.folderId,
      );
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDeleteNote() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteNote(id);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useSetNotePinned() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: { id: bigint; pinned: boolean }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.setNotePinned(input.id, input.pinned);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useAddNoteAttachment() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: { id: bigint; ref: FileRef }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addNoteAttachment(input.id, input.ref);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useRemoveNoteAttachment() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: { id: bigint; index: bigint }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.removeNoteAttachment(input.id, input.index);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useCreateNoteFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.createNoteFolder(name);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useRenameNoteFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (input: { id: bigint; name: string }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.renameNoteFolder(input.id, input.name);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}

export function useDeleteNoteFolder() {
  const { actor } = useActor(createActor);
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.deleteNoteFolder(id);
    },
    onSuccess: () => {
      invalidate();
    },
  });
}
