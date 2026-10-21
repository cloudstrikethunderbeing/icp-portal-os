import { IconPicker } from "@/components/home/IconPicker";
import type { HomeApp } from "@/components/home/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeExternalUrl } from "@/hooks/useLaunchApp";
import {
  DEFAULT_SHORTCUT_COLOR,
  DEFAULT_SHORTCUT_ICON,
  getShortcutGradient,
  getShortcutIcon,
} from "@/lib/appRegistry";
import { cn } from "@/lib/utils";
import type { ShortcutColorKey, ShortcutIconKey } from "@/types";
import { useEffect, useState } from "react";

/** The values the editor submits for a new or edited shortcut. */
export interface ShortcutDraft {
  name: string;
  url: string;
  iconKey: ShortcutIconKey;
  colorKey: ShortcutColorKey;
}

/**
 * The add and edit surface for a personal shortcut or website link. Covers the
 * name, target address and icon, and works on both desktop and mobile. When
 * `shortcut` is provided the dialog edits it; otherwise it creates a new one.
 */
export function ShortcutEditor({
  shortcut,
  isPending,
  errorMessage,
  onSubmit,
  onClose,
}: {
  shortcut?: HomeApp;
  isPending: boolean;
  errorMessage?: string;
  onSubmit: (draft: ShortcutDraft) => void;
  onClose: () => void;
}) {
  const editing = shortcut !== undefined;
  const [name, setName] = useState(shortcut?.name ?? "");
  const [url, setUrl] = useState(shortcut?.href ?? "");
  const [iconKey, setIconKey] = useState<ShortcutIconKey>(
    (shortcut?.iconKey as ShortcutIconKey) ?? DEFAULT_SHORTCUT_ICON,
  );
  const [colorKey, setColorKey] = useState<ShortcutColorKey>(
    (shortcut?.colorKey as ShortcutColorKey) ?? DEFAULT_SHORTCUT_COLOR,
  );
  const [touched, setTouched] = useState(false);

  // Re-seed the draft when the editor is pointed at a different shortcut.
  useEffect(() => {
    setName(shortcut?.name ?? "");
    setUrl(shortcut?.href ?? "");
    setIconKey((shortcut?.iconKey as ShortcutIconKey) ?? DEFAULT_SHORTCUT_ICON);
    setColorKey(
      (shortcut?.colorKey as ShortcutColorKey) ?? DEFAULT_SHORTCUT_COLOR,
    );
    setTouched(false);
  }, [shortcut]);

  const trimmedName = name.trim();
  const normalizedUrl = normalizeExternalUrl(url);
  const nameError = touched && trimmedName.length === 0;
  const urlError = touched && url.trim().length > 0 && normalizedUrl === null;
  const canSubmit =
    trimmedName.length > 0 && normalizedUrl !== null && !isPending;

  const PreviewIcon = getShortcutIcon(iconKey);

  const submit = () => {
    setTouched(true);
    if (!canSubmit || normalizedUrl === null) return;
    onSubmit({ name: trimmedName, url: normalizedUrl, iconKey, colorKey });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-ocid="shortcut.editor"
        className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl border-border surface-raised p-5 shadow-floating"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-semibold text-foreground">
            {editing ? "Edit shortcut" : "New shortcut"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {editing
              ? "Update the name, address or icon of this shortcut."
              : "Add a website link to your home screen."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <span
              className={cn(
                "app-tile flex h-12 w-12 shrink-0 items-center justify-center bg-gradient-to-br text-white",
                getShortcutGradient(colorKey),
              )}
            >
              <PreviewIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {trimmedName.length > 0 ? trimmedName : "Shortcut name"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {normalizedUrl ?? "https://example.com"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortcut-name">Name</Label>
            <Input
              id="shortcut-name"
              data-ocid="shortcut.name_input"
              value={name}
              maxLength={40}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={nameError}
              placeholder="My website"
            />
            {nameError && (
              <p
                data-ocid="shortcut.name_error"
                className="text-xs text-destructive"
              >
                Enter a name for this shortcut.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortcut-url">Address</Label>
            <Input
              id="shortcut-url"
              data-ocid="shortcut.url_input"
              value={url}
              inputMode="url"
              autoComplete="off"
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={urlError}
              placeholder="https://example.com"
            />
            {urlError && (
              <p
                data-ocid="shortcut.url_error"
                className="text-xs text-destructive"
              >
                Enter a valid http or https address.
              </p>
            )}
          </div>

          <IconPicker
            iconKey={iconKey}
            colorKey={colorKey}
            onSelect={(nextIcon, nextColor) => {
              setIconKey(nextIcon);
              setColorKey(nextColor);
            }}
          />

          {errorMessage && (
            <p
              data-ocid="shortcut.submit_error"
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              data-ocid="shortcut.cancel_button"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-ocid="shortcut.save_button"
              disabled={!canSubmit}
            >
              {isPending
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : "Add shortcut"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
