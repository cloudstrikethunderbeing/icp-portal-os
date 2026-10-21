import { MAX_UPLOAD_BYTES } from "@/components/files/upload";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";
import { type DragEvent, useRef, useState } from "react";

/**
 * Drag-and-drop upload surface with a keyboard-reachable file picker.
 *
 * Dropping or picking files hands them to `onFiles`; the parent owns the
 * upload queue and progress. The whole zone is a labelled button so it works
 * with keyboard and assistive technology, not only pointer drag.
 */
export function FileDropzone({
  onFiles,
  disabled = false,
  className,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      data-ocid="files.dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-smooth",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border bg-card/60 hover:border-primary/50",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        data-ocid="files.file_input"
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        data-ocid="files.upload_button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mx-auto flex flex-col items-center gap-2 rounded-xl px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span className="app-tile flex h-12 w-12 items-center justify-center bg-gradient-primary text-primary-foreground">
          <UploadCloud className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="font-display text-sm font-semibold text-foreground">
          Drop files here or choose from your device
        </span>
        <span className="text-xs text-muted-foreground">
          Files upload to your private workspace storage
        </span>
        <span className="text-xs text-muted-foreground">
          Up to {formatBytes(MAX_UPLOAD_BYTES)} per file · images are compressed
          automatically
        </span>
      </button>
    </div>
  );
}
