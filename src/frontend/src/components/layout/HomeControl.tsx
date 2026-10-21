import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";

/**
 * Persistent Home control. Always visible in the shell chrome so the user can
 * return to the Home screen from any open app, on phone and desktop alike.
 */
export function HomeControl({ className }: { className?: string }) {
  return (
    <Link
      to={ROUTES.home}
      data-ocid="nav.home_button"
      aria-label="Return to Home"
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-smooth hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Home className="h-5 w-5" aria-hidden="true" />
    </Link>
  );
}
