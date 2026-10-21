import type { AppCategory, DirectoryEntry } from "@/backend";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { DirectoryFilters } from "@/components/directory/DirectoryFilters";
import {
  DirectoryEmpty,
  DirectoryError,
  DirectoryLoading,
} from "@/components/directory/DirectoryStates";
import {
  useAddToHomeScreen,
  useDirectory,
  useDirectorySearch,
  useInstalledAppIds,
  useRemoveFromHome,
  useSetDirectoryFavourite,
} from "@/components/directory/useDirectory";
import { getAppVisual } from "@/components/home/appVisuals";
import { normalizeExternalUrl } from "@/hooks/useLaunchApp";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Search, X } from "lucide-react";
import { useCallback, useState } from "react";

/**
 * ICP App Directory — browse the registry of ICP applications with category
 * filtering, search, favourites and add-to-home. Coming Soon entries are
 * labelled and never launch; a launch that cannot open reports a clear failure.
 */
export default function DirectoryPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const signedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const [category, setCategory] = useState<AppCategory | null>(null);
  const [term, setTerm] = useState("");
  const [launchError, setLaunchError] = useState<string | null>(null);

  const searching = term.trim().length > 0;
  const directoryQuery = useDirectory(category);
  const searchQuery = useDirectorySearch(term);
  const activeQuery = searching ? searchQuery : directoryQuery;

  const favouriteMutation = useSetDirectoryFavourite();
  const addMutation = useAddToHomeScreen();
  const removeMutation = useRemoveFromHome();
  const installedIds = useInstalledAppIds();

  const handleLaunch = useCallback(
    (entry: DirectoryEntry) => {
      const { app } = entry;
      setLaunchError(null);
      switch (app.launchType) {
        case "native": {
          // Native registry entries carry an empty url; resolve the in-app
          // route from the visual layer so the app opens inside the shell.
          const route = getAppVisual(app).route;
          if (route) {
            void navigate({ to: route });
          } else {
            setLaunchError(`${app.name} has no in-app destination yet.`);
          }
          return;
        }
        case "icpService":
        case "externalWeb": {
          const url = normalizeExternalUrl(app.url);
          if (!url) {
            setLaunchError(
              `${app.name} has an invalid address and could not be opened.`,
            );
            return;
          }
          const opened = window.open(url, "_blank", "noopener,noreferrer");
          if (!opened) {
            setLaunchError(
              `Your browser blocked opening ${app.name}. Allow pop-ups and try again.`,
            );
          }
          return;
        }
        case "comingSoon":
          return;
      }
    },
    [navigate],
  );

  const handleToggleFavourite = useCallback(
    (entry: DirectoryEntry) => {
      favouriteMutation.mutate({
        appId: entry.app.id,
        favourite: !entry.favourite,
      });
    },
    [favouriteMutation],
  );

  const handleAddToHome = useCallback(
    (entry: DirectoryEntry) => {
      addMutation.mutate(entry.app.id);
    },
    [addMutation],
  );

  const handleRemoveFromHome = useCallback(
    (entry: DirectoryEntry) => {
      const installedId = installedIds.data?.get(entry.app.id.toString());
      if (installedId === undefined) {
        setLaunchError(
          `${entry.app.name} is not on your Home screen right now.`,
        );
        return;
      }
      removeMutation.mutate(installedId);
    },
    [installedIds.data, removeMutation],
  );

  const entries = activeQuery.data ?? [];
  const showLoading = activeQuery.isPending;
  const showError = activeQuery.isError;

  return (
    <section data-ocid="directory.page" className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          App Directory
        </h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Discover ICP services and web apps. Favourite one or add it to your
          Home screen.
        </p>
      </header>

      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search the directory</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            data-ocid="directory.search_input"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search apps by name or description"
            className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </label>

        <DirectoryFilters active={category} onChange={setCategory} />
      </div>

      {launchError && (
        <div
          data-ocid="directory.launch_error"
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1">{launchError}</p>
          <button
            type="button"
            data-ocid="directory.launch_error_dismiss_button"
            aria-label="Dismiss message"
            onClick={() => setLaunchError(null)}
            className="shrink-0 rounded-full p-1 text-muted-foreground transition-quick hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {showLoading && <DirectoryLoading />}

      {showError && (
        <DirectoryError
          onRetry={() => void activeQuery.refetch()}
          isRetrying={activeQuery.isFetching}
        />
      )}

      {!showLoading && !showError && entries.length === 0 && (
        <DirectoryEmpty
          title={searching ? "No matching apps" : "Nothing in this category"}
          description={
            searching
              ? `No apps match “${term.trim()}”. Try a different search.`
              : "No apps are registered in this category yet."
          }
        />
      )}

      {!showLoading && !showError && entries.length > 0 && (
        <div
          data-ocid="directory.list"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {entries.map((entry, index) => (
            <DirectoryCard
              key={entry.app.id.toString()}
              entry={entry}
              index={index}
              signedIn={signedIn}
              onLaunch={handleLaunch}
              onToggleFavourite={handleToggleFavourite}
              onAddToHome={handleAddToHome}
              onRemoveFromHome={handleRemoveFromHome}
              favouritePending={favouriteMutation.isPending}
              addPending={addMutation.isPending}
              removePending={removeMutation.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}
