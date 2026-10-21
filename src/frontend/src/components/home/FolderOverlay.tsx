import { AppIcon } from "@/components/home/AppIcon";
import type { HomeApp, HomeFolderView } from "@/components/home/types";
import { homeEntryKey } from "@/components/home/types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Folder overlay — an iOS-style sheet that opens a folder to show its apps.
 * Supports renaming, deleting, launching, and dragging apps back out to the
 * grid. Escape and backdrop click close it; focus is trapped while open.
 */
export function FolderOverlay({
  folder,
  onClose,
  onLaunch,
  onRename,
  onDelete,
  onDragOut,
  onOpenMenu,
}: {
  folder: HomeFolderView;
  onClose: () => void;
  onLaunch: (app: HomeApp) => void;
  onRename: (folder: HomeFolderView, name: string) => void;
  onDelete: (folder: HomeFolderView) => void;
  onDragOut: (app: HomeApp) => void;
  onOpenMenu: (app: HomeApp, x: number, y: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = () => {
    const trimmed = name.trim();
    if (trimmed.length > 0 && trimmed !== folder.name) {
      onRename(folder, trimmed);
    } else {
      setName(folder.name);
    }
    setEditing(false);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-ocid="home.folder_overlay"
        showCloseButton={false}
        className="max-w-md rounded-3xl border-border surface-raised p-5 shadow-floating"
      >
        <div className="mb-4 flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              data-ocid="home.folder_name_input"
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              onBlur={commitRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") {
                  setName(folder.name);
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3 py-2 font-display text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : (
            <DialogTitle className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-foreground">
              {folder.name}
            </DialogTitle>
          )}
          <button
            type="button"
            data-ocid="home.folder_rename_button"
            aria-label="Rename folder"
            onClick={() => setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-ocid="home.folder_delete_button"
            aria-label="Delete folder"
            onClick={() => onDelete(folder)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {folder.apps.length === 0 ? (
          <p
            data-ocid="home.folder_empty_state"
            className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
          >
            This folder is empty. Drag apps here to fill it.
          </p>
        ) : (
          <div
            data-ocid="home.folder_grid"
            className="grid grid-cols-4 gap-2 sm:grid-cols-5"
          >
            {folder.apps.map((app, index) => (
              <div
                key={homeEntryKey(app)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    "text/plain",
                    String(app.installedId),
                  );
                  onDragOut(app);
                }}
                className="rounded-2xl"
              >
                <AppIcon
                  app={app}
                  index={index}
                  onLaunch={onLaunch}
                  onDragStart={() => undefined}
                  onDragOver={() => undefined}
                  onDrop={() => undefined}
                  onOpenMenu={onOpenMenu}
                  isDragging={false}
                  isDropTarget={false}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
