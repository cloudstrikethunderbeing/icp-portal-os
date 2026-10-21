import type { Note } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, Paperclip, Pin, Plus, Search } from "lucide-react";

/** Strip HTML tags so a note body can be shown as a plain-text preview. */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pinned notes first, then most recently updated. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.updatedAt === b.updatedAt) return 0;
    return a.updatedAt > b.updatedAt ? -1 : 1;
  });
}

function NoteListSkeleton() {
  return (
    <div data-ocid="notes.list.loading_state" className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => `note-skeleton-${i}`).map((id) => (
        <div
          key={id}
          className="space-y-2 rounded-2xl border border-border bg-card p-4"
        >
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/**
 * The scrollable note list. Renders loading, error and empty states, and marks
 * the selected note. Pinned notes are grouped above the rest.
 */
export function NoteList({
  notes,
  selectedId,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onCreate,
  searchActive,
}: {
  notes: Note[];
  selectedId: bigint | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (note: Note) => void;
  onCreate: () => void;
  searchActive: boolean;
}) {
  if (isLoading) return <NoteListSkeleton />;

  if (isError) {
    return (
      <div
        data-ocid="notes.list.error_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center"
      >
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm text-foreground">
          We couldn&apos;t load your notes.
        </p>
        <Button
          type="button"
          variant="outline"
          data-ocid="notes.list.retry_button"
          onClick={onRetry}
          className="rounded-full"
        >
          Try again
        </Button>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div
        data-ocid="notes.list.empty_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center shadow-subtle"
      >
        <span className="app-tile flex h-12 w-12 items-center justify-center bg-gradient-to-br from-accent to-primary text-white">
          {searchActive ? (
            <Search className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Plus className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
        <h3 className="font-display text-base font-semibold text-foreground">
          {searchActive ? "No matching notes" : "No notes yet"}
        </h3>
        <p className="max-w-xs text-sm text-muted-foreground">
          {searchActive
            ? "Try a different search term."
            : "Create your first note to capture an idea."}
        </p>
        {!searchActive && (
          <Button
            type="button"
            data-ocid="notes.list.create_button"
            onClick={onCreate}
            className="rounded-full bg-gradient-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New note
          </Button>
        )}
      </div>
    );
  }

  const sorted = sortNotes(notes);

  return (
    <ul data-ocid="notes.list" className="space-y-2">
      {sorted.map((note, index) => {
        const active = selectedId === note.id;
        const preview = toPlainText(note.body);
        return (
          <li key={note.id.toString()}>
            <button
              type="button"
              data-ocid={`notes.item.${index + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => onSelect(note)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-smooth",
                active
                  ? "border-primary/50 bg-card shadow-elevated"
                  : "border-border bg-card shadow-subtle hover:border-primary/30",
              )}
            >
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-foreground">
                  {note.title.trim().length > 0 ? note.title : "Untitled note"}
                </h3>
                {note.pinned && (
                  <Pin
                    className="h-3.5 w-3.5 shrink-0 text-accent"
                    aria-label="Pinned"
                  />
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {preview.length > 0 ? preview : "No additional text"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {formatTimestamp(note.updatedAt)}
                </span>
                {note.attachments.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-full px-1.5 py-0 text-[10px]"
                  >
                    <Paperclip className="h-2.5 w-2.5" aria-hidden="true" />
                    {note.attachments.length}
                  </Badge>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
