import { LaunchTypeBadge } from "@/components/AppTile";
import type { HomeApp } from "@/components/home/types";
import { LAUNCH_TYPE_LABEL } from "@/lib/appRegistry";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** How long a touch must be held before the management menu opens. */
const LONG_PRESS_MS = 500;

/**
 * A single app or shortcut icon in the home grid. Supports pointer drag to
 * rearrange, a long-press (touch) or right-click (desktop) action menu, and
 * keyboard activation. Coming Soon apps are labelled and never open a fake
 * experience.
 */
export function AppIcon({
  app,
  index,
  onLaunch,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenMenu,
  isDragging,
  isDropTarget,
}: {
  app: HomeApp;
  index: number;
  onLaunch: (app: HomeApp) => void;
  onDragStart: (app: HomeApp) => void;
  onDragOver: (app: HomeApp) => void;
  onDrop: (app: HomeApp) => void;
  onOpenMenu: (app: HomeApp, x: number, y: number) => void;
  isDragging: boolean;
  isDropTarget: boolean;
}) {
  const Icon = app.icon;
  const isComingSoon = app.launchType === "coming-soon";
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startPress = (x: number, y: number) => {
    longPressedRef.current = false;
    originRef.current = { x, y };
    clearTimer();
    timerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      setPressing(false);
      onOpenMenu(app, x, y);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    clearTimer();
    originRef.current = null;
  };

  return (
    <div
      draggable={!isComingSoon}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(app.installedId));
        onDragStart(app);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(app);
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(app);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenMenu(app, event.clientX, event.clientY);
      }}
      className={cn(
        "group relative flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition-smooth",
        isDragging && "opacity-40",
        isDropTarget && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
    >
      <button
        type="button"
        data-ocid={`home.app_tile.${index + 1}`}
        aria-label={`${app.name} — ${LAUNCH_TYPE_LABEL[app.launchType]}`}
        disabled={isComingSoon}
        onClick={() => {
          // A long-press already opened the menu; swallow the trailing click.
          if (longPressedRef.current) {
            longPressedRef.current = false;
            return;
          }
          onLaunch(app);
        }}
        onPointerDown={(event) => {
          setPressing(true);
          if (event.pointerType === "touch") {
            startPress(event.clientX, event.clientY);
          }
        }}
        onPointerMove={(event) => {
          const origin = originRef.current;
          if (!origin) return;
          if (
            Math.abs(event.clientX - origin.x) > 10 ||
            Math.abs(event.clientY - origin.y) > 10
          ) {
            cancelPress();
          }
        }}
        onPointerUp={() => {
          setPressing(false);
          cancelPress();
        }}
        onPointerLeave={() => {
          setPressing(false);
          cancelPress();
        }}
        onPointerCancel={() => {
          setPressing(false);
          cancelPress();
        }}
        className={cn(
          "relative flex w-full flex-col items-center gap-1.5 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isComingSoon ? "cursor-not-allowed" : "active:scale-95",
        )}
      >
        <span
          className={cn(
            "app-tile relative flex h-16 w-16 items-center justify-center bg-gradient-to-br text-white transition-smooth md:h-[4.5rem] md:w-[4.5rem]",
            app.gradient,
            isComingSoon && "opacity-55 saturate-50",
            !isComingSoon &&
              "group-hover:scale-[1.04] group-hover:shadow-elevated",
            pressing && !isComingSoon && "scale-95",
          )}
        >
          <Icon className="h-7 w-7 md:h-8 md:w-8" aria-hidden="true" />
          {app.favourite && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card shadow-subtle">
              <Star
                className="h-3 w-3 fill-warning text-warning"
                aria-hidden="true"
              />
            </span>
          )}
        </span>
        <span className="w-full truncate text-center text-xs font-medium text-foreground">
          {app.name}
        </span>
        {isComingSoon ? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-warning">
            Soon
          </span>
        ) : (
          <LaunchTypeBadge launchType={app.launchType} />
        )}
      </button>
    </div>
  );
}
