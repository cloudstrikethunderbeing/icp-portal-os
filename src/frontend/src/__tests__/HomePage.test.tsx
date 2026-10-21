import {
  renderSignedOutWithActor,
  renderWithActor,
} from "@/__tests__/test-utils";
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
 * Home screen journeys: the grid renders installed apps with names, search
 * filters them, a folder can be created and opened, and launching a native app
 * navigates. The backend is a typed local fake; no real canister is involved.
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
    | "moveAppToFolder"
    | "reorderApps"
    | "setAppFavourite"
    | "setDock"
  >;

  return { actor, createHomeFolder, moveAppToFolder, reorderApps };
}

function baseState(): FakeState {
  return {
    registry: [
      registryEntry(0n, "Files"),
      registryEntry(1n, "Notes"),
      registryEntry(2n, "Calculator"),
      registryEntry(3n, "OpenChat", LaunchType.comingSoon),
    ],
    installed: [
      installed(0n, 0n, 0n),
      installed(1n, 1n, 1n),
      installed(2n, 2n, 2n),
      installed(3n, 3n, 3n),
    ],
    folders: [],
    dock: { appIds: [0n, 1n] },
  };
}

describe("HomePage", () => {
  it("renders installed apps as named icons and labels Coming Soon apps", async () => {
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    expect(await screen.findByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Calculator")).toBeInTheDocument();

    const comingSoon = screen.getByRole("button", {
      name: /OpenChat — Coming Soon/i,
    });
    expect(comingSoon).toBeDisabled();
    expect(within(comingSoon).getByText("Soon")).toBeInTheDocument();
  });

  it("filters the grid by app name and shows a no-results state", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    await user.type(screen.getByLabelText("Search apps by name"), "calc");

    await waitFor(() => {
      expect(screen.queryByText("Files")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Calculator")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search apps by name"));
    await user.type(screen.getByLabelText("Search apps by name"), "zzz");
    expect(await screen.findByText(/No apps match/i)).toBeInTheDocument();
  });

  it("shows the registry grid and a sign-in entry point when signed out", async () => {
    const { actor } = makeActor(baseState());
    renderSignedOutWithActor(<HomePage />, actor);

    // The signed-out Home renders the static registry, not the private layout.
    const signedOut = await screen.findByTestId("home.signed_out_state");
    expect(within(signedOut).getByText("Files")).toBeInTheDocument();
    expect(within(signedOut).getByText("Notes")).toBeInTheDocument();
    expect(
      within(signedOut).getByRole("button", {
        name: /Sign in with Internet Identity/i,
      }),
    ).toBeInTheDocument();
    // The private grid and its search are not rendered while signed out.
    expect(screen.queryByTestId("home.app_grid")).not.toBeInTheDocument();
  });

  it("distinguishes Native, ICP Service and External Web launch types", async () => {
    const state = baseState();
    state.registry.push(
      registryEntry(4n, "ICP Dashboard", LaunchType.icpService),
      registryEntry(5n, "IC Explorer", LaunchType.externalWeb),
    );
    state.installed.push(installed(4n, 4n, 4n), installed(5n, 5n, 5n));
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const native = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    expect(within(native).getByText("Native")).toBeInTheDocument();

    const icpService = screen.getByRole("button", {
      name: /ICP Dashboard — ICP Service/i,
    });
    expect(within(icpService).getByText("ICP Service")).toBeInTheDocument();

    const externalWeb = screen.getByRole("button", {
      name: /IC Explorer — External Web/i,
    });
    expect(within(externalWeb).getByText("External Web")).toBeInTheDocument();
  });

  it("creates a folder and opens it to show its apps", async () => {
    const user = userEvent.setup();
    const state = baseState();
    const { actor, createHomeFolder, moveAppToFolder } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");

    await user.click(screen.getByRole("button", { name: /New folder/i }));
    await user.type(screen.getByLabelText("New folder name"), "Work");
    await user.click(screen.getByRole("button", { name: /^Create$/i }));

    await waitFor(() => {
      expect(createHomeFolder).toHaveBeenCalledWith("Work");
    });

    // The folder tile appears once the layout query refetches.
    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });

    // Move Files into the folder through the context menu.
    const filesTile = screen.getByRole("button", { name: /Files — Native/i });
    await user.pointer({
      keys: "[MouseRight]",
      target: filesTile,
    });
    const menu = await screen.findByRole("menu");
    await user.click(within(menu).getByText("Work"));

    await waitFor(() => {
      expect(moveAppToFolder).toHaveBeenCalledWith(0n, 0n);
    });

    await user.click(folderTile);
    const overlay = await screen.findByTestId("home.folder_overlay");
    expect(within(overlay).getByText("Files")).toBeInTheDocument();
  });

  it("reorders apps when one icon is dropped onto another", async () => {
    const { actor, reorderApps } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    const filesTile = screen.getByRole("button", { name: /Files — Native/i });
    const notesTile = screen.getByRole("button", { name: /Notes — Native/i });

    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      getData: vi.fn(),
    };

    // jsdom does not carry dataTransfer through events; attach it explicitly.
    const dragStart = new Event("dragstart", { bubbles: true });
    Object.defineProperty(dragStart, "dataTransfer", { value: dataTransfer });
    filesTile.closest("[draggable]")?.dispatchEvent(dragStart);

    // The drop handler reads the dragged id from React state, so let the
    // dragstart render commit before dispatching the drop.
    await waitFor(() => {
      expect(filesTile.closest("[draggable]")?.className).toContain(
        "opacity-40",
      );
    });

    const drop = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
    notesTile.closest("[draggable]")?.dispatchEvent(drop);

    await waitFor(() => {
      expect(reorderApps).toHaveBeenCalled();
    });
    const ordered = reorderApps.mock.calls[0][0];
    expect(ordered[0]).toBe(1n);
    expect(ordered[1]).toBe(0n);
  });
});
