import { createActor } from "@/backend";
import { RequireSignIn, SignInButton } from "@/components/InternetIdentity";
import { Calculator } from "@/components/calculator/Calculator";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calculator as CalculatorIcon } from "lucide-react";

const HISTORY_KEY = ["calcHistory"] as const;

/** The signed-in user's persisted calculation history. */
function useCalcHistory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCalcHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Persist a finished calculation for the signed-in user. */
function useAddCalcEntry() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      expression,
      result,
    }: {
      expression: string;
      result: string;
    }) => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.addCalcEntry(expression, result);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

/** Clear the signed-in user's calculation history. */
function useClearCalcHistory() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend is not ready");
      return actor.clearCalcHistory();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}

function CalculatorWorkspace() {
  const history = useCalcHistory();
  const addEntry = useAddCalcEntry();
  const clearHistory = useClearCalcHistory();

  return (
    <Calculator
      history={history.data ?? []}
      isHistoryLoading={history.isPending}
      isHistoryError={history.isError}
      isClearingHistory={clearHistory.isPending}
      onClearHistory={() => clearHistory.mutate()}
      onCommit={(expression, result) => addEntry.mutate({ expression, result })}
    />
  );
}

/**
 * Calculator — everyday arithmetic with correct operator precedence,
 * percentages, parentheses, memory keys and a per-user persisted history.
 */
export default function CalculatorPage() {
  return (
    <section data-ocid="calculator.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Calculator
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Everyday arithmetic with memory and a saved history.
        </p>
      </header>

      <RequireSignIn
        fallback={
          <div
            data-ocid="calculator.signed_out_state"
            className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-subtle"
          >
            <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-chart-3 to-accent text-white">
              <CalculatorIcon className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Sign in to calculate
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Your calculation history is private to your Internet Identity.
            </p>
            <SignInButton className="rounded-full bg-gradient-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
          </div>
        }
      >
        <CalculatorWorkspace />
      </RequireSignIn>
    </section>
  );
}
