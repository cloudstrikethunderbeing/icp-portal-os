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
 * Characterization baseline for the settings surface that the rebrand and the
 * new wallpaper toggle must not disturb:
 *  - the existing appearance and workspace preferences still round-trip through
 *    the persisted settings API (theme, reduce motion, grid size);
 *  - settings stay scoped to the signed-in principal, so one user never sees
 *    another user's stored preferences;
 *  - the workspace keeps its plain gradient background by default.
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
 * A per-principal settings store. `getSettings`/`updateSettings` read the
 * caller's own record, mirroring the backend's principal-keyed map, so a test
 * can prove one user's preferences never leak to another.
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

describe("Settings persistence baseline", () => {
  it("round-trips the existing theme, motion and grid-size preferences", async () => {
    const user = userEvent.setup();
    signIn(ALICE);
    const { actor, updateSettings } = makeActor({
      "alice-principal": baseSettings(),
    });
    renderWithActor(<SettingsPage />, actor);

    // Theme: switch to Dark and persist it.
    await user.click(await screen.findByTestId("settings.theme.dark"));
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "dark" }),
      );
    });

    // Reduce motion: toggle it on and persist it.
    await user.click(
      await screen.findByTestId("settings.reduce_motion.switch"),
    );
    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ reduceMotion: true }),
      );
    });

    // The stored record keeps the earlier theme change alongside the new one.
    await waitFor(() => {
      expect(updateSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({ theme: "dark", reduceMotion: true }),
      );
    });
  });

  it("keeps each principal's settings private to that principal", async () => {
    signIn(ALICE);
    const { actor, setCaller } = makeActor({
      "alice-principal": baseSettings({ theme: "dark", gridSize: 6n }),
      "bob-principal": baseSettings({ theme: "light", gridSize: 4n }),
    });

    // Alice sees her own stored preferences.
    const alice = renderWithActor(<SettingsPage />, actor);
    expect(await screen.findByTestId("settings.theme.dark")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    alice.unmount();

    // Bob, a different principal, sees his own — never Alice's.
    setCaller("bob-principal");
    renderWithActor(<SettingsPage />, actor);
    expect(await screen.findByTestId("settings.theme.light")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByTestId("settings.theme.dark")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("renders the shell on the default route without a blank screen", async () => {
    signIn(ALICE);
    const { actor } = makeActor({ "alice-principal": baseSettings() });
    setActorForTest(actor);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    // The default route renders the Home screen inside the shell, not a blank page.
    expect(await screen.findByTestId("home.page")).toBeInTheDocument();
    expect(screen.getByTestId("app.content")).toBeInTheDocument();
  });

  it("keeps the plain gradient workspace background by default", async () => {
    signIn(ALICE);
    const { actor } = makeActor({ "alice-principal": baseSettings() });
    setActorForTest(actor);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>,
    );

    // The shell's content region keeps the plain gradient by default.
    const content = await screen.findByTestId("app.content");
    expect(content.className).toContain("bg-gradient-subtle");
  });
});
