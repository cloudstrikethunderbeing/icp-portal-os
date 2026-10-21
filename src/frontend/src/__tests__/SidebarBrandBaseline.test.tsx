import App from "@/App";
import { setActorForTest, setIdentityForTest } from "@/__tests__/setup";
import {
  type Dock,
  type InstalledApp,
  UserRole,
  type UserSettings,
  type backendInterface,
} from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the sidebar brand mark and shell chrome.
 *
 * The accepted request intentionally changes the brand-mark image SOURCE, so
 * this suite deliberately does NOT assert which asset the mark points at.
 * It protects the surrounding behavior that must survive the swap: the mark is
 * still an image carrying the `nav.brand_mark` ocid and the "ICP Portal" alt
 * text, the sidebar still shows the "ICP Portal" wordmark, the primary
 * navigation still renders, and the wallpaper layer still uses the
 * infinitygateway artwork.
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

function makeActor(settings: UserSettings) {
  const getSettings = vi.fn<backendInterface["getSettings"]>(async () =>
    structuredClone(settings),
  );
  const updateSettings = vi.fn<backendInterface["updateSettings"]>(
    async (next: UserSettings) => structuredClone(next),
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

  return {
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
}

function renderApp(actor: ReturnType<typeof makeActor>) {
  setActorForTest(actor);
  setIdentityForTest({ identity: ALICE, loginStatus: "success" });
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

describe("Sidebar brand mark baseline", () => {
  it("renders the brand mark as an image with the ICP Portal alt text", async () => {
    renderApp(makeActor(baseSettings()));

    await screen.findByTestId("app.content");
    const brandMark = screen.getByTestId("nav.brand_mark");
    // The asset source is intentionally changing; the element contract is not.
    expect(brandMark.tagName).toBe("IMG");
    expect(brandMark).toHaveAttribute("alt", "ICP Portal");
  });

  it("keeps the ICP Portal wordmark and primary navigation in the sidebar", async () => {
    renderApp(makeActor(baseSettings()));

    await screen.findByTestId("app.content");
    const sidebar = screen.getByTestId("nav.sidebar");
    expect(sidebar).toHaveTextContent("ICP Portal");

    for (const label of [
      "Home",
      "Files",
      "Notes",
      "Calculator",
      "AI Agent",
      "Directory",
      "Settings",
    ]) {
      expect(
        screen.getByTestId(
          `nav.sidebar_link.${label.toLowerCase().replace(" ", "-")}`,
        ),
      ).toHaveTextContent(label);
    }
  });

  it("still layers the infinitygateway wallpaper when the preference is on", async () => {
    renderApp(makeActor(baseSettings({ wallpaperEnabled: true })));

    await screen.findByTestId("app.content");
    const wallpaper = await screen.findByTestId("app.wallpaper");
    expect(wallpaper.style.backgroundImage).toContain("infinitygateway");
  });
});
