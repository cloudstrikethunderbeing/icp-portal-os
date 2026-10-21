import { AppCategory } from "@/backend";
import { cn } from "@/lib/utils";

/** Human-readable label for each registry category. */
export const CATEGORY_LABEL: Record<AppCategory, string> = {
  [AppCategory.ai]: "AI",
  [AppCategory.finance]: "Finance",
  [AppCategory.social]: "Social",
  [AppCategory.productivity]: "Productivity",
  [AppCategory.governance]: "Governance",
  [AppCategory.gaming]: "Gaming",
  [AppCategory.media]: "Media",
  [AppCategory.developer]: "Developer",
  [AppCategory.business]: "Business",
  [AppCategory.other]: "Other",
};

/** The filter order shown in the directory: the nine product categories, then Other. */
export const CATEGORY_ORDER: AppCategory[] = [
  AppCategory.ai,
  AppCategory.finance,
  AppCategory.social,
  AppCategory.productivity,
  AppCategory.governance,
  AppCategory.gaming,
  AppCategory.media,
  AppCategory.developer,
  AppCategory.business,
  AppCategory.other,
];

/**
 * Horizontal, scrollable category filter. `null` selects every category.
 */
export function DirectoryFilters({
  active,
  onChange,
}: {
  active: AppCategory | null;
  onChange: (category: AppCategory | null) => void;
}) {
  const options: { value: AppCategory | null; label: string }[] = [
    { value: null, label: "All" },
    ...CATEGORY_ORDER.map((category) => ({
      value: category,
      label: CATEGORY_LABEL[category],
    })),
  ];

  return (
    <div
      data-ocid="directory.filters"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
    >
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value ?? "all"}
            type="button"
            data-ocid={`directory.filter.${option.value ?? "all"}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-smooth",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-gradient-primary text-primary-foreground shadow-subtle"
                : "bg-secondary text-secondary-foreground hover:bg-accent/20",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
