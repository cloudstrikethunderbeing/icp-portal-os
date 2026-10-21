import { setIdentityForTest } from "@/__tests__/setup";
import {
  renderSignedOutWithActor,
  renderWithActor,
} from "@/__tests__/test-utils";
import {
  type Folder,
  type ListingItem,
  SortKey,
  SortOrder,
  StorageSection,
  type backendInterface,
} from "@/backend";
import FilesPage from "@/pages/FilesPage";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Files journeys: the empty state, creating a folder that then appears in the
 * listing, and the signed-out prompt. The actor is a typed local fake; the
 * folder listing is served from an in-memory array so a create is observable.
 */

const NOW = 1_700_000_000_000_000_000n;

function folder(id: bigint, name: string): Folder {
  return {
    id,
    name,
    createdAt: NOW,
    updatedAt: NOW,
    section: StorageSection.local,
  };
}

function makeActor(initial: Folder[] = []) {
  const folders = [...initial];
  const listing = (): ListingItem[] =>
    folders.map((entry) => ({ __kind__: "folder", folder: entry }));

  const sortFolder = vi.fn<backendInterface["sortFolder"]>(async () =>
    structuredClone(listing()),
  );
  const listFolder = vi.fn<backendInterface["listFolder"]>(async () =>
    structuredClone(listing()),
  );
  const searchFiles = vi.fn<backendInterface["searchFiles"]>(async () =>
    structuredClone(listing()),
  );
  const createFolder = vi.fn<backendInterface["createFolder"]>(
    async (name: string) => {
      const created = folder(BigInt(folders.length), name);
      folders.push(created);
      return structuredClone(created);
    },
  );

  const actor = {
    sortFolder,
    listFolder,
    searchFiles,
    createFolder,
  } satisfies Pick<
    backendInterface,
    "sortFolder" | "listFolder" | "searchFiles" | "createFolder"
  >;

  return { actor, createFolder };
}

function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "abc" }),
    } as never,
    loginStatus: "success",
  });
}

describe("FilesPage", () => {
  it("shows the empty state when the folder has no items", async () => {
    signIn();
    const { actor } = makeActor();
    renderWithActor(<FilesPage />, actor);

    expect(await screen.findByTestId("files.empty_state")).toBeInTheDocument();
  });

  it("creates a folder and shows it in the listing", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, createFolder } = makeActor();
    renderWithActor(<FilesPage />, actor);

    await screen.findByTestId("files.empty_state");
    await user.click(screen.getByTestId("files.new_folder_button"));
    await user.type(screen.getByTestId("files.new_folder_input"), "Reports");
    await user.click(screen.getByTestId("files.new_folder_save_button"));

    await waitFor(() => {
      expect(createFolder).toHaveBeenCalledWith(
        "Reports",
        null,
        StorageSection.local,
      );
    });
    expect(await screen.findByText("Reports")).toBeInTheDocument();
  });

  it("lists existing folders and opens one", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor } = makeActor([folder(0n, "Photos")]);
    renderWithActor(<FilesPage />, actor);

    expect(await screen.findByText("Photos")).toBeInTheDocument();
    await user.click(screen.getByTestId("files.open_folder_button.1"));

    // The breadcrumb now includes the opened folder.
    await waitFor(() => {
      expect(screen.getByTestId("files.breadcrumb")).toHaveTextContent(
        "Photos",
      );
    });
  });

  it("shows a sign-in prompt when signed out", async () => {
    const { actor } = makeActor();
    renderSignedOutWithActor(<FilesPage />, actor);

    expect(
      await screen.findByText("Sign in to open your files"),
    ).toBeInTheDocument();
  });
});
