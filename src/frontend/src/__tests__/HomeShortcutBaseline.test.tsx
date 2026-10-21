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
import { normalizeExternalUrl } from "@/hooks/useLaunchApp";
import HomePage from "@/pages/HomePage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the Home management surface that the accepted
 * shortcut-management request must preserve:
 *  - the address validator that guards every external launch and shortcut save
 *  - the context menu's dismissal contract (Escape and outside click)
 *  - the existing favourite and dock actions still reachable from the menu
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
    setAppFavourite,
    setDock,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "setAppFavourite"
    | "setDock"
  >;

  return { actor, setAppFavourite, setDock };
}

describe("normalizeExternalUrl", () => {
  it("accepts http and https addresses unchanged", () => {
    expect(normalizeExternalUrl("https://dfinity.org")).toBe(
      "https://dfinity.org/",
    );
    expect(normalizeExternalUrl("http://example.com/path")).toBe(
      "http://example.com/path",
    );
  });

  it("upgrades a bare host to https", () => {
    expect(normalizeExternalUrl("example.com")).toBe("https://example.com/");
  });

  it("rejects an empty or whitespace-only address", () => {
    expect(normalizeExternalUrl("")).toBeNull();
    expect(normalizeExternalUrl("   ")).toBeNull();
  });

  it("rejects a non-http scheme", () => {
    expect(normalizeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalUrl("ftp://example.com")).toBeNull();
  });

  it("rejects a host without a dot that is not localhost", () => {
    expect(normalizeExternalUrl("notahost")).toBeNull();
    expect(normalizeExternalUrl("localhost")).toBe("https://localhost/");
  });
});

describe("Home context menu dismissal", () => {
  it("closes on Escape", async () => {
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

  it("closes on an outside pointer press", async () => {
    const user = userEvent.setup();
    const { actor } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const filesTile = await screen.findByRole("button", {
      name: /Files — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: filesTile });
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByRole("heading", { name: "Home" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});

describe("Home context menu existing actions", () => {
  it("still toggles a favourite and closes the menu", async () => {
    const user = userEvent.setup();
    const { actor, setAppFavourite } = makeActor(baseState());
    renderWithActor(<HomePage />, actor);

    const notesTile = await screen.findByRole("button", {
      name: /Notes — Native/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: notesTile });
    const menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: /Add to favourites/i }),
    );

    await waitFor(() => {
      expect(setAppFavourite).toHaveBeenCalledWith(1n, true);
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("still adds an app to the dock from the menu", async () => {
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
      expect(setDock).toHaveBeenCalledWith([0n, 2n]);
    });
  });
});
