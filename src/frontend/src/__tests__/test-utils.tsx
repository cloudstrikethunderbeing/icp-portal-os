import type { backendInterface } from "@/backend";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { setActorForTest, setIdentityForTest } from "./setup";

/** A signed-in principal for page tests that render the private workspace. */
const SIGNED_IN_IDENTITY = {
  getPrincipal: () => ({
    isAnonymous: () => false,
    toText: () => "aaaaa-bbbbb-ccccc-ddddd-eee",
  }),
} as never;

export function renderWithActor<K extends keyof backendInterface>(
  ui: ReactElement,
  actor: Pick<backendInterface, K>,
) {
  setActorForTest(actor);
  // Page tests render the private workspace, so default to a signed-in identity.
  setIdentityForTest({ loginStatus: "success", identity: SIGNED_IN_IDENTITY });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  };
}

/**
 * Render a page in the signed-out state. The identity mock is read at render
 * time, so it must be set before mounting; `renderWithActor` forces a signed-in
 * identity and cannot be used for the unauthenticated branch.
 */
export function renderSignedOutWithActor<K extends keyof backendInterface>(
  ui: ReactElement,
  actor: Pick<backendInterface, K>,
) {
  setActorForTest(actor);
  setIdentityForTest({ loginStatus: "idle" });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
    queryClient,
  };
}
