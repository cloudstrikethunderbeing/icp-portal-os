import { BottomNav } from "@/components/layout/BottomNav";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { useWallpaperEnabled } from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * The shared app shell. One responsive architecture: a desktop sidebar plus a
 * mobile bottom navigation, a sticky top bar with a persistent Home control, and
 * a scrollable content region that clears the mobile navigation.
 *
 * When the signed-in user enables the wallpaper preference, the Infinity
 * Gateway artwork is layered behind the shell content; otherwise the plain
 * gradient background is used.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { data: wallpaperEnabled = false } = useWallpaperEnabled();

  return (
    <div className="relative flex min-h-dvh bg-background">
      {wallpaperEnabled && (
        <div
          data-ocid="app.wallpaper"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('/assets/generated/infinitygateway.dim_1920x1080.png')",
          }}
        />
      )}
      <div className="relative z-10 flex min-w-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main
            data-ocid="app.content"
            className={cn(
              "flex-1 pb-24 md:pb-8",
              wallpaperEnabled ? "bg-background/70" : "bg-gradient-subtle",
            )}
          >
            <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
          <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              caffeine.ai
            </a>
          </footer>
        </div>
        <BottomNav />
      </div>
      <InstallPrompt />
    </div>
  );
}
