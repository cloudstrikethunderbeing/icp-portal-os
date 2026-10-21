import { cn } from "@/lib/utils";
import { Delete } from "lucide-react";
import type { KeypadKey } from "./useCalculator";

interface KeypadButton {
  key: KeypadKey;
  label: string;
  /** Visual role: digit, operator, function, or the primary equals action. */
  variant: "digit" | "operator" | "function" | "equals";
  /** Accessible label when the visible glyph is ambiguous. */
  ariaLabel?: string;
  /** Grid span for wide keys. */
  span?: 2;
}

const KEYS: KeypadButton[] = [
  { key: "clear", label: "AC", variant: "function", ariaLabel: "Clear all" },
  { key: "(", label: "(", variant: "function", ariaLabel: "Open parenthesis" },
  { key: ")", label: ")", variant: "function", ariaLabel: "Close parenthesis" },
  { key: "%", label: "%", variant: "function", ariaLabel: "Percent" },
  { key: "÷", label: "÷", variant: "operator", ariaLabel: "Divide" },

  { key: "7", label: "7", variant: "digit" },
  { key: "8", label: "8", variant: "digit" },
  { key: "9", label: "9", variant: "digit" },
  { key: "×", label: "×", variant: "operator", ariaLabel: "Multiply" },
  { key: "backspace", label: "⌫", variant: "function", ariaLabel: "Backspace" },

  { key: "4", label: "4", variant: "digit" },
  { key: "5", label: "5", variant: "digit" },
  { key: "6", label: "6", variant: "digit" },
  { key: "-", label: "−", variant: "operator", ariaLabel: "Subtract" },
  { key: "equals", label: "=", variant: "equals", ariaLabel: "Equals" },

  { key: "1", label: "1", variant: "digit" },
  { key: "2", label: "2", variant: "digit" },
  { key: "3", label: "3", variant: "digit" },
  { key: "+", label: "+", variant: "operator", ariaLabel: "Add" },

  { key: "0", label: "0", variant: "digit", span: 2 },
  { key: ".", label: ".", variant: "digit", ariaLabel: "Decimal point" },
];

const VARIANT_CLASSES: Record<KeypadButton["variant"], string> = {
  digit:
    "bg-card text-foreground hover:bg-secondary active:scale-[0.97] shadow-subtle",
  operator:
    "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground active:scale-[0.97]",
  function:
    "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.97]",
  equals:
    "bg-gradient-primary text-primary-foreground hover:shadow-elevated active:scale-[0.97]",
};

/**
 * The calculator keypad. Every key is a large touch target (min 56px tall) and
 * carries a stable `data-ocid` marker for deterministic testing.
 */
export function Keypad({
  onPress,
  className,
}: {
  onPress: (key: KeypadKey) => void;
  className?: string;
}) {
  return (
    <div
      data-ocid="calculator.keypad"
      className={cn("grid grid-cols-5 gap-2 md:gap-3", className)}
    >
      {KEYS.map((button) => (
        <button
          key={button.key}
          type="button"
          data-ocid={`calculator.key.${button.key}`}
          aria-label={button.ariaLabel ?? button.label}
          onClick={() => onPress(button.key)}
          className={cn(
            "flex h-14 min-h-[56px] items-center justify-center rounded-2xl font-display text-xl font-semibold transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-16 md:text-2xl",
            button.span === 2 && "col-span-2",
            VARIANT_CLASSES[button.variant],
          )}
        >
          {button.key === "backspace" ? (
            <Delete className="h-5 w-5" aria-hidden="true" />
          ) : (
            button.label
          )}
        </button>
      ))}
    </div>
  );
}
