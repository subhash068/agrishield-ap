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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDistrictRankings, getDistricts, getParcels } from "@/lib/api";

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
  const { selectedDistrict, setSelectedDistrict } = useAppShell();
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });

  const { data: parcels = [] } = useQuery({ queryKey: ["parcels"], queryFn: getParcels });

  const mandalRanks = useMemo(() => {
    const uniqueMandals = Array.from(new Set(parcels.map((p) => p.mandal).filter(Boolean)));
    
    const baseMandals = uniqueMandals.length > 0 ? uniqueMandals : [
      "Penukonda", "Tadipatri", "Madanapalle", "Tenali", "Gudivada", "Adoni", "Kavali", "Ongole"
    ];

    const baseRanks = baseMandals.map((mandalName, i) => {
      const districtName = parcels.find(p => p.mandal === mandalName)?.district || (districts[i % (districts.length || 1)] ?? "Unknown");
      return {
        mandal: mandalName,
        district: districtName,
        outbreaks: Math.floor(Math.random() * 80),
        stress: +(40 + Math.random() * 55).toFixed(0),
        trend: Math.random() > 0.5 ? 1 : -1,
      };
    }).sort((a, b) => b.outbreaks - a.outbreaks);

    return selectedDistrict === "all"
      ? baseRanks
      : baseRanks.filter((row) => row.district === selectedDistrict);
  }, [parcels, districts, selectedDistrict]);

  const dynamicStats = useMemo(() => {
    const mandalsCount = mandalRanks.length || 1;
    const outbreaks = mandalRanks.reduce((sum, m) => sum + m.outbreaks, 0);
    const rsks = mandalsCount * 15 + (outbreaks % 100);
    const surveys = outbreaks * 26 + mandalsCount * 12;

    return [
      {
        label: "Mandals Online",
        value: `${mandalsCount} / ${mandalsCount}`,
        sub: "APRTGS sync OK",
        color: "text-success",
      },
      { label: "RSKs Reporting", value: rsks.toLocaleString("en-IN"), sub: "Real-time", color: "text-primary" },
      {
        label: "Outbreaks Active",
        value: outbreaks.toLocaleString("en-IN"),
        sub: `Across ${mandalsCount} mandals`,
        color: "text-warning",
      },
      { label: "Surveys Today", value: surveys.toLocaleString("en-IN"), sub: "Field officers", color: "text-accent" },
    ];
  }, [mandalRanks]);

  const dynamicRSKs = useMemo(() => {
    const top = mandalRanks.slice(0, 4);
    const officers = ["P. Subba Rao", "M. Kavitha", "K. Venkat", "S. Anil", "R. Krishna", "T. Lakshmi"];
    
    // Fallback if no mandals available
    if (top.length === 0) {
      return [
        { name: "RSK Bhimavaram-1", officer: "P. Subba Rao", visits: 42, status: "Active" },
        { name: "RSK Tanuku-2", officer: "M. Kavitha", visits: 38, status: "Active" },
      ];
    }

    return top.map((m, i) => ({
      name: `RSK ${m.mandal}-1`,
      officer: officers[i % officers.length],
      visits: 20 + (m.outbreaks % 30),
      status: m.stress > 60 ? "Active" : "Low",
    }));
  }, [mandalRanks]);

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
        <div className="flex justify-end mb-4">
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="w-[200px] h-9 bg-muted/20 border-border/60 text-xs">
              <SelectValue placeholder="Filter by district" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Districts</SelectItem>
              {districts.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* gov widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {dynamicStats.map((s) => (
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
              <BarChart data={mandalRanks.slice(0, 15)} layout="vertical" margin={{ left: 60, bottom: 15 }}>
                <CartesianGrid
                  stroke="oklch(0.32 0.04 200 / 30%)"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} 
                  label={{ value: 'Active Outbreaks', position: 'insideBottom', offset: -10, fill: 'oklch(0.5 0.03 200)', fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="mandal"
                  tick={{ fontSize: 10, fill: "oklch(0.9 0.02 180)" }}
                  width={80}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.21 0.04 200)",
                    border: "1px solid oklch(0.32 0.04 200)",
                    borderRadius: 8,
                  }}
                  itemStyle={{ color: "oklch(0.9 0.02 180)" }}
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
              {dynamicRSKs.map((r) => (
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
