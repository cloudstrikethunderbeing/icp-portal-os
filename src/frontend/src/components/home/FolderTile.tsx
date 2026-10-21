import type { HomeFolderView } from "@/components/home/types";
import { homeEntryKey } from "@/components/home/types";
import { cn } from "@/lib/utils";
import { Folder } from "lucide-react";

/**
 * A folder tile in the home grid. Shows a preview of the first four apps inside
 * and opens the folder overlay on activation. Droppable so apps can be dragged
 * into it.
 */
export function FolderTile({
  folder,
  index,
  onOpen,
  onDragOver,
  onDrop,
  onOpenMenu,
  isDropTarget,
}: {
  folder: HomeFolderView;
  index: number;
  onOpen: (folder: HomeFolderView) => void;
  onDragOver: (folder: HomeFolderView) => void;
  onDrop: (folder: HomeFolderView) => void;
  onOpenMenu: (folder: HomeFolderView, x: number, y: number) => void;
  isDropTarget: boolean;
}) {
  const preview = folder.apps.slice(0, 4);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(folder);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(folder);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu(folder, event.clientX, event.clientY);
      }}
      className={cn(
        "group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-smooth",
        isDropTarget && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <button
        type="button"
        data-ocid={`home.folder_tile.${index + 1}`}
        aria-label={`Open folder ${folder.name}, ${folder.apps.length} apps`}
        onClick={() => onOpen(folder)}
        className="flex w-full flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95"
      >
        <span className="app-tile grid h-16 w-16 grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden bg-muted p-1.5 transition-smooth group-hover:scale-[1.04] group-hover:shadow-elevated md:h-[4.5rem] md:w-[4.5rem]">
          {preview.length === 0 ? (
            <span className="col-span-2 row-span-2 flex items-center justify-center text-muted-foreground">
              <Folder className="h-6 w-6" aria-hidden="true" />
            </span>
          ) : (
            preview.map((app) => {
              const Icon = app.icon;
              return (
                <span
                  key={homeEntryKey(app)}
                  className={cn(
                    "flex items-center justify-center rounded-[6px] bg-gradient-to-br text-white",
                    app.gradient,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              );
            })
          )}
        </span>
        <span className="w-full truncate text-center text-xs font-medium text-foreground">
          {folder.name}
        </span>
      </button>
    </div>
  );
}
