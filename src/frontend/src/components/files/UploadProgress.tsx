import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

/** One in-flight or finished upload shown in the progress panel. */
export interface UploadTask {
  id: string;
  name: string;
  /** 0–100. */
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  /** Original file size in bytes, when known. */
  originalSize?: number;
  /** Size of the bytes actually uploaded, when known. */
  uploadedSize?: number;
  /** Whether the bytes were compressed before upload. */
  compressed?: boolean;
}

/** Live upload queue with per-file progress, success and error states. */
export function UploadProgress({ tasks }: { tasks: UploadTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <section
      data-ocid="files.upload_progress"
      aria-label="Upload progress"
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-subtle"
    >
      <h2 className="font-display text-sm font-semibold text-foreground">
        Uploading {tasks.filter((task) => task.status === "uploading").length}{" "}
        of {tasks.length}
      </h2>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id} className="space-y-1.5">
            <div className="flex items-center gap-2">
              {task.status === "uploading" && (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin text-primary"
                  aria-hidden="true"
                />
              )}
              {task.status === "done" && (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-success"
                  aria-hidden="true"
                />
              )}
              {task.status === "error" && (
                <AlertCircle
                  className="h-4 w-4 shrink-0 text-destructive"
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {task.name}
              </span>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  task.status === "error"
                    ? "text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {task.status === "error"
                  ? "Failed"
                  : task.status === "done"
                    ? "Done"
                    : `${Math.round(task.progress)}%`}
              </span>
            </div>
            {task.status === "uploading" && (
              <Progress
                value={task.progress}
                aria-label={`${task.name} upload`}
              />
            )}
            {task.compressed &&
              task.originalSize !== undefined &&
              task.uploadedSize !== undefined && (
                <p
                  data-ocid="files.upload_compression_note"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Sparkles
                    className="h-3.5 w-3.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  Compressed from {formatBytes(task.originalSize)} to{" "}
                  {formatBytes(task.uploadedSize)}
                </p>
              )}
            {task.status === "error" && task.error && (
              <p className="text-xs text-destructive">{task.error}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
