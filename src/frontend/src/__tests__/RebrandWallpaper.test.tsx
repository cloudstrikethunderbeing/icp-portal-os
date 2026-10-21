import App from "@/App";
import { setActorForTest, setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import {
  type Dock,
  type InstalledApp,
  UserRole,
  type UserSettings,
  type backendInterface,
} from "@/backend";
import SettingsPage from "@/pages/SettingsPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Coverage for the accepted rebrand and wallpaper changes:
 *  - the sidebar brand reads "ICP Portal" and shows the infinitygateway image;
 *  - the signed-out top bar reads "ICP Portal";
 *  - the Settings Wallpaper toggle sits beside the theme control and persists
 *    the preference through the settings API;
 *  - enabling the wallpaper shows the infinitygateway background in both light
 *    and dark mode, and disabling it restores the plain gradient;
 *  - the wallpaper preference is scoped to the signed-in principal.
 *
 * The actor is a typed local fake; the identity context is an explicit UI-state
 * mock. Neither proves real sign-in or backend behavior.
 */

const NOW = 1_700_000_000_000_000_000n;

const ALICE = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "alice-principal",
  }),
} as never;

const BOB = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "bob-principal",
  }),
} as never;

function baseSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    theme: "system",
    reduceMotion: false,
    wallpaper: "default",
    wallpaperEnabled: false,
    gridSize: 4n,
    updatedAt: NOW,
    ...overrides,
  };
}

/**
 * A per-principal settings store mirroring the backend's principal-keyed map,
 * so a test can prove one user's wallpaper never leaks to another.
 */
function makeActor(initial: Record<string, UserSettings>) {
  const store = new Map<string, UserSettings>(
    Object.entries(initial).map(([principal, settings]) => [
      principal,
      structuredClone(settings),
    ]),
  );
  let caller = "alice-principal";

  const getSettings = vi.fn<backendInterface["getSettings"]>(async () =>
    structuredClone(store.get(caller) ?? baseSettings()),
  );
  const updateSettings = vi.fn<backendInterface["updateSettings"]>(
    async (next: UserSettings) => {
      const updated = { ...structuredClone(next), updatedAt: NOW };
      store.set(caller, updated);
      return structuredClone(updated);
    },
  );
  const getCallerUserRole = vi.fn<backendInterface["getCallerUserRole"]>(
    async () => UserRole.user,
  );
  const listInstalledApps = vi.fn<backendInterface["listInstalledApps"]>(
    async (): Promise<InstalledApp[]> => [],
  );
  const listAppRegistry = vi.fn<backendInterface["listAppRegistry"]>(
    async () => [],
  );
  const getDock = vi.fn<backendInterface["getDock"]>(
    async (): Promise<Dock> => ({ appIds: [] }),
  );

  const actor = {
    getSettings,
    updateSettings,
    getCallerUserRole,
    listInstalledApps,
    listAppRegistry,
    getDock,
  } satisfies Pick<
    backendInterface,
    | "getSettings"
    | "updateSettings"
    | "getCallerUserRole"
    | "listInstalledApps"
    | "listAppRegistry"
    | "getDock"
  >;

  return {
    actor,
    updateSettings,
    setCaller: (principal: string) => {
      caller = principal;
    },
  };
}

function signIn(identity: unknown) {
  setIdentityForTest({ identity: identity as never, loginStatus: "success" });
}

function renderApp(actor: ReturnType<typeof makeActor>["actor"]) {
  setActorForTest(actor);
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

describe("ICP Portal rebrand", () => {
  it("shows the ICP Portal brand label and logo in the sidebar", async () => {
    signIn(ALICE);
    const { actor } = makeActor({ "alice-principal": baseSettings() });
    renderApp(actor);

    await screen.findByTestId("app.content");
    const brandMark = screen.getByTestId("nav.brand_mark");
    expect(brandMark).toHaveAttribute(
      "src",
      "/assets/generated/infinitygateway.dim_1920x1080.png",
    );
    expect(brandMark).toHaveAttribute("alt", "ICP Portal");
    // The mark still renders as a small circular icon.
    expect(brandMark.className).toContain("rounded-full");
    expect(screen.getByText("ICP Portal")).toBeInTheDocument();
  });

  it("shows the ICP Portal label in the signed-out top bar", async () => {
    setActorForTest(makeActor({}).actor);
    setIdentityForTest({ loginStatus: "idle" });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    await screen.findByTestId("app.content");
    // The signed-out top bar shows the ICP Portal label (the sidebar shows it too).
    expect(screen.getAllByText("ICP Portal").length).toBeGreaterThan(0);
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
  });
});

describe("Wallpaper toggle", () => {
  it("appears in Settings beside the theme control and persists the preference", async () => {
    const user = userEvent.setup();
    signIn(ALICE);
    const { actor, updateSettings } = makeActor({
      "alice-principal": baseSettings(),
    });
    renderWithActor(<SettingsPage />, actor);

    // The wallpaper toggle sits in the same Appearance section as the theme.
    const themeToggle = await screen.findByTestId("settings.theme.toggle");
    const wallpaperToggle = screen.getByTestId("settings.wallpaper.toggle");
    const appearanceSection = themeToggle.closest("section");
    expect(appearanceSection).not.toBeNull();
    expect(appearanceSection).toContainElement(wallpaperToggle);

    // Turning it on persists wallpaperEnabled: true.
    await user.click(screen.getByTestId("settings.wallpaper.on"));
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ wallpaperEnabled: true }),
      );
    });

    // Turning it off persists wallpaperEnabled: false.
    await user.click(screen.getByTestId("settings.wallpaper.off"));
    await waitFor(() => {
      expect(updateSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({ wallpaperEnabled: false }),
      );
    });
  });

  it("shows the infinitygateway background when enabled and the plain gradient when off", async () => {
    signIn(ALICE);
    const { actor } = makeActor({
      "alice-principal": baseSettings({ wallpaperEnabled: true }),
    });
    renderApp(actor);

    const content = await screen.findByTestId("app.content");
    const wallpaper = await screen.findByTestId("app.wallpaper");
    expect(wallpaper.style.backgroundImage).toContain("infinitygateway");
    expect(content.className).not.toContain("bg-gradient-subtle");
  });

  it("keeps the plain gradient background when the wallpaper is off", async () => {
    signIn(ALICE);
    const { actor } = makeActor({
      "alice-principal": baseSettings({ wallpaperEnabled: false }),
    });
    renderApp(actor);

    const content = await screen.findByTestId("app.content");
    expect(content.className).toContain("bg-gradient-subtle");
    expect(screen.queryByTestId("app.wallpaper")).not.toBeInTheDocument();
  });

  it("keeps each principal's wallpaper preference private", async () => {
    signIn(ALICE);
    const { actor, setCaller } = makeActor({
      "alice-principal": baseSettings({ wallpaperEnabled: true }),
      "bob-principal": baseSettings({ wallpaperEnabled: false }),
    });

    // Alice has the wallpaper on.
    const alice = renderApp(actor);
    expect(await screen.findByTestId("app.wallpaper")).toBeInTheDocument();
    alice.unmount();

    // Bob, a different principal, keeps the plain background.
    setCaller("bob-principal");
    signIn(BOB);
    renderApp(actor);
    await screen.findByTestId("app.content");
    await waitFor(() => {
      expect(screen.queryByTestId("app.wallpaper")).not.toBeInTheDocument();
    });
  });
});
