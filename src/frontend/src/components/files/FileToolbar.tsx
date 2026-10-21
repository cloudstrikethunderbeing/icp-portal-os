import { SortKey, SortOrder } from "@/backend";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  FolderPlus,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";

/** The sort field options shown in the toolbar. */
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: SortKey.name, label: "Name" },
  { value: SortKey.createdAt, label: "Date created" },
  { value: SortKey.updatedAt, label: "Date updated" },
  { value: SortKey.size, label: "Size" },
];

/** Search, sort, view and create controls for the file browser. */
export function FileToolbar({
  search,
  onSearchChange,
  sortKey,
  sortOrder,
  onSortKeyChange,
  onSortOrderToggle,
  view,
  onViewChange,
  onNewFolder,
  disabled,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sortKey: SortKey;
  sortOrder: SortOrder;
  onSortKeyChange: (key: SortKey) => void;
  onSortOrderToggle: () => void;
  view: "list" | "grid";
  onViewChange: (view: "list" | "grid") => void;
  onNewFolder: () => void;
  disabled: boolean;
}) {
  const ascending = sortOrder === SortOrder.asc;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          data-ocid="files.search_input"
          type="search"
          value={search}
          disabled={disabled}
          placeholder="Search files and folders"
          aria-label="Search files and folders"
          onChange={(event) => onSearchChange(event.target.value)}
          className="rounded-full pl-9 pr-9"
        />
        {search.length > 0 && (
          <button
            type="button"
            data-ocid="files.search_clear_button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(value as SortKey)}
        >
          <SelectTrigger
            data-ocid="files.sort_select"
            aria-label="Sort by"
            className="w-[9.5rem] rounded-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          data-ocid="files.sort_order_button"
          aria-label={ascending ? "Sort descending" : "Sort ascending"}
          onClick={onSortOrderToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-smooth hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {ascending ? (
            <ArrowUpAZ className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <fieldset
          aria-label="View mode"
          className="flex items-center rounded-full border border-border p-0.5"
        >
          <ViewButton
            active={view === "list"}
            label="List view"
            ocid="files.view_list_button"
            onClick={() => onViewChange("list")}
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </ViewButton>
          <ViewButton
            active={view === "grid"}
            label="Grid view"
            ocid="files.view_grid_button"
            onClick={() => onViewChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          </ViewButton>
        </fieldset>

        <button
          type="button"
          data-ocid="files.new_folder_button"
          disabled={disabled}
          onClick={onNewFolder}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">New folder</span>
        </button>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  label,
  ocid,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  ocid: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
