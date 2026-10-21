import { Skeleton } from "@/components/ui/skeleton";

const SKELETON_IDS = Array.from(
  { length: 3 },
  (_, index) => `settings-skeleton-${index}`,
);

/** Layout-matched loading state for the settings page. */
export function SettingsSkeleton() {
  return (
    <div data-ocid="settings.loading_state" className="space-y-6">
      {SKELETON_IDS.map((id) => (
        <div
          key={id}
          className="overflow-hidden rounded-2xl border border-border bg-card shadow-subtle"
        >
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Skeleton className="h-9 w-9 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="space-y-4 px-5 py-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      ))}
    </div>
  );
}
