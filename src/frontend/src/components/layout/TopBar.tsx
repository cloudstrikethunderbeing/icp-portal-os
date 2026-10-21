import { SignInButton } from "@/components/InternetIdentity";
import { HomeControl } from "@/components/layout/HomeControl";
import { useWorkspaceIdentity } from "@/hooks/useWorkspace";

/**
 * Sticky top bar: persistent Home control, workspace identity and the sign-in /
 * sign-out entry point. Uses the aurora-glass material from the design system.
 */
export function TopBar() {
  const workspace = useWorkspaceIdentity();

  return (
    <header
      data-ocid="nav.top_bar"
      className="safe-top sticky top-0 z-30 border-b border-border surface-glass"
    >
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <HomeControl />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
            {workspace ? "Your workspace" : "ICP Portal"}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {workspace ? workspace.shortPrincipal : "Not signed in"}
          </p>
        </div>
        <SignInButton className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" />
      </div>
    </header>
  );
}
