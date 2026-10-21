import { StorageSection } from "@/backend";
import { cn } from "@/lib/utils";
import { CloudOff, HardDrive } from "lucide-react";

/**
 * Storage section switcher. Local Files is the working section; ICP Cloud is
 * clearly marked as not yet available rather than pretending to work.
 */
export function SectionTabs({
  section,
  onSectionChange,
}: {
  section: StorageSection;
  onSectionChange: (section: StorageSection) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Storage sections"
      data-ocid="files.section_tabs"
      className="flex flex-wrap items-center gap-2"
    >
      <SectionTab
        active={section === StorageSection.local}
        ocid="files.section_tab.local"
        onClick={() => onSectionChange(StorageSection.local)}
        icon={<HardDrive className="h-4 w-4" aria-hidden="true" />}
        label="Local Files"
      />
      <SectionTab
        active={section === StorageSection.icpCloud}
        ocid="files.section_tab.icp_cloud"
        onClick={() => onSectionChange(StorageSection.icpCloud)}
        icon={<CloudOff className="h-4 w-4" aria-hidden="true" />}
        label="ICP Cloud"
        badge="Not yet available"
      />
    </div>
  );
}

function SectionTab({
  active,
  ocid,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  ocid: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-ocid={ocid}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge && (
        <span className="rounded-full border border-warning/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
          {badge}
        </span>
      )}
    </button>
  );
}
