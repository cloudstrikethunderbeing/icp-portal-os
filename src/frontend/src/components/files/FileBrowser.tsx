import {
  type FileEntry,
  type Folder,
  type Id,
  type ListingItem,
  SortKey,
  SortOrder,
  StorageSection,
} from "@/backend";
import { FileBreadcrumb, buildCrumbs } from "@/components/files/FileBreadcrumb";
import {
  DeleteDialog,
  MoveCopyDialog,
  RenameDialog,
} from "@/components/files/FileDialogs";
import { FileDropzone } from "@/components/files/FileDropzone";
import { FileItem, FolderItem, itemKey } from "@/components/files/FileItem";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { FileToolbar } from "@/components/files/FileToolbar";
import { SectionTabs } from "@/components/files/SectionTabs";
import {
  UploadProgress,
  type UploadTask,
} from "@/components/files/UploadProgress";
import {
  FileTooLargeError,
  buildFileRef,
  downloadFile,
} from "@/components/files/upload";
import {
  useCopyFile,
  useCreateFolder,
  useDeleteFile,
  useDeleteFolder,
  useFileSearch,
  useMoveFile,
  useMoveFolder,
  useRenameFile,
  useRenameFolder,
  useSortedFolder,
  useUploadFile,
} from "@/components/files/useFiles";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, FolderOpen, RefreshCw, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/** The Files browser: sections, navigation, search, sort, upload and actions. */
export function FileBrowser() {
  const [section, setSection] = useState<StorageSection>(StorageSection.local);
  const [chain, setChain] = useState<Folder[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(SortKey.name);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.asc);
  const [view, setView] = useState<"list" | "grid">("list");
  const [uploads, setUploads] = useState<UploadTask[]>([]);

  const [previewFile, setPreviewFile] = useState<FileEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<ListingItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<ListingItem | null>(null);
  const [moveMode, setMoveMode] = useState<"move" | "copy">("move");
  const [deleteTarget, setDeleteTarget] = useState<ListingItem | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const parentId = chain.length > 0 ? chain[chain.length - 1].id : null;
  const isSearching = search.trim().length > 0;
  const isCloud = section === StorageSection.icpCloud;

  const sorted = useSortedFolder(parentId, section, sortKey, sortOrder);
  const searchResults = useFileSearch(search);
  const createFolder = useCreateFolder();
  const uploadFile = useUploadFile();
  const renameFile = useRenameFile();
  const renameFolder = useRenameFolder();
  const moveFile = useMoveFile();
  const moveFolder = useMoveFolder();
  const copyFile = useCopyFile();
  const deleteFile = useDeleteFile();
  const deleteFolder = useDeleteFolder();

  const activeQuery = isSearching ? searchResults : sorted;
  const items = useMemo<ListingItem[]>(
    () => activeQuery.data ?? [],
    [activeQuery.data],
  );

  const folders = useMemo(
    () =>
      items
        .filter(
          (item): item is Extract<ListingItem, { __kind__: "folder" }> =>
            item.__kind__ === "folder",
        )
        .map((item) => item.folder),
    [items],
  );

  const crumbs = buildCrumbs(isCloud ? "ICP Cloud" : "Local Files", chain);

  const resetToRoot = () => setChain([]);

  const handleSectionChange = (next: StorageSection) => {
    setSection(next);
    setChain([]);
    setSearch("");
  };

  const handleOpenFolder = (folder: Folder) => {
    setChain((current) => [...current, folder]);
    setSearch("");
  };

  const handleNavigate = (id: Id | null) => {
    if (id === null) {
      setChain([]);
      return;
    }
    setChain((current) => {
      const index = current.findIndex((folder) => folder.id === id);
      return index >= 0 ? current.slice(0, index + 1) : current;
    });
  };

  const handleUpload = async (files: File[]) => {
    const tasks: UploadTask[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      progress: 0,
      status: "uploading",
    }));
    setUploads((current) => [...current, ...tasks]);

    let succeeded = 0;
    let rejected = 0;
    await Promise.all(
      files.map(async (file, index) => {
        const task = tasks[index];
        try {
          const { ref, prepared } = await buildFileRef(file, (percentage) => {
            setUploads((current) =>
              current.map((entry) =>
                entry.id === task.id
                  ? { ...entry, progress: percentage }
                  : entry,
              ),
            );
          });
          await uploadFile.mutateAsync({
            name: file.name,
            parentId,
            section,
            ref,
          });
          succeeded += 1;
          setUploads((current) =>
            current.map((entry) =>
              entry.id === task.id
                ? {
                    ...entry,
                    status: "done",
                    progress: 100,
                    originalSize: prepared.originalSize,
                    uploadedSize: prepared.uploadedSize,
                    compressed: prepared.compressed,
                  }
                : entry,
            ),
          );
        } catch (error) {
          const tooLarge = error instanceof FileTooLargeError;
          if (tooLarge) rejected += 1;
          setUploads((current) =>
            current.map((entry) =>
              entry.id === task.id
                ? {
                    ...entry,
                    status: "error",
                    error: tooLarge
                      ? error.message
                      : "Upload failed. Please try again.",
                  }
                : entry,
            ),
          );
        }
      }),
    );

    if (succeeded === 0 && rejected > 0) {
      toast.error(
        rejected === 1
          ? "That file is over the upload limit."
          : `${rejected} files were over the upload limit.`,
      );
    } else if (succeeded === 0) {
      toast.error(
        files.length === 1
          ? "Upload failed. Please try again."
          : "No files were uploaded. Please try again.",
      );
    } else if (succeeded < files.length) {
      toast.warning(
        `${succeeded} of ${files.length} files uploaded. Some files failed.`,
      );
    } else {
      toast.success(
        files.length === 1 ? "File uploaded" : `${files.length} files uploaded`,
      );
    }
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (name.length === 0) return;
    createFolder.mutate(
      { name, parentId, section },
      {
        onSuccess: () => {
          setNewFolderName("");
          setNewFolderOpen(false);
          toast.success("Folder created");
        },
        onError: () => toast.error("Could not create the folder"),
      },
    );
  };

  const handleRename = (name: string) => {
    if (!renameTarget) return;
    const onSuccess = () => {
      setRenameTarget(null);
      toast.success("Renamed");
    };
    const onError = () => toast.error("Could not rename the item");
    if (renameTarget.__kind__ === "folder") {
      renameFolder.mutate(
        { id: renameTarget.folder.id, name },
        { onSuccess, onError },
      );
    } else {
      renameFile.mutate(
        { id: renameTarget.file.id, name },
        { onSuccess, onError },
      );
    }
  };

  const handleMoveCopy = (destination: Id | null) => {
    if (!moveTarget) return;
    const onSuccess = () => {
      setMoveTarget(null);
      toast.success(moveMode === "move" ? "Moved" : "Copied");
    };
    const onError = () => toast.error("Could not complete the action");
    if (moveTarget.__kind__ === "folder") {
      moveFolder.mutate(
        { id: moveTarget.folder.id, parentId: destination },
        { onSuccess, onError },
      );
    } else if (moveMode === "move") {
      moveFile.mutate(
        { id: moveTarget.file.id, parentId: destination },
        { onSuccess, onError },
      );
    } else {
      copyFile.mutate(
        { id: moveTarget.file.id, parentId: destination },
        { onSuccess, onError },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const onSuccess = () => {
      setDeleteTarget(null);
      toast.success("Deleted");
    };
    const onError = () => toast.error("Could not delete the item");
    if (deleteTarget.__kind__ === "folder") {
      deleteFolder.mutate(deleteTarget.folder.id, { onSuccess, onError });
    } else {
      deleteFile.mutate(deleteTarget.file.id, { onSuccess, onError });
    }
  };

  const handleDownload = async (file: FileEntry) => {
    try {
      await downloadFile(file.ref.blob, file.name);
    } catch {
      toast.error("Could not download the file");
    }
  };

  const actions = {
    onOpenFolder: handleOpenFolder,
    onPreview: setPreviewFile,
    onDownload: (file: FileEntry) => void handleDownload(file),
    onRename: setRenameTarget,
    onMove: (item: ListingItem) => {
      setMoveMode("move");
      setMoveTarget(item);
    },
    onCopy: (file: FileEntry) => {
      setMoveMode("copy");
      setMoveTarget({ __kind__: "file", file });
    },
    onDelete: setDeleteTarget,
  };

  const isPending =
    renameFile.isPending ||
    renameFolder.isPending ||
    moveFile.isPending ||
    moveFolder.isPending ||
    copyFile.isPending ||
    deleteFile.isPending ||
    deleteFolder.isPending;

  return (
    <section data-ocid="files.page" className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Files
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Upload, organise and preview the files in your private workspace.
        </p>
      </header>

      <SectionTabs section={section} onSectionChange={handleSectionChange} />

      {isCloud ? (
        <CloudUnavailable />
      ) : (
        <>
          <FileToolbar
            search={search}
            onSearchChange={setSearch}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortKeyChange={setSortKey}
            onSortOrderToggle={() =>
              setSortOrder((current) =>
                current === SortOrder.asc ? SortOrder.desc : SortOrder.asc,
              )
            }
            view={view}
            onViewChange={setView}
            onNewFolder={() => setNewFolderOpen(true)}
            disabled={false}
          />

          <UploadProgress tasks={uploads} />

          <FileDropzone onFiles={(files) => void handleUpload(files)} />

          <div className="flex items-center justify-between gap-3">
            <FileBreadcrumb crumbs={crumbs} onNavigate={handleNavigate} />
            <span className="shrink-0 text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <FileList
            query={activeQuery}
            items={items}
            view={view}
            isSearching={isSearching}
            actions={actions}
            onRetry={() => void activeQuery.refetch()}
            onUpload={() => resetToRoot()}
          />
        </>
      )}

      <FilePreviewDialog
        file={previewFile}
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        onDownload={(file) => void handleDownload(file)}
      />

      <RenameDialog
        item={renameTarget}
        open={renameTarget !== null}
        pending={isPending}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        onSubmit={handleRename}
      />

      <MoveCopyDialog
        item={moveTarget}
        mode={moveMode}
        folders={folders}
        open={moveTarget !== null}
        pending={isPending}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        onSubmit={handleMoveCopy}
      />

      <DeleteDialog
        item={deleteTarget}
        open={deleteTarget !== null}
        pending={isPending}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />

      <NewFolderDialog
        open={newFolderOpen}
        name={newFolderName}
        pending={createFolder.isPending}
        onNameChange={setNewFolderName}
        onOpenChange={(open) => {
          setNewFolderOpen(open);
          if (!open) setNewFolderName("");
        }}
        onSubmit={handleCreateFolder}
      />
    </section>
  );
}

/** The list/grid body with loading, empty and error states. */
function FileList({
  query,
  items,
  view,
  isSearching,
  actions,
  onRetry,
  onUpload,
}: {
  query: { isPending: boolean; isError: boolean };
  items: ListingItem[];
  view: "list" | "grid";
  isSearching: boolean;
  actions: React.ComponentProps<typeof FileItem>["actions"];
  onRetry: () => void;
  onUpload: () => void;
}) {
  if (query.isPending) {
    return <FileListSkeleton view={view} />;
  }

  if (query.isError) {
    return (
      <div
        data-ocid="files.error_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-12 text-center"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <h2 className="font-display text-base font-semibold text-foreground">
          Could not load your files
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Something went wrong while reading this folder. Please try again.
        </p>
        <Button
          type="button"
          data-ocid="files.retry_button"
          onClick={onRetry}
          className="rounded-full"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-ocid="files.empty_state"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-subtle"
      >
        <span className="app-tile flex h-14 w-14 items-center justify-center bg-gradient-to-br from-primary to-accent text-white">
          {isSearching ? (
            <SearchX className="h-7 w-7" aria-hidden="true" />
          ) : (
            <FolderOpen className="h-7 w-7" aria-hidden="true" />
          )}
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">
          {isSearching ? "No matching files" : "This folder is empty"}
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          {isSearching
            ? "Try a different search term, or clear the search to browse this folder."
            : "Upload files or create a folder to start organising your workspace."}
        </p>
        {!isSearching && (
          <Button
            type="button"
            data-ocid="files.empty_upload_button"
            onClick={onUpload}
            className="rounded-full"
          >
            Add your first file
          </Button>
        )}
      </div>
    );
  }

  if (view === "grid") {
    return (
      <ul
        data-ocid="files.grid"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        {items.map((item, index) => (
          <li key={itemKey(item)}>
            {item.__kind__ === "folder" ? (
              <FolderItem
                folder={item.folder}
                index={index}
                view="grid"
                actions={actions}
              />
            ) : (
              <FileItem
                file={item.file}
                index={index}
                view="grid"
                actions={actions}
              />
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      data-ocid="files.list"
      className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
    >
      {items.map((item, index) =>
        item.__kind__ === "folder" ? (
          <FolderItem
            key={itemKey(item)}
            folder={item.folder}
            index={index}
            view="list"
            actions={actions}
          />
        ) : (
          <FileItem
            key={itemKey(item)}
            file={item.file}
            index={index}
            view="list"
            actions={actions}
          />
        ),
      )}
    </ul>
  );
}

/** Layout-matched skeleton shown while a folder loads. */
function FileListSkeleton({ view }: { view: "list" | "grid" }) {
  const ids = Array.from(
    { length: 6 },
    (_, index) => `files-skeleton-${index}`,
  );
  if (view === "grid") {
    return (
      <ul
        data-ocid="files.loading_state"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        {ids.map((id) => (
          <li
            key={id}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
          >
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul
      data-ocid="files.loading_state"
      className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
    >
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The ICP Cloud section placeholder — clearly marked as not yet available. */
function CloudUnavailable() {
  return (
    <div
      data-ocid="files.cloud_unavailable_state"
      className="flex flex-col items-center gap-3 rounded-2xl border border-warning/40 bg-warning/5 px-6 py-14 text-center"
    >
      <span className="app-tile flex h-14 w-14 items-center justify-center bg-warning/15 text-warning">
        <AlertCircle className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="font-display text-lg font-semibold text-foreground">
        ICP Cloud is not yet available
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Cloud storage on the Internet Computer is coming in a future release.
        Your files are safe in Local Files, which stores them in your private
        workspace storage today.
      </p>
    </div>
  );
}

/** Create-folder dialog. */
function NewFolderDialog({
  open,
  name,
  pending,
  onNameChange,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  name: string;
  pending: boolean;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) {
  const canSubmit = name.trim().length > 0 && !pending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="files.new_folder_dialog"
        className="rounded-2xl border-border bg-card shadow-floating"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base font-semibold">
            New folder
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Give the folder a name.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canSubmit) onSubmit();
          }}
          className="space-y-2"
        >
          <Label htmlFor="new-folder-input">Name</Label>
          <Input
            id="new-folder-input"
            data-ocid="files.new_folder_input"
            value={name}
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
          />
          <DialogFooter className="pt-2">
            <button
              type="button"
              data-ocid="files.new_folder_cancel_button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-ocid="files.new_folder_save_button"
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              )}
            >
              Create
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
