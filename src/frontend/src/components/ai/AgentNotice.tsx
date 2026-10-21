import { ShieldCheck, Sparkles } from "lucide-react";

/**
 * Honest status banner for the AI Agent screen. The agent is not wired to any
 * model yet, so this states that plainly and sets the safety expectation for
 * sensitive and financial actions.
 */
export function AgentNotice() {
  return (
    <div
      data-ocid="ai_agent.notice"
      className="surface-glass flex flex-col gap-3 rounded-2xl border border-border p-4 shadow-subtle md:flex-row md:items-start md:gap-4 md:p-5"
    >
      <span className="app-tile flex h-10 w-10 shrink-0 items-center justify-center bg-gradient-primary text-primary-foreground">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-base font-semibold text-foreground">
            Preview — not yet functional
          </h2>
          <span className="rounded-full border border-warning/50 bg-warning/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-warning">
            Coming soon
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          This is a preview of the workspace agent. It is not connected to any
          AI service yet, so it will not answer your messages or take any
          action.
        </p>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck
            className="mt-0.5 h-4 w-4 shrink-0 text-accent"
            aria-hidden="true"
          />
          <span>
            When it ships, sensitive actions and financial transactions will
            always require your explicit confirmation before anything happens.
          </span>
        </p>
      </div>
    </div>
  );
}
