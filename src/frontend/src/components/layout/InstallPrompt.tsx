import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Share, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Platform-specific "add to home screen" guidance. The steps differ enough
 * between iOS, Android and desktop that the prompt shows only the instructions
 * that match the visitor's device.
 */
type Platform = "ios" | "android" | "desktop";

const STORAGE_PREFIX = "icp-portal.install-prompt.dismissed";

/** Detect the visitor's platform from the user agent and touch capability. */
function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const isIpadOs =
    /Macintosh/.test(ua) &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || isIpadOs) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** Whether the app is already running as an installed home-screen app. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean })
    .standalone;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    iosStandalone === true
  );
}

const PLATFORM_COPY: Record<
  Platform,
  { title: string; intro: string; steps: string[] }
> = {
  ios: {
    title: "Add ICP Portal to your Home Screen",
    intro: "Open it like any other app, full screen and one tap away.",
    steps: [
      "Tap the Share button in Safari's toolbar.",
      "Scroll down and choose “Add to Home Screen”.",
      "Tap “Add” in the top corner to finish.",
    ],
  },
  android: {
    title: "Install ICP Portal on your device",
    intro: "Launch it from your home screen without opening the browser.",
    steps: [
      "Open the browser menu (⋮) in the top corner.",
      "Choose “Install app” or “Add to Home screen”.",
      "Confirm to place the icon on your home screen.",
    ],
  },
  desktop: {
    title: "Install ICP Portal on your desktop",
    intro: "Keep it in your dock or taskbar and open it in its own window.",
    steps: [
      "Look for the install icon in your browser's address bar.",
      "Or open the browser menu and choose “Install ICP Portal”.",
      "Confirm to add it to your applications.",
    ],
  },
};

/**
 * A dismissible prompt that guides the visitor through saving ICP Portal to
 * their home screen as an app icon. The dismissal is remembered per signed-in
 * principal (and for signed-out visitors) so the prompt does not reappear once
 * the choice is made. It never shows when the app already runs standalone.
 */
export function InstallPrompt() {
  const { identity } = useInternetIdentity();
  const principal =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal().toText()
      : "anonymous";

  const storageKey = `${STORAGE_PREFIX}.${principal}`;
  const [platform] = useState<Platform>(() => detectPlatform());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (window.localStorage.getItem(storageKey) === "true") return;
    } catch {
      // Storage can be unavailable (private mode); fall through and show once.
    }
    setVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage failures — the prompt still hides for this session.
    }
    setVisible(false);
  };

  if (!visible) return null;

  const copy = PLATFORM_COPY[platform];

  return (
    <aside
      data-ocid="install_prompt.panel"
      aria-label="Install ICP Portal"
      className="surface-sheet fixed inset-x-3 bottom-24 z-50 rounded-2xl border border-border p-4 shadow-elevated md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      <div className="flex items-start gap-3">
        <span className="app-tile flex h-11 w-11 shrink-0 items-center justify-center bg-gradient-primary text-primary-foreground">
          {platform === "ios" ? (
            <Share className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-sm font-semibold tracking-tight text-foreground">
            {copy.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.intro}</p>
        </div>
        <button
          type="button"
          data-ocid="install_prompt.close_button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-quick hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <ol className="mt-3 space-y-1.5">
        {copy.steps.map((step, index) => (
          <li
            key={step}
            className="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          data-ocid="install_prompt.dismiss_button"
          onClick={dismiss}
          className="rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground transition-smooth hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Got it
        </button>
      </div>
    </aside>
  );
}
