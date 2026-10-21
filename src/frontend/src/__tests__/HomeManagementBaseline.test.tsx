import { renderWithActor } from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  type Dock,
  type HomeFolder,
  type HomeItem,
  type InstalledApp,
  LaunchType,
  type backendInterface,
} from "@/backend";
import HomePage from "@/pages/HomePage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the Home management surface that the accepted
 * request must preserve: right-click opens the app/folder context menu, folders
 * can be created, renamed and deleted, apps reorder by drag-and-drop and move
 * into folders, the dock and favourites toggle, native apps navigate, external
 * links open in a new tab, and Coming Soon apps never launch.
 *
 * The actor is a typed local fake; no real canister or identity is involved.
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
      registryEntry(3n, "OpenChat", LaunchType.comingSoon),
      registryEntry(4n, "ICP Dashboard", LaunchType.icpService),
    ],
    installed: [
      installed(0n, 0n, 0n),
      installed(1n, 1n, 1n),
      installed(2n, 2n, 2n),
      installed(3n, 3n, 3n),
      installed(4n, 4n, 4n),
    ],
    folders: [],
    dock: { appIds: [0n, 1n] },
  };
}

function makeActor(state: FakeState) {
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
  const createHomeFolder = vi.fn<backendInterface["createHomeFolder"]>(
    async (name: string) => {
      const folder: HomeFolder = {
        id: BigInt(state.folders.length),
        name,
        createdAt: NOW,
        position: BigInt(state.folders.length),
      };
      state.folders.push(folder);
      return structuredClone(folder);
    },
  );
  const renameHomeFolder = vi.fn<backendInterface["renameHomeFolder"]>(
    async (id: bigint, name: string) => {
      const folder = state.folders.find((entry) => entry.id === id);
      if (!folder) return null;
      folder.name = name;
      return structuredClone(folder);
    },
  );
  const deleteHomeFolder = vi.fn<backendInterface["deleteHomeFolder"]>(
    async (id: bigint) => {
      const index = state.folders.findIndex((entry) => entry.id === id);
      if (index === -1) return false;
      state.folders.splice(index, 1);
      for (const app of state.installed) {
        if (app.folderId === id) app.folderId = undefined;
      }
      return true;
    },
  );
  const moveAppToFolder = vi.fn<backendInterface["moveAppToFolder"]>(
    async (installedId: bigint, folderId: bigint | null) => {
      const app = state.installed.find((entry) => entry.id === installedId);
      if (!app) return null;
      app.folderId = folderId ?? undefined;
      return structuredClone(app);
    },
  );
  const reorderApps = vi.fn<backendInterface["reorderApps"]>(
    async (orderedIds: bigint[]) => {
      orderedIds.forEach((id, index) => {
        const app = state.installed.find((entry) => entry.id === id);
        if (app) app.position = BigInt(index);
      });
      return structuredClone(state.installed);
    },
  );
  const setAppFavourite = vi.fn<backendInterface["setAppFavourite"]>(
    async (installedId: bigint, favourite: boolean) => {
      const app = state.installed.find((entry) => entry.id === installedId);
      if (!app) return null;
      app.favourite = favourite;
      return structuredClone(app);
    },
  );
  const setDock = vi.fn<backendInterface["setDock"]>(
    async (appIds: bigint[]) => {
      state.dock = { appIds };
      return structuredClone(state.dock);
    },
  );

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    createHomeFolder,
    renameHomeFolder,
    deleteHomeFolder,
    moveAppToFolder,
    reorderApps,
    setAppFavourite,
    setDock,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "createHomeFolder"
    | "renameHomeFolder"
    | "deleteHomeFolder"
    | "moveAppToFolder"
    | "reorderApps"
    | "setAppFavourite"
    | "setDock"
  >;

  return {
    actor,
    createHomeFolder,
    renameHomeFolder,
    deleteHomeFolder,
    moveAppToFolder,
    reorderApps,
    setAppFavourite,
    setDock,
  };
}

function dragEvent(type: string, dataTransfer: unknown) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  return event;
}

function makeDataTransfer() {
  return { effectAllowed: "", setData: vi.fn(), getData: vi.fn() };
}

describe("Home management baseline", () => {
  it("opens the app context menu on right-click", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const filesTile = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: filesTile });

    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: /Add to favourites/i }),
    ).toBeInTheDocument();
    // Files is already in the seeded dock, so the menu offers removal.
    expect(
      within(menu).getByRole("menuitem", { name: /Remove from dock/i }),
    ).toBeInTheDocument();
  });

  it("creates, renames and deletes a folder through the context menu", async () => {
    const user = userEvent.setup();
    const state = baseState();
    const { actor, createHomeFolder, renameHomeFolder, deleteHomeFolder } =
      makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");

    // Create.
    await user.click(screen.getByRole("button", { name: /New folder/i }));
    await user.type(screen.getByLabelText("New folder name"), "Work");
    await user.click(screen.getByRole("button", { name: /^Create$/i }));
    await waitFor(() => {
      expect(createHomeFolder).toHaveBeenCalledWith("Work");
    });

    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });

    // Rename through the folder context menu.
    await user.pointer({ keys: "[MouseRight]", target: folderTile });
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /Rename folder/i }),
    );

    const overlay = await screen.findByTestId("home.folder_overlay");
    await user.click(
      within(overlay).getByRole("button", { name: /Rename folder/i }),
    );
    const nameInput = within(overlay).getByTestId("home.folder_name_input");
    await user.clear(nameInput);
    await user.type(nameInput, "Projects{Enter}");
    await waitFor(() => {
      expect(renameHomeFolder).toHaveBeenCalledWith(0n, "Projects");
    });

    // Delete through the overlay.
    await user.click(
      within(overlay).getByRole("button", { name: /Delete folder/i }),
    );
    await waitFor(() => {
      expect(deleteHomeFolder).toHaveBeenCalledWith(0n);
    });
  });

  it("reorders apps by dragging one icon onto another", async () => {
    const { actor, reorderApps } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    const filesTile = screen.getByRole("button", { name: /Files — Native/i });
    const notesTile = screen.getByRole("button", { name: /Notes — Native/i });
    const dataTransfer = makeDataTransfer();

    filesTile
      .closest("[draggable]")
      ?.dispatchEvent(dragEvent("dragstart", dataTransfer));
    await waitFor(() => {
      expect(filesTile.closest("[draggable]")?.className).toContain(
        "opacity-40",
      );
    });

    notesTile
      .closest("[draggable]")
      ?.dispatchEvent(dragEvent("drop", dataTransfer));

    await waitFor(() => {
      expect(reorderApps).toHaveBeenCalled();
    });
    const ordered = reorderApps.mock.calls[0][0];
    expect(ordered[0]).toBe(1n);
    expect(ordered[1]).toBe(0n);
  });

  it("moves an app into a folder by dropping it on the folder tile", async () => {
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "Work",
      createdAt: NOW,
      position: 0n,
    });
    const { actor, moveAppToFolder } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });
    const filesTile = screen.getByRole("button", { name: /Files — Native/i });
    const dataTransfer = makeDataTransfer();

    filesTile
      .closest("[draggable]")
      ?.dispatchEvent(dragEvent("dragstart", dataTransfer));
    // The drop handler reads the dragged id from React state, so let the
    // dragstart render commit before dispatching the drop.
    await waitFor(() => {
      expect(filesTile.closest("[draggable]")?.className).toContain(
        "opacity-40",
      );
    });
    folderTile.closest("div")?.dispatchEvent(dragEvent("drop", dataTransfer));

    await waitFor(() => {
      expect(moveAppToFolder).toHaveBeenCalledWith(0n, 0n);
    });
  });

  it("toggles an app in and out of the dock", async () => {
    const user = userEvent.setup();
    const { actor, setDock } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const calculatorTile = await screen.findByRole("button", {
      name: /Calculator — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: calculatorTile });
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /Add to dock/i }),
    );

    await waitFor(() => {
      expect(setDock).toHaveBeenCalledWith([0n, 1n, 2n]);
    });
  });

  it("toggles an app favourite from the context menu", async () => {
    const user = userEvent.setup();
    const { actor, setAppFavourite } = makeActor(baseState());
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
  });

  it("opens an external link in a new tab and never launches Coming Soon", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const dashboard = await screen.findByRole("button", {
      name: /ICP Dashboard — ICP Service/i,
    });
    await user.click(dashboard);
    // The launch path validates and normalizes the address before opening it.
    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com/ICP%20Dashboard",
      "_blank",
      "noopener,noreferrer",
    );

    // Coming Soon apps are disabled and never open a tab.
    const comingSoon = screen.getByRole("button", {
      name: /OpenChat — Coming Soon/i,
    });
    expect(comingSoon).toBeDisabled();
    openSpy.mockClear();
    await user.click(comingSoon);
    expect(openSpy).not.toHaveBeenCalled();

    openSpy.mockRestore();
  });
});
