import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsSection";
import { useWorkspaceIdentity } from "@/hooks/useWorkspace";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";

/**
 * Account and session information: the signed-in principal, the workspace role
 * and the sign-out action that ends the session and returns to the Home screen.
 */
export function AccountSection() {
  const workspace = useWorkspaceIdentity();
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const principal = workspace?.principal ?? "";

  const handleCopy = async () => {
    if (!principal) return;
    try {
      await navigator.clipboard.writeText(principal);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSignOut = () => {
    void queryClient.cancelQueries();
    queryClient.clear();
    clear();
  };

  return (
    <SettingsSection
      id="account"
      title="Account & session"
      description="Your Internet Identity and the workspace it unlocks."
      icon={UserRound}
    >
      <SettingsRow
        label="Signed-in principal"
        hint="Your private workspace is scoped to this identity."
      >
        <div className="flex items-center justify-end gap-2">
          <code
            data-ocid="settings.principal"
            className="max-w-[14rem] truncate rounded-lg bg-muted px-2.5 py-1.5 font-mono text-xs text-foreground"
            title={principal}
          >
            {principal || "Not signed in"}
          </code>
          <button
            type="button"
            data-ocid="settings.copy_principal_button"
            aria-label="Copy principal to clipboard"
            disabled={!principal}
            onClick={() => void handleCopy()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-smooth hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Workspace role"
        hint="Roles are managed by the workspace access-control system."
      >
        <span
          data-ocid="settings.role"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {workspace?.role ?? "guest"}
        </span>
      </SettingsRow>

      <SettingsRow
        label="Session"
        hint="Signing out clears this device's cached workspace data."
      >
        <button
          type="button"
          data-ocid="settings.sign_out_button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-smooth hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </SettingsRow>
    </SettingsSection>
  );
}
