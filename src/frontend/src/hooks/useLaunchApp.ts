import type { AppRegistryEntry } from "@/types";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

/**
 * Validate a user-supplied or registry target address before it is opened.
 *
 * Only `http` and `https` addresses are accepted. A bare host such as
 * `example.com` is upgraded to `https://example.com`; anything else (a
 * `javascript:` scheme, a malformed host, an empty string) is rejected so the
 * app never opens an unsafe or broken target.
 */
export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.hostname.length === 0) return null;
  // A hostname must contain a dot or be localhost to be a real web address.
  if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
    return null;
  }
  return parsed.toString();
}

/** The outcome of a launch attempt, so callers can surface a clear message. */
export type LaunchResult =
  | { ok: true }
  | { ok: false; reason: "invalid-url" | "blocked" | "no-target" };

/**
 * Resolves a registry entry into a real launch action.
 *
 * - `native`      → navigates inside the shell.
 * - `icp-service` / `external-web` → validates the target and opens it in the
 *   system browser (a new tab), reporting a clear failure when the address is
 *   invalid or the browser blocks the popup.
 * - `coming-soon` → does nothing; the tile is labelled and disabled.
 */
export function useLaunchApp() {
  const navigate = useNavigate();

  return useCallback(
    (app: AppRegistryEntry): LaunchResult => {
      switch (app.launchType) {
        case "native": {
          if (app.route) {
            void navigate({ to: app.route });
            return { ok: true };
          }
          return { ok: false, reason: "no-target" };
        }
        case "icp-service":
        case "external-web": {
          if (!app.href) return { ok: false, reason: "no-target" };
          const url = normalizeExternalUrl(app.href);
          if (!url) return { ok: false, reason: "invalid-url" };
          const opened = window.open(url, "_blank", "noopener,noreferrer");
          if (!opened) return { ok: false, reason: "blocked" };
          return { ok: true };
        }
        case "coming-soon":
          return { ok: false, reason: "no-target" };
      }
    },
    [navigate],
  );
}
