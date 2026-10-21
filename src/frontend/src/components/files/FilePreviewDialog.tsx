import type { FileEntry } from "@/backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBytes, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Download,
  FileQuestion,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { fileTypeOf } from "./fileTypes";
import { extractDocxText, formatJson, parseCsv, readText } from "./preview";

/**
 * Inline preview for the supported file types. Images, PDF, audio and video
 * stream from the object-storage direct URL; text-like formats are fetched and
 * rendered; DOCX text is extracted from the archive. Anything else falls back
 * to a metadata card with a download action.
 */
export function FilePreviewDialog({
  file,
  open,
  onOpenChange,
  onDownload,
}: {
  file: FileEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (file: FileEntry) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="files.preview_dialog"
        className="max-h-[90dvh] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden rounded-2xl border-border bg-card p-0 shadow-floating"
      >
        {file && (
          <PreviewBody
            key={file.id.toString()}
            file={file}
            onDownload={onDownload}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({
  file,
  onDownload,
}: {
  file: FileEntry;
  onDownload: (file: FileEntry) => void;
}) {
  const type = fileTypeOf(file);
  const directUrl = file.ref.blob.getDirectURL();
  const size =
    file.ref.sizeBytes !== undefined
      ? formatBytes(Number(file.ref.sizeBytes))
      : "Unknown size";

  return (
    <>
      <DialogHeader className="border-b border-border px-5 py-4 text-left">
        <DialogTitle className="truncate font-display text-base font-semibold text-foreground">
          {file.name}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {type.label} · {size} · Updated {formatTimestamp(file.updatedAt)}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[62dvh] overflow-auto bg-muted/30 p-4">
        {type.kind === "image" && (
          <ImagePreview src={directUrl} name={file.name} />
        )}

        {type.kind === "pdf" && (
          <iframe
            src={directUrl}
            title={`Preview of ${file.name}`}
            className="h-[56dvh] w-full rounded-xl border border-border bg-card"
          />
        )}

        {type.kind === "video" && (
          <video
            src={directUrl}
            controls
            className="mx-auto max-h-[56dvh] w-full rounded-xl bg-black"
          >
            <track kind="captions" />
          </video>
        )}

        {type.kind === "audio" && (
          <div className="flex flex-col items-center gap-4 py-10">
            <span
              className={cn(
                "app-tile flex h-20 w-20 items-center justify-center",
                type.tint,
              )}
            >
              <type.icon className="h-9 w-9" aria-hidden="true" />
            </span>
            <audio src={directUrl} controls className="w-full max-w-md">
              <track kind="captions" />
            </audio>
          </div>
        )}

        {(type.kind === "text" ||
          type.kind === "json" ||
          type.kind === "csv" ||
          type.kind === "docx") && <TextPreview file={file} kind={type.kind} />}

        {type.kind === "none" && (
          <div
            data-ocid="files.preview_fallback"
            className="flex flex-col items-center gap-3 py-12 text-center"
          >
            <span className="app-tile flex h-16 w-16 items-center justify-center bg-muted text-muted-foreground">
              <FileQuestion className="h-8 w-8" aria-hidden="true" />
            </span>
            <p className="font-display text-sm font-semibold text-foreground">
              No inline preview for this file type
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Download the file to open it in an application that supports{" "}
              {type.label.toLowerCase()} files.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border px-5 py-3">
        <button
          type="button"
          data-ocid="files.preview_download_button"
          onClick={() => onDownload(file)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
        </button>
      </div>
    </>
  );
}

/**
 * An image preview that fits the image to the dialog by default and lets the
 * viewer switch to full size, where the image scrolls at its natural scale.
 */
function ImagePreview({ src, name }: { src: string; name: string }) {
  const [fullSize, setFullSize] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        data-ocid="files.preview_error_state"
        className="flex flex-col items-center gap-3 py-12 text-center"
      >
        <span className="app-tile flex h-14 w-14 items-center justify-center bg-destructive/12 text-destructive">
          <FileQuestion className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="font-display text-sm font-semibold text-foreground">
          This image could not be loaded
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          The preview failed to load. Download the file to open it locally.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          data-ocid="files.preview_fullsize_button"
          aria-pressed={fullSize}
          onClick={() => setFullSize((current) => !current)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {fullSize ? (
            <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {fullSize ? "Fit to view" : "View full size"}
        </button>
      </div>
      <div
        className={cn(
          "overflow-auto rounded-xl",
          fullSize ? "max-h-[56dvh]" : "flex justify-center",
        )}
      >
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className={cn(
            "rounded-xl",
            fullSize
              ? "max-w-none"
              : "mx-auto max-h-[56dvh] w-auto object-contain",
          )}
        />
      </div>
    </div>
  );
}

/** Fetch and render text-like previews (text, JSON, CSV, DOCX). */
function TextPreview({
  file,
  kind,
}: {
  file: FileEntry;
  kind: "text" | "json" | "csv" | "docx";
}) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);

    const load = async (run: number) => {
      try {
        const text =
          kind === "docx"
            ? await extractDocxText(file.ref.blob)
            : await readText(file.ref.blob);
        if (!cancelled && run === attempt) setContent(text);
      } catch {
        if (!cancelled && run === attempt) {
          setError("This file could not be read for preview.");
        }
      }
    };
    void load(attempt);

    return () => {
      cancelled = true;
    };
  }, [file, kind, attempt]);

  if (error) {
    return (
      <div
        data-ocid="files.preview_error_state"
        className="flex flex-col items-center gap-3 py-10 text-center"
      >
        <span className="app-tile flex h-12 w-12 items-center justify-center bg-destructive/12 text-destructive">
          <FileQuestion className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-sm text-destructive">{error}</p>
        <button
          type="button"
          data-ocid="files.preview_retry_button"
          onClick={() => setAttempt((current) => current + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  if (content === null) {
    return (
      <div
        data-ocid="files.preview_loading_state"
        className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading preview…
      </div>
    );
  }

  if (kind === "csv") {
    const rows = parseCsv(content);
    const [header, ...body] = rows;
    if (!header) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">
          This CSV file is empty.
        </p>
      );
    }
    const headerIds = header.map((cell, index) => `head-${index}-${cell}`);
    const bodyRows = body.map((row, rowIndex) => ({
      id: `row-${rowIndex}-${row.join("|")}`,
      cells: header.map((_, cellIndex) => ({
        id: `cell-${rowIndex}-${cellIndex}`,
        value: row[cellIndex] ?? "",
      })),
    }));
    return (
      <div className="overflow-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-muted">
            <tr>
              {header.map((cell, index) => (
                <th
                  key={headerIds[index]}
                  className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold text-foreground"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((row) => (
              <tr key={row.id} className="odd:bg-muted/30">
                {row.cells.map((cell) => (
                  <td
                    key={cell.id}
                    className="whitespace-nowrap border-b border-border/60 px-3 py-1.5 text-muted-foreground"
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const display = kind === "json" ? formatJson(content) : content;
  return (
    <pre className="overflow-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground">
      {display.length > 0 ? display : "This file is empty."}
    </pre>
  );
}
