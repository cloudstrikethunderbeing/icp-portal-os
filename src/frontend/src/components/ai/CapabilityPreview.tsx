import {
  Calculator,
  FileSearch,
  FolderTree,
  type LucideIcon,
  NotebookPen,
  Rocket,
} from "lucide-react";

type Capability = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const CAPABILITIES: Capability[] = [
  {
    id: "search",
    icon: FileSearch,
    title: "Search your workspace",
    description:
      "Find files, notes and records across your private workspace in plain language.",
  },
  {
    id: "organize",
    icon: FolderTree,
    title: "Organize files",
    description:
      "Group, rename and tidy folders and documents without manual dragging.",
  },
  {
    id: "summarize",
    icon: NotebookPen,
    title: "Summarize documents",
    description:
      "Turn long notes and documents into short, readable summaries you can act on.",
  },
  {
    id: "generate",
    icon: Rocket,
    title: "Generate documents",
    description:
      "Draft notes, outlines and documents from a short prompt, ready to edit.",
  },
  {
    id: "calculate",
    icon: Calculator,
    title: "Calculate projections",
    description:
      "Run quick projections and estimates from the numbers already in your workspace.",
  },
];

/**
 * A read-only preview of the capabilities the agent is intended to gain. These
 * are descriptions only — nothing here is wired to a backend or model.
 */
export function CapabilityPreview() {
  return (
    <section
      data-ocid="ai_agent.capabilities"
      aria-labelledby="ai-agent-capabilities-heading"
      className="space-y-3"
    >
      <div className="space-y-1">
        <h2
          id="ai-agent-capabilities-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          What it will do
        </h2>
        <p className="text-sm text-muted-foreground">
          A preview of the intended capabilities. None of these are active yet.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((capability) => {
          const Icon = capability.icon;
          return (
            <li
              key={capability.id}
              data-ocid={`ai_agent.capability.${capability.id}`}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-subtle"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 space-y-1">
                <h3 className="font-display text-sm font-semibold text-foreground">
                  {capability.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {capability.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
