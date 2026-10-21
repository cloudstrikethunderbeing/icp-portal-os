import type { NoteFolder } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

/**
 * Folder rail for the notes workspace: pick a folder, create one, and rename or
 * delete existing folders inline. `selectedId` is `null` for the "All notes" view.
 */
export function FolderManager({
  folders,
  selectedId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  creating,
  renaming,
  deleting,
}: {
  folders: NoteFolder[];
  selectedId: bigint | null;
  onSelect: (id: bigint | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: bigint, name: string) => void;
  onDelete: (id: bigint) => void;
  creating: boolean;
  renaming: boolean;
  deleting: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editName, setEditName] = useState("");

  const submitCreate = () => {
    const name = newName.trim();
    if (name.length === 0) return;
    setNewName("");
    onCreate(name);
  };

  const submitRename = (id: bigint) => {
    const name = editName.trim();
    if (name.length === 0) return;
    setEditingId(null);
    onRename(id, name);
  };

  return (
    <div data-ocid="notes.folders.panel" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Folders
        </h2>
      </div>

      <ul data-ocid="notes.folders.list" className="space-y-1">
        <li>
          <button
            type="button"
            data-ocid="notes.folder.all_button"
            aria-pressed={selectedId === null}
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-smooth",
              selectedId === null
                ? "bg-accent/15 font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            All notes
          </button>
        </li>
        {folders.map((folder, index) => {
          const active = selectedId === folder.id;
          const editing = editingId === folder.id;
          return (
            <li
              key={folder.id.toString()}
              data-ocid={`notes.folder.item.${index + 1}`}
            >
              {editing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editName}
                    autoFocus
                    data-ocid={`notes.folder.rename_input.${index + 1}`}
                    onChange={(event) => setEditName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitRename(folder.id);
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    className="h-8"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    data-ocid={`notes.folder.rename_save_button.${index + 1}`}
                    aria-label={`Save name for ${folder.name}`}
                    disabled={renaming}
                    onClick={() => submitRename(folder.id)}
                    className="h-8 w-8 shrink-0 rounded-full"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    data-ocid={`notes.folder.rename_cancel_button.${index + 1}`}
                    aria-label={`Cancel renaming ${folder.name}`}
                    onClick={() => setEditingId(null)}
                    className="h-8 w-8 shrink-0 rounded-full"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "group flex items-center gap-1 rounded-xl pr-1 transition-smooth",
                    active ? "bg-accent/15" : "hover:bg-muted",
                  )}
                >
                  <button
                    type="button"
                    data-ocid={`notes.folder.select_button.${index + 1}`}
                    aria-pressed={active}
                    onClick={() => onSelect(folder.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm",
                      active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {folder.name}
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    data-ocid={`notes.folder.rename_button.${index + 1}`}
                    aria-label={`Rename ${folder.name}`}
                    onClick={() => {
                      setEditingId(folder.id);
                      setEditName(folder.name);
                    }}
                    className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    data-ocid={`notes.folder.delete_button.${index + 1}`}
                    aria-label={`Delete ${folder.name}`}
                    disabled={deleting}
                    onClick={() => onDelete(folder.id)}
                    className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <Input
          value={newName}
          data-ocid="notes.folder.new_input"
          placeholder="New folder"
          aria-label="New folder name"
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submitCreate();
          }}
          className="h-9"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          data-ocid="notes.folder.create_button"
          aria-label="Create folder"
          disabled={creating || newName.trim().length === 0}
          onClick={submitCreate}
          className="h-9 w-9 shrink-0 rounded-full"
        >
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
