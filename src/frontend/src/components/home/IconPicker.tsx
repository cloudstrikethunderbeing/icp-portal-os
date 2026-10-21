import {
  SHORTCUT_COLORS,
  SHORTCUT_COLOR_KEYS,
  SHORTCUT_ICONS,
  SHORTCUT_ICON_KEYS,
} from "@/lib/appRegistry";
import { cn } from "@/lib/utils";
import type { ShortcutColorKey, ShortcutIconKey } from "@/types";

/**
 * A built-in icon picker for a personal shortcut or link. Offers a curated set
 * of icon keys and colour keys; the chosen icon key is persisted on the backend
 * and the colour key is derived from it. Works with touch and keyboard.
 */
export function IconPicker({
  iconKey,
  colorKey,
  onSelect,
}: {
  iconKey: ShortcutIconKey;
  colorKey: ShortcutColorKey;
  onSelect: (iconKey: ShortcutIconKey, colorKey: ShortcutColorKey) => void;
}) {
  return (
    <div data-ocid="shortcut.icon_picker" className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Icon
        </p>
        <div
          aria-label="Shortcut icon"
          className="grid grid-cols-6 gap-2 sm:grid-cols-9"
        >
          {SHORTCUT_ICON_KEYS.map((key) => {
            const Icon = SHORTCUT_ICONS[key];
            const selected = key === iconKey;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                aria-label={`Icon ${key}`}
                data-ocid={`shortcut.icon_option.${key}`}
                onClick={() => onSelect(key, colorKey)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Colour
        </p>
        <div
          role="radiogroup"
          aria-label="Shortcut colour"
          className="flex flex-wrap gap-2"
        >
          {SHORTCUT_COLOR_KEYS.map((key) => {
            const selected = key === colorKey;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Colour ${key}`}
                data-ocid={`shortcut.color_option.${key}`}
                onClick={() => onSelect(iconKey, key)}
                className={cn(
                  "h-9 w-9 rounded-full bg-gradient-to-br transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  SHORTCUT_COLORS[key],
                  selected
                    ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    : "hover:scale-105",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
