import { Bot, User } from "lucide-react";

export type ChatRole = "user" | "agent";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type MessageListProps = {
  messages: ChatMessage[];
};

/**
 * Renders the conversation transcript. Messages are local UI state only — the
 * agent never produces a reply, so the list stays exactly what the user typed.
 */
export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div
        data-ocid="ai_agent.empty_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center"
      >
        <span className="app-tile flex h-12 w-12 items-center justify-center bg-gradient-to-br from-chart-5 to-primary text-white">
          <Bot className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="font-display text-base font-semibold text-foreground">
          No messages yet
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Type a message below to see how the conversation will look. The agent
          will not reply while it is in preview.
        </p>
      </div>
    );
  }

  return (
    <ul
      data-ocid="ai_agent.message_list"
      className="space-y-3"
      aria-live="polite"
    >
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <li
            key={message.id}
            data-ocid={`ai_agent.message.${message.id}`}
            className={`flex items-start gap-3 ${
              isUser ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-primary"
              }`}
              aria-hidden="true"
            >
              {isUser ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </span>
            <div
              className={`max-w-[80%] min-w-0 rounded-2xl px-4 py-2.5 text-sm ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground shadow-subtle"
              }`}
            >
              <span className="sr-only">
                {isUser ? "You said: " : "Agent said: "}
              </span>
              <p className="whitespace-pre-wrap break-words">{message.text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
