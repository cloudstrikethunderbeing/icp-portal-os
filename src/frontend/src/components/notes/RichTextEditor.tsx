import "react-quill-new/dist/quill.snow.css";
import "@/components/notes/notes-editor.css";
import { useMemo } from "react";
import ReactQuill from "react-quill-new";

/**
 * Rich-text editor for note bodies. Supports headings, bold, italic, ordered and
 * bulleted lists, and links — the formatting set the notes requirement calls for.
 * The value is HTML, which is what the backend stores in `Note.body`.
 */

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link"],
  ["clean"],
];

const FORMATS = ["header", "bold", "italic", "underline", "list", "link"];

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your note…",
  readOnly = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const modules = useMemo(() => ({ toolbar: TOOLBAR }), []);

  return (
    <div
      data-ocid="notes.editor"
      className="notes-editor overflow-hidden rounded-xl border border-input bg-card"
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}
