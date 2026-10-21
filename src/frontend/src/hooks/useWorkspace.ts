import { useCallerRole } from "@/hooks/useQueries";
import { shortenPrincipal } from "@/lib/format";
import type { WorkspaceIdentity } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";

/**
 * The signed-in workspace identity. Returns `null` while signed out so screens
 * can render their unauthenticated state without duplicating principal logic.
 */
export function useWorkspaceIdentity(): WorkspaceIdentity | null {
  const { identity } = useInternetIdentity();
  const { data: role } = useCallerRole();

  if (!identity || identity.getPrincipal().isAnonymous()) return null;

  const principal = identity.getPrincipal().toText();
  return {
    principal,
    shortPrincipal: shortenPrincipal(principal),
    role: role ?? "user",
    isAdmin: role === "admin",
  };
}
