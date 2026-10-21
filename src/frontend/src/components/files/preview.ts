import type { ExternalBlob } from "@caffeineai/object-storage";

/** Decode a blob's bytes as UTF-8 text. */
export async function readText(blob: ExternalBlob): Promise<string> {
  const bytes = await blob.getBytes();
  return new TextDecoder("utf-8").decode(bytes);
}

/** Pretty-print a JSON document, falling back to the raw text when invalid. */
export function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Parse CSV text into rows, honouring quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

/**
 * Extract readable text from a DOCX file.
 *
 * A DOCX is a ZIP archive; `word/document.xml` holds the body. We inflate that
 * single entry with the platform `DecompressionStream` (no dependency) and
 * strip the XML tags, turning paragraph and line breaks into newlines.
 */
export async function extractDocxText(blob: ExternalBlob): Promise<string> {
  const bytes = await blob.getBytes();
  const xml = await readZipEntry(bytes, "word/document.xml");
  if (!xml) return "";
  return xml
    .replace(/<w:p[ >][^>]*>/g, "\n")
    .replace(/<w:br\s*\/>/g, "\n")
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Read and inflate one entry from a ZIP archive by name. */
async function readZipEntry(
  bytes: Uint8Array,
  entryName: string,
): Promise<string | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(
      bytes.subarray(nameStart, nameStart + nameLength),
    );
    const dataStart = nameStart + nameLength + extraLength;
    if (name === entryName) {
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      if (method === 0) return new TextDecoder().decode(data);
      if (method === 8) return inflateRaw(data);
      return null;
    }
    offset = dataStart + compressedSize;
  }
  return null;
}

/** Inflate a raw-deflate byte stream using the platform DecompressionStream. */
async function inflateRaw(data: Uint8Array): Promise<string> {
  const copy = new Uint8Array(data);
  const stream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}
