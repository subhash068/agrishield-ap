import { useMemo, useState, useEffect } from "react";

import { useNavigate, Outlet, useRouterState } from "@tanstack/react-router";

import { useIsMobile } from "@/hooks/use-mobile";
import { clearFarmerSession, getFarmerSession } from "@/lib/farmer-auth";

import { Button } from "@/components/ui/button";
import { FarmerBottomNav } from "@/routes/farmers/-bottom-nav";

// Farmer app shell: header + outlet + mobile bottom navigation.
export function FarmerAppShell() {
  const mobile = useIsMobile();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() => getFarmerSession()?.profile ?? null);

  useEffect(() => {
    const handler = () => setProfile(getFarmerSession()?.profile ?? null);
    window.addEventListener("farmer.session.changed", handler);

    // Re-check on mount to avoid stale initial state when navigating back/forth.
    handler();

    return () => window.removeEventListener("farmer.session.changed", handler);
  }, []);

  const title = useMemo(() => {
    if (!profile) return "Farmer App";
    return profile.farmerName ? `${profile.farmerName}` : "Farmer App";
  }, [profile]);


  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="px-4 pt-4 pb-24 max-w-xl mx-auto">
        <Outlet />

        <div className="mt-4 rounded-2xl border border-border/60 bg-background/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Farmer App</div>
              <h1 className="mt-1 text-lg font-bold">{title}</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Parcel ID:{" "}
                <span className="font-semibold text-primary">{profile.parcelId}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">Crop</div>
                <div className="text-sm font-semibold">{profile.cropType}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => {
                  clearFarmerSession();
                  navigate({ to: "/farmers" as any, replace: true });
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {mobile ? <FarmerBottomNav /> : <div className="h-4" />}
    </div>
  );
}

