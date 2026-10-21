import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * A titled settings panel. Every settings group shares this surface so the page
 * reads as one calm, layered system rather than a stack of ad-hoc cards.
 */
export function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-ocid={`settings.${id}.section`}
      aria-labelledby={`settings-${id}-title`}
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-subtle",
        className,
      )}
    >
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span className="app-tile flex h-9 w-9 shrink-0 items-center justify-center bg-gradient-primary text-primary-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2
            id={`settings-${id}-title`}
            className="font-display text-base font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

/** A single labelled row inside a settings section. */
export function SettingsRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0 sm:min-w-[12rem] sm:text-right">{children}</div>
    </div>
  );
}
