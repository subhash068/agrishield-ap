import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, Search, CloudSun, Bell, FileText, User2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const nav = [
  { label: "Dashboard", url: "/farmers/dashboard", icon: Leaf },
  { label: "Scan", url: "/farmers/scan", icon: Search },
  { label: "Weather", url: "/farmers/weather", icon: CloudSun },
  { label: "Alerts", url: "/farmers/alerts", icon: Bell },
  { label: "Advisory", url: "/farmers/advisory", icon: FileText },
  { label: "Profile", url: "/farmers/profile", icon: User2 },
] as const;

export function FarmerBottomNav() {
  const mobile = useIsMobile();
  const path = useRouterState({ select: (r) => r.location.pathname });

  if (!mobile) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur">
      <div className="grid grid-cols-6">
        {nav.map((item) => {
          const active = path === item.url || path.startsWith(item.url);
          const Icon = item.icon;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={
                "py-2 text-center text-[10px] transition " +
                (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
              }
            >
              <div className="mx-auto">
                <Icon className={`h-4 w-4 mx-auto ${active ? "text-primary" : ""}`} />
              </div>
              <div className="mt-1">{item.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

