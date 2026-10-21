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
 * Characterization baseline for the Home context menu's dismissal and action
 * behavior that the accepted request must preserve while the menu is portaled
 * above the folder window:
 *  - Escape closes the menu
 *  - a pointerdown outside the menu closes it
 *  - the menu still performs its action and then closes
 *  - the folder menu still offers rename and delete
 *
 * The intentional change (portaling the menu so it paints above overlays) is NOT
 * asserted here. The actor is a typed local fake; no real canister is involved.
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
  const setAppFavourite = vi.fn<backendInterface["setAppFavourite"]>(
    async (installedId: bigint, favourite: boolean) => {
      const app = state.installed.find((entry) => entry.id === installedId);
      if (!app) return null;
      app.favourite = favourite;
      return structuredClone(app);
    },
  );
  const deleteHomeFolder = vi.fn<backendInterface["deleteHomeFolder"]>(
    async (id: bigint) => {
      const index = state.folders.findIndex((entry) => entry.id === id);
      if (index === -1) return false;
      state.folders.splice(index, 1);
      return true;
    },
  );

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    setAppFavourite,
    deleteHomeFolder,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "setAppFavourite"
    | "deleteHomeFolder"
  >;

  return { actor, setAppFavourite, deleteHomeFolder };
}

describe("Home context menu dismissal baseline", () => {
  it("closes the menu on Escape", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const filesTile = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: filesTile });
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("closes the menu on a pointerdown outside it", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const filesTile = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: filesTile });
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    // A pointerdown on the page heading is outside the menu.
    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByRole("heading", { name: "Home" }),
    });
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("still performs the favourite action from the menu", async () => {
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
    // The menu closes after the action.
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});

describe("Home folder overlay context menu baseline", () => {
  it("offers rename and delete for a folder from its context menu", async () => {
    const user = userEvent.setup();
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "Work",
      createdAt: NOW,
      position: 0n,
    });
    const { actor, deleteHomeFolder } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: folderTile });

    const menu = await screen.findByRole("menu");
    expect(
      within(menu).getByRole("menuitem", { name: /Rename folder/i }),
    ).toBeInTheDocument();
    await user.click(
      within(menu).getByRole("menuitem", { name: /Delete folder/i }),
    );

    await waitFor(() => {
      expect(deleteHomeFolder).toHaveBeenCalledWith(0n);
    });
  });
});
