import type { FileRef } from "@/backend";
import { formatBytes } from "@/lib/format";
import { ExternalBlob } from "@caffeineai/object-storage";

/**
 * The maximum size of a single upload, in bytes. A file larger than this is
 * rejected before any bytes leave the browser.
 */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Whether a file is an image the browser can decode and re-encode. */
export function isCompressibleImage(file: File): boolean {
  return file.type.startsWith("image/") && file.type !== "image/svg+xml";
}

/** The outcome of preparing a file for upload. */
export interface PreparedUpload {
  /** The bytes to upload: compressed for images, original otherwise. */
  bytes: Uint8Array<ArrayBuffer>;
  /** The MIME type of the uploaded bytes. */
  mimeType: string | undefined;
  /** The original file size in bytes. */
  originalSize: number;
  /** The size of the bytes actually uploaded, in bytes. */
  uploadedSize: number;
  /** Whether the bytes were re-encoded and are smaller than the original. */
  compressed: boolean;
}

/** A file that cannot be uploaded because it exceeds the size limit. */
export class FileTooLargeError extends Error {
  readonly size: number;
  readonly limit: number;

  constructor(size: number, limit: number) {
    super(
      `“${formatBytes(size)}” is over the ${formatBytes(limit)} upload limit.`,
    );
    this.name = "FileTooLargeError";
    this.size = size;
    this.limit = limit;
  }
}

/**
 * Prepare a file for upload: reject anything over the size limit, then
 * re-encode images to a smaller JPEG when that produces a smaller result.
 *
 * Non-image files and images that do not shrink are uploaded unchanged, so
 * compression never blocks an upload that would otherwise succeed.
 */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new FileTooLargeError(file.size, MAX_UPLOAD_BYTES);
  }

  const original = new Uint8Array(await file.arrayBuffer());

  if (!isCompressibleImage(file)) {
    return {
      bytes: original,
      mimeType: file.type || undefined,
      originalSize: file.size,
      uploadedSize: file.size,
      compressed: false,
    };
  }

  try {
    const compressed = await compressImage(file);
    if (compressed && compressed.bytes.length < original.length) {
      return {
        bytes: compressed.bytes,
        mimeType: compressed.mimeType,
        originalSize: file.size,
        uploadedSize: compressed.bytes.length,
        compressed: true,
      };
    }
  } catch {
    // Decoding or re-encoding failed; fall through to the original bytes.
  }

  return {
    bytes: original,
    mimeType: file.type || undefined,
    originalSize: file.size,
    uploadedSize: file.size,
    compressed: false,
  };
}

/** Re-encode an image to JPEG at a bounded dimension and quality. */
async function compressImage(
  file: File,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; mimeType: string } | null> {
  const bitmap = await loadBitmap(file);
  if (!bitmap) return null;

  const maxDimension = 2048;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) return null;

  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType: "image/jpeg",
  };
}

/** Decode a file into an ImageBitmap, falling back to an HTMLImageElement. */
async function loadBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall through to the element-based decode.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image decode failed"));
      element.src = url;
    });
    return await createImageBitmap(image);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Build a backend `FileRef` from a browser `File`, wiring upload progress.
 *
 * The file is size-checked and images are compressed first; the bytes are then
 * wrapped in an `ExternalBlob` so the platform object-storage client uploads
 * them to the gateway. The backend only stores the reference.
 */
export async function buildFileRef(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<{ ref: FileRef; prepared: PreparedUpload }> {
  const prepared = await prepareUpload(file);
  const blob = ExternalBlob.fromBytes(
    prepared.bytes,
    prepared.mimeType,
    file.name,
  ).withUploadProgress(onProgress);

  return {
    ref: {
      blob,
      filename: file.name,
      mimeType: prepared.mimeType,
      sizeBytes: BigInt(prepared.uploadedSize),
    },
    prepared,
  };
}

/** Trigger a browser download of a stored file's bytes under its real name. */
export async function downloadFile(
  blob: ExternalBlob,
  filename: string,
): Promise<void> {
  const bytes = await blob.getBytes();
  const url = URL.createObjectURL(new Blob([bytes]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
