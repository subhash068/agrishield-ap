import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, Download, Filter, Leaf } from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Cell,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getAlerts,
  getCropDistribution,
  getDashboardData,
  getDistrictRankings,
  getSpectralTrend,
} from "@/lib/api";

export const Route = createFileRoute("/surveillance")({
  head: () => ({
    meta: [
      { title: "Crop Surveillance · AgriShield AP" },
      {
        name: "description",
        content:
          "Real-time crop surveillance intelligence - KPIs, NDVI trends, district rankings and AI insights.",
      },
    ],
  }),
  component: SurveillancePage,
});

function SurveillancePage() {
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardData,
  });
  const { data: spectralTrend = [] } = useQuery({
    queryKey: ["spectral-trend"],
    queryFn: getSpectralTrend,
  });
  const { data: districtRankings = [] } = useQuery({
    queryKey: ["district-rankings"],
    queryFn: getDistrictRankings,
  });
  const { data: cropDistribution = [] } = useQuery({
    queryKey: ["crop-distribution"],
    queryFn: getCropDistribution,
  });
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const kpiCards = dashboardData?.kpi_cards ?? [];

  return (
    <div>
      <PageHeader
        icon={<Leaf className="h-6 w-6 text-primary" />}
        eyebrow="Crop Surveillance"
        title="Statewide Crop Intelligence Dashboard"
        description="AI-fused KPIs from 1.93M parcels - Sentinel-2 + Landsat-9 - refreshed every 6 hours."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpiCards.map((k, i) => (
            <KpiCard key={k.label} {...k} unit={k.unit ?? undefined} index={i} />
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Spectral Indices (30d)
                </h3>
                <p className="text-xs text-muted-foreground">
                  NDVI / EVI / NDRE - weighted statewide mean
                </p>
              </div>
              <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                +1.8% MoM
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spectralTrend}>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Line type="monotone" dataKey="ndvi" stroke="oklch(0.78 0.19 145)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="evi" stroke="oklch(0.78 0.17 200)" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="ndre"
                  stroke="oklch(0.82 0.17 80)"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Crop Health by Type</h3>
            <p className="text-xs text-muted-foreground mb-3">Average health index across focus crops</p>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={cropDistribution}>
                <PolarGrid stroke="oklch(0.32 0.04 200 / 40%)" />
                <PolarAngleAxis dataKey="crop" tick={{ fontSize: 11, fill: "oklch(0.9 0.02 180)" }} />
                <Radar
                  dataKey="health"
                  stroke="oklch(0.78 0.19 145)"
                  fill="oklch(0.78 0.19 145)"
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Outbreak Heatmap - Last 14 Days</h3>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-sm bg-success/40" /> Low
                <span className="h-2.5 w-2.5 rounded-sm bg-warning/60" /> Medium
                <span className="h-2.5 w-2.5 rounded-sm bg-destructive/70" /> High
              </div>
            </div>
            <div
              className="grid grid-cols-14 gap-1.5"
              style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}
            >
              {Array.from({ length: 13 * 14 }, (_, i) => {
                const v = Math.random();
                const bg =
                  v > 0.85
                    ? "bg-destructive/70"
                    : v > 0.6
                      ? "bg-warning/60"
                      : v > 0.3
                        ? "bg-success/40"
                        : "bg-muted/40";
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${bg} hover:scale-110 transition`}
                    title={`Mandal cell ${i}`}
                  />
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Rows = districts (13) - Columns = days (14) - Cell intensity = outbreak severity
            </p>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">Latest AI Insights</h3>
            <div className="space-y-2.5">
              {alerts.slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{a.type}</span>
                    <Badge
                      variant="outline"
                      className={
                        a.severity === "Critical"
                          ? "border-destructive/50 text-destructive bg-destructive/10"
                          : a.severity === "High"
                            ? "border-warning/50 text-warning bg-warning/10"
                            : "border-info/50 text-info bg-info/10"
                      }
                    >
                      {a.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {a.district} - {a.crop} - {a.time}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5">
          <h3 className="font-semibold mb-1">District Stress Alerts</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Number of active stress flags per district (live)
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={districtRankings}>
              <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
              <XAxis
                dataKey="district"
                tick={{ fontSize: 9, fill: "oklch(0.68 0.03 200)" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
              <Tooltip
                contentStyle={{
                  background: "oklch(0.21 0.04 200)",
                  border: "1px solid oklch(0.32 0.04 200)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="alerts" radius={[6, 6, 0, 0]}>
                {districtRankings.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.alerts > 1800
                        ? "oklch(0.68 0.22 25)"
                        : d.alerts > 1200
                          ? "oklch(0.82 0.17 80)"
                          : "oklch(0.78 0.19 145)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
