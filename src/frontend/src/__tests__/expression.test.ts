import {
  evaluateExpression,
  formatResult,
} from "@/components/calculator/expression";
import { describe, expect, it } from "vitest";

/**
 * The calculator expression engine: operator precedence, parentheses and the
 * documented percentage semantics. These are pure functions, so this is a
 * direct unit contract for the arithmetic the Calculator page relies on.
 */
describe("evaluateExpression", () => {
  it("applies multiplication before addition", () => {
    expect(evaluateExpression("2+3×4")).toBe(14);
  });

  it("evaluates parenthesised expressions", () => {
    expect(evaluateExpression("(2+3)×4")).toBe(20);
  });

  it("treats a trailing percent as a division by 100", () => {
    expect(evaluateExpression("50%")).toBe(0.5);
  });

  it("applies a percent operand inside a larger expression", () => {
    expect(evaluateExpression("100×50%")).toBe(50);
  });

  it("reads a percent after + as a percentage of the left operand", () => {
    expect(evaluateExpression("200+10%")).toBe(220);
  });

  it("reads a percent after - as a percentage of the left operand", () => {
    expect(evaluateExpression("200-10%")).toBe(180);
  });

  it("formats integer results without floating-point noise", () => {
    expect(formatResult(evaluateExpression("0.1+0.2"))).toBe("0.3");
  });
});
