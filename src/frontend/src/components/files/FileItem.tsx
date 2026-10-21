import type { FileEntry, Folder, Id, ListingItem } from "@/backend";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Copy,
  Download,
  Eye,
  Folder as FolderIcon,
  FolderInput,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { fileTypeOf } from "./fileTypes";

/** The actions a file or folder row can trigger. */
export interface FileActions {
  onOpenFolder: (folder: Folder) => void;
  onPreview: (file: FileEntry) => void;
  onDownload: (file: FileEntry) => void;
  onRename: (item: ListingItem) => void;
  onMove: (item: ListingItem) => void;
  onCopy: (file: FileEntry) => void;
  onDelete: (item: ListingItem) => void;
}

/** A folder row/grid item. */
export function FolderItem({
  folder,
  index,
  view,
  actions,
}: {
  folder: Folder;
  index: number;
  view: "list" | "grid";
  actions: FileActions;
}) {
  if (view === "grid") {
    return (
      <div
        data-ocid={`files.folder_item.${index + 1}`}
        className="group relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-subtle transition-smooth hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <button
          type="button"
          data-ocid={`files.open_folder_button.${index + 1}`}
          onClick={() => actions.onOpenFolder(folder)}
          className="flex w-full flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-primary to-accent text-white">
            <FolderIcon className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="w-full truncate text-sm font-medium text-foreground">
            {folder.name}
          </span>
          <span className="text-xs text-muted-foreground">Folder</span>
        </button>
        <ItemMenu
          index={index}
          isFolder
          onRename={() => actions.onRename({ __kind__: "folder", folder })}
          onMove={() => actions.onMove({ __kind__: "folder", folder })}
          onDelete={() => actions.onDelete({ __kind__: "folder", folder })}
        />
      </div>
    );
  }

  return (
    <li
      data-ocid={`files.folder_item.${index + 1}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-smooth hover:bg-muted/60"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <FolderIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <button
        type="button"
        data-ocid={`files.open_folder_button.${index + 1}`}
        onClick={() => actions.onOpenFolder(folder)}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">
          {folder.name}
        </span>
        <span className="block text-xs text-muted-foreground">
          Folder · {formatTimestamp(folder.updatedAt)}
        </span>
      </button>
      <ItemMenu
        index={index}
        isFolder
        onRename={() => actions.onRename({ __kind__: "folder", folder })}
        onMove={() => actions.onMove({ __kind__: "folder", folder })}
        onDelete={() => actions.onDelete({ __kind__: "folder", folder })}
      />
    </li>
  );
}

/** A file row/grid item. */
export function FileItem({
  file,
  index,
  view,
  actions,
}: {
  file: FileEntry;
  index: number;
  view: "list" | "grid";
  actions: FileActions;
}) {
  const type = fileTypeOf(file);
  const Icon = type.icon;
  const size =
    file.ref.sizeBytes !== undefined
      ? formatBytes(Number(file.ref.sizeBytes))
      : "—";

  if (view === "grid") {
    return (
      <div
        data-ocid={`files.file_item.${index + 1}`}
        className="group relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-subtle transition-smooth hover:-translate-y-0.5 hover:shadow-elevated"
      >
        <button
          type="button"
          data-ocid={`files.preview_button.${index + 1}`}
          onClick={() => actions.onPreview(file)}
          className="flex w-full flex-col items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              "app-tile flex h-14 w-14 items-center justify-center",
              type.tint,
            )}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="w-full truncate text-sm font-medium text-foreground">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground">{size}</span>
        </button>
        <ItemMenu
          index={index}
          isFolder={false}
          onPreview={() => actions.onPreview(file)}
          onDownload={() => actions.onDownload(file)}
          onRename={() => actions.onRename({ __kind__: "file", file })}
          onMove={() => actions.onMove({ __kind__: "file", file })}
          onCopy={() => actions.onCopy(file)}
          onDelete={() => actions.onDelete({ __kind__: "file", file })}
        />
      </div>
    );
  }

  return (
    <li
      data-ocid={`files.file_item.${index + 1}`}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-smooth hover:bg-muted/60"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          type.tint,
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <button
        type="button"
        data-ocid={`files.preview_button.${index + 1}`}
        onClick={() => actions.onPreview(file)}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">
          {file.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {type.label} · {size} · {formatTimestamp(file.updatedAt)}
        </span>
      </button>
      <ItemMenu
        index={index}
        isFolder={false}
        onPreview={() => actions.onPreview(file)}
        onDownload={() => actions.onDownload(file)}
        onRename={() => actions.onRename({ __kind__: "file", file })}
        onMove={() => actions.onMove({ __kind__: "file", file })}
        onCopy={() => actions.onCopy(file)}
        onDelete={() => actions.onDelete({ __kind__: "file", file })}
      />
    </li>
  );
}

/** The per-item overflow menu. */
function ItemMenu({
  index,
  isFolder,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onDelete,
}: {
  index: number;
  isFolder: boolean;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename: () => void;
  onMove: () => void;
  onCopy?: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-ocid={`files.item_menu_button.${index + 1}`}
          aria-label="Item actions"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {!isFolder && onPreview && (
          <DropdownMenuItem onSelect={onPreview}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Preview
          </DropdownMenuItem>
        )}
        {!isFolder && onDownload && (
          <DropdownMenuItem onSelect={onDownload}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onRename}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove}>
          <FolderInput className="h-4 w-4" aria-hidden="true" />
          Move to…
        </DropdownMenuItem>
        {!isFolder && onCopy && (
          <DropdownMenuItem onSelect={onCopy}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy to…
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The stable identity of a listing item, used for keys and selection. */
export function itemKey(item: ListingItem): string {
  return item.__kind__ === "folder"
    ? `folder-${item.folder.id.toString()}`
    : `file-${item.file.id.toString()}`;
}

/** The id of a listing item. */
export function itemId(item: ListingItem): Id {
  return item.__kind__ === "folder" ? item.folder.id : item.file.id;
}

/** The display name of a listing item. */
export function itemName(item: ListingItem): string {
  return item.__kind__ === "folder" ? item.folder.name : item.file.name;
}
