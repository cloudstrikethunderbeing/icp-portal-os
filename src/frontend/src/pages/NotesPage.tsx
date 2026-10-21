import type { FileRef, Note } from "@/backend";
import { RequireSignIn } from "@/components/InternetIdentity";
import { FolderManager } from "@/components/notes/FolderManager";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { NoteList } from "@/components/notes/NoteList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddNoteAttachment,
  useCreateNote,
  useCreateNoteFolder,
  useDeleteNote,
  useDeleteNoteFolder,
  useNoteFolders,
  useNotes,
  useRemoveNoteAttachment,
  useRenameNoteFolder,
  useSearchNotes,
  useSetNotePinned,
  useUpdateNote,
} from "@/hooks/useNotes";
import { NotebookPen, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Notes — a private, per-principal notes workspace with rich-text editing,
 * folders, search, pinning and file attachments. The whole surface is gated
 * behind Internet Identity because the backend rejects anonymous callers.
 */
export default function NotesPage() {
  return (
    <RequireSignIn
      fallback={
        <section
          data-ocid="notes.page"
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
        >
          <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-accent to-primary text-white">
            <NotebookPen className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="font-display text-xl font-semibold text-foreground">
            Sign in to open Notes
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your notes are private to your Internet Identity. Sign in from the
            top bar to view and edit them.
          </p>
        </section>
      }
    >
      <NotesWorkspace />
    </RequireSignIn>
  );
}

function NotesWorkspace() {
  const [selectedFolderId, setSelectedFolderId] = useState<bigint | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<bigint | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  const searchActive = searchTerm.trim().length > 0;

  const foldersQuery = useNoteFolders();
  const notesQuery = useNotes(selectedFolderId);
  const searchQuery = useSearchNotes(searchTerm);

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const setPinned = useSetNotePinned();
  const addAttachment = useAddNoteAttachment();
  const removeAttachment = useRemoveNoteAttachment();
  const createFolder = useCreateNoteFolder();
  const renameFolder = useRenameNoteFolder();
  const deleteFolder = useDeleteNoteFolder();

  const folders = foldersQuery.data ?? [];
  const activeQuery = searchActive ? searchQuery : notesQuery;
  const notes = activeQuery.data ?? [];

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );

  const handleCreate = () => {
    createNote.mutate(
      { title: "", body: "", folderId: selectedFolderId },
      {
        onSuccess: (note) => {
          setSelectedNoteId(note.id);
          setSearchTerm("");
        },
      },
    );
  };

  const handleDelete = (id: bigint) => {
    deleteNote.mutate(id, {
      onSuccess: () => {
        if (selectedNoteId === id) setSelectedNoteId(null);
      },
    });
  };

  const handleAddAttachment = (note: Note, ref: FileRef) => {
    addAttachment.mutate({ id: note.id, ref });
  };

  const handleRemoveAttachment = (note: Note, index: number) => {
    setRemovingIndex(index);
    removeAttachment.mutate(
      { id: note.id, index: BigInt(index) },
      { onSettled: () => setRemovingIndex(null) },
    );
  };

  return (
    <section data-ocid="notes.page" className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Notes
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Capture ideas, organise them into folders and attach files.
          </p>
        </div>
        <Button
          type="button"
          data-ocid="notes.create_button"
          disabled={createNote.isPending}
          onClick={handleCreate}
          className="rounded-full bg-gradient-primary text-primary-foreground"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New note
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="space-y-6">
          <FolderManager
            folders={folders}
            selectedId={selectedFolderId}
            onSelect={(id) => {
              setSelectedFolderId(id);
              setSelectedNoteId(null);
            }}
            onCreate={(name) => createFolder.mutate(name)}
            onRename={(id, name) => renameFolder.mutate({ id, name })}
            onDelete={(id) => {
              if (selectedFolderId === id) setSelectedFolderId(null);
              deleteFolder.mutate(id);
            }}
            creating={createFolder.isPending}
            renaming={renameFolder.isPending}
            deleting={deleteFolder.isPending}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchTerm}
              data-ocid="notes.search_input"
              placeholder="Search titles and note text"
              aria-label="Search notes"
              onChange={(event) => setSearchTerm(event.target.value)}
              className="h-11 rounded-full pl-9 pr-9"
            />
            {searchActive && (
              <button
                type="button"
                data-ocid="notes.search_clear_button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <NoteList
            notes={notes}
            selectedId={selectedNoteId}
            isLoading={activeQuery.isPending}
            isError={activeQuery.isError}
            onRetry={() => void activeQuery.refetch()}
            onSelect={(note) => setSelectedNoteId(note.id)}
            onCreate={handleCreate}
            searchActive={searchActive}
          />

          {selectedNote ? (
            <NoteEditor
              key={selectedNote.id.toString()}
              note={selectedNote}
              folders={folders}
              onSave={(input) =>
                updateNote.mutate({ id: selectedNote.id, ...input })
              }
              onDelete={() => handleDelete(selectedNote.id)}
              onTogglePin={() =>
                setPinned.mutate({
                  id: selectedNote.id,
                  pinned: !selectedNote.pinned,
                })
              }
              onAddAttachment={(ref) => handleAddAttachment(selectedNote, ref)}
              onRemoveAttachment={(index) =>
                handleRemoveAttachment(selectedNote, index)
              }
              saving={updateNote.isPending}
              deleting={deleteNote.isPending}
              pinning={setPinned.isPending}
              uploading={addAttachment.isPending}
              removingIndex={removingIndex}
              saveError={updateNote.isError}
            />
          ) : (
            notes.length > 0 && (
              <p
                data-ocid="notes.editor.empty_state"
                className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center text-sm text-muted-foreground"
              >
                Select a note to read or edit it, or create a new one.
              </p>
            )
          )}
        </div>
      </div>
    </section>
  );
}
