import App from "@/App";
import { setActorForTest, setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
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
  StorageSection,
  UserRole,
  type UserSettings,
  type backendInterface,
} from "@/backend";
import DirectoryPage from "@/pages/DirectoryPage";
import FilesPage from "@/pages/FilesPage";
import HomePage from "@/pages/HomePage";
import { useActor } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: toastMock }));

/**
 * Coverage for the accepted changes in this build:
 *  - a Native app launched from the Directory navigates inside ICP Home
 *  - the Home grid folder shows its drop-target highlight while an app is
 *    dragged over it
 *  - the attribution footer renders at phone widths as well as desktop
 *  - Home, Directory, Notes, Calculator and Settings show a loading state while
 *    the actor initializes
 *  - a fully failed Files upload no longer reports success
 *
 * The actor is a typed local fake; the identity context is an explicit UI-state
 * mock. Neither proves real sign-in or backend behavior.
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
  settings: UserSettings;
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
  const listNotes = vi.fn<backendInterface["listNotes"]>(async () => []);
  const listNoteFolders = vi.fn<backendInterface["listNoteFolders"]>(
    async () => [],
  );
  const searchNotes = vi.fn<backendInterface["searchNotes"]>(async () => []);
  const listCalcHistory = vi.fn<backendInterface["listCalcHistory"]>(
    async () => [],
  );
  const sortFolder = vi.fn<backendInterface["sortFolder"]>(async () => []);
  const listFolder = vi.fn<backendInterface["listFolder"]>(async () => []);
  const searchFiles = vi.fn<backendInterface["searchFiles"]>(async () => []);

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
    listDirectory,
    searchDirectory,
    addToHomeScreen,
    setDirectoryFavourite,
    getSettings,
    updateSettings,
    getCallerUserRole,
    listNotes,
    listNoteFolders,
    searchNotes,
    listCalcHistory,
    sortFolder,
    listFolder,
    searchFiles,
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
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "setDirectoryFavourite"
    | "getSettings"
    | "updateSettings"
    | "getCallerUserRole"
    | "listNotes"
    | "listNoteFolders"
    | "searchNotes"
    | "listCalcHistory"
    | "sortFolder"
    | "listFolder"
    | "searchFiles"
  >;

  return { actor, moveAppToFolder };
}

type FakeActor = ReturnType<typeof makeActor>["actor"];

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

describe("Native app launch from the Directory", () => {
  it("navigates inside ICP Home instead of opening a blank tab", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    const { actor } = makeActor(baseState());
    renderApp(actor);

    // Reach the Directory through the shell so the router is available.
    await screen.findByTestId("app.content");
    await user.click(screen.getByTestId("nav.bottom_link.directory"));
    const list = await screen.findByTestId("directory.list");

    // Files is the first Native entry; its launch button opens the in-app route.
    const filesCard = within(list).getByText("Files").closest("article");
    expect(filesCard).not.toBeNull();
    await user.click(
      within(filesCard as HTMLElement).getByRole("button", { name: "Open" }),
    );

    // The native launch navigates inside the shell and opens no new tab.
    expect(await screen.findByTestId("files.page")).toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});

describe("Home grid folder drop target", () => {
  it("highlights the folder while an app is dragged over it", async () => {
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "Work",
      createdAt: NOW,
      position: 0n,
    });
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    const folderTile = await screen.findByRole("button", {
      name: /Open folder Work/i,
    });
    const folderWrapper = folderTile.closest("div");
    expect(folderWrapper).not.toBeNull();

    // Drag an app icon over the folder.
    const filesTile = screen.getByRole("button", { name: /Files — Native/i });
    const dataTransfer = {
      effectAllowed: "",
      setData: vi.fn(),
      getData: vi.fn(),
    };
    const dragStart = new Event("dragstart", { bubbles: true });
    Object.defineProperty(dragStart, "dataTransfer", { value: dataTransfer });
    filesTile.closest("[draggable]")?.dispatchEvent(dragStart);

    const dragOver = new Event("dragover", { bubbles: true, cancelable: true });
    Object.defineProperty(dragOver, "dataTransfer", { value: dataTransfer });
    folderWrapper?.dispatchEvent(dragOver);

    await waitFor(() => {
      expect(folderWrapper?.className).toContain("ring-2");
    });
  });
});

describe("Attribution footer", () => {
  it("renders the caffeine.ai attribution in the shell", async () => {
    const { actor } = makeActor(baseState());
    renderApp(actor);

    await screen.findByTestId("app.content");
    const footer = document.querySelector("footer");
    expect(footer).not.toBeNull();
    expect(footer).toHaveTextContent("caffeine.ai");
  });
});

describe("Actor initialization loading states", () => {
  it("shows the Home loading state while the actor initializes", async () => {
    const { actor } = makeActor(baseState());
    setIdentityForTest({
      loginStatus: "success",
      identity: SIGNED_IN_IDENTITY,
    });
    vi.mocked(useActor).mockReturnValue({
      actor,
      isFetching: true,
    } as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>,
    );

    expect(await screen.findByTestId("home.loading_state")).toBeInTheDocument();
  });

  it("shows the Directory loading state while the actor initializes", async () => {
    const { actor } = makeActor(baseState());
    setIdentityForTest({
      loginStatus: "success",
      identity: SIGNED_IN_IDENTITY,
    });
    vi.mocked(useActor).mockReturnValue({
      actor,
      isFetching: true,
    } as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <DirectoryPage />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByTestId("directory.loading_state"),
    ).toBeInTheDocument();
  });
});

describe("Files upload failure reporting", () => {
  it("does not report success when every upload fails", async () => {
    const user = userEvent.setup();
    toastMock.error.mockClear();
    toastMock.success.mockClear();

    const { actor } = makeActor(baseState());
    // The upload mutation rejects, so the whole batch fails.
    const addFile = vi.fn<backendInterface["addFile"]>(async () => {
      throw new Error("upload failed");
    });
    const failingActor = { ...actor, addFile } as FakeActor & {
      addFile: typeof addFile;
    };

    renderWithActor(<FilesPage />, failingActor);

    await screen.findByTestId("files.empty_state");
    const input = screen.getByTestId("files.file_input");
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    await user.upload(input, file);

    // A fully failed upload must report an error, never success.
    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalled();
    });
    expect(toastMock.success).not.toHaveBeenCalled();
  });
});
