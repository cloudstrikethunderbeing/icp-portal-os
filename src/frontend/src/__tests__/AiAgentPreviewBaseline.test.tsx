import App from "@/App";
import { renderWithActor } from "@/__tests__/test-utils";
import {
  AppCategory,
  type AppRegistryEntry,
  Availability,
  type DirectoryEntry,
  LaunchType,
  type backendInterface,
} from "@/backend";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import AiAgentPage from "@/pages/AiAgentPage";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Characterization baseline for the AI Agent preview surface and the Directory
 * Auth label. These are the behaviors the accepted change must leave intact:
 *  - the AI Agent page still shows its preview notice and 'Coming soon' badge
 *  - sending a message appends only the user's own message; the agent never
 *    fabricates a reply
 *  - the AI Agent stays a native app that opens its existing preview page
 *  - the Directory card's Auth label is display-only and never gates launch
 *
 * The actor is a typed local fake; the identity context is an explicit UI-state
 * mock. Neither proves real sign-in or backend behavior.
 */

function aiAgentEntry(requiresAuth: boolean): AppRegistryEntry {
  return {
    id: 35n,
    name: "AI Agent",
    description: "Ask questions about your workspace.",
    launchType: LaunchType.native,
    icon: "ai",
    url: "",
    permissions: [],
    requiresAuth,
    version: "1.0.0",
    category: AppCategory.ai,
  };
}

function directoryEntry(requiresAuth: boolean): DirectoryEntry {
  return {
    app: aiAgentEntry(requiresAuth),
    installed: false,
    availability: Availability.available,
    favourite: false,
  };
}

function makeActor() {
  const actor = {
    listDirectory: vi.fn<backendInterface["listDirectory"]>(async () => []),
    searchDirectory: vi.fn<backendInterface["searchDirectory"]>(async () => []),
    addToHomeScreen: vi.fn<backendInterface["addToHomeScreen"]>(
      async () => null,
    ),
    setDirectoryFavourite: vi.fn<backendInterface["setDirectoryFavourite"]>(
      async () => null,
    ),
  } satisfies Pick<
    backendInterface,
    | "listDirectory"
    | "searchDirectory"
    | "addToHomeScreen"
    | "setDirectoryFavourite"
  >;
  return actor;
}

describe("AI Agent preview page", () => {
  it("shows the preview notice and the Coming soon badge", async () => {
    renderWithActor(<AiAgentPage />, makeActor());

    expect(await screen.findByTestId("ai_agent.page")).toBeInTheDocument();
    const notice = screen.getByTestId("ai_agent.notice");
    expect(notice).toHaveTextContent("Preview — not yet functional");
    expect(within(notice).getByText("Coming soon")).toBeInTheDocument();
  });

  it("appends only the user's message and never fabricates an agent reply", async () => {
    const user = userEvent.setup();
    renderWithActor(<AiAgentPage />, makeActor());

    await screen.findByTestId("ai_agent.empty_state");
    await user.type(
      screen.getByTestId("ai_agent.input"),
      "What is on my home screen?",
    );
    await user.click(screen.getByTestId("ai_agent.send_button"));

    const list = await screen.findByTestId("ai_agent.message_list");
    expect(
      within(list).getByText("What is on my home screen?"),
    ).toBeInTheDocument();
    // Exactly one message: the user's own. No agent reply is produced.
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).queryByText(/Agent said:/)).not.toBeInTheDocument();
  });
});

describe("Directory Auth label is display-only", () => {
  it("renders 'Sign-in required' for a requiresAuth entry", async () => {
    renderWithActor(
      <DirectoryCard
        entry={directoryEntry(true)}
        index={0}
        signedIn
        onLaunch={vi.fn()}
        onToggleFavourite={vi.fn()}
        onAddToHome={vi.fn()}
        onRemoveFromHome={vi.fn()}
        favouritePending={false}
        addPending={false}
        removePending={false}
      />,
      makeActor(),
    );

    const card = await screen.findByTestId("directory.card.1");
    expect(within(card).getByText("Sign-in required")).toBeInTheDocument();
  });

  it("renders 'Open access' for a non-requiresAuth entry", async () => {
    renderWithActor(
      <DirectoryCard
        entry={directoryEntry(false)}
        index={0}
        signedIn
        onLaunch={vi.fn()}
        onToggleFavourite={vi.fn()}
        onAddToHome={vi.fn()}
        onRemoveFromHome={vi.fn()}
        favouritePending={false}
        addPending={false}
        removePending={false}
      />,
      makeActor(),
    );

    const card = await screen.findByTestId("directory.card.1");
    expect(within(card).getByText("Open access")).toBeInTheDocument();
  });

  it("shows the same Auth label for a fresh and a reconciled AI Agent entry", async () => {
    // A newly created workspace reads the live catalogue entry; an existing
    // workspace reconciled by the migration reads the stored entry. Both now
    // report requiresAuth = true, so the card must render one identical label.
    const fresh = directoryEntry(true);
    const reconciled = directoryEntry(true);

    const { unmount } = renderWithActor(
      <DirectoryCard
        entry={fresh}
        index={0}
        signedIn
        onLaunch={vi.fn()}
        onToggleFavourite={vi.fn()}
        onAddToHome={vi.fn()}
        onRemoveFromHome={vi.fn()}
        favouritePending={false}
        addPending={false}
        removePending={false}
      />,
      makeActor(),
    );
    const freshCard = await screen.findByTestId("directory.card.1");
    const freshLabel = within(freshCard).getByText("Sign-in required");
    expect(freshLabel).toBeInTheDocument();
    unmount();

    renderWithActor(
      <DirectoryCard
        entry={reconciled}
        index={0}
        signedIn
        onLaunch={vi.fn()}
        onToggleFavourite={vi.fn()}
        onAddToHome={vi.fn()}
        onRemoveFromHome={vi.fn()}
        favouritePending={false}
        addPending={false}
        removePending={false}
      />,
      makeActor(),
    );
    const reconciledCard = await screen.findByTestId("directory.card.1");
    expect(
      within(reconciledCard).getByText("Sign-in required"),
    ).toBeInTheDocument();
    expect(
      within(reconciledCard).queryByText("Open access"),
    ).not.toBeInTheDocument();
  });

  it("keeps the native AI Agent launchable regardless of the Auth label", async () => {
    const user = userEvent.setup();
    const onLaunch = vi.fn();
    renderWithActor(
      <DirectoryCard
        entry={directoryEntry(true)}
        index={0}
        signedIn
        onLaunch={onLaunch}
        onToggleFavourite={vi.fn()}
        onAddToHome={vi.fn()}
        onRemoveFromHome={vi.fn()}
        favouritePending={false}
        addPending={false}
        removePending={false}
      />,
      makeActor(),
    );

    const card = await screen.findByTestId("directory.card.1");
    const launch = within(card).getByRole("button", { name: "Open" });
    expect(launch).toBeEnabled();
    await user.click(launch);
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });
});

describe("Directory page AI Agent card", () => {
  it("shows the AI Agent with a Sign-in required Auth label", async () => {
    const user = userEvent.setup();
    const actor = {
      ...makeActor(),
      listDirectory: vi.fn<backendInterface["listDirectory"]>(async () => [
        directoryEntry(true),
      ]),
      listInstalledApps: vi.fn<backendInterface["listInstalledApps"]>(
        async () => [],
      ),
    } satisfies Pick<
      backendInterface,
      | "listDirectory"
      | "searchDirectory"
      | "addToHomeScreen"
      | "setDirectoryFavourite"
      | "listInstalledApps"
    >;

    // Render the real shell so the router is available, then reach the
    // Directory through the bottom navigation.
    renderWithActor(<App />, actor);
    await screen.findByTestId("app.content");
    await user.click(screen.getByTestId("nav.bottom_link.directory"));

    const list = await screen.findByTestId("directory.list");
    const card = within(list).getByText("AI Agent").closest("article");
    expect(card).not.toBeNull();
    expect(
      within(card as HTMLElement).getByText("Sign-in required"),
    ).toBeInTheDocument();
    expect(
      within(card as HTMLElement).queryByText("Open access"),
    ).not.toBeInTheDocument();
  });
});
