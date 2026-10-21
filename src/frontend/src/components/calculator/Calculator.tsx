import type { CalcEntry } from "@/backend";
import { CalculatorDisplay } from "./CalculatorDisplay";
import { HistoryPanel } from "./HistoryPanel";
import { Keypad } from "./Keypad";
import { MemoryControls } from "./MemoryControls";
import { useCalculator } from "./useCalculator";

/**
 * The calculator surface: display, memory controls, keypad and history. The
 * expression engine and keyboard handling live in `useCalculator`; history is
 * supplied by the page so it can be persisted through the backend.
 */
export function Calculator({
  history,
  isHistoryLoading,
  isHistoryError,
  isClearingHistory,
  onClearHistory,
  onCommit,
}: {
  history: CalcEntry[];
  isHistoryLoading: boolean;
  isHistoryError: boolean;
  isClearingHistory: boolean;
  onClearHistory: () => void;
  onCommit: (expression: string, result: string) => void;
}) {
  const calculator = useCalculator();

  const handleEquals = () => {
    const entry = calculator.commit();
    if (entry) onCommit(entry.expression, entry.result);
  };

  const handleSelectHistory = (entry: CalcEntry) => {
    calculator.press("clear");
    for (const char of entry.result) {
      if (char === ".") calculator.press(".");
      else if (char === "-") calculator.press("-");
      else if (char >= "0" && char <= "9") {
        calculator.press(char as "0");
      }
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-3">
        <CalculatorDisplay
          expression={calculator.expression}
          result={calculator.result}
          preview={calculator.preview}
          hasError={calculator.hasError}
          memory={calculator.memory}
        />
        <MemoryControls
          memory={calculator.memory}
          onStore={calculator.storeMemory}
          onRecall={calculator.recallMemory}
          onClear={calculator.clearMemory}
        />
        <Keypad
          onPress={(key) => {
            if (key === "equals") handleEquals();
            else calculator.press(key);
          }}
        />
      </div>

      <HistoryPanel
        entries={history}
        isLoading={isHistoryLoading}
        isError={isHistoryError}
        isClearing={isClearingHistory}
        onClear={onClearHistory}
        onSelect={handleSelectHistory}
      />
    </div>
  );
}
