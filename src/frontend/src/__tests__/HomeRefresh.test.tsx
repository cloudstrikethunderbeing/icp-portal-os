import App from "@/App";
import { setActorForTest, setIdentityForTest } from "@/__tests__/setup";
import {
  AppCategory,
  type AppRegistryEntry,
  Availability,
  type DirectoryEntry,
  type Dock,
  type HomeItem,
  type InstalledApp,
  LaunchType,
  UserRole,
  type UserSettings,
  type backendInterface,
} from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Cross-page refresh journeys for the accepted Home-layout changes: adding an
 * app from the Directory and toggling the dock in Settings both update the Home
 * screen without a reload. The actor is a typed local fake backed by one shared
 * in-memory store, so a mutation is observable on the next Home render.
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
): AppRegistryEntry {
  return {
    id,
    name,
    description: `${name} description`,
    launchType,
    icon: "grid",
    url:
      launchType === LaunchType.native
        ? "/files"
        : `https://example.com/${name}`,
    permissions: [],
    requiresAuth: true,
    version: "1.0.0",
    category: AppCategory.productivity,
  };
}

interface FakeState {
  registry: AppRegistryEntry[];
  installed: InstalledApp[];
  dock: Dock;
  settings: UserSettings;
}

function baseState(): FakeState {
  return {
    registry: [
      registryEntry(0n, "Files"),
      registryEntry(5n, "Internet Identity", LaunchType.icpService),
    ],
    installed: [
      {
        id: 0n,
        appId: 0n,
        installedAt: NOW,
        position: 0n,
        favourite: false,
      },
    ],
    dock: { appIds: [0n] },
    settings: {
      theme: "system",
      reduceMotion: false,
      wallpaper: "default",
      wallpaperEnabled: false,
      gridSize: 4n,
      updatedAt: NOW,
    },
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
    const items: HomeItem[] = state.installed
      .filter((app) => app.folderId === undefined)
      .map((app) => ({ __kind__: "app", app: structuredClone(app) }));
    return items;
  });
  const getDock = vi.fn<backendInterface["getDock"]>(async () =>
    structuredClone(state.dock),
  );
  const setDock = vi.fn<backendInterface["setDock"]>(
    async (appIds: bigint[]) => {
      state.dock = { appIds: [...appIds] };
      return structuredClone(state.dock);
    },
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
      if (!state.installed.some((entry) => entry.appId === appId)) {
        state.installed.push({
          id: BigInt(state.installed.length),
          appId,
          installedAt: NOW,
          position: BigInt(state.installed.length),
          favourite: false,
        });
      }
      return {
        app: structuredClone(app),
        installed: true,
        availability: Availability.installed,
        favourite: false,
      };
    },
  );
  const getSettings = vi.fn<backendInterface["getSettings"]>(async () =>
    structuredClone(state.settings),
  );
  const updateSettings = vi.fn<backendInterface["updateSettings"]>(
    async (settings: UserSettings) => {
      state.settings = structuredClone(settings);
      return structuredClone(state.settings);
    },
  );
  const getCallerUserRole = vi.fn<backendInterface["getCallerUserRole"]>(
    async () => UserRole.user,
  );

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    setDock,
    listDirectory,
    searchDirectory,
    addToHomeScreen,
    getSettings,
    updateSettings,
    getCallerUserRole,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "setDock"
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "getSettings"
    | "updateSettings"
    | "getCallerUserRole"
  >;

  return { actor, addToHomeScreen, setDock };
}

type FakeActor = Pick<
  backendInterface,
  | "listAppRegistry"
  | "listInstalledApps"
  | "listHomeItems"
  | "getDock"
  | "setDock"
  | "listDirectory"
  | "searchDirectory"
  | "addToHomeScreen"
  | "getSettings"
  | "updateSettings"
  | "getCallerUserRole"
>;

function renderApp(actor: FakeActor) {
  setActorForTest(actor);
  setIdentityForTest({ loginStatus: "success", identity: SIGNED_IN_IDENTITY });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

describe("Home layout refresh across pages", () => {
  it("adds an app from the Directory and shows it on Home without a reload", async () => {
    const user = userEvent.setup();
    const state = baseState();
    const { actor, addToHomeScreen } = makeActor(state);
    renderApp(actor);

    // Home starts with only Files installed.
    await screen.findByTestId("home.page");
    const grid = await screen.findByTestId("home.app_grid");
    expect(within(grid).getByText("Files")).toBeInTheDocument();
    expect(
      within(grid).queryByText("Internet Identity"),
    ).not.toBeInTheDocument();

    // Navigate to the Directory and add Internet Identity to Home.
    await user.click(screen.getByTestId("nav.bottom_link.directory"));
    const identityCard = (await screen.findByText("Internet Identity")).closest(
      "article",
    );
    expect(identityCard).not.toBeNull();
    await user.click(
      within(identityCard as HTMLElement).getByRole("button", {
        name: "Add to Home",
      }),
    );
    await waitFor(() => {
      expect(addToHomeScreen).toHaveBeenCalledWith(5n);
    });

    // Return Home: the newly installed app is present without a reload.
    await user.click(screen.getByTestId("nav.bottom_link.home"));
    expect(await screen.findByTestId("home.page")).toBeInTheDocument();
    const homeGrid = await screen.findByTestId("home.app_grid");
    expect(
      await within(homeGrid).findByText("Internet Identity"),
    ).toBeInTheDocument();
  });

  it("toggles the dock in Settings and reflects it on Home without a reload", async () => {
    const user = userEvent.setup();
    const state = baseState();
    // A second installed app so the dock has something to add. The seed keeps
    // installedId equal to appId, and the dock stores registry appIds.
    state.installed.push({
      id: 5n,
      appId: 5n,
      installedAt: NOW,
      position: 1n,
      favourite: false,
    });
    const { actor, setDock } = makeActor(state);
    renderApp(actor);

    await screen.findByTestId("home.page");
    // Files is the only dock app initially.
    expect(await screen.findByTestId("home.dock_item.1")).toBeInTheDocument();
    expect(screen.queryByTestId("home.dock_item.2")).not.toBeInTheDocument();

    // Add Internet Identity to the dock from Settings.
    await user.click(screen.getByTestId("nav.bottom_link.settings"));
    const toggle = await screen.findByTestId("settings.dock.toggle.5");
    await user.click(toggle);
    await waitFor(() => {
      expect(setDock).toHaveBeenCalledWith([0n, 5n]);
    });

    // Return Home: the dock now holds both apps without a reload.
    await user.click(screen.getByTestId("nav.bottom_link.home"));
    expect(await screen.findByTestId("home.dock_item.2")).toBeInTheDocument();
  });
});
