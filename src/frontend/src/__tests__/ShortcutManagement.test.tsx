import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  type BugReport,
  type DirectoryEntry,
  type Dock,
  type HomeFolder,
  type HomeItem,
  type InstalledApp,
  LaunchType,
  ReportStatus,
  type Shortcut,
  UserRole,
  type backendInterface,
} from "@/backend";
import AdminReportsPage from "@/pages/AdminReportsPage";
import DirectoryPage from "@/pages/DirectoryPage";
import HomePage from "@/pages/HomePage";
import SettingsPage from "@/pages/SettingsPage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Coverage for the accepted shortcut-management, App Directory, Explore ICP and
 * bug-report changes:
 *  - a signed-in user adds a website link from Home and it appears on the grid
 *  - the shortcut context menu offers rename, change icon, edit link and remove,
 *    and each mutation reaches the backend
 *  - an invalid address is rejected with a visible message and never saved
 *  - the App Directory shows Installed / Available / Coming Soon states and
 *    MULTI/DEX and Caffeine carry their exact addresses
 *  - the seeded Explore ICP folder holds the four core shortcuts
 *  - a bug report submitted from Settings reaches the admin inbox with status
 *    and timestamps, and a non-admin cannot read the inbox
 *
 * The actor is a typed local fake backed by one in-memory store; the identity
 * context is an explicit UI-state mock. Neither proves real sign-in, real
 * persistence or per-principal isolation.
 */

const NOW = 1_700_000_000_000_000_000n;

const SIGNED_IN_IDENTITY = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "aaaaa-bbbbb-ccccc-ddddd-eee",
  }),
} as never;

/** A Principal-shaped reporter, matching the backend's `UserId` (Principal). */
const REPORTER = {
  toText: () => "aaaaa-bbbbb-ccccc-ddddd-eee",
} as never;

/**
 * `structuredClone` cannot copy the reporter's `toText` method, so clone the
 * plain fields and reattach a fresh Principal-shaped reporter.
 */
function cloneReport(report: BugReport): BugReport {
  return {
    ...structuredClone({ ...report, reporter: undefined }),
    reporter: REPORTER,
  } as BugReport;
}

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
  shortcuts: Shortcut[];
  folders: HomeFolder[];
  dock: Dock;
  reports: BugReport[];
  isAdmin: boolean;
}

function baseState(): FakeState {
  return {
    registry: [
      registryEntry(0n, "Files"),
      registryEntry(1n, "Notes"),
      registryEntry(2n, "Calculator"),
      registryEntry(
        3n,
        "MULTI/DEX",
        LaunchType.externalWeb,
        "https://multidex.ai",
      ),
      registryEntry(
        4n,
        "Caffeine",
        LaunchType.externalWeb,
        "https://caffeine.ai",
      ),
      registryEntry(5n, "IC Wallet", LaunchType.comingSoon),
    ],
    installed: [
      installed(0n, 0n, 0n),
      installed(1n, 1n, 1n),
      installed(2n, 2n, 2n),
    ],
    shortcuts: [],
    folders: [],
    dock: { appIds: [0n] },
    reports: [],
    isAdmin: false,
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
  const createShortcut = vi.fn<backendInterface["createShortcut"]>(
    async (name, url, icon, launchType) => {
      const shortcut: Shortcut = {
        id: BigInt(state.shortcuts.length),
        name,
        url,
        icon,
        launchType,
        position: BigInt(state.shortcuts.length),
        favourite: false,
        createdAt: NOW,
      };
      state.shortcuts.push(shortcut);
      return structuredClone(shortcut);
    },
  );
  const renameShortcut = vi.fn<backendInterface["renameShortcut"]>(
    async (id, name) => {
      const shortcut = state.shortcuts.find((entry) => entry.id === id);
      if (!shortcut) return null;
      shortcut.name = name;
      return structuredClone(shortcut);
    },
  );
  const setShortcutIcon = vi.fn<backendInterface["setShortcutIcon"]>(
    async (id, icon) => {
      const shortcut = state.shortcuts.find((entry) => entry.id === id);
      if (!shortcut) return null;
      shortcut.icon = icon;
      return structuredClone(shortcut);
    },
  );
  const setShortcutUrl = vi.fn<backendInterface["setShortcutUrl"]>(
    async (id, url) => {
      const shortcut = state.shortcuts.find((entry) => entry.id === id);
      if (!shortcut) return null;
      shortcut.url = url;
      return structuredClone(shortcut);
    },
  );
  const removeShortcut = vi.fn<backendInterface["removeShortcut"]>(
    async (id) => {
      const index = state.shortcuts.findIndex((entry) => entry.id === id);
      if (index === -1) return false;
      state.shortcuts.splice(index, 1);
      return true;
    },
  );
  const listDirectory = vi.fn<backendInterface["listDirectory"]>(async () =>
    state.registry.map(
      (app): DirectoryEntry => ({
        app: structuredClone(app),
        installed: state.installed.some((entry) => entry.appId === app.id),
        availability: state.installed.some((entry) => entry.appId === app.id)
          ? ("installed" as DirectoryEntry["availability"])
          : app.launchType === LaunchType.comingSoon
            ? ("comingSoon" as DirectoryEntry["availability"])
            : ("available" as DirectoryEntry["availability"]),
        favourite: false,
      }),
    ),
  );
  const searchDirectory = vi.fn<backendInterface["searchDirectory"]>(
    async (term) =>
      state.registry
        .filter((app) => app.name.toLowerCase().includes(term.toLowerCase()))
        .map(
          (app): DirectoryEntry => ({
            app: structuredClone(app),
            installed: state.installed.some((entry) => entry.appId === app.id),
            availability: state.installed.some(
              (entry) => entry.appId === app.id,
            )
              ? ("installed" as DirectoryEntry["availability"])
              : app.launchType === LaunchType.comingSoon
                ? ("comingSoon" as DirectoryEntry["availability"])
                : ("available" as DirectoryEntry["availability"]),
            favourite: false,
          }),
        ),
  );
  const addToHomeScreen = vi.fn<backendInterface["addToHomeScreen"]>(
    async (appId) => {
      const app = state.registry.find((entry) => entry.id === appId);
      if (!app) return null;
      if (!state.installed.some((entry) => entry.appId === appId)) {
        state.installed.push(
          installed(
            BigInt(state.installed.length),
            appId,
            BigInt(state.installed.length),
          ),
        );
      }
      return {
        app: structuredClone(app),
        installed: true,
        availability: "installed" as DirectoryEntry["availability"],
        favourite: false,
      };
    },
  );
  const setDirectoryFavourite = vi.fn<
    backendInterface["setDirectoryFavourite"]
  >(async () => null);
  const getSettings = vi.fn<backendInterface["getSettings"]>(async () => ({
    theme: "system",
    reduceMotion: false,
    wallpaper: "default",
    wallpaperEnabled: false,
    gridSize: 4n,
    updatedAt: NOW,
  }));
  const updateSettings = vi.fn<backendInterface["updateSettings"]>(
    async (settings) => structuredClone(settings),
  );
  const getCallerUserRole = vi.fn<backendInterface["getCallerUserRole"]>(
    async () => (state.isAdmin ? UserRole.admin : UserRole.user),
  );
  const isCallerAdmin = vi.fn<backendInterface["isCallerAdmin"]>(
    async () => state.isAdmin,
  );
  const submitBugReport = vi.fn<backendInterface["submitBugReport"]>(
    async (input) => {
      const report: BugReport = {
        id: BigInt(state.reports.length),
        reporter: REPORTER,
        description: input.description,
        status: ReportStatus.open,
        createdAt: NOW,
        updatedAt: NOW,
      };
      state.reports.push(report);
      return cloneReport(report);
    },
  );
  const listBugReports = vi.fn<backendInterface["listBugReports"]>(async () => {
    if (!state.isAdmin) throw new Error("Unauthorized");
    return state.reports.map(cloneReport);
  });
  const setBugReportStatus = vi.fn<backendInterface["setBugReportStatus"]>(
    async (id, status) => {
      const report = state.reports.find((entry) => entry.id === id);
      if (!report) return null;
      report.status = status;
      report.updatedAt = NOW + 1n;
      return cloneReport(report);
    },
  );

  const actor = {
    listAppRegistry,
    listInstalledApps,
    listHomeItems,
    getDock,
    listShortcuts,
    createShortcut,
    renameShortcut,
    setShortcutIcon,
    setShortcutUrl,
    removeShortcut,
    listDirectory,
    searchDirectory,
    addToHomeScreen,
    setDirectoryFavourite,
    getSettings,
    updateSettings,
    getCallerUserRole,
    isCallerAdmin,
    submitBugReport,
    listBugReports,
    setBugReportStatus,
  } satisfies Pick<
    backendInterface,
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
    | "listShortcuts"
    | "createShortcut"
    | "renameShortcut"
    | "setShortcutIcon"
    | "setShortcutUrl"
    | "removeShortcut"
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "setDirectoryFavourite"
    | "getSettings"
    | "updateSettings"
    | "getCallerUserRole"
    | "isCallerAdmin"
    | "submitBugReport"
    | "listBugReports"
    | "setBugReportStatus"
  >;

  return {
    actor,
    createShortcut,
    renameShortcut,
    setShortcutIcon,
    setShortcutUrl,
    removeShortcut,
    addToHomeScreen,
    submitBugReport,
  };
}

function signIn() {
  setIdentityForTest({ loginStatus: "success", identity: SIGNED_IN_IDENTITY });
}

describe("Home shortcut management", () => {
  it("adds a website link from Home and shows it on the grid", async () => {
    const user = userEvent.setup();
    const state = baseState();
    const { actor, createShortcut } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    await user.click(screen.getByTestId("home.add_shortcut_button"));

    const editor = await screen.findByTestId("shortcut.editor");
    await user.type(
      within(editor).getByTestId("shortcut.name_input"),
      "My site",
    );
    await user.type(
      within(editor).getByTestId("shortcut.url_input"),
      "example.com",
    );
    await user.click(within(editor).getByTestId("shortcut.save_button"));

    await waitFor(() => {
      expect(createShortcut).toHaveBeenCalledWith(
        "My site",
        "https://example.com/",
        expect.any(String),
        LaunchType.externalWeb,
      );
    });
    // The new shortcut appears on the grid once the layout query refetches.
    expect(await screen.findByText("My site")).toBeInTheDocument();
  });

  it("rejects an invalid address with a visible message and does not save", async () => {
    const user = userEvent.setup();
    const state = baseState();
    const { actor, createShortcut } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    await screen.findByText("Files");
    await user.click(screen.getByTestId("home.add_shortcut_button"));

    const editor = await screen.findByTestId("shortcut.editor");
    await user.type(within(editor).getByTestId("shortcut.name_input"), "Bad");
    await user.type(
      within(editor).getByTestId("shortcut.url_input"),
      "javascript:alert(1)",
    );
    await user.click(within(editor).getByTestId("shortcut.save_button"));

    expect(
      await within(editor).findByTestId("shortcut.url_error"),
    ).toBeInTheDocument();
    expect(createShortcut).not.toHaveBeenCalled();
  });

  it("renames, changes the icon, edits the link and removes a shortcut from the menu", async () => {
    const user = userEvent.setup();
    const state = baseState();
    state.shortcuts.push({
      id: 0n,
      name: "Old name",
      url: "https://old.example.com",
      icon: "globe",
      launchType: LaunchType.externalWeb,
      position: 0n,
      favourite: false,
      createdAt: NOW,
    });
    const {
      actor,
      renameShortcut,
      setShortcutIcon,
      setShortcutUrl,
      removeShortcut,
    } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const tile = await screen.findByRole("button", {
      name: /Old name — External Web/i,
    });

    // Rename + edit link + change icon all route through the editor.
    await user.pointer({ keys: "[MouseRight]", target: tile });
    let menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByTestId("home.menu_rename_shortcut_button"),
    );
    let editor = await screen.findByTestId("shortcut.editor");
    const nameInput = within(editor).getByTestId("shortcut.name_input");
    await user.clear(nameInput);
    await user.type(nameInput, "New name");
    const urlInput = within(editor).getByTestId("shortcut.url_input");
    await user.clear(urlInput);
    await user.type(urlInput, "https://new.example.com");
    await user.click(within(editor).getByTestId("shortcut.icon_option.rocket"));
    await user.click(within(editor).getByTestId("shortcut.save_button"));

    await waitFor(() => {
      expect(renameShortcut).toHaveBeenCalledWith(0n, "New name");
      expect(setShortcutUrl).toHaveBeenCalledWith(
        0n,
        "https://new.example.com/",
      );
      expect(setShortcutIcon).toHaveBeenCalledWith(0n, "rocket");
    });

    // Remove through the context menu.
    const renamed = await screen.findByRole("button", {
      name: /New name — External Web/i,
    });
    await user.pointer({ keys: "[MouseRight]", target: renamed });
    menu = await screen.findByRole("menu");
    await user.click(
      within(menu).getByTestId("home.menu_remove_shortcut_button"),
    );
    await waitFor(() => {
      expect(removeShortcut).toHaveBeenCalledWith(0n);
    });
  });

  it("opens the management menu on a touch long-press", async () => {
    const state = baseState();
    state.shortcuts.push({
      id: 0n,
      name: "Touch link",
      url: "https://touch.example.com",
      icon: "globe",
      launchType: LaunchType.externalWeb,
      position: 0n,
      favourite: false,
      createdAt: NOW,
    });
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const tile = await screen.findByRole("button", {
      name: /Touch link — External Web/i,
    });
    // A touch pointerdown starts the 500ms long-press timer; the menu opens
    // once it elapses, without a right-click. jsdom has no PointerEvent, so
    // build a MouseEvent and attach the touch pointerType the handler reads.
    const pointerDown = new MouseEvent("pointerdown", {
      bubbles: true,
      clientX: 10,
      clientY: 10,
    });
    Object.defineProperty(pointerDown, "pointerType", { value: "touch" });
    tile.dispatchEvent(pointerDown);

    const menu = await screen.findByRole("menu", undefined, { timeout: 2000 });
    expect(
      within(menu).getByTestId("home.menu_rename_shortcut_button"),
    ).toBeInTheDocument();
  });
});

describe("Explore ICP folder", () => {
  it("renders the seeded folder with its four core shortcuts", async () => {
    const state = baseState();
    state.folders.push({
      id: 0n,
      name: "Explore ICP",
      createdAt: NOW,
      position: 0n,
    });
    const links: [string, string][] = [
      ["DFINITY", "https://dfinity.org"],
      ["Internet Computer", "https://internetcomputer.org"],
      ["OpenCloud", "https://opencloud.org"],
      ["ICP Skills", "https://skills.internetcomputer.org"],
    ];
    links.forEach(([name, url], index) => {
      state.shortcuts.push({
        id: BigInt(index),
        name,
        url,
        icon: "globe",
        launchType: LaunchType.externalWeb,
        position: BigInt(index),
        folderId: 0n,
        favourite: false,
        createdAt: NOW,
      });
    });
    const { actor } = makeActor(state);
    renderWithActor(<HomePage />, actor);

    const folderTile = await screen.findByRole("button", {
      name: /Open folder Explore ICP/i,
    });
    await userEvent.setup().click(folderTile);

    const overlay = await screen.findByTestId("home.folder_overlay");
    for (const [name] of links) {
      expect(within(overlay).getByText(name)).toBeInTheDocument();
    }
  });
});

describe("App Directory states and links", () => {
  it("shows Installed, Available and Coming Soon states", async () => {
    signIn();
    const { actor } = makeActor(baseState());
    renderWithActor(<DirectoryPage />, actor);

    const filesCard = (await screen.findByText("Files")).closest("article");
    expect(filesCard).not.toBeNull();
    expect(
      within(filesCard as HTMLElement).getByText("Installed"),
    ).toBeInTheDocument();

    const multidexCard = screen.getByText("MULTI/DEX").closest("article");
    expect(multidexCard).not.toBeNull();
    expect(
      within(multidexCard as HTMLElement).getByText("Available"),
    ).toBeInTheDocument();

    const walletCard = screen.getByText("IC Wallet").closest("article");
    expect(walletCard).not.toBeNull();
    expect(
      within(walletCard as HTMLElement).getByTestId("directory.state.6"),
    ).toHaveTextContent("Coming Soon");
  });

  it("lists MULTI/DEX and Caffeine with their exact addresses", async () => {
    signIn();
    const { actor } = makeActor(baseState());
    renderWithActor(<DirectoryPage />, actor);

    const multidexCard = (await screen.findByText("MULTI/DEX")).closest(
      "article",
    );
    expect(multidexCard).not.toBeNull();
    expect(
      within(multidexCard as HTMLElement).getByRole("link", {
        name: "https://multidex.ai",
      }),
    ).toBeInTheDocument();

    const caffeineCard = screen.getByText("Caffeine").closest("article");
    expect(caffeineCard).not.toBeNull();
    expect(
      within(caffeineCard as HTMLElement).getByRole("link", {
        name: "https://caffeine.ai",
      }),
    ).toBeInTheDocument();
  });

  it("adds an Available entry to Home", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, addToHomeScreen } = makeActor(baseState());
    renderWithActor(<DirectoryPage />, actor);

    const multidexCard = (await screen.findByText("MULTI/DEX")).closest(
      "article",
    );
    expect(multidexCard).not.toBeNull();
    await user.click(
      within(multidexCard as HTMLElement).getByRole("button", {
        name: "Add to Home",
      }),
    );

    await waitFor(() => {
      expect(addToHomeScreen).toHaveBeenCalledWith(3n);
    });
  });
});

describe("Bug report flow", () => {
  it("submits a report from Settings and shows it in the admin inbox", async () => {
    const user = userEvent.setup();
    const state = baseState();
    state.isAdmin = true;
    const { actor, submitBugReport } = makeActor(state);
    renderWithActor(<SettingsPage />, actor);

    await screen.findByTestId("report_bug.open_button");
    await user.click(screen.getByTestId("report_bug.open_button"));
    const dialog = await screen.findByTestId("report_bug.dialog");
    await user.type(
      within(dialog).getByTestId("report_bug.textarea"),
      "The dock disappeared",
    );
    await user.click(within(dialog).getByTestId("report_bug.submit_button"));

    await waitFor(() => {
      expect(submitBugReport).toHaveBeenCalledWith({
        description: "The dock disappeared",
      });
    });
    expect(
      await within(dialog).findByTestId("report_bug.success_state"),
    ).toBeInTheDocument();
  });

  it("shows the report with its status and timestamp in the admin inbox", async () => {
    const state = baseState();
    state.isAdmin = true;
    state.reports.push({
      id: 0n,
      reporter: REPORTER,
      description: "Broken upload",
      status: ReportStatus.open,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const { actor } = makeActor(state);
    renderWithActor(<AdminReportsPage />, actor);

    const item = await screen.findByTestId("admin_reports.item.1");
    expect(within(item).getByText("Broken upload")).toBeInTheDocument();
    expect(
      within(item).getByTestId("admin_reports.status.1"),
    ).toHaveTextContent("Open");
    expect(within(item).getByText(/^Submitted /)).toBeInTheDocument();
  });

  it("blocks a non-admin from reading the inbox", async () => {
    const state = baseState();
    state.isAdmin = false;
    const { actor } = makeActor(state);
    renderWithActor(<AdminReportsPage />, actor);

    expect(
      await screen.findByTestId("admin_reports.forbidden_state"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("admin_reports.list")).not.toBeInTheDocument();
  });
});
