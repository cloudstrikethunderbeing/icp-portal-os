import { setIdentityForTest } from "@/__tests__/setup";
import { renderWithActor } from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  Availability,
  type DirectoryEntry,
  LaunchType,
  type backendInterface,
} from "@/backend";
import DirectoryPage from "@/pages/DirectoryPage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * ICP App Directory journeys: entries list with name, category and description;
 * adding one installs it; and Coming Soon entries are labelled and never launch.
 * The actor is a typed local fake.
 */

const _NOW = 1_700_000_000_000_000_000n;

function entry(
  id: bigint,
  name: string,
  launchType: AppRegistryEntry["launchType"],
  category: AppRegistryEntry["category"] = AppCategory.productivity,
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
    category,
  };
}

function makeActor(entries: DirectoryEntry[]) {
  const listDirectory = vi.fn<backendInterface["listDirectory"]>(async () =>
    structuredClone(entries),
  );
  const searchDirectory = vi.fn<backendInterface["searchDirectory"]>(
    async (term: string) =>
      structuredClone(
        entries.filter((item) =>
          item.app.name.toLowerCase().includes(term.toLowerCase()),
        ),
      ),
  );
  const addToHomeScreen = vi.fn<backendInterface["addToHomeScreen"]>(
    async (appId: bigint) => {
      const found = entries.find((item) => item.app.id === appId);
      if (!found) return null;
      found.installed = true;
      return structuredClone(found);
    },
  );
  const setDirectoryFavourite = vi.fn<
    backendInterface["setDirectoryFavourite"]
  >(async (appId: bigint, favourite: boolean) => {
    const found = entries.find((item) => item.app.id === appId);
    if (!found) return null;
    found.favourite = favourite;
    return structuredClone(found);
  });

  const actor = {
    listDirectory,
    searchDirectory,
    addToHomeScreen,
    setDirectoryFavourite,
  } satisfies Pick<
    backendInterface,
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "setDirectoryFavourite"
  >;

  return { actor, addToHomeScreen };
}

function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "abc" }),
    } as never,
    loginStatus: "success",
  });
}

function baseEntries(): DirectoryEntry[] {
  return [
    {
      app: entry(0n, "Files", LaunchType.native),
      installed: true,
      availability: Availability.installed,
      favourite: false,
    },
    {
      app: entry(
        5n,
        "Internet Identity",
        LaunchType.icpService,
        AppCategory.governance,
      ),
      installed: false,
      availability: Availability.available,
      favourite: false,
    },
    {
      app: entry(8n, "Wallet", LaunchType.comingSoon, AppCategory.finance),
      installed: false,
      availability: Availability.comingSoon,
      favourite: false,
    },
  ];
}

describe("DirectoryPage", () => {
  it("lists apps with name, category and description", async () => {
    signIn();
    const { actor } = makeActor(baseEntries());
    renderWithActor(<DirectoryPage />, actor);

    expect(await screen.findByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Internet Identity")).toBeInTheDocument();
    expect(screen.getByText("Wallet")).toBeInTheDocument();
    expect(screen.getByText("Files description")).toBeInTheDocument();

    const identityCard = screen
      .getByText("Internet Identity")
      .closest("article");
    expect(identityCard).not.toBeNull();
    expect(
      within(identityCard as HTMLElement).getByText("Governance"),
    ).toBeInTheDocument();
  });

  it("labels Coming Soon apps and disables their launch", async () => {
    signIn();
    const { actor } = makeActor(baseEntries());
    renderWithActor(<DirectoryPage />, actor);

    const walletCard = (await screen.findByText("Wallet")).closest("article");
    expect(walletCard).not.toBeNull();
    const launch = within(walletCard as HTMLElement).getByRole("button", {
      name: "Coming Soon",
    });
    expect(launch).toBeDisabled();
  });

  it("adds an app to the home screen", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, addToHomeScreen } = makeActor(baseEntries());
    renderWithActor(<DirectoryPage />, actor);

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
  });

  it("filters the directory by search term", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor } = makeActor(baseEntries());
    renderWithActor(<DirectoryPage />, actor);

    await screen.findByText("Files");
    await user.type(
      screen.getByPlaceholderText("Search apps by name or description"),
      "wallet",
    );

    await waitFor(() => {
      expect(screen.queryByText("Internet Identity")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Wallet")).toBeInTheDocument();
  });
});
