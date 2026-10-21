import type { Folder, Id, ListingItem } from "@/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Folder as FolderIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { itemName } from "./FileItem";

/** Rename a file or folder. */
export function RenameDialog({
  item,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  item: ListingItem | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open && item) setName(itemName(item));
  }, [open, item]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="files.rename_dialog"
        className="rounded-2xl border-border bg-card shadow-floating"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base font-semibold">
            Rename {item?.__kind__ === "folder" ? "folder" : "file"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose a new name for this item.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSubmit(trimmed);
          }}
          className="space-y-2"
        >
          <Label htmlFor="rename-input">Name</Label>
          <Input
            id="rename-input"
            data-ocid="files.rename_input"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
          <DialogFooter className="pt-2">
            <button
              type="button"
              data-ocid="files.rename_cancel_button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-ocid="files.rename_save_button"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
            >
              {pending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Move or copy an item into a destination folder. */
export function MoveCopyDialog({
  item,
  mode,
  folders,
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  item: ListingItem | null;
  mode: "move" | "copy";
  folders: Folder[];
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (parentId: Id | null) => void;
}) {
  const [selected, setSelected] = useState<Id | null>(null);

  useEffect(() => {
    if (open) setSelected(null);
  }, [open]);

  const currentParent =
    item?.__kind__ === "folder"
      ? item.folder.parentId
      : item?.__kind__ === "file"
        ? item.file.parentId
        : undefined;

  const destinations = folders.filter(
    (folder) =>
      folder.id !== (item?.__kind__ === "folder" ? item.folder.id : undefined),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="files.move_dialog"
        className="rounded-2xl border-border bg-card shadow-floating"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base font-semibold">
            {mode === "move" ? "Move" : "Copy"} “{item ? itemName(item) : ""}”
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose a destination folder.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-64 space-y-1 overflow-auto">
          <li>
            <button
              type="button"
              data-ocid="files.destination_root"
              onClick={() => setSelected(null)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === null
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted",
              )}
            >
              <FolderIcon className="h-4 w-4" aria-hidden="true" />
              Workspace root
            </button>
          </li>
          {destinations.map((folder, index) => (
            <li key={folder.id.toString()}>
              <button
                type="button"
                data-ocid={`files.destination.${index + 1}`}
                onClick={() => setSelected(folder.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected === folder.id
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <FolderIcon className="h-4 w-4" aria-hidden="true" />
                <span className="truncate">{folder.name}</span>
              </button>
            </li>
          ))}
        </ul>

        <DialogFooter>
          <button
            type="button"
            data-ocid="files.move_cancel_button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="files.move_confirm_button"
            disabled={pending || selected === currentParent}
            onClick={() => onSubmit(selected)}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {pending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {mode === "move" ? "Move here" : "Copy here"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confirm deletion of a file or folder. */
export function DeleteDialog({
  item,
  open,
  pending,
  onOpenChange,
  onConfirm,
}: {
  item: ListingItem | null;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const isFolder = item?.__kind__ === "folder";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-ocid="files.delete_dialog"
        className="rounded-2xl border-border bg-card shadow-floating"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-base font-semibold">
            Delete {isFolder ? "folder" : "file"}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            “{item ? itemName(item) : ""}” will be permanently removed from your
            workspace. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-ocid="files.delete_cancel_button"
            className="rounded-full"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            data-ocid="files.delete_confirm_button"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
