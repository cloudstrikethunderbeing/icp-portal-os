import { AgentComposer } from "@/components/ai/AgentComposer";
import { AgentNotice } from "@/components/ai/AgentNotice";
import { CapabilityPreview } from "@/components/ai/CapabilityPreview";
import { type ChatMessage, MessageList } from "@/components/ai/MessageList";
import { Bot } from "lucide-react";
import { useState } from "react";

/**
 * AI Agent — a preview of the workspace agent. The chat surface is interactive
 * so the experience can be evaluated, but it is deliberately not connected to
 * any AI service: it never sends a request and never fabricates a reply.
 */
export default function AiAgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  function handleSend(text: string) {
    setMessages((current) => [
      ...current,
      { id: `m-${current.length + 1}`, role: "user", text },
    ]);
  }

  return (
    <section data-ocid="ai_agent.page" className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="app-tile flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-br from-chart-5 to-primary text-white">
          <Bot className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            AI Agent
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            A preview of the assistant that will work across your workspace.
          </p>
        </div>
      </header>

      <AgentNotice />

      <div
        data-ocid="ai_agent.panel"
        className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-subtle md:p-5"
      >
        <MessageList messages={messages} />
        <AgentComposer onSend={handleSend} />
      </div>

      <CapabilityPreview />
    </section>
  );
}
