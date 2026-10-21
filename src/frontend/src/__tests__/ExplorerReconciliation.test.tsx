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
import { APP_REGISTRY, getAppById } from "@/lib/appRegistry";
import DirectoryPage from "@/pages/DirectoryPage";
import HomePage from "@/pages/HomePage";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Coverage for the accepted explorer-reconciliation changes:
 *  - the static frontend registry points IC Explorer at https://www.icexplorer.io/
 *    and keeps it distinct from ICP Explorer at https://icpexplorer.org/
 *  - OpenChat is labelled Coming Soon in the static registry, matching the
 *    backend catalogue's #comingSoon launch type
 *  - the AI Agent entry is a native app in the static registry, matching the
 *    backend catalogue's native entry
 *  - the signed-out Home grid opens IC Explorer at the corrected address
 *  - the signed-in App Directory lists IC Explorer and ICP Explorer as two
 *    separate entries with their distinct addresses and no duplicate tile
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

describe("Static registry explorer reconciliation", () => {
  it("points IC Explorer at the corrected address with no duplicate explorer entry", () => {
    const icExplorer = getAppById("icp-explorer");
    expect(icExplorer).toBeDefined();
    expect(icExplorer?.name).toBe("IC Explorer");
    expect(icExplorer?.href).toBe("https://www.icexplorer.io/");

    // The static registry carries exactly one IC Explorer entry, so the
    // reconciliation left no duplicate tile behind.
    expect(
      APP_REGISTRY.filter((app) => app.name === "IC Explorer"),
    ).toHaveLength(1);
  });

  it("labels OpenChat Coming Soon and keeps AI Agent native", () => {
    const openchat = getAppById("openchat");
    expect(openchat?.launchType).toBe("coming-soon");

    const aiAgent = getAppById("ai-agent");
    expect(aiAgent?.launchType).toBe("native");
    expect(aiAgent?.route).toBe("/ai-agent");
  });
});

describe("Signed-out Home explorer launch", () => {
  it("opens IC Explorer at the corrected address from the static grid", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const { actor } = makeActor(baseState());
    renderSignedOutWithActor(<HomePage />, actor);

    const signedOut = await screen.findByTestId("home.signed_out_state");
    const explorer = within(signedOut).getByRole("button", {
      name: /IC Explorer — External Web/i,
    });
    await user.click(explorer);

    expect(openSpy).toHaveBeenCalledWith(
      "https://www.icexplorer.io/",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });
});

describe("App Directory explorer entries", () => {
  it("lists IC Explorer and ICP Explorer once each with distinct addresses", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    signIn();
    const state = baseState();
    state.registry.push(
      registryEntry(
        13n,
        "IC Explorer",
        LaunchType.externalWeb,
        "https://www.icexplorer.io/",
      ),
      registryEntry(
        33n,
        "ICP Explorer",
        LaunchType.externalWeb,
        "https://icpexplorer.org/",
      ),
    );
    const { actor } = makeActor(state);
    renderWithActor(<DirectoryPage />, actor);

    const list = await screen.findByTestId("directory.list");
    // Each explorer appears exactly once — no duplicate tile after reconciliation.
    expect(within(list).getAllByText("IC Explorer")).toHaveLength(1);
    expect(within(list).getAllByText("ICP Explorer")).toHaveLength(1);

    const icCard = within(list).getByText("IC Explorer").closest("article");
    expect(icCard).not.toBeNull();
    expect(
      within(icCard as HTMLElement).getByRole("link", {
        name: "https://www.icexplorer.io/",
      }),
    ).toBeInTheDocument();

    const icpCard = within(list).getByText("ICP Explorer").closest("article");
    expect(icpCard).not.toBeNull();
    expect(
      within(icpCard as HTMLElement).getByRole("link", {
        name: "https://icpexplorer.org/",
      }),
    ).toBeInTheDocument();

    // Launching IC Explorer opens the corrected address.
    await user.click(
      within(icCard as HTMLElement).getByRole("button", { name: "Open" }),
    );
    expect(openSpy).toHaveBeenCalledWith(
      "https://www.icexplorer.io/",
      "_blank",
      "noopener,noreferrer",
    );

    openSpy.mockRestore();
  });

  it("presents OpenChat as Coming Soon in the signed-in directory", async () => {
    signIn();
    const state = baseState();
    state.registry.push(
      registryEntry(18n, "OpenChat", LaunchType.comingSoon, "https://oc.app"),
    );
    const { actor } = makeActor(state);
    renderWithActor(<DirectoryPage />, actor);

    const card = (await screen.findByText("OpenChat")).closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByRole("button", { name: "Coming Soon" }),
    ).toBeDisabled();
  });
});
