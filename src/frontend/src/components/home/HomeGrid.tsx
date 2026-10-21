import { AppIcon } from "@/components/home/AppIcon";
import { FolderTile } from "@/components/home/FolderTile";
import type {
  HomeApp,
  HomeCell,
  HomeFolderView,
} from "@/components/home/types";
import { homeEntryKey } from "@/components/home/types";

/**
 * Match a drag/drop target id against an entry. Accepts both the namespaced
 * entry key (`app:0` / `shortcut:3`) and the bare installed id, so the grid
 * stays compatible with callers that still track the raw id.
 */
function matchesEntry(targetId: string | null, app: HomeApp): boolean {
  if (targetId === null) return false;
  return (
    targetId === homeEntryKey(app) ||
    (app.kind === "app" && targetId === app.installedId.toString())
  );
}

/**
 * The responsive home grid. Reflows from a four-column phone layout with large
 * touch targets to a wider desktop layout, and renders both loose apps and
 * folders as draggable cells. Installed apps and personal shortcuts share the
 * same cell treatment.
 */
export function HomeGrid({
  cells,
  onLaunch,
  onOpenFolder,
  onDragStart,
  onDragOver,
  onDragOverFolder,
  onDropApp,
  onDropFolder,
  onOpenAppMenu,
  onOpenFolderMenu,
  draggingId,
  dropTargetId,
}: {
  cells: HomeCell[];
  onLaunch: (app: HomeApp) => void;
  onOpenFolder: (folder: HomeFolderView) => void;
  onDragStart: (app: HomeApp) => void;
  onDragOver: (app: HomeApp) => void;
  onDragOverFolder: (folder: HomeFolderView) => void;
  onDropApp: (app: HomeApp) => void;
  onDropFolder: (folder: HomeFolderView) => void;
  onOpenAppMenu: (app: HomeApp, x: number, y: number) => void;
  onOpenFolderMenu: (folder: HomeFolderView, x: number, y: number) => void;
  draggingId: string | null;
  dropTargetId: string | null;
}) {
  return (
    <div
      data-ocid="home.app_grid"
      className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 md:grid-cols-6 md:gap-x-3 md:gap-y-5"
    >
      {cells.map((cell, index) =>
        cell.kind === "app" ? (
          <AppIcon
            key={homeEntryKey(cell.app)}
            app={cell.app}
            index={index}
            onLaunch={onLaunch}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDropApp}
            onOpenMenu={onOpenAppMenu}
            isDragging={matchesEntry(draggingId, cell.app)}
            isDropTarget={matchesEntry(dropTargetId, cell.app)}
          />
        ) : (
          <FolderTile
            key={`folder-${cell.folder.id.toString()}`}
            folder={cell.folder}
            index={index}
            onOpen={onOpenFolder}
            onDragOver={onDragOverFolder}
            onDrop={onDropFolder}
            onOpenMenu={onOpenFolderMenu}
            isDropTarget={
              dropTargetId === `folder-${cell.folder.id.toString()}`
            }
          />
        ),
      )}
    </div>
  );
}
