import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { type FormEvent, useState } from "react";

type AgentComposerProps = {
  onSend: (text: string) => void;
};

/**
 * The message composer. It is fully interactive so the layout can be evaluated,
 * but it only appends the user's own message to the transcript — no request is
 * sent anywhere and no reply is fabricated.
 */
export function AgentComposer({ onSend }: AgentComposerProps) {
  const [draft, setDraft] = useState("");

  const trimmed = draft.trim();
  const canSend = trimmed.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <form
      data-ocid="ai_agent.composer"
      onSubmit={handleSubmit}
      className="surface-raised sticky bottom-0 space-y-2 rounded-2xl border border-border p-3 shadow-elevated"
    >
      <label htmlFor="ai-agent-input" className="sr-only">
        Message the AI agent
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id="ai-agent-input"
          data-ocid="ai_agent.input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about your workspace…"
          rows={1}
          className="min-h-11 resize-none bg-card"
        />
        <Button
          type="submit"
          data-ocid="ai_agent.send_button"
          disabled={!canSend}
          className="h-11 shrink-0 rounded-full bg-gradient-primary px-4 text-primary-foreground transition-smooth hover:shadow-elevated"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Preview only — messages stay on this screen and the agent will not
        respond.
      </p>
    </form>
  );
}
