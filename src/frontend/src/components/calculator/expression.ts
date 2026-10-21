/**
 * Expression engine for the calculator.
 *
 * The keypad builds a plain-text expression using the display operators
 * `+ - × ÷ % ( )`. This module tokenises that text and evaluates it with
 * correct operator precedence (multiplication/division before addition and
 * subtraction) via the shunting-yard algorithm, so parenthesised and mixed
 * expressions resolve correctly.
 *
 * Percentage semantics follow the familiar calculator convention:
 * - a trailing `%` divides its operand by 100 (`50%` → `0.5`)
 * - when the left operand of `+` or `-` is a plain number, `b%` is read as a
 *   percentage of that number (`200 + 10%` → `220`)
 */

export type Token =
  | { type: "number"; value: number }
  | { type: "operator"; value: "+" | "-" | "×" | "÷" }
  | { type: "percent" }
  | { type: "paren"; value: "(" | ")" };

const OPERATOR_PRECEDENCE: Record<"+" | "-" | "×" | "÷", number> = {
  "+": 1,
  "-": 1,
  "×": 2,
  "÷": 2,
};

/** Tokenise an expression string into numbers, operators, percent and parens. */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === " ") {
      index += 1;
      continue;
    }

    if (char >= "0" && char <= "9") {
      let literal = "";
      while (
        index < input.length &&
        ((input[index] >= "0" && input[index] <= "9") || input[index] === ".")
      ) {
        literal += input[index];
        index += 1;
      }
      tokens.push({ type: "number", value: Number(literal) });
      continue;
    }

    if (char === "+" || char === "-" || char === "×" || char === "÷") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "%") {
      tokens.push({ type: "percent" });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character "${char}"`);
  }

  return tokens;
}

/** Whether a token can legally follow another token (used for input validation). */
export function isValueToken(token: Token): boolean {
  return token.type === "number" || token.type === "percent";
}

/**
 * Evaluate a token stream. Throws on malformed input (unbalanced parentheses,
 * dangling operators, division by zero).
 */
export function evaluateTokens(tokens: Token[]): number {
  const values: number[] = [];
  const operators: Array<"+" | "-" | "×" | "÷" | "("> = [];

  const applyTop = () => {
    const operator = operators.pop();
    if (!operator || operator === "(") throw new Error("Malformed expression");
    const right = values.pop();
    const left = values.pop();
    if (left === undefined || right === undefined) {
      throw new Error("Malformed expression");
    }
    values.push(applyOperator(operator, left, right));
  };

  let expectValue = true;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === "number") {
      if (!expectValue) throw new Error("Malformed expression");
      values.push(token.value);
      expectValue = false;
      continue;
    }

    if (token.type === "percent") {
      if (expectValue) throw new Error("Malformed expression");
      const operand = values.pop();
      if (operand === undefined) throw new Error("Malformed expression");
      values.push(operand / 100);
      continue;
    }

    if (token.type === "paren" && token.value === "(") {
      if (!expectValue) throw new Error("Malformed expression");
      operators.push("(");
      continue;
    }

    if (token.type === "paren" && token.value === ")") {
      if (expectValue) throw new Error("Malformed expression");
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        applyTop();
      }
      if (operators.pop() === undefined)
        throw new Error("Unbalanced parentheses");
      continue;
    }

    if (token.type === "operator") {
      // A leading `-` (or `+`) is a unary sign on the following number.
      if (expectValue) {
        if (token.value === "-") {
          const next = tokens[i + 1];
          if (next && next.type === "number") {
            values.push(-next.value);
            i += 1;
            expectValue = false;
            continue;
          }
        }
        if (token.value === "+") {
          continue;
        }
        throw new Error("Malformed expression");
      }

      // Percentage-of-left-operand: `200 + 10%` → `200 + 200 × 0.1`.
      const next = tokens[i + 1];
      if (
        (token.value === "+" || token.value === "-") &&
        next &&
        next.type === "number" &&
        tokens[i + 2]?.type === "percent"
      ) {
        const left = values[values.length - 1];
        while (operators.length > 0) {
          const top = operators[operators.length - 1];
          if (top === "(") break;
          if (OPERATOR_PRECEDENCE[top] < OPERATOR_PRECEDENCE[token.value])
            break;
          applyTop();
        }
        operators.push(token.value);
        values.push(left * (next.value / 100));
        i += 2;
        expectValue = false;
        continue;
      }

      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (top === "(") break;
        if (OPERATOR_PRECEDENCE[top] < OPERATOR_PRECEDENCE[token.value]) break;
        applyTop();
      }
      operators.push(token.value);
      expectValue = true;
    }
  }

  if (expectValue) throw new Error("Incomplete expression");

  while (operators.length > 0) {
    if (operators[operators.length - 1] === "(") {
      throw new Error("Unbalanced parentheses");
    }
    applyTop();
  }

  if (values.length !== 1) throw new Error("Malformed expression");
  return values[0];
}

function applyOperator(
  operator: "+" | "-" | "×" | "÷",
  left: number,
  right: number,
): number {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "×":
      return left * right;
    case "÷":
      if (right === 0) throw new Error("Cannot divide by zero");
      return left / right;
  }
}

/** Evaluate an expression string, returning a number or throwing on error. */
export function evaluateExpression(input: string): number {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Empty expression");
  return evaluateTokens(tokens);
}

/**
 * Format a numeric result for display: trims floating-point noise, keeps up to
 * 12 significant digits and switches to exponential notation for very large or
 * very small magnitudes.
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  if (Number.isInteger(value) && Math.abs(value) < 1e15) {
    return value.toString();
  }
  const magnitude = Math.abs(value);
  if (magnitude !== 0 && (magnitude >= 1e15 || magnitude < 1e-9)) {
    return value.toExponential(6).replace(/\.?0+e/, "e");
  }
  const rounded = Number(value.toPrecision(12));
  return rounded.toString();
}
