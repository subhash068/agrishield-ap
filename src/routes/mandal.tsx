import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Treemap,
} from "recharts";

import { useAppShell } from "@/components/app-shell-store";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getDistrictRankings, getDistricts } from "@/lib/api";

export const Route = createFileRoute("/mandal")({
  head: () => ({
    meta: [
      { title: "Mandal Surveillance · AgriShield AP" },
      {
        name: "description",
        content:
          "Government-level surveillance dashboard: mandal-wise outbreaks, ranks and RSK monitoring.",
      },
    ],
  }),
  component: MandalPage,
});

function MandalPage() {
  const { data: districtRankings = [] } = useQuery({
    queryKey: ["district-rankings"],
    queryFn: getDistrictRankings,
  });
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const { selectedDistrict } = useAppShell();

  const mandalRanks = useMemo(() => {
    const baseRanks = Array.from({ length: 18 }, (_, i) => ({
      mandal: [
        "Penukonda",
        "Tadipatri",
        "Madanapalle",
        "Tenali",
        "Gudivada",
        "Adoni",
        "Kavali",
        "Ongole",
        "Bapatla",
        "Chirala",
        "Markapur",
        "Kanigiri",
        "Atmakur",
        "Rajampet",
        "Pulivendula",
        "Proddatur",
        "Yemmiganur",
        "Nandyal",
      ][i],
      district: districts[i % (districts.length || 1)] ?? "Unknown",
      outbreaks: Math.floor(Math.random() * 80),
      stress: +(40 + Math.random() * 55).toFixed(0),
      trend: Math.random() > 0.5 ? 1 : -1,
    })).sort((a, b) => b.outbreaks - a.outbreaks);

    return selectedDistrict === "all"
      ? baseRanks
      : baseRanks.filter((row) => row.district === selectedDistrict);
  }, [districts, selectedDistrict]);

  const tree = useMemo(
    () =>
      (selectedDistrict === "all"
        ? districts
        : districts.filter((district) => district === selectedDistrict)
      ).map((district) => ({
        name: district,
        size: 50_000 + Math.floor(Math.random() * 250_000),
      })),
    [districts, selectedDistrict],
  );
  return (
    <div>
      <PageHeader
        icon={<ShieldAlert className="h-6 w-6 text-warning" />}
        eyebrow="Government Surveillance"
        title="Mandal Surveillance Dashboard"
        description="District ↔ mandal monitoring · APRTGS sync · RSK status · outbreak hotspot analysis."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* gov widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Mandals Online",
              value: "679 / 679",
              sub: "APRTGS sync OK",
              color: "text-success",
            },
            { label: "RSKs Reporting", value: "10,634", sub: "Real-time", color: "text-primary" },
            {
              label: "Outbreaks Active",
              value: "318",
              sub: "Across 47 mandals",
              color: "text-warning",
            },
            { label: "Surveys Today", value: "8,420", sub: "Field officers", color: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* mandal ranking + treemap */}
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">Top Mandals by Outbreak Severity</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Real-time ranking · live AI surveillance
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={mandalRanks} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid
                  stroke="oklch(0.32 0.04 200 / 30%)"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis
                  type="category"
                  dataKey="mandal"
                  tick={{ fontSize: 10, fill: "oklch(0.9 0.02 180)" }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="outbreaks" radius={[0, 6, 6, 0]}>
                  {mandalRanks.map((m, i) => (
                    <Cell
                      key={i}
                      fill={
                        m.outbreaks > 60
                          ? "oklch(0.68 0.22 25)"
                          : m.outbreaks > 30
                            ? "oklch(0.82 0.17 80)"
                            : "oklch(0.78 0.19 145)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-1">District Monitoring Footprint</h3>
            <p className="text-xs text-muted-foreground mb-3">Parcels under active surveillance</p>
            <ResponsiveContainer width="100%" height={360}>
              <Treemap
                data={tree}
                dataKey="size"
                stroke="oklch(0.16 0.03 200)"
                fill="oklch(0.78 0.19 145)"
              />
            </ResponsiveContainer>
          </div>
        </div>

        {/* RSK cards + district table */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold mb-3">RSK Monitoring</h3>
            <div className="space-y-2.5">
              {[
                { name: "RSK Vijayawada-3", officer: "P. Subba Rao", visits: 42, status: "Active" },
                { name: "RSK Anantapur-1", officer: "M. Kavitha", visits: 38, status: "Active" },
                { name: "RSK Tirupati-2", officer: "K. Venkat", visits: 12, status: "Low" },
                { name: "RSK Kurnool-5", officer: "S. Anil", visits: 51, status: "Active" },
              ].map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{r.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Officer · {r.officer} · {r.visits} visits today
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "Active"
                        ? "border-success/40 text-success bg-success/10"
                        : "border-warning/40 text-warning bg-warning/10"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5 overflow-hidden">
            <h3 className="font-semibold mb-3">District Health Index</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/60">
                    <th className="py-2">#</th>
                    <th>District</th>
                    <th className="text-right">Health</th>
                    <th className="text-right">Alerts</th>
                    <th className="text-right">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {districtRankings.slice(0, 10).map((d) => (
                    <tr key={d.district}>
                      <td className="py-2 text-muted-foreground">{d.rank}</td>
                      <td className="font-medium">{d.district}</td>
                      <td className="text-right tabular-nums">{d.healthScore}%</td>
                      <td className="text-right tabular-nums">
                        {d.alerts.toLocaleString("en-IN")}
                      </td>
                      <td className="text-right">
                        {d.riskIndex > 50 ? (
                          <span className="inline-flex items-center gap-0.5 text-destructive">
                            <TrendingUp className="h-3 w-3" />
                            {d.riskIndex}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-success">
                            <TrendingDown className="h-3 w-3" />
                            {d.riskIndex}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
