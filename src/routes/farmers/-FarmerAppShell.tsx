import { useMemo, useState, useEffect } from "react";

import { useNavigate, Outlet, useRouterState } from "@tanstack/react-router";

import { useIsMobile } from "@/hooks/use-mobile";
import { clearFarmerSession, getFarmerSession } from "@/lib/farmer-auth";

import { Button } from "@/components/ui/button";
import { FarmerBottomNav } from "@/routes/farmers/-bottom-nav";
import { Languages, Bell, ShieldAlert, CloudRain, Landmark, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAppShell } from "@/components/app-shell-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const TRANSLATIONS = {
  en: {
    title: "Farmer App",
    parcelId: "Parcel ID:",
    crop: "Crop",
    logout: "Logout",
    notifications: "Notifications & Alerts",
    noNotifications: "No new notifications",
    goBack: "Go back to Home",
  },
  te: {
    title: "రైతు యాప్",
    parcelId: "పొలం ID:",
    crop: "పంట",
    logout: "లాగ్అవుట్",
    notifications: "నోటిఫికేషన్‌లు & హెచ్చరికలు",
    noNotifications: "కొత్త నోటిఫికేషన్‌లు లేవు",
    goBack: "హోమ్‌కి తిరిగి వెళ్ళు",
  }
};

const NOTIFICATIONS = {
  en: [
    {
      id: "1",
      title: "Weather Alert",
      desc: "Heavy rain warning. Protect harvested Paddy crops in district fields.",
      time: "Today",
      category: "weather",
    },
    {
      id: "2",
      title: "Government Scheme",
      desc: "PM-KISAN Scheme: Installment credited. Check status for ₹2,000 subsidy.",
      time: "1 day ago",
      category: "scheme",
    },
    {
      id: "3",
      title: "Disease Alert",
      desc: "Advisory: High humidity increases Blast Risk. Monitor fields closely.",
      time: "2 days ago",
      category: "disease",
    },
    {
      id: "4",
      title: "Free Seed Distribution",
      desc: "High-yield seeds available at nearest Rythu Bharosa Kendra (RBK).",
      time: "3 days ago",
      category: "scheme",
    },
  ],
  te: [
    {
      id: "1",
      title: "వాతావరణ హెచ్చరిక",
      desc: "భారీ వర్ష సూచన. పొలాల్లో కోత కోసిన వరి పంటలను రక్షించండి.",
      time: "ఈరోజు",
      category: "weather",
    },
    {
      id: "2",
      title: "ప్రభుత్వ పథకం",
      desc: "పీఎం-కిసాన్ పథకం: విడత జమ చేయబడింది. ₹2,000 సబ్సిడీ కోసం స్థితిని తనిఖీ చేయండి.",
      time: "1 రోజు క్రితం",
      category: "scheme",
    },
    {
      id: "3",
      title: "తెగులు హెచ్చరిక",
      desc: "సలహా: అధిక తేమ బ్లాస్ట్ ప్రమాదాన్ని పెంచుతుంది. పంటలను నిశితంగా గమనించండి.",
      time: "2 రోజుల క్రితం",
      category: "disease",
    },
    {
      id: "4",
      title: "ఉచిత విత్తనాల పంపిణీ",
      desc: "సమీప రైతు భరోసా కేంద్రం (RBK) లో అధిక దిగుబడి విత్తనాలు అందుబాటులో ఉన్నాయి.",
      time: "3 రోజుల క్రితం",
      category: "scheme",
    },
  ],
};

// Farmer app shell: header + outlet + mobile bottom navigation.
export function FarmerAppShell() {
  const mobile = useIsMobile();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const { locale, toggleLocale } = useAppShell();

  const t = TRANSLATIONS[locale] || TRANSLATIONS.en;

  function toggleLanguage() {
    toggleLocale();
    toast.success(locale === "en" ? "Switched to Telugu mode." : "Switched to English mode.");
  }

  useEffect(() => {
    setProfile(getFarmerSession()?.profile ?? null);
    setMounted(true);

    const handler = () => setProfile(getFarmerSession()?.profile ?? null);
    window.addEventListener("farmer.session.changed", handler);

    return () => window.removeEventListener("farmer.session.changed", handler);
  }, []);

  const title = useMemo(() => {
    if (!profile) return t.title;
    return profile.farmerName ? `${profile.farmerName}` : t.title;
  }, [profile, t.title]);


  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-muted/10 flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  if (!profile) {
    const isAuthRoute =
      pathname.startsWith("/farmers/login") ||
      pathname.startsWith("/farmers/register") ||
      pathname.startsWith("/farmers/verify-otp");

    if (isAuthRoute) {
      return (
        <div className="min-h-[calc(100vh-3.5rem)]">
          <div className="px-4 pt-4 pb-24 max-w-xl mx-auto">
            <Outlet />
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-sm mx-auto">
        <p className="text-sm text-muted-foreground">Please login to continue.</p>

        <Button
          className="mt-4 w-full"
          onClick={() => {
            console.log('Farmer login clicked');
            navigate({ to: "/farmers/login" as any, replace: true });
          }}
        >
          Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/10">
      <div className="max-w-[430px] mx-auto min-h-[calc(100vh-3.5rem)] bg-background shadow-2xl relative border-x border-border/50">
        {/* Sticky Premium Top Navigation Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title={t.goBack}
              onClick={() => navigate({ to: "/" })}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs uppercase tracking-[0.16em] font-semibold text-muted-foreground">
              {t.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 relative"
                  title={t.notifications}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-4 rounded-2xl shadow-xl border border-border bg-background z-[100]" align="end">
                <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
                  <h4 className="font-bold text-sm">{t.notifications}</h4>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {(NOTIFICATIONS[locale as "en" | "te"] || NOTIFICATIONS.en).length} Active
                  </span>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {(NOTIFICATIONS[locale as "en" | "te"] || NOTIFICATIONS.en).map((n) => {
                    const Icon = n.category === "weather" ? CloudRain : n.category === "disease" ? ShieldAlert : Landmark;
                    const iconColor = n.category === "weather" ? "text-destructive" : n.category === "disease" ? "text-warning" : "text-primary";
                    const bgColor = n.category === "weather" ? "bg-destructive/10" : n.category === "disease" ? "bg-warning/10" : "bg-primary/10";
                    return (
                      <div key={n.id} className="flex gap-3 text-xs leading-normal hover:bg-muted/30 p-2 rounded-xl transition">
                        <div className={`h-8 w-8 rounded-lg ${bgColor} shrink-0 flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${iconColor}`} />
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center justify-between gap-2">
                            <span className="truncate">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground font-normal shrink-0">{n.time}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] break-words">{n.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Language"
              onClick={toggleLanguage}
            >
              <Languages className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => {
                clearFarmerSession();
                navigate({ to: "/farmers" as any, replace: true });
              }}
            >
              {t.logout}
            </Button>
          </div>
        </div>

        <div className="px-4 pt-4 pb-24">
          <Outlet />
        </div>

        <FarmerBottomNav />
      </div>
    </div>
  );
}

