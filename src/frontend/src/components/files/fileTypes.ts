import type { FileEntry } from "@/backend";
import {
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  type LucideIcon,
  Presentation,
} from "lucide-react";

/** The preview surface a file maps to. `none` falls back to a metadata card. */
export type PreviewKind =
  | "image"
  | "pdf"
  | "video"
  | "audio"
  | "text"
  | "json"
  | "csv"
  | "docx"
  | "none";

/** A resolved file type: icon, label, tint and preview strategy. */
export interface FileTypeInfo {
  kind: PreviewKind;
  label: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile background. */
  tint: string;
}

const EXTENSION_MAP: Record<string, FileTypeInfo> = {
  png: {
    kind: "image",
    label: "PNG image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  jpg: {
    kind: "image",
    label: "JPEG image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  jpeg: {
    kind: "image",
    label: "JPEG image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  webp: {
    kind: "image",
    label: "WebP image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  gif: {
    kind: "image",
    label: "GIF image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  svg: {
    kind: "image",
    label: "SVG image",
    icon: FileImage,
    tint: "bg-accent/15 text-accent-foreground",
  },
  pdf: {
    kind: "pdf",
    label: "PDF document",
    icon: FileType2,
    tint: "bg-destructive/12 text-destructive",
  },
  doc: {
    kind: "docx",
    label: "Word document",
    icon: FileText,
    tint: "bg-primary/12 text-primary",
  },
  docx: {
    kind: "docx",
    label: "Word document",
    icon: FileText,
    tint: "bg-primary/12 text-primary",
  },
  txt: {
    kind: "text",
    label: "Text file",
    icon: FileText,
    tint: "bg-muted text-muted-foreground",
  },
  md: {
    kind: "text",
    label: "Markdown",
    icon: FileText,
    tint: "bg-muted text-muted-foreground",
  },
  log: {
    kind: "text",
    label: "Log file",
    icon: FileText,
    tint: "bg-muted text-muted-foreground",
  },
  csv: {
    kind: "csv",
    label: "CSV spreadsheet",
    icon: FileSpreadsheet,
    tint: "bg-success/15 text-success",
  },
  json: {
    kind: "json",
    label: "JSON data",
    icon: FileJson,
    tint: "bg-warning/15 text-warning",
  },
  mp3: {
    kind: "audio",
    label: "MP3 audio",
    icon: FileAudio,
    tint: "bg-chart-5/15 text-chart-5",
  },
  wav: {
    kind: "audio",
    label: "WAV audio",
    icon: FileAudio,
    tint: "bg-chart-5/15 text-chart-5",
  },
  m4a: {
    kind: "audio",
    label: "M4A audio",
    icon: FileAudio,
    tint: "bg-chart-5/15 text-chart-5",
  },
  ogg: {
    kind: "audio",
    label: "OGG audio",
    icon: FileAudio,
    tint: "bg-chart-5/15 text-chart-5",
  },
  mp4: {
    kind: "video",
    label: "MP4 video",
    icon: FileVideo,
    tint: "bg-chart-2/15 text-chart-2",
  },
  webm: {
    kind: "video",
    label: "WebM video",
    icon: FileVideo,
    tint: "bg-chart-2/15 text-chart-2",
  },
  mov: {
    kind: "video",
    label: "QuickTime video",
    icon: FileVideo,
    tint: "bg-chart-2/15 text-chart-2",
  },
  zip: {
    kind: "none",
    label: "ZIP archive",
    icon: FileArchive,
    tint: "bg-muted text-muted-foreground",
  },
  ppt: {
    kind: "none",
    label: "Presentation",
    icon: Presentation,
    tint: "bg-chart-4/15 text-chart-4",
  },
  pptx: {
    kind: "none",
    label: "Presentation",
    icon: Presentation,
    tint: "bg-chart-4/15 text-chart-4",
  },
  js: {
    kind: "text",
    label: "JavaScript",
    icon: FileCode,
    tint: "bg-muted text-muted-foreground",
  },
  ts: {
    kind: "text",
    label: "TypeScript",
    icon: FileCode,
    tint: "bg-muted text-muted-foreground",
  },
  html: {
    kind: "text",
    label: "HTML",
    icon: FileCode,
    tint: "bg-muted text-muted-foreground",
  },
  css: {
    kind: "text",
    label: "Stylesheet",
    icon: FileCode,
    tint: "bg-muted text-muted-foreground",
  },
};

const FALLBACK: FileTypeInfo = {
  kind: "none",
  label: "File",
  icon: FileText,
  tint: "bg-muted text-muted-foreground",
};

/** The lowercase extension of a filename, or an empty string. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/** Resolve a file's type from its MIME type first, then its extension. */
export function resolveFileType(name: string, mimeType?: string): FileTypeInfo {
  if (mimeType) {
    if (mimeType.startsWith("image/")) {
      return {
        kind: "image",
        label: "Image",
        icon: FileImage,
        tint: "bg-accent/15 text-accent-foreground",
      };
    }
    if (mimeType.startsWith("video/")) {
      return {
        kind: "video",
        label: "Video",
        icon: FileVideo,
        tint: "bg-chart-2/15 text-chart-2",
      };
    }
    if (mimeType.startsWith("audio/")) {
      return {
        kind: "audio",
        label: "Audio",
        icon: FileAudio,
        tint: "bg-chart-5/15 text-chart-5",
      };
    }
    if (mimeType === "application/pdf") {
      return {
        kind: "pdf",
        label: "PDF document",
        icon: FileType2,
        tint: "bg-destructive/12 text-destructive",
      };
    }
    if (mimeType === "application/json") {
      return {
        kind: "json",
        label: "JSON data",
        icon: FileJson,
        tint: "bg-warning/15 text-warning",
      };
    }
    if (mimeType === "text/csv") {
      return {
        kind: "csv",
        label: "CSV spreadsheet",
        icon: FileSpreadsheet,
        tint: "bg-success/15 text-success",
      };
    }
    if (mimeType.startsWith("text/")) {
      return {
        kind: "text",
        label: "Text file",
        icon: FileText,
        tint: "bg-muted text-muted-foreground",
      };
    }
  }
  return EXTENSION_MAP[fileExtension(name)] ?? FALLBACK;
}

/** Resolve the type of a stored file entry. */
export function fileTypeOf(entry: FileEntry): FileTypeInfo {
  return resolveFileType(entry.name, entry.ref.mimeType);
}

/** Whether a file can be previewed inline (anything but the metadata fallback). */
export function isPreviewable(entry: FileEntry): boolean {
  return fileTypeOf(entry).kind !== "none";
}
