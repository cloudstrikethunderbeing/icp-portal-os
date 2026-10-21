import { setIdentityForTest } from "@/__tests__/setup";
import {
  renderSignedOutWithActor,
  renderWithActor,
} from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  Availability,
  type DirectoryEntry,
  type Dock,
  type HomeFolder,
  type HomeItem,
  type InstalledApp,
  LaunchType,
  type Shortcut,
  type backendInterface,
} from "@/backend";
import { normalizeExternalUrl } from "@/hooks/useLaunchApp";
import DirectoryPage from "@/pages/DirectoryPage";
import HomePage from "@/pages/HomePage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the registry/launch surface that the accepted
 * explorer-reconciliation request must preserve:
 *  - the signed-out Home grid renders the static registry and opens an
 *    external-web entry through the validated window.open seam
 *  - the signed-in Home grid launches an external-web entry from the backend
 *    registry url
 *  - the App Directory renders each registry entry once and opens an
 *    external-web entry through the same validated seam
 *  - a user's existing custom folders, shortcuts and dock settings survive
 *    unchanged (the additive migration must not disturb them)
 *  - the address validator accepts the target URL shape
 *
 * The actor is a typed local fake; the identity context is an explicit UI-state
 * mock. Neither proves real sign-in, real persistence or backend behavior.
 */

const NOW = 1_700_000_000_000_000_000n;

const SIGNED_IN_IDENTITY = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "aaaaa-bbbbb-ccccc-ddddd-eee",
  }),
} as never;

function registryEntry(
  id: bigint,
  name: string,
  launchType: AppRegistryEntry["launchType"] = LaunchType.native,
  url = "",
): AppRegistryEntry {
  return {
    id,
    name,
    description: `${name} description`,
    launchType,
    icon: "grid",
    url,
    permissions: [],
    requiresAuth: true,
    version: "1.0.0",
    category: AppCategory.developer,
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
  shortcuts: Shortcut[];
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
    shortcuts: [],
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
  const listShortcuts = vi.fn<backendInterface["listShortcuts"]>(async () =>
    structuredClone(state.shortcuts),
  );
  const listDirectory = vi.fn<backendInterface["listDirectory"]>(async () =>
    state.registry.map(
      (app): DirectoryEntry => ({
        app: structuredClone(app),
        installed: state.installed.some((entry) => entry.appId === app.id),
        availability: state.installed.some((entry) => entry.appId === app.id)
          ? Availability.installed
          : app.launchType === LaunchType.comingSoon
            ? Availability.comingSoon
            : Availability.available,
        favourite: false,
      }),
    ),
  );
  const searchDirectory = vi.fn<backendInterface["searchDirectory"]>(
    async (term: string) =>
      state.registry
        .filter((app) => app.name.toLowerCase().includes(term.toLowerCase()))
        .map(
          (app): DirectoryEntry => ({
            app: structuredClone(app),
            installed: state.installed.some((entry) => entry.appId === app.id),
            availability: state.installed.some(
              (entry) => entry.appId === app.id,
            )
              ? Availability.installed
              : app.launchType === LaunchType.comingSoon
                ? Availability.comingSoon
                : Availability.available,
            favourite: false,
          }),
        ),
  );
  const addToHomeScreen = vi.fn<backendInterface["addToHomeScreen"]>(
    async (appId: bigint) => {
      const app = state.registry.find((entry) => entry.id === appId);
      if (!app) return null;
      return {
        app: structuredClone(app),
        installed: true,
        availability: Availability.installed,
        favourite: false,
      };
    },
  );
  const setDirectoryFavourite = vi.fn<
    backendInterface["setDirectoryFavourite"]
  >(async () => null);

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    listShortcuts,
    listDirectory,
    searchDirectory,
    addToHomeScreen,
    setDirectoryFavourite,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "listShortcuts"
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "setDirectoryFavourite"
  >;

  return { actor };
}

function signIn() {
  setIdentityForTest({ loginStatus: "success", identity: SIGNED_IN_IDENTITY });
}

describe("normalizeExternalUrl target shape", () => {
  it("accepts the explorer target address and normalizes it", () => {
    expect(normalizeExternalUrl("https://www.icexplorer.io/")).toBe(
      "https://www.icexplorer.io/",
    );
    expect(normalizeExternalUrl("https://icpexplorer.org/")).toBe(
      "https://icpexplorer.org/",
    );
  });
});

describe("Signed-out Home registry launch", () => {
  it("renders the static registry and opens an external-web entry in a new tab", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const { actor } = makeActor(baseState());
    renderSignedOutWithActor(<HomePage />, actor);

    const signedOut = await screen.findByTestId("home.signed_out_state");
    // The static registry renders regardless of the backend actor.
    expect(within(signedOut).getByText("Files")).toBeInTheDocument();

    // IC Explorer is an external-web entry in the static registry; launching it
    // must route through the validated window.open seam.
    const explorer = within(signedOut).getByRole("button", {
      name: /IC Explorer — External Web/i,
    });
    await user.click(explorer);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [openedUrl, target, features] = openSpy.mock.calls[0];
    expect(openedUrl).toMatch(/^https:\/\//);
    expect(target).toBe("_blank");
    expect(features).toBe("noopener,noreferrer");

    openSpy.mockRestore();
  });
});

describe("Signed-in Home external launch", () => {
  it("opens an external-web app from the backend registry url", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const state = baseState();
    state.registry.push(
      registryEntry(
        3n,
        "IC Explorer",
        LaunchType.externalWeb,
        "https://www.icexplorer.io/",
      ),
    );
    state.installed.push(installed(3n, 3n, 3n));
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const tile = await screen.findByRole("button", {
      name: /IC Explorer — External Web/i,
    });
    await user.click(tile);

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.icexplorer.io/",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });
});

describe("App Directory distinct entries", () => {
  it("renders each registry entry once and opens an external-web entry", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    signIn();
    const state = baseState();
    state.registry.push(
      registryEntry(
        3n,
        "IC Explorer",
        LaunchType.externalWeb,
        "https://www.icexplorer.io/",
      ),
      registryEntry(
        4n,
        "ICP Explorer",
        LaunchType.externalWeb,
        "https://icpexplorer.org/",
      ),
    );
    const { actor } = makeActor(state);
    renderWithActor(<DirectoryPage />, actor);

    const list = await screen.findByTestId("directory.list");
    // Each explorer appears exactly once as its own card.
    expect(within(list).getAllByText("IC Explorer")).toHaveLength(1);
    expect(within(list).getAllByText("ICP Explorer")).toHaveLength(1);

    const explorerCard = within(list)
      .getByText("IC Explorer")
      .closest("article");
    expect(explorerCard).not.toBeNull();
    await user.click(
      within(explorerCard as HTMLElement).getByRole("button", {
        name: "Open",
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.icexplorer.io/",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });
});

describe("Existing user layout preservation", () => {
  it("keeps custom folders, shortcuts and dock settings unchanged", async () => {
    signIn();
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "My Stuff",
      createdAt: NOW,
      position: 0n,
    });
    state.shortcuts.push({
      id: 0n,
      name: "My link",
      url: "https://my.example.com/",
      icon: "globe",
      launchType: LaunchType.externalWeb,
      position: 0n,
      favourite: false,
      createdAt: NOW,
    });
    state.dock = { appIds: [0n, 2n] };
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    // The custom folder and shortcut render as the user left them.
    expect(
      await screen.findByRole("button", { name: /Open folder My Stuff/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /My link — External Web/i }),
    ).toBeInTheDocument();

    // The dock keeps exactly the user's chosen apps.
    const dock = await screen.findByTestId("home.dock");
    expect(
      within(dock).getByRole("button", { name: "Launch Files" }),
    ).toBeInTheDocument();
    expect(
      within(dock).getByRole("button", { name: "Launch Calculator" }),
    ).toBeInTheDocument();
    expect(
      within(dock).queryByRole("button", { name: "Launch Notes" }),
    ).not.toBeInTheDocument();
  });
});
