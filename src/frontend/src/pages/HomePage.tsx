import {
  type AppRegistryEntry as BackendAppEntry,
  type Id,
  LaunchType,
} from "@/backend";
import { FavouritesRow } from "@/components/home/FavouritesRow";
import { FolderOverlay } from "@/components/home/FolderOverlay";
import {
  HomeContextMenu,
  type MenuTarget,
} from "@/components/home/HomeContextMenu";
import { HomeDock } from "@/components/home/HomeDock";
import { HomeGrid } from "@/components/home/HomeGrid";
import { HomeSearch } from "@/components/home/HomeSearch";
import {
  HomeEmptyState,
  HomeErrorState,
  HomeLoadingState,
  HomeNoResultsState,
  SignedOutHome,
} from "@/components/home/HomeStates";
import {
  type ShortcutDraft,
  ShortcutEditor,
} from "@/components/home/ShortcutEditor";
import {
  getAppVisual,
  toFrontendLaunchType,
  toShortcutHomeApp,
} from "@/components/home/appVisuals";
import {
  type HomeApp,
  type HomeCell,
  type HomeFolderView,
  fromDockId,
  homeEntryKey,
  toDockId,
} from "@/components/home/types";
import {
  useCreateHomeFolder,
  useCreateShortcut,
  useDeleteHomeFolder,
  useHomeLayout,
  useMoveAppToFolder,
  useMoveShortcutToFolder,
  useRemoveShortcut,
  useRenameHomeFolder,
  useRenameShortcut,
  useReorderApps,
  useSetAppFavourite,
  useSetDock,
  useSetShortcutFavourite,
  useSetShortcutIcon,
  useSetShortcutUrl,
} from "@/hooks/useHomeLayout";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { ROUTES } from "@/lib/routes";
import type { AppRegistryEntry } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import { FolderPlus, Plus } from "lucide-react";
import { useMemo, useState } from "react";

/** Join a backend registry entry with its install record and visual layer. */
function toHomeApp(
  entry: BackendAppEntry,
  installedId: Id,
  favourite: boolean,
  folderId: Id | undefined,
  position: bigint,
): HomeApp {
  const visual = getAppVisual(entry);
  return {
    kind: "app",
    installedId,
    appId: entry.id,
    name: entry.name,
    description: entry.description,
    launchType: toFrontendLaunchType(entry.launchType),
    state: "installed",
    icon: visual.icon,
    gradient: visual.gradient,
    route: visual.route,
    href: entry.url.length > 0 ? entry.url : undefined,
    favourite,
    folderId,
    position,
  };
}

/** The shortcut editor's current mode: creating, or editing an existing entry. */
type EditorState = { mode: "create" } | { mode: "edit"; app: HomeApp } | null;

export default function HomePage() {
  const navigate = useNavigate();
  const launchApp = useLaunchApp();
  const { identity } = useInternetIdentity();
  const signedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const { data, isPending, isError, error, refetch } = useHomeLayout();

  const reorder = useReorderApps();
  const moveToFolder = useMoveAppToFolder();
  const createFolder = useCreateHomeFolder();
  const renameFolder = useRenameHomeFolder();
  const deleteFolder = useDeleteHomeFolder();
  const setFavourite = useSetAppFavourite();
  const setDock = useSetDock();
  const createShortcut = useCreateShortcut();
  const renameShortcut = useRenameShortcut();
  const setShortcutIcon = useSetShortcutIcon();
  const setShortcutUrl = useSetShortcutUrl();
  const setShortcutFavourite = useSetShortcutFavourite();
  const moveShortcutToFolder = useMoveShortcutToFolder();
  const removeShortcut = useRemoveShortcut();

  const [query, setQuery] = useState("");
  const [openFolderId, setOpenFolderId] = useState<Id | null>(null);
  const [menu, setMenu] = useState<{
    target: MenuTarget;
    x: number;
    y: number;
  } | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [namingFolder, setNamingFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const model = useMemo(() => {
    if (!data) return null;
    const entryById = new Map(
      data.registry.map((entry) => [entry.id.toString(), entry]),
    );
    const apps: HomeApp[] = [];
    for (const installed of data.installed) {
      const entry = entryById.get(installed.appId.toString());
      if (!entry) continue;
      apps.push(
        toHomeApp(
          entry,
          installed.id,
          installed.favourite,
          installed.folderId,
          installed.position,
        ),
      );
    }
    for (const shortcut of data.shortcuts) {
      apps.push(toShortcutHomeApp(shortcut));
    }
    const appByKey = new Map(apps.map((app) => [homeEntryKey(app), app]));

    const folders: HomeFolderView[] = [];
    const folderById = new Map<string, HomeFolderView>();
    for (const item of data.items) {
      if (item.__kind__ === "folder") {
        const view: HomeFolderView = {
          id: item.folder.id,
          name: item.folder.name,
          position: item.folder.position,
          apps: [],
        };
        folders.push(view);
        folderById.set(item.folder.id.toString(), view);
      }
    }
    for (const app of apps) {
      if (app.folderId === undefined) continue;
      folderById.get(app.folderId.toString())?.apps.push(app);
    }
    for (const folder of folders) {
      folder.apps.sort((a, b) => Number(a.position - b.position));
    }

    const cells: HomeCell[] = [];
    for (const item of data.items) {
      if (item.__kind__ === "app") {
        const app = appByKey.get(`app:${item.app.id.toString()}`);
        if (app) cells.push({ kind: "app", app });
      } else {
        const folder = folderById.get(item.folder.id.toString());
        if (folder) cells.push({ kind: "folder", folder });
      }
    }
    // Personal shortcuts are always loose on the grid, after the installed apps.
    for (const app of apps) {
      if (app.kind === "shortcut" && app.folderId === undefined) {
        cells.push({ kind: "app", app });
      }
    }

    const dockApps = data.dock.appIds
      .map((id) => {
        const decoded = fromDockId(id);
        return appByKey.get(
          decoded.kind === "shortcut"
            ? `shortcut:${decoded.id.toString()}`
            : `app:${decoded.id.toString()}`,
        );
      })
      .filter((app): app is HomeApp => app !== undefined);

    return {
      apps,
      folders,
      cells,
      dockApps,
      favourites: apps.filter((app) => app.favourite),
    };
  }, [data]);

  const filteredCells = useMemo(() => {
    if (!model) return [];
    const term = query.trim().toLowerCase();
    if (term.length === 0) return model.cells;
    return model.cells.filter((cell) =>
      cell.kind === "app"
        ? cell.app.name.toLowerCase().includes(term)
        : cell.folder.name.toLowerCase().includes(term) ||
          cell.folder.apps.some((app) => app.name.toLowerCase().includes(term)),
    );
  }, [model, query]);

  const openFolder =
    openFolderId !== null
      ? (model?.folders.find((folder) => folder.id === openFolderId) ?? null)
      : null;

  const handleLaunch = (app: HomeApp) => {
    launchApp({
      id: app.appId.toString(),
      name: app.name,
      description: app.description,
      launchType: app.launchType,
      icon: app.icon,
      gradient: app.gradient,
      route: app.route,
      href: app.href,
    });
  };

  const handleSignedOutLaunch = (app: AppRegistryEntry) => {
    if (app.launchType === "native") return;
    launchApp(app);
  };

  const handleDropOnApp = (target: HomeApp) => {
    if (!model || draggingId === null) return;
    const dragged = model.apps.find((app) => homeEntryKey(app) === draggingId);
    setDropTargetId(null);
    setDraggingId(null);
    if (!dragged || homeEntryKey(dragged) === homeEntryKey(target)) return;
    // Reordering is defined over installed apps only; shortcuts keep their order.
    const ordered = model.apps
      .filter((app) => app.kind === "app" && app.folderId === undefined)
      .map((app) => app.installedId);
    const from = ordered.findIndex((id) => id === dragged.installedId);
    const to = ordered.findIndex((id) => id === target.installedId);
    if (from === -1 || to === -1) return;
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    reorder.mutate(ordered);
  };

  const handleDropOnFolder = (folder: HomeFolderView) => {
    if (draggingId === null) return;
    const dragged = model?.apps.find((app) => homeEntryKey(app) === draggingId);
    setDropTargetId(null);
    setDraggingId(null);
    if (!dragged) return;
    if (dragged.kind === "shortcut") {
      const id = dragged.shortcutId ?? dragged.installedId;
      moveShortcutToFolder.mutate({ id, folderId: folder.id });
      return;
    }
    moveToFolder.mutate({
      installedId: dragged.installedId,
      folderId: folder.id,
    });
  };

  const handleToggleDock = (app: HomeApp) => {
    if (!model) return;
    const ids = model.dockApps.map((dockApp) => toDockId(dockApp));
    const target = toDockId(app);
    const present = ids.some((id) => id === target);
    const next = present ? ids.filter((id) => id !== target) : [...ids, target];
    setDock.mutate(next);
  };

  const submitNewFolder = () => {
    const trimmed = folderName.trim();
    if (trimmed.length > 0) createFolder.mutate(trimmed);
    setFolderName("");
    setNamingFolder(false);
  };

  const submitShortcut = (draft: ShortcutDraft) => {
    const onSuccess = () => setEditor(null);
    if (editor?.mode === "edit" && editor.app.kind === "shortcut") {
      const id = editor.app.shortcutId ?? editor.app.installedId;
      renameShortcut.mutate({ id, name: draft.name }, { onSuccess });
      setShortcutUrl.mutate({ id, url: draft.url });
      setShortcutIcon.mutate({ id, icon: draft.iconKey });
    } else {
      createShortcut.mutate(
        {
          name: draft.name,
          url: draft.url,
          icon: draft.iconKey,
          launchType: LaunchType.externalWeb,
        },
        { onSuccess },
      );
    }
  };

  const isInDock = (app: HomeApp) =>
    model?.dockApps.some(
      (dockApp) => homeEntryKey(dockApp) === homeEntryKey(app),
    ) ?? false;

  const shortcutPending =
    createShortcut.isPending ||
    renameShortcut.isPending ||
    setShortcutIcon.isPending ||
    setShortcutUrl.isPending;

  const shortcutError =
    createShortcut.error ??
    renameShortcut.error ??
    setShortcutIcon.error ??
    setShortcutUrl.error;

  return (
    <section data-ocid="home.page" className="space-y-6 pb-44 md:pb-32">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Home
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Your workspace apps, arranged your way.
          </p>
        </div>
        {signedIn && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-ocid="home.add_shortcut_button"
              onClick={() => setEditor({ mode: "create" })}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add shortcut
            </button>
            <button
              type="button"
              data-ocid="home.new_folder_button"
              onClick={() => setNamingFolder(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-smooth hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              New folder
            </button>
          </div>
        )}
      </header>

      {!signedIn && <SignedOutHome onLaunch={handleSignedOutLaunch} />}

      {signedIn && <HomeSearch value={query} onChange={setQuery} />}

      {signedIn && namingFolder && (
        <form
          data-ocid="home.new_folder_form"
          onSubmit={(event) => {
            event.preventDefault();
            submitNewFolder();
          }}
          className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-subtle"
        >
          <input
            // biome-ignore lint/a11y/noAutofocus: the field appears from an explicit user action
            autoFocus
            data-ocid="home.new_folder_input"
            value={folderName}
            maxLength={40}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Folder name"
            aria-label="New folder name"
            className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            data-ocid="home.new_folder_submit_button"
            disabled={folderName.trim().length === 0 || createFolder.isPending}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create
          </button>
          <button
            type="button"
            data-ocid="home.new_folder_cancel_button"
            onClick={() => {
              setFolderName("");
              setNamingFolder(false);
            }}
            className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
        </form>
      )}

      {signedIn && isPending && <HomeLoadingState />}

      {signedIn && isError && (
        <HomeErrorState
          message={
            error instanceof Error
              ? error.message
              : "Something went wrong while loading your workspace."
          }
          onRetry={() => void refetch()}
        />
      )}

      {signedIn && model && !isPending && !isError && (
        <>
          {model.apps.length === 0 ? (
            <HomeEmptyState
              onBrowse={() => void navigate({ to: ROUTES.directory })}
              onAddShortcut={() => setEditor({ mode: "create" })}
            />
          ) : (
            <>
              <FavouritesRow
                apps={model.favourites}
                onLaunch={handleLaunch}
                onOpenMenu={(app, x, y) =>
                  setMenu({ target: { kind: "app", app }, x, y })
                }
              />

              {filteredCells.length === 0 ? (
                <HomeNoResultsState query={query} />
              ) : (
                <HomeGrid
                  cells={filteredCells}
                  onLaunch={handleLaunch}
                  onOpenFolder={(folder) => setOpenFolderId(folder.id)}
                  onDragStart={(app) => setDraggingId(homeEntryKey(app))}
                  onDragOver={(app) => setDropTargetId(homeEntryKey(app))}
                  onDragOverFolder={(folder) =>
                    setDropTargetId(`folder-${folder.id.toString()}`)
                  }
                  onDropApp={handleDropOnApp}
                  onDropFolder={handleDropOnFolder}
                  onOpenAppMenu={(app, x, y) =>
                    setMenu({ target: { kind: "app", app }, x, y })
                  }
                  onOpenFolderMenu={(folder, x, y) =>
                    setMenu({ target: { kind: "folder", folder }, x, y })
                  }
                  draggingId={draggingId}
                  dropTargetId={dropTargetId}
                />
              )}
            </>
          )}

          <HomeDock
            dockApps={model.dockApps}
            availableApps={model.apps}
            onLaunch={handleLaunch}
            onAdd={(app) => handleToggleDock(app)}
            onRemove={(app) => handleToggleDock(app)}
            onOpenMenu={(app, x, y) =>
              setMenu({ target: { kind: "app", app }, x, y })
            }
          />
        </>
      )}

      {openFolder && (
        <FolderOverlay
          folder={openFolder}
          onClose={() => setOpenFolderId(null)}
          onLaunch={handleLaunch}
          onRename={(folder, name) =>
            renameFolder.mutate({ id: folder.id, name })
          }
          onDelete={(folder) => {
            deleteFolder.mutate(folder.id);
            setOpenFolderId(null);
          }}
          onDragOut={(app) => setDraggingId(homeEntryKey(app))}
          onOpenMenu={(app, x, y) =>
            setMenu({ target: { kind: "app", app }, x, y })
          }
        />
      )}

      {menu && (
        <HomeContextMenu
          target={menu.target}
          x={menu.x}
          y={menu.y}
          folders={model?.folders ?? []}
          isInDock={
            menu.target.kind === "app" ? isInDock(menu.target.app) : false
          }
          onClose={() => setMenu(null)}
          onToggleFavourite={(app) => {
            if (app.kind === "shortcut") {
              const id = app.shortcutId ?? app.installedId;
              setShortcutFavourite.mutate({ id, favourite: !app.favourite });
              return;
            }
            setFavourite.mutate({
              installedId: app.installedId,
              favourite: !app.favourite,
            });
          }}
          onMoveToFolder={(app, folderId) => {
            if (app.kind === "shortcut") {
              const id = app.shortcutId ?? app.installedId;
              moveShortcutToFolder.mutate({ id, folderId });
              return;
            }
            moveToFolder.mutate({ installedId: app.installedId, folderId });
          }}
          onToggleDock={handleToggleDock}
          onRenameFolder={(folder) => {
            setOpenFolderId(folder.id);
          }}
          onDeleteFolder={(folder) => deleteFolder.mutate(folder.id)}
          onRenameShortcut={(app) => setEditor({ mode: "edit", app })}
          onChangeIcon={(app) => setEditor({ mode: "edit", app })}
          onEditLink={(app) => setEditor({ mode: "edit", app })}
          onRemoveShortcut={(app) => {
            const id = app.shortcutId ?? app.installedId;
            removeShortcut.mutate(id);
          }}
        />
      )}

      {editor && (
        <ShortcutEditor
          shortcut={editor.mode === "edit" ? editor.app : undefined}
          isPending={shortcutPending}
          errorMessage={
            shortcutError instanceof Error ? shortcutError.message : undefined
          }
          onSubmit={submitShortcut}
          onClose={() => setEditor(null)}
        />
      )}
    </section>
  );
}
