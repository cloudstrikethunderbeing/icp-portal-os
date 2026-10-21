import type { FileRef } from "@/backend";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";

/** True when a stored attachment is an image, based on its recorded MIME type. */
function isImage(ref: FileRef): boolean {
  return ref.mimeType?.startsWith("image/") ?? false;
}

/**
 * The attachments on a note. Each row shows the file name, size and a remove
 * action; images render a small inline preview from the object-storage proxy URL.
 */
export function AttachmentList({
  attachments,
  onRemove,
  removingIndex,
}: {
  attachments: FileRef[];
  onRemove: (index: number) => void;
  removingIndex: number | null;
}) {
  if (attachments.length === 0) {
    return (
      <p
        data-ocid="notes.attachments.empty_state"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
        No files attached yet.
      </p>
    );
  }

  return (
    <ul data-ocid="notes.attachments.list" className="space-y-2">
      {attachments.map((ref, index) => (
        <li
          key={`${ref.filename}-${index}`}
          data-ocid={`notes.attachment.item.${index + 1}`}
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-secondary-foreground">
            {isImage(ref) ? (
              <img
                src={ref.blob.getDirectURL()}
                alt={ref.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {ref.filename}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isImage(ref) ? (
                <ImageIcon className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {ref.sizeBytes !== undefined
                ? formatBytes(Number(ref.sizeBytes))
                : "Attached file"}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-ocid={`notes.attachment.remove_button.${index + 1}`}
            aria-label={`Remove ${ref.filename}`}
            disabled={removingIndex === index}
            onClick={() => onRemove(index)}
            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
