import App from "@/App";
import { setActorForTest, setIdentityForTest } from "@/__tests__/setup";
import { UserRole, type backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * The signed-in / signed-out shell states: a signed-out visitor sees the Home
 * screen with a clear Sign in entry point, the signed-in shell shows the
 * personal workspace identity and a Sign out action, and each action calls the
 * identity context's login / clear.
 *
 * The identity context is an explicit UI-state mock; it never proves real
 * Internet Identity authentication.
 */

function makeActor() {
  const actor = {
    getCallerUserRole: vi.fn(async () => UserRole.user),
    listAppRegistry: vi.fn(async () => []),
    listInstalledApps: vi.fn(async () => []),
    listHomeItems: vi.fn(async () => []),
    getDock: vi.fn(async () => ({ appIds: [] })),
  } satisfies Pick<
    backendInterface,
    | "getCallerUserRole"
    | "listAppRegistry"
    | "listInstalledApps"
    | "listHomeItems"
    | "getDock"
  >;
  return actor;
}

function renderApp() {
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

const SIGNED_IN_IDENTITY = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "aaaaa-bbbbb-ccccc-ddddd-eee",
  }),
} as never;

describe("App authentication shell", () => {
  it("shows the Home screen and a Sign in entry point when signed out", async () => {
    setActorForTest(makeActor());
    setIdentityForTest({ loginStatus: "idle" });
    renderApp();

    expect(await screen.findByTestId("home.page")).toBeInTheDocument();
    expect(screen.getByTestId("auth.button")).toHaveTextContent(
      "Sign in with Internet Identity",
    );
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
  });

  it("starts the sign-in flow from the signed-out Home screen", async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    setActorForTest(makeActor());
    setIdentityForTest({ loginStatus: "idle", login });
    renderApp();

    await user.click(await screen.findByTestId("auth.button"));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("shows the personal workspace identity and a Sign out action when signed in", async () => {
    setActorForTest(makeActor());
    setIdentityForTest({
      loginStatus: "success",
      identity: SIGNED_IN_IDENTITY,
    });
    renderApp();

    expect(await screen.findByTestId("home.page")).toBeInTheDocument();
    expect(screen.getByTestId("auth.button")).toHaveTextContent("Sign out");
    expect(screen.getByText("Your workspace")).toBeInTheDocument();
  });

  it("signs out from the signed-in shell", async () => {
    const user = userEvent.setup();
    const clear = vi.fn();
    setActorForTest(makeActor());
    setIdentityForTest({
      loginStatus: "success",
      clear,
      identity: SIGNED_IN_IDENTITY,
    });
    renderApp();

    await user.click(await screen.findByTestId("auth.button"));
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
