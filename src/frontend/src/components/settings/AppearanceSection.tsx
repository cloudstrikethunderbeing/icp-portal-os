import type { UserSettings } from "@/backend";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsSection";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useEffect } from "react";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const WALLPAPER_OPTIONS = [
  { value: false, label: "Off" },
  { value: true, label: "On" },
] as const;

/**
 * Apply the stored theme preference to the document root. `system` follows the
 * device's colour-scheme preference and reacts to changes while mounted.
 */
export function useAppliedTheme(theme: string) {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    return undefined;
  }, [theme]);
}

/** Appearance preference: light, dark or follow the system. */
export function AppearanceSection({
  settings,
  onUpdate,
  isSaving,
}: {
  settings: UserSettings;
  onUpdate: (next: UserSettings) => void;
  isSaving: boolean;
}) {
  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="Choose how the workspace looks on this device."
      icon={Palette}
    >
      <SettingsRow
        label="Theme"
        hint="System follows your device's light or dark setting."
      >
        <div
          data-ocid="settings.theme.toggle"
          aria-label="Theme preference"
          className="inline-flex rounded-full border border-border bg-muted p-1"
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = settings.theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                data-ocid={`settings.theme.${option.value}`}
                disabled={isSaving}
                onClick={() => onUpdate({ ...settings, theme: option.value })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  active
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsRow>

      <SettingsRow
        label="Wallpaper"
        hint="Show the Infinity Gateway artwork behind your workspace."
      >
        <div
          data-ocid="settings.wallpaper.toggle"
          aria-label="Wallpaper preference"
          className="inline-flex rounded-full border border-border bg-muted p-1"
        >
          {WALLPAPER_OPTIONS.map((option) => {
            const active = settings.wallpaperEnabled === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={active}
                data-ocid={`settings.wallpaper.${option.label.toLowerCase()}`}
                disabled={isSaving}
                onClick={() =>
                  onUpdate({ ...settings, wallpaperEnabled: option.value })
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
                  active
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.value && (
                  <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {option.label}
              </button>
            );
          })}
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
