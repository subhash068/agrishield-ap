import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Satellite, Activity, AlertTriangle, ArrowRight, MapPin, Sparkles,
  Radio, ShieldCheck, Leaf, CloudRain, Bug, TrendingUp, Target, FileText, BrainCircuit,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTicker } from "@/components/alert-ticker";
import { getAlerts, getCropDistribution, getDashboardData, getDistrictRankings, getSchemes } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AgriShield AP — Command Center" },
      { name: "description", content: "Real-time AI agriculture intelligence for Andhra Pradesh: 4.2M+ farmers, 1.9M+ parcels, satellite-grade crop surveillance." },
      { property: "og:title", content: "AgriShield AP — Command Center" },
      { property: "og:description", content: "Real-time AI agriculture intelligence for Andhra Pradesh." },
    ],
  }),
  component: HomePage,
});

const COLORS = ["oklch(0.78 0.19 145)", "oklch(0.78 0.17 200)", "oklch(0.82 0.17 80)", "oklch(0.68 0.22 25)", "oklch(0.7 0.2 290)"];

const projectNarrative = [
  {
    icon: AlertTriangle,
    title: "Main Problem",
    body: "Farmers usually notice crop problems only after visible damage has already begun. By that stage, pest attacks spread faster, diseases become harder to control, yield losses increase, and recovery costs rise.",
  },
  {
    icon: Target,
    title: "Project Objective",
    body: "Build an intelligent monitoring platform that detects crop stress early, predicts risk proactively, alerts farmers automatically, and helps officers monitor large areas efficiently.",
  },
  {
    icon: FileText,
    title: "Executive Summary",
    body: "The platform combines satellite imagery, weather intelligence, AI disease detection, and smartphone crop photos to monitor paddy, cotton, chilli, red gram, and maize across Andhra Pradesh.",
  },
];

const projectOutcomes = [
  "Early stress detection before visible damage",
  "Proactive pest and disease risk prediction",
  "Automated alerts for farmers and field officers",
  "Large-area monitoring with parcel and mandal views",
];

function HomePage() {
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: getDashboardData,
  });
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: getAlerts,
  });
  const { data: schemes = [] } = useQuery({
    queryKey: ["schemes"],
    queryFn: getSchemes,
  });
  const { data: cropDistribution = [] } = useQuery({
    queryKey: ["crop-distribution"],
    queryFn: getCropDistribution,
  });
  const { data: districtRankings = [] } = useQuery({
    queryKey: ["district-rankings"],
    queryFn: getDistrictRankings,
  });

  const heroStats = dashboardData?.hero_stats ?? [];
  const spectralTrend = dashboardData?.spectral_trend ?? [];
  const tickerItems = dashboardData?.ticker_items ?? [];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute inset-0" style={{ background: "var(--gradient-glow)" }} />

        {/* satellite pulses */}
        {[...Array(4)].map((_, i) => (
          <div key={i}
            className="absolute h-2 w-2 rounded-full bg-primary pulse-ring"
            style={{ left: `${15 + i * 22}%`, top: `${30 + (i % 2) * 30}%`, animationDelay: `${i * 0.4}s` }} />
        ))}

        <div className="relative px-6 lg:px-10 pt-10 pb-8">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary gap-1.5">
              <Radio className="h-3 w-3 animate-pulse" /> LIVE · Sentinel-2 sync 99.2%
            </Badge>
            <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Govt. of Andhra Pradesh · Dept. of Agriculture
            </Badge>
          </div>

          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-end">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="text-4xl lg:text-6xl font-bold tracking-tight leading-[1.05]"
              >
                AI Agriculture Intelligence<br />
                for <span className="gradient-text">Andhra Pradesh</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }}
                className="mt-4 text-base lg:text-lg text-muted-foreground max-w-2xl"
              >
                Parcel-level satellite surveillance, disease intelligence and farmer advisory —
                fused into one command center for 4.2 million farmers across 679 mandals.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
                className="mt-6 flex flex-wrap gap-2"
              >
                <Button asChild size="lg" className="gap-2 glow-primary">
                  <Link to="/surveillance"><Activity className="h-4 w-4" /> Open Surveillance Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 border-accent/40 hover:bg-accent/10">
                  <Link to="/satellite"><Satellite className="h-4 w-4" /> Launch GIS Console</Link>
                </Button>
              </motion.div>
            </div>

            {/* satellite ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, duration: 0.6 }}
              className="hidden lg:flex justify-end"
            >
              <div className="relative h-64 w-64">
                {[1, 2, 3].map(r => (
                  <div key={r} className="absolute inset-0 rounded-full border border-primary/30"
                    style={{ transform: `scale(${0.5 + r * 0.2})`, animation: `spin ${20 + r * 10}s linear infinite` }} />
                ))}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center glow-primary">
                    <Satellite className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
                <div className="absolute top-2 right-12 h-3 w-3 rounded-full bg-accent pulse-ring" />
                <div className="absolute bottom-6 left-4 h-3 w-3 rounded-full bg-warning pulse-ring" style={{ animationDelay: "0.6s" }} />
              </div>
            </motion.div>
          </div>

          {/* hero stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {heroStats.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05 }}
                className="glass rounded-xl p-3.5"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-xl lg:text-2xl font-bold tabular-nums">{s.value.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-success mt-0.5">{s.delta}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <AlertTicker items={tickerItems} />

      {/* CONTENT */}
      <section className="px-6 lg:px-10 py-8 space-y-8">
        {/* project narrative */}
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-xl p-6 border border-border/60"
          >
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Project Narrative
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight">
              Early warning crop intelligence for the Agriculture Department
            </h2>
            <p className="mt-3 text-sm lg:text-base text-muted-foreground max-w-3xl">
              This platform is designed to help Andhra Pradesh move from reactive crop recovery to proactive crop protection.
              It combines remote sensing, AI, and field-friendly advisories so stress can be identified before losses become severe.
            </p>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              {projectNarrative.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-lg border border-border/60 bg-muted/20 p-4"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-3 font-semibold text-sm">{item.title}</h3>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="glass rounded-xl p-6 border border-border/60"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Desired Outcomes
              </span>
            </div>
            <div className="space-y-3">
              {projectOutcomes.map((item, i) => (
                <div key={item} className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full bg-success/15 text-success grid place-items-center text-[11px] font-bold">
                    {i + 1}
                  </div>
                  <p className="text-sm text-foreground/90 leading-6">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-wider text-primary/80">Focus crops</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Paddy, cotton, chilli, red gram, and maize are the priority crops for early stress detection and advisory delivery.
              </p>
            </div>
          </motion.aside>
        </div>

        {/* schemes + alerts */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Active Government Schemes</h2>
                <p className="text-xs text-muted-foreground">Live eligibility & disbursement tracker</p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1 text-xs">View all <ArrowRight className="h-3 w-3" /></Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {schemes.map(s => (
                <div key={s.title} className="rounded-lg border border-border/60 bg-muted/20 p-4 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <Leaf className="h-4 w-4 text-primary mt-0.5" />
                    <Badge variant="outline" className="text-[10px] border-success/40 text-success">{s.tag}</Badge>
                  </div>
                  <h3 className="mt-2 font-semibold text-sm">{s.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Emergency Alerts</h2>
              <Badge className="bg-destructive/20 text-destructive border-destructive/40">{alerts.length} active</Badge>
            </div>
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {alerts.map((a, i) => (
                <motion.div key={a.id}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{a.type}</span>
                    <Badge variant="outline" className={
                      a.severity === "Critical" ? "border-destructive/50 text-destructive bg-destructive/10" :
                      a.severity === "High" ? "border-warning/50 text-warning bg-warning/10" :
                      "border-info/50 text-info bg-info/10"
                    }>{a.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.crop} · {a.district} · {a.time}</p>
                  <p className="mt-1.5 text-xs">{a.action}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* charts */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> 30-Day Crop Health Trends</h2>
                <p className="text-xs text-muted-foreground">NDVI · EVI · NDRE — statewide weighted average</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={spectralTrend}>
                <defs>
                  <linearGradient id="ndvi" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.19 145)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.78 0.19 145)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="evi" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.17 200)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.17 200)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
                <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="ndvi" stroke="oklch(0.78 0.19 145)" fill="url(#ndvi)" strokeWidth={2} />
                <Area type="monotone" dataKey="evi"  stroke="oklch(0.78 0.17 200)" fill="url(#evi)"  strokeWidth={2} />
                <Area type="monotone" dataKey="ndre" stroke="oklch(0.82 0.17 80)"  fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-1">Crop Distribution</h2>
            <p className="text-xs text-muted-foreground mb-4">Monitored parcels by crop type</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={cropDistribution} dataKey="parcels" nameKey="crop" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {cropDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* district summary */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> District Health Rankings</h2>
              <p className="text-xs text-muted-foreground">Live AI-computed crop health index across all districts</p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-1"><Link to="/mandal">Mandal view <ArrowRight className="h-3 w-3" /></Link></Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={districtRankings} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid stroke="oklch(0.32 0.04 200 / 30%)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.68 0.03 200)" }} />
              <YAxis type="category" dataKey="district" tick={{ fontSize: 10, fill: "oklch(0.9 0.02 180)" }} width={90} />
              <Tooltip contentStyle={{ background: "oklch(0.21 0.04 200)", border: "1px solid oklch(0.32 0.04 200)", borderRadius: 8 }} />
              <Bar dataKey="healthScore" radius={[0, 6, 6, 0]}>
                {districtRankings.map((d, i) => (
                  <Cell key={i} fill={d.healthScore > 80 ? "oklch(0.78 0.19 145)" : d.healthScore > 70 ? "oklch(0.78 0.17 200)" : d.healthScore > 60 ? "oklch(0.82 0.17 80)" : "oklch(0.68 0.22 25)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI insights */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Bug, title: "Outbreak Forecast", text: "AI predicts 72% probability of cotton bollworm spread in Guntur within 14 days.", tone: "warning" },
            { icon: CloudRain, title: "Weather Risk", text: "Rainfall deficit at 18% across Rayalaseema. Drought advisory recommended.", tone: "info" },
            { icon: Sparkles, title: "Yield Boost", text: "Optimal nitrogen schedule could lift paddy yield by 6.4% in Krishna delta.", tone: "primary" },
          ].map((c, i) => (
            <motion.div key={c.title}
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="glass rounded-xl p-5 hover:glow-primary transition"
            >
              <div className={`h-10 w-10 rounded-lg grid place-items-center mb-3 ${
                c.tone === "warning" ? "bg-warning/15 text-warning" : c.tone === "info" ? "bg-info/15 text-info" : "bg-primary/15 text-primary"
              }`}>
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{c.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
