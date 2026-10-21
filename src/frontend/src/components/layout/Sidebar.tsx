import { ReportBugSection } from "@/components/settings/ReportBugSection";
import { useIsCallerAdmin } from "@/hooks/useQueries";
import { ADMIN_NAV_DESTINATION, NAV_DESTINATIONS } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

/** Desktop sidebar navigation. Active destination is tinted with the accent. */
export function Sidebar() {
  const { data: isAdmin } = useIsCallerAdmin();
  const destinations = isAdmin
    ? [...NAV_DESTINATIONS, ADMIN_NAV_DESTINATION]
    : NAV_DESTINATIONS;

  return (
    <aside
      data-ocid="nav.sidebar"
      className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex"
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <img
          src="/assets/generated/infinitygateway.dim_1920x1080.png"
          alt="ICP Portal"
          data-ocid="nav.brand_mark"
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-sidebar-border"
        />
        <span className="font-display text-lg font-semibold tracking-tight text-sidebar-foreground">
          ICP Portal
        </span>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-1 px-3 py-2">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          return (
            <Link
              key={destination.id}
              to={destination.to}
              data-ocid={`nav.sidebar_link.${destination.id}`}
              activeOptions={{ exact: destination.to === "/" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-smooth hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              activeProps={{
                className: cn(
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-subtle",
                ),
              }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {destination.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <ReportBugSection
          variant="menu"
          className="w-full justify-center bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
        />
      </div>
    </aside>
  );
}
