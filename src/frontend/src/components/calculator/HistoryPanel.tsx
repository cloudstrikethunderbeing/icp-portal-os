import type { CalcEntry } from "@/backend";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { History, Trash2 } from "lucide-react";

/**
 * Calculation history. Entries are persisted per signed-in principal through the
 * backend calculator API; this panel renders them, exposes a clear action, and
 * handles loading, empty and error states.
 */
export function HistoryPanel({
  entries,
  isLoading,
  isError,
  isClearing,
  onClear,
  onSelect,
  className,
}: {
  entries: CalcEntry[];
  isLoading: boolean;
  isError: boolean;
  isClearing: boolean;
  onClear: () => void;
  onSelect: (entry: CalcEntry) => void;
  className?: string;
}) {
  return (
    <section
      data-ocid="calculator.history_panel"
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card shadow-subtle",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <History
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            History
          </h2>
        </div>
        <button
          type="button"
          data-ocid="calculator.history_clear_button"
          onClick={onClear}
          disabled={entries.length === 0 || isClearing}
          className="inline-flex h-9 min-h-[36px] items-center gap-1.5 rounded-full px-3 text-xs font-medium text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {isClearing ? "Clearing…" : "Clear"}
        </button>
      </header>

      <div className="max-h-[22rem] flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <ul
            data-ocid="calculator.history_loading_state"
            className="space-y-2 p-2"
          >
            {Array.from({ length: 4 }, (_, i) => `history-skeleton-${i}`).map(
              (id) => (
                <li
                  key={id}
                  className="h-12 animate-pulse rounded-xl bg-muted"
                  aria-hidden="true"
                />
              ),
            )}
          </ul>
        ) : isError ? (
          <p
            data-ocid="calculator.history_error_state"
            className="px-3 py-8 text-center text-sm text-destructive"
          >
            Could not load your history. Try again in a moment.
          </p>
        ) : entries.length === 0 ? (
          <div
            data-ocid="calculator.history_empty_state"
            className="flex flex-col items-center gap-2 px-4 py-10 text-center"
          >
            <span className="app-tile flex h-11 w-11 items-center justify-center bg-gradient-to-br from-chart-3 to-accent text-white">
              <History className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              No calculations yet
            </p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">
              Finished calculations are saved here for your Internet Identity.
            </p>
          </div>
        ) : (
          <ul data-ocid="calculator.history_list" className="space-y-1">
            {entries.map((entry, index) => (
              <li key={entry.id.toString()}>
                <button
                  type="button"
                  data-ocid={`calculator.history_item.${index + 1}`}
                  onClick={() => onSelect(entry)}
                  title="Reuse this result"
                  className="w-full rounded-xl px-3 py-2 text-right transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {entry.expression}
                  </span>
                  <span className="block truncate font-mono text-base font-semibold text-foreground">
                    = {entry.result}
                  </span>
                  <span className="block font-body text-[0.65rem] text-muted-foreground/70">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
