import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import {
  type AppRegistryEntry,
  type Dock,
  type InstalledApp,
  LaunchType,
  UserRole,
  type UserSettings,
  type backendInterface,
} from "@/backend";
import SettingsPage from "@/pages/SettingsPage";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The reduce-motion preference: toggling it in Settings persists through the
 * backend and applies the `reduce-motion` class to the document root so the
 * whole shell honours it. The actor is a typed local fake.
 */

const NOW = 1_700_000_000_000_000_000n;

function registryEntry(id: bigint, name: string): AppRegistryEntry {
  return {
    id,
    name,
    description: `${name} description`,
    launchType: LaunchType.native,
    icon: "grid",
    url: "/files",
    permissions: [],
    requiresAuth: true,
    version: "1.0.0",
    category: "productivity" as AppRegistryEntry["category"],
  };
}

function makeActor(settings: UserSettings) {
  const getSettings = vi.fn<backendInterface["getSettings"]>(async () =>
    structuredClone(settings),
  );
  const updateSettings = vi.fn<backendInterface["updateSettings"]>(
    async (next: UserSettings) => {
      Object.assign(settings, structuredClone(next));
      return structuredClone(settings);
    },
  );
  const getCallerUserRole = vi.fn<backendInterface["getCallerUserRole"]>(
    async () => UserRole.user,
  );
  const listInstalledApps = vi.fn<backendInterface["listInstalledApps"]>(
    async (): Promise<InstalledApp[]> => [],
  );
  const listAppRegistry = vi.fn<backendInterface["listAppRegistry"]>(
    async (): Promise<AppRegistryEntry[]> => [registryEntry(0n, "Files")],
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

  return { actor, updateSettings };
}

function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "abc" }),
    } as never,
    loginStatus: "success",
  });
}

function baseSettings(reduceMotion: boolean): UserSettings {
  return {
    theme: "system",
    reduceMotion,
    wallpaper: "default",
    wallpaperEnabled: false,
    gridSize: 4n,
    updatedAt: NOW,
  };
}

afterEach(() => {
  document.documentElement.classList.remove("reduce-motion");
});

describe("Settings reduce-motion preference", () => {
  it("applies the reduce-motion class when the preference is on", async () => {
    signIn();
    const { actor } = makeActor(baseSettings(true));
    renderWithActor(<SettingsPage />, actor);

    await screen.findByTestId("settings.reduce_motion.switch");
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("reduce-motion");
    });
  });

  it("does not apply the class when the preference is off", async () => {
    signIn();
    const { actor } = makeActor(baseSettings(false));
    renderWithActor(<SettingsPage />, actor);

    await screen.findByTestId("settings.reduce_motion.switch");
    expect(document.documentElement).not.toHaveClass("reduce-motion");
  });

  it("persists the toggle and applies the class without a reload", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, updateSettings } = makeActor(baseSettings(false));
    renderWithActor(<SettingsPage />, actor);

    const toggle = await screen.findByTestId("settings.reduce_motion.switch");
    expect(document.documentElement).not.toHaveClass("reduce-motion");

    await user.click(toggle);

    await waitFor(() => {
      expect(updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ reduceMotion: true }),
      );
    });
    await waitFor(() => {
      expect(document.documentElement).toHaveClass("reduce-motion");
    });
  });
});
