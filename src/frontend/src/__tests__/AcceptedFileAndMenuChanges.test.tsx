import { renderWithActor } from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  type Dock,
  type FileEntry,
  type FileRef,
  type HomeFolder,
  type HomeItem,
  type InstalledApp,
  LaunchType,
  type ListingItem,
  StorageSection,
  type backendInterface,
} from "@/backend";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { UploadProgress } from "@/components/files/UploadProgress";
import {
  FileTooLargeError,
  MAX_UPLOAD_BYTES,
  prepareUpload,
} from "@/components/files/upload";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import HomePage from "@/pages/HomePage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Coverage for the accepted changes in this build:
 *  - the Home context menu is portaled to document.body so it paints above the
 *    folder window and every other overlay
 *  - an over-limit upload is rejected before upload with a message naming the
 *    limit and the file size
 *  - a large image is compressed and the original/compressed sizes are shown
 *  - a non-image file is uploaded unchanged
 *  - an image preview offers fit-to-view and full-size toggling
 *  - the add-to-home-screen prompt shows platform steps and remembers dismissal
 *
 * The actor is a typed local fake; the identity context is an explicit UI-state
 * mock. Neither proves real sign-in, backend, or object-storage behavior.
 */

const NOW = 1_700_000_000_000_000_000n;

function registryEntry(
  id: bigint,
  name: string,
  launchType: AppRegistryEntry["launchType"] = LaunchType.native,
): AppRegistryEntry {
  return {
    id,
    name,
    description: `${name} description`,
    launchType,
    icon: "grid",
    url: launchType === LaunchType.native ? "" : `https://example.com/${name}`,
    permissions: [],
    requiresAuth: true,
    version: "1.0.0",
    category: AppCategory.productivity,
  };
}

function installed(
  id: bigint,
  appId: bigint,
  position: bigint,
  overrides: Partial<InstalledApp> = {},
): InstalledApp {
  return {
    id,
    appId,
    installedAt: NOW,
    position,
    favourite: false,
    ...overrides,
  };
}

interface FakeState {
  registry: AppRegistryEntry[];
  installed: InstalledApp[];
  folders: HomeFolder[];
  dock: Dock;
}

function baseState(): FakeState {
  return {
    registry: [
      registryEntry(0n, "Files"),
      registryEntry(1n, "Notes"),
      registryEntry(2n, "Calculator"),
    ],
    installed: [
      installed(0n, 0n, 0n),
      installed(1n, 1n, 1n),
      installed(2n, 2n, 2n),
    ],
    folders: [],
    dock: { appIds: [0n] },
  };
}

function makeHomeActor(state: FakeState) {
  const listAppRegistry = vi.fn<backendInterface["listAppRegistry"]>(async () =>
    structuredClone(state.registry),
  );
  const listInstalledApps = vi.fn<backendInterface["listInstalledApps"]>(
    async () => structuredClone(state.installed),
  );
  const listHomeItems = vi.fn<backendInterface["listHomeItems"]>(async () => {
    const items: HomeItem[] = [];
    for (const folder of state.folders) {
      items.push({ __kind__: "folder", folder: structuredClone(folder) });
    }
    for (const app of state.installed) {
      if (app.folderId === undefined) {
        items.push({ __kind__: "app", app: structuredClone(app) });
      }
    }
    return items;
  });
  const getDock = vi.fn<backendInterface["getDock"]>(async () =>
    structuredClone(state.dock),
  );
  const setAppFavourite = vi.fn<backendInterface["setAppFavourite"]>(
    async (installedId: bigint, favourite: boolean) => {
      const app = state.installed.find((entry) => entry.id === installedId);
      if (!app) return null;
      app.favourite = favourite;
      return structuredClone(app);
    },
  );

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    setAppFavourite,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "setAppFavourite"
  >;

  return { actor, setAppFavourite };
}

/** A minimal stand-in for the object-storage ExternalBlob the app reads. */
function fakeBlob(bytes: Uint8Array, directUrl = "blob:preview") {
  return {
    getDirectURL: () => directUrl,
    getBytes: async () => bytes,
  } as unknown as FileRef["blob"];
}

function fileEntry(
  id: bigint,
  name: string,
  mimeType: string | undefined,
  bytes: Uint8Array,
): FileEntry {
  return {
    id,
    name,
    createdAt: NOW,
    updatedAt: NOW,
    section: StorageSection.local,
    ref: {
      blob: fakeBlob(bytes),
      filename: name,
      mimeType,
      sizeBytes: BigInt(bytes.length),
    },
  };
}

function makePreviewActor(initial: ListingItem[] = []) {
  const items = [...initial];
  const listing = (): ListingItem[] =>
    items.map((item) =>
      item.__kind__ === "file"
        ? { __kind__: "file", file: { ...item.file } }
        : { __kind__: "folder", folder: { ...item.folder } },
    );
  const sortFolder = vi.fn<backendInterface["sortFolder"]>(async () =>
    listing(),
  );
  const listFolder = vi.fn<backendInterface["listFolder"]>(async () =>
    listing(),
  );
  const searchFiles = vi.fn<backendInterface["searchFiles"]>(async () =>
    listing(),
  );
  const actor = {
    sortFolder,
    listFolder,
    searchFiles,
  } satisfies Pick<
    backendInterface,
    "sortFolder" | "listFolder" | "searchFiles"
  >;
  return { actor };
}

describe("Home context menu paints above the folder window", () => {
  it("portals the menu to document.body so it escapes the folder overlay", async () => {
    const user = userEvent.setup();
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "Work",
      createdAt: NOW,
      position: 0n,
    });
    const { actor } = makeHomeActor(state);
    renderWithActor(<HomePage />, actor);

    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: folderTile });

    const menu = await screen.findByRole("menu");
    // The menu is a direct child of body, not nested inside the folder overlay
    // or the app shell's stacking context.
    expect(menu.parentElement).toBe(document.body);
    expect(menu.closest('[data-ocid="home.folder_overlay"]')).toBeNull();
  });

  it("still performs the favourite action from the portaled menu", async () => {
    const user = userEvent.setup();
    const { actor, setAppFavourite } = makeHomeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const filesTile = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: filesTile });
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /Add to favourites/i }),
    );

    await waitFor(() => {
      expect(setAppFavourite).toHaveBeenCalledWith(0n, true);
    });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});

describe("Upload size limit and compression", () => {
  it("rejects a file over the limit with a message naming the limit and size", async () => {
    // 30 MB is clearly over the 25 MB limit, so the two sizes differ in the
    // message and the assertion cannot pass on a coincidental match.
    const overLimit = new File([new Uint8Array(30 * 1024 * 1024)], "huge.bin", {
      type: "application/octet-stream",
    });

    await expect(prepareUpload(overLimit)).rejects.toBeInstanceOf(
      FileTooLargeError,
    );

    try {
      await prepareUpload(overLimit);
    } catch (error) {
      const message = (error as Error).message;
      // The message names both the file's size and the configured limit.
      expect(message).toContain("30.0 MB");
      expect(message).toContain("25.0 MB");
    }
  });

  it("uploads a non-image file unchanged", async () => {
    const bytes = new TextEncoder().encode("plain text payload");
    const file = new File([bytes], "notes.txt", { type: "text/plain" });
    // jsdom's File does not implement arrayBuffer; the app reads it directly.
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => bytes.buffer.slice(0),
    });

    const prepared = await prepareUpload(file);

    expect(prepared.compressed).toBe(false);
    expect(prepared.uploadedSize).toBe(file.size);
    expect(prepared.originalSize).toBe(file.size);
    expect(prepared.mimeType).toBe("text/plain");
    expect(Array.from(prepared.bytes)).toEqual(Array.from(bytes));
  });

  it("shows the original and compressed sizes for a compressed upload", () => {
    renderWithActor(
      <UploadProgress
        tasks={[
          {
            id: "1",
            name: "photo.png",
            progress: 100,
            status: "done",
            originalSize: 4 * 1024 * 1024,
            uploadedSize: 512 * 1024,
            compressed: true,
          },
        ]}
      />,
      makePreviewActor().actor,
    );

    const note = screen.getByTestId("files.upload_compression_note");
    expect(note).toHaveTextContent("4.0 MB");
    expect(note).toHaveTextContent("512.0 KB");
  });
});

describe("Image preview fit-to-view and full size", () => {
  it("toggles between fit-to-view and full size", async () => {
    const user = userEvent.setup();
    const file = fileEntry(0n, "photo.png", "image/png", new Uint8Array([1]));
    renderWithActor(
      <FilePreviewDialog
        file={file}
        open
        onOpenChange={() => undefined}
        onDownload={() => undefined}
      />,
      makePreviewActor().actor,
    );

    const toggle = await screen.findByTestId("files.preview_fullsize_button");
    expect(toggle).toHaveTextContent("View full size");
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(toggle).toHaveTextContent("Fit to view");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Add-to-home-screen prompt", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("shows platform-appropriate steps and stays hidden after dismissal", async () => {
    const user = userEvent.setup();
    renderWithActor(<InstallPrompt />, makePreviewActor().actor);

    const panel = await screen.findByTestId("install_prompt.panel");
    // jsdom's default user agent is not iOS/Android, so desktop steps show.
    expect(panel).toHaveTextContent("Install ICP Portal on your desktop");

    await user.click(screen.getByTestId("install_prompt.dismiss_button"));
    await waitFor(() => {
      expect(
        screen.queryByTestId("install_prompt.panel"),
      ).not.toBeInTheDocument();
    });

    // A fresh mount (as after a refresh) stays hidden for the same visitor.
    renderWithActor(<InstallPrompt />, makePreviewActor().actor);
    await waitFor(() => {
      expect(
        screen.queryByTestId("install_prompt.panel"),
      ).not.toBeInTheDocument();
    });
  });
});
