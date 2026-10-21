import { Search, X } from "lucide-react";

/** Search field that filters the installed apps by name. */
export function HomeSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        data-ocid="home.search_input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search apps"
        aria-label="Search apps by name"
        className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-10 text-sm text-foreground shadow-subtle transition-smooth placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {value.length > 0 && (
        <button
          type="button"
          data-ocid="home.search_clear_button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-smooth hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
