import type { HomeApp, HomeFolderView } from "@/components/home/types";
import { cn } from "@/lib/utils";
import {
  Link2,
  Palette,
  Pencil,
  Pin,
  PinOff,
  Star,
  StarOff,
  Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type MenuTarget =
  | { kind: "app"; app: HomeApp }
  | { kind: "folder"; folder: HomeFolderView };

/** Keep the menu this far from the viewport edge when clamping. */
const EDGE_MARGIN = 8;

/**
 * A small action menu anchored at the pointer. Opens from a right-click on
 * desktop and a long-press on touch. Offers favourite toggling, moving an entry
 * into a folder (or back to the grid), dock add/remove, and folder
 * rename/delete. A personal shortcut additionally offers rename, change icon,
 * edit link and remove. Closes on Escape, outside click, or action.
 *
 * The menu is portaled to `document.body` so it escapes the app shell's
 * stacking context and always paints above the folder window and every other
 * overlay. Its position is clamped to the viewport so it stays fully visible
 * and clickable near screen edges.
 */
export function HomeContextMenu({
  target,
  x,
  y,
  folders,
  isInDock,
  onClose,
  onToggleFavourite,
  onMoveToFolder,
  onToggleDock,
  onRenameFolder,
  onDeleteFolder,
  onRenameShortcut,
  onChangeIcon,
  onEditLink,
  onRemoveShortcut,
}: {
  target: MenuTarget;
  x: number;
  y: number;
  folders: HomeFolderView[];
  isInDock: boolean;
  onClose: () => void;
  onToggleFavourite: (app: HomeApp) => void;
  onMoveToFolder: (app: HomeApp, folderId: bigint | null) => void;
  onToggleDock: (app: HomeApp) => void;
  onRenameFolder: (folder: HomeFolderView) => void;
  onDeleteFolder: (folder: HomeFolderView) => void;
  onRenameShortcut: (app: HomeApp) => void;
  onChangeIcon: (app: HomeApp) => void;
  onEditLink: (app: HomeApp) => void;
  onRemoveShortcut: (app: HomeApp) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Measure the rendered menu and clamp it inside the viewport. Runs before
  // paint so the menu never flashes off-screen, and re-runs when the pointer
  // anchor changes.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const maxLeft = Math.max(
      EDGE_MARGIN,
      window.innerWidth - width - EDGE_MARGIN,
    );
    const maxTop = Math.max(
      EDGE_MARGIN,
      window.innerHeight - height - EDGE_MARGIN,
    );
    setPosition({
      left: Math.min(Math.max(x, EDGE_MARGIN), maxLeft),
      top: Math.min(Math.max(y, EDGE_MARGIN), maxTop),
    });
  }, [x, y]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  const itemClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const menu = (
    <div
      ref={ref}
      data-ocid="home.context_menu"
      role="menu"
      style={{ left: position.left, top: position.top }}
      // Stop pointerdown from bubbling to document-level listeners so an open
      // folder dialog does not treat a menu interaction as an outside click
      // and dismiss itself before the menu action fires. Bubble phase keeps the
      // event reaching the menu's own buttons first.
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-[60] w-56 rounded-2xl border border-border surface-raised p-1.5 shadow-floating animate-scale-in"
    >
      {target.kind === "app" ? (
        <>
          {target.app.kind === "shortcut" && (
            <>
              <button
                type="button"
                role="menuitem"
                data-ocid="home.menu_rename_shortcut_button"
                className={itemClass}
                onClick={() => {
                  onRenameShortcut(target.app);
                  onClose();
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                data-ocid="home.menu_change_icon_button"
                className={itemClass}
                onClick={() => {
                  onChangeIcon(target.app);
                  onClose();
                }}
              >
                <Palette className="h-4 w-4" aria-hidden="true" />
                Change icon
              </button>
              <button
                type="button"
                role="menuitem"
                data-ocid="home.menu_edit_link_button"
                className={itemClass}
                onClick={() => {
                  onEditLink(target.app);
                  onClose();
                }}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Edit link
              </button>
              <div className="my-1 h-px bg-border" />
            </>
          )}
          <button
            type="button"
            role="menuitem"
            data-ocid="home.menu_favourite_button"
            className={itemClass}
            onClick={() => {
              onToggleFavourite(target.app);
              onClose();
            }}
          >
            {target.app.favourite ? (
              <StarOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Star className="h-4 w-4" aria-hidden="true" />
            )}
            {target.app.favourite
              ? "Remove from favourites"
              : "Add to favourites"}
          </button>
          <button
            type="button"
            role="menuitem"
            data-ocid="home.menu_dock_button"
            className={itemClass}
            onClick={() => {
              onToggleDock(target.app);
              onClose();
            }}
          >
            {isInDock ? (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4" aria-hidden="true" />
            )}
            {isInDock ? "Remove from dock" : "Add to dock"}
          </button>
          <div className="my-1 h-px bg-border" />
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Move to folder
          </p>
          {folders.length === 0 && (
            <p className="px-3 py-1.5 text-xs text-muted-foreground">
              No folders yet
            </p>
          )}
          {folders.map((folder) => (
            <button
              key={folder.id.toString()}
              type="button"
              role="menuitem"
              data-ocid={`home.menu_folder_option.${folder.id.toString()}`}
              className={itemClass}
              onClick={() => {
                onMoveToFolder(target.app, folder.id);
                onClose();
              }}
            >
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
          {target.app.folderId !== undefined && (
            <button
              type="button"
              role="menuitem"
              data-ocid="home.menu_ungroup_button"
              className={itemClass}
              onClick={() => {
                onMoveToFolder(target.app, null);
                onClose();
              }}
            >
              Remove from folder
            </button>
          )}
          {target.app.kind === "shortcut" && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                role="menuitem"
                data-ocid="home.menu_remove_shortcut_button"
                className={cn(
                  itemClass,
                  "text-destructive hover:bg-destructive/10",
                )}
                onClick={() => {
                  onRemoveShortcut(target.app);
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove shortcut
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            role="menuitem"
            data-ocid="home.menu_rename_folder_button"
            className={itemClass}
            onClick={() => {
              onRenameFolder(target.folder);
              onClose();
            }}
          >
            Rename folder
          </button>
          <button
            type="button"
            role="menuitem"
            data-ocid="home.menu_delete_folder_button"
            className={cn(
              itemClass,
              "text-destructive hover:bg-destructive/10",
            )}
            onClick={() => {
              onDeleteFolder(target.folder);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete folder
          </button>
        </>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
