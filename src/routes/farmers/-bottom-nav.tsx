import { Link, useRouterState } from "@tanstack/react-router";
import { Leaf, Search, CloudSun, Bell, FileText, User2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppShell } from "@/components/app-shell-store";

const TRANSLATIONS = {
  en: {
    dashboard: "Dashboard",
    scan: "Scan",
    weather: "Weather",
    alerts: "Alerts",
    advisory: "Advisory",
    profile: "Profile",
  },
  te: {
    dashboard: "డ్యాష్‌బోర్డ్",
    scan: "స్కాన్",
    weather: "వాతావరణం",
    alerts: "హెచ్చరికలు",
    advisory: "సలహాలు",
    profile: "ప్రొఫైల్",
  }
};

export function FarmerBottomNav() {
  const mobile = useIsMobile();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { locale } = useAppShell();
  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  const nav = [
    { label: t.dashboard, url: "/farmers/dashboard", icon: Leaf },
    { label: t.scan, url: "/farmers/scan", icon: Search },
    { label: t.weather, url: "/farmers/weather", icon: CloudSun },
    { label: t.alerts, url: "/farmers/alerts", icon: Bell },
    { label: t.advisory, url: "/farmers/advisory", icon: FileText },
    { label: t.profile, url: "/farmers/profile", icon: User2 },
  ] as const;

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40 border-t border-border/60 bg-background/80 backdrop-blur">
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

