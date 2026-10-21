import { cn } from "@/lib/utils";

/**
 * The calculator readout. Shows the in-progress expression, a live preview of
 * its value, and the last committed result. Uses the mono face for numeric
 * readouts per the design brief.
 */
export function CalculatorDisplay({
  expression,
  result,
  preview,
  hasError,
  memory,
}: {
  expression: string;
  result: string;
  preview: string | null;
  hasError: boolean;
  memory: number | null;
}) {
  const showPreview = expression.length > 0 && preview !== null;
  const primary = expression.length > 0 ? expression : result;

  return (
    <div
      data-ocid="calculator.display"
      className="rounded-2xl border border-border bg-card p-5 shadow-subtle md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          data-ocid="calculator.memory_indicator"
          className={cn(
            "rounded-full px-2.5 py-1 font-mono text-xs font-semibold tracking-wider transition-smooth",
            memory !== null
              ? "bg-accent/15 text-accent"
              : "bg-muted text-muted-foreground/60",
          )}
        >
          M
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {memory !== null ? `stored ${memory}` : "memory empty"}
        </span>
      </div>

      <div className="mt-4 min-h-[3.5rem] text-right">
        <p
          data-ocid="calculator.expression"
          className={cn(
            "break-all font-mono text-2xl font-semibold tracking-tight md:text-3xl",
            hasError ? "text-destructive" : "text-foreground",
          )}
        >
          {hasError ? "Error" : primary || "0"}
        </p>
        <p
          data-ocid="calculator.preview"
          className="mt-1 min-h-[1.5rem] break-all font-mono text-sm text-muted-foreground md:text-base"
        >
          {hasError
            ? "Check the expression and try again"
            : showPreview
              ? `= ${preview}`
              : "\u00a0"}
        </p>
      </div>
    </div>
  );
}
