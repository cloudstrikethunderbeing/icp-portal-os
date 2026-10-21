import { setIdentityForTest } from "@/__tests__/setup";
import {
  renderSignedOutWithActor,
  renderWithActor,
} from "@/__tests__/test-utils";
import type { CalcEntry, backendInterface } from "@/backend";
import CalculatorPage from "@/pages/CalculatorPage";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

/**
 * Calculator journeys: arithmetic with precedence, percentages and parentheses
 * evaluate correctly, and a committed calculation is persisted through the
 * backend history API. The actor is a typed local fake.
 */

const NOW = 1_700_000_000_000_000_000n;

function makeActor(history: CalcEntry[] = []) {
  const listCalcHistory = vi.fn<backendInterface["listCalcHistory"]>(async () =>
    structuredClone(history),
  );
  const addCalcEntry = vi.fn<backendInterface["addCalcEntry"]>(
    async (expression: string, result: string) => {
      const entry: CalcEntry = {
        id: BigInt(history.length),
        expression,
        result,
        createdAt: NOW,
      };
      history.push(entry);
      return structuredClone(entry);
    },
  );
  const clearCalcHistory = vi.fn<backendInterface["clearCalcHistory"]>(
    async () => {
      history.length = 0;
    },
  );

  const actor = {
    listCalcHistory,
    addCalcEntry,
    clearCalcHistory,
  } satisfies Pick<
    backendInterface,
    "listCalcHistory" | "addCalcEntry" | "clearCalcHistory"
  >;

  return { actor, addCalcEntry, clearCalcHistory };
}

/** Sign in so the RequireSignIn gate renders the calculator workspace. */
function signIn() {
  setIdentityForTest({
    identity: {
      getPrincipal: () => ({ isAnonymous: () => false, toText: () => "abc" }),
    } as never,
    loginStatus: "success",
  });
}

async function pressKeys(
  user: ReturnType<typeof userEvent.setup>,
  keys: string[],
) {
  for (const key of keys) {
    await user.click(screen.getByTestId(`calculator.key.${key}`));
  }
}

describe("CalculatorPage", () => {
  it("evaluates arithmetic with correct operator precedence", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor } = makeActor();
    renderWithActor(<CalculatorPage />, actor);

    await pressKeys(user, ["2", "+", "3", "×", "4"]);
    await user.click(screen.getByTestId("calculator.key.equals"));

    await waitFor(() => {
      expect(screen.getByTestId("calculator.expression")).toHaveTextContent(
        "14",
      );
    });
  });

  it("evaluates parentheses", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor } = makeActor();
    renderWithActor(<CalculatorPage />, actor);

    await pressKeys(user, ["(", "2", "+", "3", ")", "×", "4"]);
    await user.click(screen.getByTestId("calculator.key.equals"));
    await waitFor(() => {
      expect(screen.getByTestId("calculator.expression")).toHaveTextContent(
        "20",
      );
    });
  });

  it("evaluates a trailing percentage", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor } = makeActor();
    renderWithActor(<CalculatorPage />, actor);

    await pressKeys(user, ["5", "0", "%"]);
    expect(screen.getByTestId("calculator.expression")).toHaveTextContent(
      "50%",
    );
    await user.click(screen.getByTestId("calculator.key.equals"));
    await waitFor(() => {
      expect(screen.getByTestId("calculator.expression")).toHaveTextContent(
        "0.5",
      );
    });
  });

  it("persists a committed calculation to the history API", async () => {
    const user = userEvent.setup();
    signIn();
    const { actor, addCalcEntry } = makeActor();
    renderWithActor(<CalculatorPage />, actor);

    await pressKeys(user, ["7", "×", "6"]);
    await user.click(screen.getByTestId("calculator.key.equals"));

    await waitFor(() => {
      expect(addCalcEntry).toHaveBeenCalledWith("7×6", "42");
    });

    const historyPanel = await screen.findByTestId("calculator.history_panel");
    await waitFor(() => {
      expect(within(historyPanel).getByText("7×6")).toBeInTheDocument();
    });
  });

  it("shows the empty history state when there are no calculations", async () => {
    signIn();
    const { actor } = makeActor();
    renderWithActor(<CalculatorPage />, actor);

    expect(
      await screen.findByTestId("calculator.history_empty_state"),
    ).toBeInTheDocument();
  });

  it("shows a sign-in prompt when signed out", async () => {
    const { actor } = makeActor();
    renderSignedOutWithActor(<CalculatorPage />, actor);

    expect(
      await screen.findByTestId("calculator.signed_out_state"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("auth.button")).toBeInTheDocument();
  });
});
