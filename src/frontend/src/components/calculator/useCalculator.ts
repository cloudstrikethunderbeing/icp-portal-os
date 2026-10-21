import { useCallback, useEffect, useMemo, useState } from "react";
import { evaluateExpression, formatResult } from "./expression";

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "+"
  | "-"
  | "×"
  | "÷"
  | "%"
  | "("
  | ")"
  | "clear"
  | "backspace"
  | "equals";

export interface CalculatorState {
  /** The expression currently being built, e.g. `12 + (3 × 4)`. */
  expression: string;
  /** The last committed result, shown large when no expression is in progress. */
  result: string;
  /** Live preview of the expression's value, or null when it cannot be evaluated. */
  preview: string | null;
  /** Stored memory value, or null when memory is empty. */
  memory: number | null;
  /** True when the last action produced an error. */
  hasError: boolean;
  press: (key: KeypadKey) => void;
  clear: () => void;
  clearMemory: () => void;
  recallMemory: () => void;
  storeMemory: () => void;
  /** Commit the current expression and return the entry to persist, if valid. */
  commit: () => { expression: string; result: string } | null;
}

const OPERATORS = new Set(["+", "-", "×", "÷"]);
const MAX_DIGITS = 15;

function lastChar(expression: string): string {
  return expression.slice(-1);
}

/**
 * Calculator state machine. Owns the in-progress expression, the running result,
 * memory, and keyboard handling. Persistence of committed entries is delegated
 * to the caller through `commit`.
 */
export function useCalculator(): CalculatorState {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [memory, setMemory] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);

  const preview = useMemo(() => {
    if (expression.length === 0) return null;
    try {
      return formatResult(evaluateExpression(expression));
    } catch {
      return null;
    }
  }, [expression]);

  const append = useCallback((text: string) => {
    setHasError(false);
    setExpression((current) => {
      const next = current + text;
      // Guard against runaway digit strings.
      const trailingNumber = next.match(/[0-9.]+$/)?.[0] ?? "";
      if (trailingNumber.replace(".", "").length > MAX_DIGITS) return current;
      return next;
    });
  }, []);

  const press = useCallback(
    (key: KeypadKey) => {
      switch (key) {
        case "clear":
          setExpression("");
          setResult("0");
          setHasError(false);
          return;
        case "backspace":
          setHasError(false);
          setExpression((current) => current.slice(0, -1));
          return;
        case "equals": {
          if (expression.length === 0) return;
          try {
            const value = evaluateExpression(expression);
            setResult(formatResult(value));
            setExpression("");
            setHasError(false);
          } catch {
            setHasError(true);
          }
          return;
        }
        case ".": {
          setHasError(false);
          setExpression((current) => {
            const trailingNumber = current.match(/[0-9.]*$/)?.[0] ?? "";
            if (trailingNumber.includes(".")) return current;
            if (trailingNumber.length === 0) return `${current}0.`;
            return `${current}.`;
          });
          return;
        }
        case "+":
        case "-":
        case "×":
        case "÷": {
          setHasError(false);
          setExpression((current) => {
            if (current.length === 0) {
              // Allow a leading minus for negative numbers.
              return key === "-" ? "-" : current;
            }
            const last = lastChar(current);
            if (OPERATORS.has(last)) {
              return `${current.slice(0, -1)}${key}`;
            }
            if (last === "(") {
              return key === "-" ? `${current}-` : current;
            }
            return `${current}${key}`;
          });
          return;
        }
        case "%": {
          setHasError(false);
          setExpression((current) => {
            if (current.length === 0) return current;
            const last = lastChar(current);
            if (OPERATORS.has(last) || last === "(") return current;
            return `${current}%`;
          });
          return;
        }
        case "(": {
          setHasError(false);
          setExpression((current) => {
            const last = lastChar(current);
            if (last === ")" || /[0-9.]/.test(last) || last === "%") {
              return `${current}×(`;
            }
            return `${current}(`;
          });
          return;
        }
        case ")": {
          setHasError(false);
          setExpression((current) => {
            const opens = (current.match(/\(/g) ?? []).length;
            const closes = (current.match(/\)/g) ?? []).length;
            if (opens <= closes) return current;
            const last = lastChar(current);
            if (OPERATORS.has(last) || last === "(") return current;
            return `${current})`;
          });
          return;
        }
        default:
          append(key);
      }
    },
    [append, expression],
  );

  const clear = useCallback(() => {
    setExpression("");
    setResult("0");
    setHasError(false);
  }, []);

  const storeMemory = useCallback(() => {
    const source = preview ?? (expression.length === 0 ? result : null);
    if (source === null) return;
    const value = Number(source);
    if (Number.isNaN(value)) return;
    setMemory(value);
  }, [expression, preview, result]);

  const recallMemory = useCallback(() => {
    if (memory === null) return;
    setHasError(false);
    setExpression((current) => `${current}${formatResult(memory)}`);
  }, [memory]);

  const clearMemory = useCallback(() => setMemory(null), []);

  const commit = useCallback(() => {
    if (expression.length === 0) return null;
    try {
      const value = evaluateExpression(expression);
      const formatted = formatResult(value);
      setResult(formatted);
      setExpression("");
      setHasError(false);
      return { expression, result: formatted };
    } catch {
      setHasError(true);
      return null;
    }
  }, [expression]);

  // Physical keyboard support.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = event.key;
      let mapped: KeypadKey | null = null;

      if (/^[0-9]$/.test(key)) mapped = key as KeypadKey;
      else if (key === "." || key === ",") mapped = ".";
      else if (key === "+") mapped = "+";
      else if (key === "-") mapped = "-";
      else if (key === "*" || key.toLowerCase() === "x") mapped = "×";
      else if (key === "/") mapped = "÷";
      else if (key === "%") mapped = "%";
      else if (key === "(") mapped = "(";
      else if (key === ")") mapped = ")";
      else if (key === "Enter" || key === "=") mapped = "equals";
      else if (key === "Backspace") mapped = "backspace";
      else if (key === "Escape" || key.toLowerCase() === "c") mapped = "clear";

      if (mapped) {
        event.preventDefault();
        press(mapped);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [press]);

  return {
    expression,
    result,
    preview,
    memory,
    hasError,
    press,
    clear,
    clearMemory,
    recallMemory,
    storeMemory,
    commit,
  };
}
