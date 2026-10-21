import type { FileRef, Note, NoteFolder } from "@/backend";
import { AttachmentList } from "@/components/notes/AttachmentList";
import { RichTextEditor } from "@/components/notes/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTimestamp } from "@/lib/format";
import { ExternalBlob } from "@caffeineai/object-storage";
import {
  AlertCircle,
  Loader2,
  Paperclip,
  Pin,
  PinOff,
  Save,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";

const ALL_FOLDERS = "all";

/**
 * The note editing surface. Owns the in-progress draft (title, body, folder) in
 * local state, seeded once from the selected note, and saves it through the
 * backend. Attachments upload to object storage and are attached to the note.
 */
export function NoteEditor({
  note,
  folders,
  onSave,
  onDelete,
  onTogglePin,
  onAddAttachment,
  onRemoveAttachment,
  saving,
  deleting,
  pinning,
  uploading,
  removingIndex,
  saveError,
}: {
  note: Note;
  folders: NoteFolder[];
  onSave: (input: {
    title: string;
    body: string;
    folderId: bigint | null;
  }) => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onAddAttachment: (ref: FileRef) => void;
  onRemoveAttachment: (index: number) => void;
  saving: boolean;
  deleting: boolean;
  pinning: boolean;
  uploading: boolean;
  removingIndex: number | null;
  saveError: boolean;
}) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [folderId, setFolderId] = useState<bigint | null>(
    note.folderId ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave({ title, body, folderId });
  };

  const handleFile = async (file: File) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(bytes, file.type, file.name);
    onAddAttachment({
      blob,
      filename: file.name,
      mimeType: file.type.length > 0 ? file.type : undefined,
      sizeBytes: BigInt(file.size),
    });
  };

  return (
    <div
      data-ocid="notes.editor.panel"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-subtle md:p-6"
    >
      <div className="flex items-center gap-2">
        <Input
          value={title}
          data-ocid="notes.title_input"
          placeholder="Note title"
          aria-label="Note title"
          onChange={(event) => setTitle(event.target.value)}
          className="h-11 flex-1 border-0 bg-transparent px-0 font-display text-lg font-semibold shadow-none focus-visible:ring-0 md:text-xl"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-ocid="notes.pin_button"
          aria-label={note.pinned ? "Unpin note" : "Pin note"}
          aria-pressed={note.pinned}
          disabled={pinning}
          onClick={onTogglePin}
          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-accent"
        >
          {note.pinned ? (
            <PinOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Pin className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <RichTextEditor value={body} onChange={setBody} />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={folderId === null ? ALL_FOLDERS : folderId.toString()}
          onValueChange={(value) =>
            setFolderId(value === ALL_FOLDERS ? null : BigInt(value))
          }
        >
          <SelectTrigger
            data-ocid="notes.folder_select"
            aria-label="Note folder"
            className="h-9 w-full rounded-xl sm:w-56"
          >
            <SelectValue placeholder="No folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FOLDERS}>No folder</SelectItem>
            {folders.map((folder) => (
              <SelectItem
                key={folder.id.toString()}
                value={folder.id.toString()}
              >
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          data-ocid="notes.attachment.file_input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          data-ocid="notes.attachment.upload_button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 rounded-full"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Paperclip className="h-4 w-4" aria-hidden="true" />
          )}
          {uploading ? "Attaching…" : "Attach file"}
        </Button>
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Attachments
        </h3>
        <AttachmentList
          attachments={note.attachments}
          onRemove={onRemoveAttachment}
          removingIndex={removingIndex}
        />
      </div>

      {saveError && (
        <p
          role="alert"
          data-ocid="notes.editor.error_state"
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Your note could not be saved. Please try again.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-muted-foreground">
          Updated {formatTimestamp(note.updatedAt)}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            data-ocid="notes.delete_button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
          <Button
            type="button"
            data-ocid="notes.save_button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-full bg-gradient-primary text-primary-foreground"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            {saving ? "Saving…" : "Save note"}
          </Button>
        </div>
      </div>
    </div>
  );
}
