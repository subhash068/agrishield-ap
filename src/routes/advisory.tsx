import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BellRing,
  CheckCheck,
  CloudRain,
  Clock3,
  FileText,
  Megaphone,
  PhoneCall,
  Radio,
  Send,
  Smartphone,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getAlerts,
  getDistricts,
  getSchemes,
  getWeatherForecast,
} from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

type Channel = "SMS" | "App Push" | "IVR" | "WhatsApp";
type Language = "Telugu" | "English" | "Bilingual";

type BroadcastDraft = {
  district: string;
  crop: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  language: Language;
  audience: string;
  schedule: string;
  message: string;
  action: string;
  channels: Channel[];
};

type BroadcastRecord = BroadcastDraft & {
  id: string;
  status: "Queued" | "Sent";
  createdAt: string;
};

type Template = {
  id: string;
  name: string;
  tone: "warning" | "info" | "success";
  draft: Partial<BroadcastDraft>;
};

const channelOptions: Channel[] = ["SMS", "App Push", "IVR", "WhatsApp"];
const languageOptions: Language[] = ["Telugu", "English", "Bilingual"];

const templates: Template[] = [
  {
    id: "drought",
    name: "Drought warning",
    tone: "warning",
    draft: {
      crop: "Paddy",
      severity: "High",
      audience: "Farmers in low-rainfall mandals",
      message:
        "Low rainfall is expected over the next few days. Please prioritise irrigation, conserve moisture, and inspect crops for early stress signs.",
      action: "Trigger irrigation advisory and field verification.",
    },
  },
  {
    id: "pest",
    name: "Pest outbreak",
    tone: "warning",
    draft: {
      crop: "Cotton",
      severity: "Critical",
      audience: "Cotton growers in hotspot villages",
      message:
        "AI surveillance has detected a high pest-risk pattern. Please scout fields immediately and apply the recommended control measures.",
      action: "Send scouting and spray guidance to affected villages.",
    },
  },
  {
    id: "weather",
    name: "Weather advisory",
    tone: "info",
    draft: {
      crop: "All crops",
      severity: "Medium",
      audience: "All farmers in the selected district",
      message:
        "Weather conditions are changing. Please follow the latest field advisory, avoid unnecessary spraying, and protect exposed crops.",
      action: "Broadcast weather caution and update field officers.",
    },
  },
  {
    id: "good",
    name: "Positive update",
    tone: "success",
    draft: {
      crop: "Paddy",
      severity: "Low",
      audience: "Farmers with improving crop health",
      message:
        "Crop health is improving. Continue current irrigation and nutrient practices and keep monitoring for any localised stress.",
      action: "Share best-practice reminder and keep routine monitoring active.",
    },
  },
];

const initialDraft: BroadcastDraft = {
  district: "Krishna",
  crop: "Paddy",
  severity: "High",
  language: "Bilingual",
  audience: "Farmers in the selected district",
  schedule: "Send now",
  message:
    "AI surveillance has flagged rising crop stress. Please inspect fields, verify moisture levels, and follow the district advisory bulletin.",
  action: "Route to SMS, app push, and IVR with field officer follow-up.",
  channels: ["SMS", "App Push", "IVR"],
};

const seededBroadcasts: BroadcastRecord[] = [
  {
    id: "BRD-10041",
    district: "Guntur",
    crop: "Cotton",
    severity: "Critical",
    language: "Bilingual",
    audience: "Cotton growers in hotspot villages",
    schedule: "Sent 12 min ago",
    message:
      "High pest pressure has been detected in the Guntur belt. Please scout immediately and follow the control guidance from the agriculture team.",
    action: "Spray recommendation issued to 1,204 farmers.",
    channels: ["SMS", "App Push", "WhatsApp"],
    status: "Sent",
    createdAt: "12 min ago",
  },
  {
    id: "BRD-10040",
    district: "Anantapur",
    crop: "Paddy",
    severity: "High",
    language: "Telugu",
    audience: "Farmers in low-rainfall mandals",
    schedule: "Sent 38 min ago",
    message:
      "Rainfall deficit is increasing across the mandal. Please conserve moisture and prioritise irrigation where available.",
    action: "Irrigation advisory broadcast to RSKs.",
    channels: ["SMS", "IVR"],
    status: "Sent",
    createdAt: "38 min ago",
  },
];

const severityTone: Record<BroadcastDraft["severity"], string> = {
  Low: "border-success/40 bg-success/10 text-success",
  Medium: "border-info/40 bg-info/10 text-info",
  High: "border-warning/40 bg-warning/10 text-warning",
  Critical: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const Route = createFileRoute("/advisory")({
  head: () => ({
    meta: [
      { title: "Advisory System · AgriShield AP" },
      {
        name: "description",
        content: "Automated multilingual farmer advisories via SMS, mobile app, IVR and WhatsApp.",
      },
    ],
  }),
  component: AdvisoryPage,
});

function AdvisoryPage() {
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: getAlerts });
  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: getDistricts });
  const { data: weatherForecast = [] } = useQuery({
    queryKey: ["weather-forecast"],
    queryFn: getWeatherForecast,
  });
  const { data: schemes = [] } = useQuery({ queryKey: ["schemes"], queryFn: getSchemes });

  const [draft, setDraft] = useState<BroadcastDraft>(initialDraft);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [queue, setQueue] = useState<BroadcastRecord[]>(seededBroadcasts);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0].id);

  const stats = useMemo(() => {
    const critical = alerts.filter((alert) => alert.severity === "Critical").length;
    const high = alerts.filter((alert) => alert.severity === "High").length;
    const medium = alerts.filter((alert) => alert.severity === "Medium").length;
    const low = alerts.filter((alert) => alert.severity === "Low").length;
    const totalChannels = draft.channels.length;
    const weatherSlice = weatherForecast.slice(0, 3);
    const avgRain =
      weatherSlice.length > 0
        ? weatherSlice.reduce((sum, day) => sum + day.rainfall, 0) / weatherSlice.length
        : 0;
    const avgDrought =
      weatherSlice.length > 0
        ? weatherSlice.reduce((sum, day) => sum + day.drought, 0) / weatherSlice.length
        : 0;

    return {
      critical,
      high,
      medium,
      low,
      totalChannels,
      avgRain,
      avgDrought,
    };
  }, [alerts, draft.channels.length, weatherForecast]);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0];

  const audienceCoverage = useMemo(() => {
    const districtMatch = districts.includes(draft.district) ? 1 : 0;
    const channelReach =
      0.35 +
      (draft.channels.includes("SMS") ? 0.55 : 0) +
      (draft.channels.includes("App Push") ? 0.18 : 0) +
      (draft.channels.includes("IVR") ? 0.15 : 0) +
      (draft.channels.includes("WhatsApp") ? 0.12 : 0);

    return Math.round(Math.min(100, (districtMatch * 12 + channelReach * 100) * 0.78));
  }, [districts, draft.channels, draft.district]);

  const queueMutation = useMutation({
    mutationFn: async () => {
      const createdAt = new Date().toLocaleString();
      return {
        id: `BRD-${Date.now().toString().slice(-5)}`,
        ...draft,
        status: "Queued" as const,
        createdAt,
      };
    },
    onSuccess: (record) => {
      setQueue((current) => [record, ...current]);
      setStatusMessage(
        `${record.schedule === "Send now" ? "Queued" : "Scheduled"} broadcast for ${record.district}`,
      );
    },
  });

  const weatherSignal = useMemo(() => {
    const firstThree = weatherForecast.slice(0, 3);
    if (!firstThree.length) {
      return {
        label: "Weather data unavailable",
        detail: "Broadcast based on active alerts only.",
      };
    }

    const rain = firstThree.reduce((sum, point) => sum + point.rainfall, 0);
    const drought = firstThree.reduce((sum, point) => sum + point.drought, 0) / firstThree.length;

    if (drought >= 65) {
      return {
        label: "Drought watch",
        detail: `Average drought score ${Math.round(drought)} with only ${rain.toFixed(1)} mm forecast rain in the next 3 days.`,
      };
    }

    if (rain >= 20) {
      return {
        label: "Heavy rain window",
        detail: `Rainfall of ${rain.toFixed(1)} mm is expected across the next 3 days.`,
      };
    }

    return {
      label: "Stable weather",
      detail: `Moderate weather expected with ${rain.toFixed(1)} mm rain in the next 3 days.`,
    };
  }, [weatherForecast]);

  const handleTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setDraft((current) => ({
      ...current,
      ...template.draft,
      channels: template.id === "good" ? ["SMS", "App Push"] : current.channels,
      severity: template.draft.severity ?? current.severity,
      language: current.language,
      district: current.district,
      schedule: current.schedule,
    }));
    setStatusMessage(`Loaded ${template.name} template`);
  };

  const toggleChannel = (channel: Channel) => {
    setDraft((current) => ({
      ...current,
      channels: current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel],
    }));
  };

  const sendBroadcast = () => {
    if (draft.channels.length === 0) {
      setStatusMessage("Select at least one delivery channel before sending.");
      return;
    }

    queueMutation.mutate();
  };

  const resendLatest = alerts[0];
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div>
      <PageHeader
        icon={<Megaphone className="h-6 w-6 text-warning" />}
        eyebrow="Advisory Engine"
        title="Automated Farmer Advisory System"
        description="Compose, queue, and route multilingual advisories across SMS, app push, IVR, and WhatsApp with live operational context."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleTemplate("weather")}>
              <Sparkles className="h-3.5 w-3.5" />
              Load template
            </Button>
            <Button size="sm" className="gap-2 glow-primary" onClick={sendBroadcast}>
              <Send className="h-3.5 w-3.5" />
              Queue broadcast
            </Button>
          </>
        }
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Alerts in Queue", value: queue.length, sub: "Broadcast records", tone: "text-primary" },
            { label: "Critical Alerts", value: stats.critical, sub: "Immediate attention", tone: "text-destructive" },
            { label: "Channel Mix", value: stats.totalChannels, sub: "Active delivery paths", tone: "text-accent" },
            { label: "Weather Signal", value: Math.round(stats.avgDrought), sub: "Drought risk score", tone: "text-warning" },
          ].map((item) => (
            <div key={item.label} className="glass rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <div className={`mt-1 text-2xl font-bold tabular-nums ${item.tone}`}>{item.value}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Critical", value: stats.critical, tone: "text-destructive" },
            { label: "High", value: stats.high, tone: "text-warning" },
            { label: "Medium", value: stats.medium, tone: "text-info" },
            { label: "Low", value: stats.low, tone: "text-success" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.18fr_0.82fr] gap-5">
          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Advisory Composer
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a template, target the district, and queue a multilingual broadcast.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-success/40 text-success bg-success/10">
                  Live routing ready
                </Badge>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                  Template: {selectedTemplate.name}
                </Badge>
              </div>
            </div>

            {statusMessage ? (
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
                {statusMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {templates.map((template) => {
                const active = template.id === selectedTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplate(template.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {template.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">District</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.district}
                  onChange={(e) => setDraft((current) => ({ ...current, district: e.target.value }))}
                >
                  {(districts.length ? districts : [draft.district]).map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Crop</span>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.crop}
                  onChange={(e) => setDraft((current) => ({ ...current, crop: e.target.value }))}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Severity</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.severity}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      severity: e.target.value as BroadcastDraft["severity"],
                    }))
                  }
                >
                  {["Low", "Medium", "High", "Critical"].map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Language</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.language}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      language: e.target.value as Language,
                    }))
                  }
                >
                  {languageOptions.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.9fr]">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Audience</span>
                <input
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.audience}
                  onChange={(e) => setDraft((current) => ({ ...current, audience: e.target.value }))}
                />
              </label>

              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Schedule</span>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.schedule}
                  onChange={(e) => setDraft((current) => ({ ...current, schedule: e.target.value }))}
                >
                  {["Send now", "In 15 minutes", "In 1 hour", "Tomorrow 6:00 AM"].map((schedule) => (
                    <option key={schedule} value={schedule}>
                      {schedule}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Delivery channels</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {channelOptions.map((channel) => {
                  const active = draft.channels.includes(channel);
                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/20 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {channel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <label className="grid gap-1.5 text-sm">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Message</span>
                <textarea
                  rows={5}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.message}
                  onChange={(e) => setDraft((current) => ({ ...current, message: e.target.value }))}
                />
              </label>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Action note</p>
                <textarea
                  rows={5}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={draft.action}
                  onChange={(e) => setDraft((current) => ({ ...current, action: e.target.value }))}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleTemplate("drought")}>
                    <CloudRain className="h-3.5 w-3.5" />
                    Drought copy
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleTemplate("pest")}>
                    <BellRing className="h-3.5 w-3.5" />
                    Pest copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="gap-2" onClick={sendBroadcast} disabled={queueMutation.isPending}>
                {queueMutation.isPending ? (
                  <Clock3 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {draft.schedule === "Send now" ? "Queue broadcast" : "Schedule broadcast"}
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setDraft(initialDraft)}
                disabled={queueMutation.isPending}
              >
                Reset form
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => resendLatest && handleTemplate("weather")}
                disabled={!resendLatest}
              >
                <FileText className="h-4 w-4" />
                Use latest alert
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-xl p-5 border border-border/60">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Broadcast preview
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {draft.language} delivery across {draft.channels.length} channel(s).
                  </p>
                </div>
                <Badge variant="outline" className={severityTone[draft.severity]}>
                  {draft.severity}
                </Badge>
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-border/60 bg-background/60 p-4 shadow-lg">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>AGRI-AP</span>
                  <span>Now</span>
                </div>
                <div className="mt-2 rounded-2xl bg-gradient-to-br from-primary/15 via-background to-accent/10 border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Target</p>
                      <h4 className="mt-1 text-sm font-semibold">
                        {draft.crop} farmers in {draft.district}
                      </h4>
                    </div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      {draft.audience}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground/90">{draft.message}</p>
                  <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
                    Next action: <span className="text-foreground">{draft.action}</span>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  {[
                    { icon: Smartphone, label: "SMS" },
                    { icon: Radio, label: "App" },
                    { icon: PhoneCall, label: "IVR" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border p-2 ${
                        draft.channels.includes(item.label as Channel)
                          ? "border-primary/30 bg-primary/10"
                          : "border-border/60 bg-muted/20"
                      }`}
                    >
                      <item.icon className="mx-auto h-4 w-4 text-primary" />
                      <p className="mt-1 text-center text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Estimated reach</span>
                    <span className="font-semibold tabular-nums">{audienceCoverage}%</span>
                  </div>
                  <Progress value={audienceCoverage} className="mt-2 h-2" />
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-5 border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-accent" />
                    Weather trigger
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{weatherSignal.label}</p>
                </div>
                <Badge variant="outline" className="border-accent/40 bg-accent/10 text-accent">
                  Forecast aware
                </Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-6">{weatherSignal.detail}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Average rainfall next 3 days: {stats.avgRain.toFixed(1)} mm
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                {weatherForecast.slice(0, 3).map((day) => (
                  <div key={day.day} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-muted-foreground">{day.day}</p>
                    <p className="mt-1 font-semibold">{day.rainfall.toFixed(1)} mm</p>
                    <p className="text-[11px] text-muted-foreground">Drought {day.drought}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-5 border border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-success" />
                    Linked schemes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quick references to the active government programs.
                  </p>
                </div>
                <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                  {schemes.length} active
                </Badge>
              </div>
              <div className="mt-4 space-y-2">
                {schemes.slice(0, 3).map((scheme) => (
                  <div key={scheme.title} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{scheme.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{scheme.desc}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-border/60">
                        {scheme.tag}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.08fr_0.92fr] gap-5">
          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Recent advisories</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Live alerts fetched from the backend and ready for resend.
                </p>
              </div>
              <Badge variant="outline" className="border-border/60 text-muted-foreground">
                {recentAlerts.length} items
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{alert.type}</span>
                        <Badge variant="outline" className={severityTone[alert.severity]}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.crop} - {alert.district} - {alert.time}
                      </p>
                      <p className="text-sm mt-2 leading-6">{alert.action}</p>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 shrink-0">
                      <Send className="h-3 w-3" />
                      Resend
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Smartphone className="h-3 w-3" />
                          SMS
                        </span>
                        <span className="text-success flex items-center gap-0.5">
                          <CheckCheck className="h-3 w-3" />
                          98%
                        </span>
                      </div>
                      <Progress value={98} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Radio className="h-3 w-3" />
                          App
                        </span>
                        <span className="text-accent">74%</span>
                      </div>
                      <Progress value={74} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <PhoneCall className="h-3 w-3" />
                          IVR
                        </span>
                        <span className="text-warning">52%</span>
                      </div>
                      <Progress value={52} className="h-1 mt-1" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Broadcast queue</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  The most recent queued and sent advisories in this session.
                </p>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                {queue.length} records
              </Badge>
            </div>

            <div className="mt-4 space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {queue.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{item.crop} - {item.district}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.language} - {item.schedule}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "Sent"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-warning/40 bg-warning/10 text-warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.message}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.channels.map((channel) => (
                      <Badge key={channel} variant="outline" className="bg-muted/20">
                        {channel}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
