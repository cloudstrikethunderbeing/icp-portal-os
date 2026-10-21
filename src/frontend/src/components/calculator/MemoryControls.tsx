import { cn } from "@/lib/utils";

/**
 * Memory controls: store the current value, recall it into the expression, and
 * clear memory. Recall and clear are disabled when memory is empty, and the
 * disabled state explains what is missing.
 */
export function MemoryControls({
  memory,
  onStore,
  onRecall,
  onClear,
  className,
}: {
  memory: number | null;
  onStore: () => void;
  onRecall: () => void;
  onClear: () => void;
  className?: string;
}) {
  const empty = memory === null;
  const buttonClass =
    "flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-xl border border-border bg-card px-3 font-body text-sm font-medium text-foreground transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      data-ocid="calculator.memory_controls"
      className={cn("flex items-center gap-2", className)}
    >
      <button
        type="button"
        data-ocid="calculator.memory_store_button"
        onClick={onStore}
        className={buttonClass}
      >
        M+
      </button>
      <button
        type="button"
        data-ocid="calculator.memory_recall_button"
        onClick={onRecall}
        disabled={empty}
        title={empty ? "Memory is empty" : "Recall stored value"}
        className={buttonClass}
      >
        MR
      </button>
      <button
        type="button"
        data-ocid="calculator.memory_clear_button"
        onClick={onClear}
        disabled={empty}
        title={empty ? "Memory is empty" : "Clear stored value"}
        className={buttonClass}
      >
        MC
      </button>
    </div>
  );
}
