import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { FarmerAppShell } from "@/routes/farmers/-FarmerAppShell";
import { isFarmerLoggedIn } from "@/lib/farmer-auth";

export const Route = createFileRoute("/farmers")({
  head: () => ({
    meta: [
      { title: "Farmer App · AgriShield AP" },
      {
        name: "description",
        content:
          "Farmer mobile app experience: login, parcel dashboard, disease scan, live weather, alerts, advisory, offline sync (mock).",
      },
    ],
  }),
  component: FarmerRoute,
});

function FarmerRoute() {
  return <FarmerAppShell />;
}






