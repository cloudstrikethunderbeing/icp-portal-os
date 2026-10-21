import type { UserSettings } from "@/backend";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal } from "lucide-react";
import { useEffect } from "react";

const GRID_SIZE_OPTIONS = [
  { value: "4", label: "Compact — 4 columns" },
  { value: "5", label: "Comfortable — 5 columns" },
  { value: "6", label: "Spacious — 6 columns" },
] as const;

/**
 * Apply the reduce-motion preference to the document root so the whole shell
 * honours it, not just this page.
 */
export function useAppliedMotion(reduceMotion: boolean) {
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);
}

/** Workspace preferences: home grid density and motion. */
export function WorkspacePreferencesSection({
  settings,
  onUpdate,
  isSaving,
}: {
  settings: UserSettings;
  onUpdate: (next: UserSettings) => void;
  isSaving: boolean;
}) {
  const gridSize = settings.gridSize.toString();

  return (
    <SettingsSection
      id="workspace"
      title="Workspace preferences"
      description="Tune the home screen and motion to your liking."
      icon={SlidersHorizontal}
    >
      <SettingsRow
        label="Home grid size"
        hint="How many app columns the home screen shows on larger screens."
        htmlFor="settings-grid-size"
      >
        <Select
          value={gridSize}
          disabled={isSaving}
          onValueChange={(value) =>
            onUpdate({ ...settings, gridSize: BigInt(value) })
          }
        >
          <SelectTrigger
            id="settings-grid-size"
            data-ocid="settings.grid_size.select"
            className="w-full rounded-xl sm:w-56"
          >
            <SelectValue placeholder="Choose grid size" />
          </SelectTrigger>
          <SelectContent>
            {GRID_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        label="Reduce motion"
        hint="Minimise animations and transitions across the workspace."
        htmlFor="settings-reduce-motion"
      >
        <div className="flex justify-end">
          <Switch
            id="settings-reduce-motion"
            data-ocid="settings.reduce_motion.switch"
            checked={settings.reduceMotion}
            disabled={isSaving}
            onCheckedChange={(checked) =>
              onUpdate({ ...settings, reduceMotion: checked })
            }
          />
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
