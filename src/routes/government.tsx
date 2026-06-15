import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Landmark,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Users,
  Layers,
  FileText,
  Download,
  Satellite,
  CloudRain,
  Map,
  Activity,
  Sprout,
  IndianRupee,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import {
  getAlerts,
  getSchemes,
  getDistrictRankings,
  getNearestSupportCenters,
  exportAprtgsMandalReport,
} from "@/lib/api";
import { DISTRICTS } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/government")({
  head: () => ({
    meta: [
      { title: "Government Dashboard · AgriShield AP" },
      {
        name: "description",
        content:
          "Executive dashboard for the Department of Agriculture, Government of Andhra Pradesh — Minister, Commissioner and cross-department KPIs.",
      },
    ],
  }),
  component: GovernmentDashboard,
});

/* ─── helpers ──────────────────────────────────────────────────────────────── */

type SyncStatus = "live" | "synced" | "degraded" | "offline";

function SyncBadge({ status }: { status: SyncStatus }) {
  const cfg = {
    live:     { label: "Live",     cls: "border-success/40 bg-success/10 text-success",       icon: <CheckCircle2 className="h-3 w-3" /> },
    synced:   { label: "Synced",   cls: "border-success/40 bg-success/10 text-success",       icon: <CheckCircle2 className="h-3 w-3" /> },
    degraded: { label: "Degraded", cls: "border-warning/40 bg-warning/10 text-warning",       icon: <AlertCircle className="h-3 w-3" /> },
    offline:  { label: "Offline",  cls: "border-destructive/30 bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3" /> },
  }[status];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "border-destructive/40 bg-destructive/10 text-destructive",
  High:     "border-warning/40 bg-warning/10 text-warning",
  Medium:   "border-info/40 bg-info/10 text-info",
  Low:      "border-border/60 bg-muted/20 text-muted-foreground",
};

/* ─── main component ───────────────────────────────────────────────────────── */

function GovernmentDashboard() {
  return (
    <div>
      <PageHeader
        icon={<Landmark className="h-6 w-6 text-accent" />}
        eyebrow="Department of Agriculture · GoAP"
        title="Executive Government Dashboard"
        description="Minister & Commissioner view — statewide crop health, active alerts, district rankings, government schemes and cross-department integration status."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* ── KPI Row ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Annual Outlay (Cr)"    value={12_450}     unit=""  trend={4.1}  confidence={98}  index={0} />
          <KpiCard label="Farmers Benefitted"    value={3_904_212}  unit=""  trend={2.6}  confidence={96}  index={1} />
          <KpiCard label="Crop Loss Averted (Cr)" value={1_864}     unit=""  trend={9.1}  confidence={92}  index={2} />
          <KpiCard label="Schemes Active"         value={47}         unit=""  trend={1.0}  confidence={100} index={3} />
        </div>

        {/* ── Platform Health Strip ───────────────────────────────────── */}
        <div className="glass rounded-xl p-4 border border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Platform Health & Coverage</span>
            </div>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success gap-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse inline-block" />
              All systems operational
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Satellite Coverage",   value: "99.2%",      icon: <Satellite className="h-4 w-4" />,   color: "text-success" },
              { label: "Parcels Monitored",    value: "19.3 Lakh",  icon: <Layers className="h-4 w-4" />,     color: "text-primary" },
              { label: "Active Stress Alerts", value: "12,847",     icon: <ShieldAlert className="h-4 w-4" />, color: "text-warning" },
              { label: "AI Confidence Avg",    value: "92.5%",      icon: <Activity className="h-4 w-4" />,    color: "text-accent" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border/40 bg-background/40 px-4 py-3 flex items-center gap-3">
                <span className={s.color}>{s.icon}</span>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Active Alerts + District Rankings ───────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <AlertsSection />
          <DistrictRankingsSection />
        </div>

        {/* ── Nearest Support Centers ──────────────────────────────────── */}
        <NearestSupportCentersSection />

        {/* ── Government Schemes ──────────────────────────────────────── */}
        <SchemesSection />

        {/* ── Cross-department Sync + APRTGS Export ───────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <CrossDeptSyncSection />
          <AprtgsExportSection />
        </div>
      </div>
    </div>
  );
}

/* ─── Active Alerts ─────────────────────────────────────────────────────────── */

function AlertsSection() {
  const { data: alerts, isLoading } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="font-semibold">Active Crop Alerts</h3>
        </div>
        <Link to="/surveillance">
          <Badge variant="outline" className="border-border/60 bg-background/60 text-xs cursor-pointer hover:bg-muted/40">
            View all →
          </Badge>
        </Link>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading alerts…</div>
      ) : (
        <div className="space-y-2">
          {(alerts ?? []).slice(0, 6).map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{a.type}</span>
                  <Badge variant="outline" className={`text-xs ${SEVERITY_COLOR[a.severity] ?? ""}`}>
                    {a.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.crop} · {a.district} · {a.time}
                </p>
                <p className="text-xs text-muted-foreground">{a.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── District Rankings ─────────────────────────────────────────────────────── */

function DistrictRankingsSection() {
  const { data: rankings, isLoading } = useQuery({ queryKey: ["district-rankings"], queryFn: getDistrictRankings });

  function riskColor(idx: number) {
    if (idx >= 80) return "text-destructive";
    if (idx >= 50) return "text-warning";
    return "text-success";
  }

  function healthBand(score: number) {
    if (score >= 80) return "text-success";
    if (score >= 65) return "text-warning";
    return "text-destructive";
  }

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">District Health Rankings</h3>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/60 text-xs">
          Kharif 2025
        </Badge>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading rankings…</div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-background/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">#</TableHead>
                <TableHead className="text-xs">District</TableHead>
                <TableHead className="text-xs text-right">Health</TableHead>
                <TableHead className="text-xs text-right">Alerts</TableHead>
                <TableHead className="text-xs text-right">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rankings ?? []).slice(0, 8).map((r) => (
                <TableRow key={r.district}>
                  <TableCell className="text-xs font-mono text-muted-foreground">{r.rank}</TableCell>
                  <TableCell className="text-sm font-medium">{r.district}</TableCell>
                  <TableCell className={`text-sm font-bold text-right ${healthBand(r.healthScore)}`}>
                    {r.healthScore.toFixed(1)}
                  </TableCell>
                  <TableCell className="text-xs text-right text-muted-foreground">
                    {r.alerts.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className={`text-sm font-bold text-right ${riskColor(r.riskIndex)}`}>
                    {r.riskIndex}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─── Nearest Support Centers ───────────────────────────────────────────────── */

function NearestSupportCentersSection() {
  const [district, setDistrict] = useState("");
  const [mandal, setMandal]     = useState("");

  const query = useQuery({
    queryKey: ["nearest-support-centers", district, mandal],
    queryFn:  () => getNearestSupportCenters({ district: district || undefined, mandal: mandal.trim() || undefined }),
  });

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" />
          <div>
            <h3 className="font-semibold">Nearest Support Centers</h3>
            <p className="text-xs text-muted-foreground">RSK / ATMA / Dept. Helpdesk contacts ranked by proximity</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_0.9fr] gap-3 mb-4">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">District</span>
          <select
            className="h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">All Districts</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Mandal (optional)</span>
          <input
            className="h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={mandal}
            placeholder="e.g., Eluru"
            onChange={(e) => setMandal(e.target.value)}
          />
        </label>
      </div>

      {query.isLoading ? (
        <div className="text-sm text-muted-foreground py-2">Loading support centers…</div>
      ) : query.error ? (
        <div className="text-sm text-destructive font-medium">Failed to load support centers.</div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-background/40 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Center</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>District / Mandal</TableHead>
                <TableHead>Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.address}</div>
                    {c.phone && <div className="text-xs mt-0.5">{c.phone}</div>}
                    {c.hours && <div className="text-xs text-muted-foreground">{c.hours}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border/60 bg-background/60 text-xs">{c.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{c.district} / {c.mandal ?? "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap font-mono">
                    {c.distance_km !== null ? `${c.distance_km.toFixed(1)} km` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─── Government Schemes ────────────────────────────────────────────────────── */

function SchemesSection() {
  const { data: schemes, isLoading } = useQuery({ queryKey: ["schemes"], queryFn: getSchemes });

  const tagColor: Record<string, string> = {
    Active: "border-success/40 bg-success/10 text-success",
    Open:   "border-primary/40 bg-primary/10 text-primary",
    Closed: "border-border/60 bg-muted/20 text-muted-foreground",
  };

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <IndianRupee className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Active Government Schemes</h3>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-2">Loading schemes…</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {(schemes ?? []).map((s) => (
            <div key={s.title} className="rounded-xl border border-border/40 bg-background/40 px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm">{s.title}</span>
                <Badge variant="outline" className={`text-xs shrink-0 ${tagColor[s.tag] ?? ""}`}>{s.tag}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cross-department Sync ─────────────────────────────────────────────────── */

function CrossDeptSyncSection() {
  const feeds: { label: string; dept: string; status: SyncStatus; note: string; icon: React.ReactNode }[] = [
    { label: "APRTGS",                    dept: "AP Real Time Governance Society",   status: "synced",   note: "Mandal surveillance reports synced", icon: <Activity className="h-3.5 w-3.5" /> },
    { label: "Revenue Dept – Land Records", dept: "Revenue & Stamps Department",     status: "synced",   note: "Patta & land parcel data current",   icon: <FileText className="h-3.5 w-3.5" /> },
    { label: "IMD Weather Feed",           dept: "India Meteorological Department",  status: "live",     note: "Live forecast data streaming",       icon: <CloudRain className="h-3.5 w-3.5" /> },
    { label: "NRSC Satellite Ingest",      dept: "Natl. Remote Sensing Centre",      status: "synced",   note: "99.2% AP coverage refreshed",        icon: <Satellite className="h-3.5 w-3.5" /> },
    { label: "PMFBY Insurance API",        dept: "Pradhan Mantri Fasal Bima Yojana", status: "degraded", note: "Partial outage — retrying",          icon: <Sprout className="h-3.5 w-3.5" /> },
    { label: "RSK Advisory Portal",        dept: "Rythu Seva Kendras",               status: "offline",  note: "Scheduled maintenance",              icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <Satellite className="h-4 w-4 text-accent" />
        <h3 className="font-semibold">Cross-Department Integration Status</h3>
      </div>
      <div className="space-y-2">
        {feeds.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-primary">{f.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground truncate">{f.dept} · {f.note}</p>
              </div>
            </div>
            <SyncBadge status={f.status} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── APRTGS Mandal Report Export ───────────────────────────────────────────── */

function AprtgsExportSection() {
  const [district, setDistrict] = useState<string>(DISTRICTS[0]);
  const [mandal,   setMandal]   = useState("Penukonda");
  const [report,   setReport]   = useState<Awaited<ReturnType<typeof exportAprtgsMandalReport>> | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await exportAprtgsMandalReport(district, mandal);
      setReport(r);
    } catch {
      setError("Failed to generate report. Check the district/mandal name and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-xl p-5 border border-border/60">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">APRTGS Mandal Report Export</h3>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end mb-4">
        <label className="grid gap-1 text-xs">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">District</span>
          <select
            className="h-9 rounded-lg border border-input bg-background/60 px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Mandal</span>
          <input
            className="h-9 rounded-lg border border-input bg-background/60 px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={mandal}
            placeholder="e.g., Penukonda"
            onChange={(e) => setMandal(e.target.value)}
          />
        </label>
        <button
          id="aprtgs-export-btn"
          onClick={fetchReport}
          disabled={loading || !mandal.trim()}
          className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          {loading ? "Generating…" : "Export"}
        </button>
      </div>

      {error && <p className="text-xs text-destructive mb-3">{error}</p>}

      {report && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary">{report.district} · {report.mandal}</span>
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-xs">Report Ready</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: "Total Parcels",        value: report.total_parcels.toLocaleString("en-IN") },
              { label: "Avg Health Index",     value: `${report.average_health_index.toFixed(1)} / 100` },
              { label: "Biotic Alerts",        value: report.active_biotic_alerts },
              { label: "Abiotic Alerts",       value: report.active_abiotic_alerts },
              { label: "Primary Outbreak",     value: report.primary_outbreak ?? "None" },
              { label: "Est. Yield Impact",    value: `${report.estimated_yield_impact_pct.toFixed(1)}%` },
            ].map((row) => (
              <div key={row.label} className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">{row.label}</p>
                <p className="font-semibold mt-0.5">{row.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Generated: {new Date(report.reporting_timestamp).toLocaleString("en-IN")}
          </p>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="rounded-lg border border-border/40 bg-background/30 px-4 py-6 text-center">
          <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a district and mandal, then click Export to generate an APRTGS surveillance report.</p>
        </div>
      )}
    </div>
  );
}
