import type { Folder, Id } from "@/backend";
import { ChevronRight, Home } from "lucide-react";

/** A single crumb in the folder path. */
export interface Crumb {
  id: Id | null;
  name: string;
}

/**
 * Folder breadcrumb. The first crumb is the section root; each subsequent crumb
 * navigates back up the folder path.
 */
export function FileBreadcrumb({
  crumbs,
  onNavigate,
}: {
  crumbs: Crumb[];
  onNavigate: (id: Id | null) => void;
}) {
  return (
    <nav
      aria-label="Folder path"
      data-ocid="files.breadcrumb"
      className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm"
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span
            key={crumb.id?.toString() ?? "root"}
            className="flex items-center gap-1"
          >
            {index > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
            {isLast ? (
              <span
                data-ocid={`files.crumb.${index + 1}`}
                aria-current="page"
                className="flex items-center gap-1.5 whitespace-nowrap font-medium text-foreground"
              >
                {index === 0 && (
                  <Home className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {crumb.name}
              </span>
            ) : (
              <button
                type="button"
                data-ocid={`files.crumb.${index + 1}`}
                onClick={() => onNavigate(crumb.id)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {index === 0 && (
                  <Home className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {crumb.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Build the crumb path from a folder chain (root-first). */
export function buildCrumbs(rootName: string, chain: Folder[]): Crumb[] {
  return [
    { id: null, name: rootName },
    ...chain.map((folder) => ({ id: folder.id, name: folder.name })),
  ];
}
