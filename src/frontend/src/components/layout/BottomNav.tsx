import { useIsCallerAdmin } from "@/hooks/useQueries";
import { ADMIN_NAV_DESTINATION, NAV_DESTINATIONS } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

/**
 * Mobile bottom navigation with safe-area handling. Mirrors the desktop sidebar
 * so both form factors share one navigation architecture. The admin bug report
 * inbox appears only for a caller holding the admin role.
 */
export function BottomNav() {
  const { data: isAdmin } = useIsCallerAdmin();
  const destinations = isAdmin
    ? [...NAV_DESTINATIONS, ADMIN_NAV_DESTINATION]
    : NAV_DESTINATIONS;

  return (
    <nav
      data-ocid="nav.bottom"
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border surface-raised md:hidden"
    >
      <ul className="flex items-stretch justify-around px-1 pt-1">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          return (
            <li key={destination.id} className="flex-1">
              <Link
                to={destination.to}
                data-ocid={`nav.bottom_link.${destination.id}`}
                activeOptions={{ exact: destination.to === "/" }}
                className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{
                  className: cn("text-primary"),
                }}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{destination.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
