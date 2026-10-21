import { setIdentityForTest } from "@/__tests__/setup";
import {
  renderSignedOutWithActor,
  renderWithActor,
} from "@/__tests__/test-utils";
import type { Note, backendInterface } from "@/backend";
import NotesPage from "@/pages/NotesPage";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Notes journeys: creating a note persists it through the backend, saving an
 * edit updates it, and the empty state is shown when there are no notes. The
 * actor is a typed local fake; the rich-text editor is exercised through its
 * title field and the save action.
 */

const NOW = 1_700_000_000_000_000_000n;

function makeActor(notes: Note[] = []) {
  const listNotes = vi.fn<backendInterface["listNotes"]>(async () =>
    structuredClone(notes),
  );
  const listNoteFolders = vi.fn<backendInterface["listNoteFolders"]>(
    async () => [],
  );
  const searchNotes = vi.fn<backendInterface["searchNotes"]>(async () =>
    structuredClone(notes),
  );
  const createNote = vi.fn<backendInterface["createNote"]>(
    async (title: string, body: string, folderId: bigint | null) => {
      const note: Note = {
        id: BigInt(notes.length),
        title,
        body,
        folderId: folderId ?? undefined,
        pinned: false,
        attachments: [],
        createdAt: NOW,
        updatedAt: NOW,
      };
      notes.push(note);
      return structuredClone(note);
    },
  );
  const updateNote = vi.fn<backendInterface["updateNote"]>(
    async (
      id: bigint,
      title: string,
      body: string,
      folderId: bigint | null,
    ) => {
      const note = notes.find((entry) => entry.id === id);
      if (!note) return null;
      note.title = title;
      note.body = body;
      note.folderId = folderId ?? undefined;
      note.updatedAt = NOW + 1n;
      return structuredClone(note);
    },
  );
  const deleteNote = vi.fn<backendInterface["deleteNote"]>(async () => true);
  const setNotePinned = vi.fn<backendInterface["setNotePinned"]>(
    async () => null,
  );
  const addNoteAttachment = vi.fn<backendInterface["addNoteAttachment"]>(
    async () => null,
  );
  const removeNoteAttachment = vi.fn<backendInterface["removeNoteAttachment"]>(
    async () => null,
  );
  const createNoteFolder = vi.fn<backendInterface["createNoteFolder"]>(
    async () => ({ id: 0n, name: "", createdAt: NOW, updatedAt: NOW }),
  );
  const renameNoteFolder = vi.fn<backendInterface["renameNoteFolder"]>(
    async () => null,
  );
  const deleteNoteFolder = vi.fn<backendInterface["deleteNoteFolder"]>(
    async () => true,
  );

  const actor = {
    listNotes,
    listNoteFolders,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
    setNotePinned,
    addNoteAttachment,
    removeNoteAttachment,
    createNoteFolder,
    renameNoteFolder,
    deleteNoteFolder,
  } satisfies Pick<
    backendInterface,
    | "listNotes"
    | "listNoteFolders"
    | "searchNotes"
    | "createNote"
    | "updateNote"
    | "deleteNote"
    | "setNotePinned"
    | "addNoteAttachment"
    | "removeNoteAttachment"
    | "createNoteFolder"
    | "renameNoteFolder"
    | "deleteNoteFolder"
  >;

  return { actor, createNote, updateNote };
}

function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "abc" }),
    } as never,
    loginStatus: "success",
  });
}

describe("NotesPage", () => {
  it("shows the empty state when there are no notes", async () => {
    signIn();
    const { actor } = makeActor();
    renderWithActor(<NotesPage />, actor);

    expect(
      await screen.findByTestId("notes.list.empty_state"),
    ).toBeInTheDocument();
  });

  it("creates a note and persists it through the backend", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, createNote } = makeActor();
    renderWithActor(<NotesPage />, actor);

    await screen.findByTestId("notes.list.empty_state");
    await user.click(screen.getByTestId("notes.create_button"));

    await waitFor(() => {
      expect(createNote).toHaveBeenCalledWith("", "", null);
    });

    // The new note opens in the editor.
    expect(await screen.findByTestId("notes.editor.panel")).toBeInTheDocument();
  });

  it("saves an edited note through the backend", async () => {
    const user = userEvent.setup();
    signIn();
    const existing: Note = {
      id: 0n,
      title: "Draft",
      body: "<p>hello</p>",
      pinned: false,
      attachments: [],
      createdAt: NOW,
      updatedAt: NOW,
    };
    const { actor, updateNote } = makeActor([existing]);
    renderWithActor(<NotesPage />, actor);

    await user.click(await screen.findByTestId("notes.item.1"));
    const titleInput = await screen.findByTestId("notes.title_input");
    await user.clear(titleInput);
    await user.type(titleInput, "Renamed");
    await user.click(screen.getByTestId("notes.save_button"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalledWith(
        0n,
        "Renamed",
        "<p>hello</p>",
        null,
      );
    });
  });

  it("shows a sign-in prompt when signed out", async () => {
    const { actor } = makeActor();
    renderSignedOutWithActor(<NotesPage />, actor);

    expect(
      await screen.findByText("Sign in to open Notes"),
    ).toBeInTheDocument();
  });
});
