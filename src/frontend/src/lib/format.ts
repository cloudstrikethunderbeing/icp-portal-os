/**
 * Convert a Motoko `Time.now()` nanosecond bigint into a JavaScript Date.
 * Returns null when the value cannot be represented as a valid date.
 */
export function timestampToDate(timestamp: bigint): Date | null {
  const date = new Date(Number(timestamp / 1_000_000n));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a backend timestamp for display, with a safe fallback. */
export function formatTimestamp(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Shorten a principal for compact display: `abcd…wxyz`. */
export function shortenPrincipal(
  principal: string,
  lead = 5,
  tail = 4,
): string {
  if (principal.length <= lead + tail + 1) return principal;
  return `${principal.slice(0, lead)}…${principal.slice(-tail)}`;
}

/** Format a byte count into a human-readable size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
