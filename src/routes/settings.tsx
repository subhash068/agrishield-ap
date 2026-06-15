import { createFileRoute } from "@tanstack/react-router";
import {
  Settings as Cog,
  Bell,
  Plug,
  Globe,
  Database,
  User,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Satellite,
  CloudRain,
  Landmark,
  FileBarChart2,
  MessageSquare,
  Phone,
  Mail,
  Save,
  RefreshCw,
  Cpu,
  Activity,
  Leaf,
  Map,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAppShell } from "@/components/app-shell-store";
import { DISTRICTS, CROPS } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · AgriShield AP" },
      { name: "description", content: "Platform configuration, notifications, integrations, and system preferences for AgriShield AP." },
    ],
  }),
  component: SettingsPage,
});

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

type IntegrationStatus = "active" | "degraded" | "inactive";

interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  icon: React.ReactNode;
  lastSync: string;
  enabled: boolean;
}

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const config = {
    active:   { label: "Active",    icon: <CheckCircle2 className="h-3 w-3" />, cls: "border-success/40 bg-success/10 text-success" },
    degraded: { label: "Degraded",  icon: <AlertCircle className="h-3 w-3" />,  cls: "border-warning/40 bg-warning/10 text-warning" },
    inactive: { label: "Inactive",  icon: <XCircle className="h-3 w-3" />,      cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  }[status];
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${config.cls}`}>
      {config.icon} {config.label}
    </Badge>
  );
}

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="h-9 w-9 rounded-lg bg-primary/15 border border-primary/25 grid place-items-center shrink-0 mt-0.5">
        <span className="text-primary">{icon}</span>
      </div>
      <div>
        <h2 className="font-semibold text-base">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */

function SettingsPage() {
  const { locale, toggleLocale, selectedDistrict, setSelectedDistrict } = useAppShell();

  /* Notification toggles */
  const [notif, setNotif] = useState({
    criticalAlerts:    true,
    dailyDigest:       true,
    weatherWarnings:   true,
    schemeUpdates:     false,
    diseaseOutbreaks:  true,
    yieldForecasts:    false,
    rsKnotifications:  true,
    smsAlerts:         false,
  });

  /* Integration states */
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "aprtgs",  name: "APRTGS Sync",          description: "Andhra Pradesh Real Time Governance Society surveillance reports", status: "active",   icon: <Landmark className="h-4 w-4" />,    lastSync: "2 min ago",  enabled: true  },
    { id: "imd",     name: "IMD Weather Feed",      description: "India Meteorological Department live weather data stream",        status: "active",   icon: <CloudRain className="h-4 w-4" />,   lastSync: "5 min ago",  enabled: true  },
    { id: "nrsc",    name: "NRSC Satellite Ingest", description: "National Remote Sensing Centre Sentinel-2 / Landsat-9 imagery",  status: "active",   icon: <Satellite className="h-4 w-4" />,   lastSync: "14 min ago", enabled: true  },
    { id: "pmfby",   name: "PMFBY Insurance API",   description: "Pradhan Mantri Fasal Bima Yojana crop insurance data feed",      status: "degraded", icon: <Shield className="h-4 w-4" />,      lastSync: "2 hr ago",   enabled: true  },
    { id: "aprtgs2", name: "Revenue Dept – Land Records", description: "Land parcel ownership and patta integration",               status: "active",   icon: <Map className="h-4 w-4" />,         lastSync: "1 hr ago",   enabled: false },
    { id: "rsk",     name: "RSK Advisory Portal",   description: "Rythu Seva Kendra field staff push notifications",               status: "inactive", icon: <MessageSquare className="h-4 w-4" />, lastSync: "Never",     enabled: false },
  ]);

  /* System preferences */
  const [system, setSystem] = useState({
    autoRefresh:       true,
    compactMode:       false,
    highContrast:      false,
    satelliteAutoSync: true,
    offlineMode:       false,
    analyticsSharing:  true,
    betaFeatures:      false,
  });

  /* Monitored crops */
  const [monitoredCrops, setMonitoredCrops] = useState<Set<string>>(
    new Set(["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"])
  );

  /* Alert channels */
  const [alertChannels, setAlertChannels] = useState({
    inApp:   true,
    sms:     false,
    email:   false,
    ivr:     false,
    whatsapp:false,
  });

  const toggleIntegration = (id: string) =>
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
    );

  const toggleCrop = (crop: string) =>
    setMonitoredCrops((prev) => {
      const next = new Set(prev);
      next.has(crop) ? next.delete(crop) : next.add(crop);
      return next;
    });

  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader
        icon={<Cog className="h-6 w-6 text-primary" />}
        eyebrow="Configuration"
        title="Settings"
        description="Manage notification preferences, integrations, language, and system configuration."
        actions={
          <button
            id="settings-save-btn"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        }
      />

      <div className="px-6 lg:px-10 py-6 space-y-6 max-w-6xl">

        {/* ── Profile & Account ──────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 border border-border/60">
          <SectionHeader
            icon={<User className="h-4 w-4" />}
            title="Profile & Account"
            description="Your identity and role in the AgriShield AP platform."
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Full Name</label>
                <input
                  id="settings-profile-name"
                  defaultValue="Commissioner, Agriculture"
                  className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Designation</label>
                <input
                  id="settings-profile-designation"
                  defaultValue="Dept. of Agriculture, GoAP"
                  className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Official Email</label>
                <input
                  id="settings-profile-email"
                  type="email"
                  defaultValue="commissioner@agri.ap.gov.in"
                  className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Mobile (Alerts)</label>
                <input
                  id="settings-profile-phone"
                  type="tel"
                  defaultValue="+91 98765 43210"
                  className="mt-1.5 w-full h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/40">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">Session active</span>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs">
              Admin · Level 1 Access
            </Badge>
          </div>
        </div>

        {/* ── Region & Language ──────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 border border-border/60">
          <SectionHeader
            icon={<Globe className="h-4 w-4" />}
            title="Region & Language"
            description="Configure default district focus and platform language."
          />
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Default District</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Sets the default filter across all monitoring pages.</p>
              <select
                id="settings-default-district"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full h-10 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Districts (State-wide)</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Interface Language</label>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Toggles UI labels between English and Telugu.</p>
              <div className="flex gap-2">
                <button
                  id="settings-lang-en"
                  onClick={() => locale !== "en" && toggleLocale()}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${locale === "en" ? "border-primary bg-primary/20 text-primary" : "border-input bg-background/60 text-muted-foreground hover:border-primary/40"}`}
                >
                  🇮🇳 English
                </button>
                <button
                  id="settings-lang-te"
                  onClick={() => locale !== "te" && toggleLocale()}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${locale === "te" ? "border-primary bg-primary/20 text-primary" : "border-input bg-background/60 text-muted-foreground hover:border-primary/40"}`}
                >
                  తె Telugu
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-6 border border-border/60">
            <SectionHeader
              icon={<Bell className="h-4 w-4" />}
              title="Notifications"
              description="Control which events trigger platform alerts."
            />
            <ToggleRow id="notif-critical"   label="Critical outbreak alerts"      description="Immediate pest/disease outbreak detected in any district"     checked={notif.criticalAlerts}    onChange={(v) => setNotif((p) => ({ ...p, criticalAlerts: v }))}    />
            <ToggleRow id="notif-digest"     label="Daily intelligence digest"     description="Morning summary of overnight satellite & AI analytics"        checked={notif.dailyDigest}       onChange={(v) => setNotif((p) => ({ ...p, dailyDigest: v }))}       />
            <ToggleRow id="notif-weather"    label="Weather anomaly warnings"      description="IMD extreme weather & drought index threshold breach"         checked={notif.weatherWarnings}   onChange={(v) => setNotif((p) => ({ ...p, weatherWarnings: v }))}   />
            <ToggleRow id="notif-scheme"     label="Scheme disbursement updates"   description="PM-Kisan, PMFBY & AP scheme payment status changes"          checked={notif.schemeUpdates}     onChange={(v) => setNotif((p) => ({ ...p, schemeUpdates: v }))}     />
            <ToggleRow id="notif-disease"    label="Disease spread projections"    description="AI-predicted disease risk crossing medium/high threshold"     checked={notif.diseaseOutbreaks}  onChange={(v) => setNotif((p) => ({ ...p, diseaseOutbreaks: v }))}  />
            <ToggleRow id="notif-yield"      label="Yield forecast alerts"         description="LSTM-predicted crop yield change exceeding ±5%"              checked={notif.yieldForecasts}    onChange={(v) => setNotif((p) => ({ ...p, yieldForecasts: v }))}    />
            <ToggleRow id="notif-rsk"        label="RSK field officer notifications" description="Alerts forwarded from Rythu Seva Kendra field staff"      checked={notif.rsKnotifications}  onChange={(v) => setNotif((p) => ({ ...p, rsKnotifications: v }))}  />
          </div>

          {/* ── Alert Delivery Channels ── */}
          <div className="glass rounded-xl p-6 border border-border/60">
            <SectionHeader
              icon={<Phone className="h-4 w-4" />}
              title="Alert Delivery Channels"
              description="How you receive AgriShield AP notifications."
            />
            <ToggleRow id="ch-inapp"    label="In-app notifications"   description="Banner alerts in this platform dashboard"                  checked={alertChannels.inApp}    onChange={(v) => setAlertChannels((p) => ({ ...p, inApp: v }))}    />
            <ToggleRow id="ch-sms"      label="SMS alerts"             description="Text messages to registered mobile via BSNL/Airtel"       checked={alertChannels.sms}      onChange={(v) => setAlertChannels((p) => ({ ...p, sms: v }))}      />
            <ToggleRow id="ch-email"    label="Email digest"           description="HTML report to official government email address"          checked={alertChannels.email}    onChange={(v) => setAlertChannels((p) => ({ ...p, email: v }))}    />
            <ToggleRow id="ch-ivr"      label="IVR voice alerts"       description="Automated voice call for critical alerts (offline zones)"  checked={alertChannels.ivr}      onChange={(v) => setAlertChannels((p) => ({ ...p, ivr: v }))}      />
            <ToggleRow id="ch-whatsapp" label="WhatsApp messages"      description="Advisory via WhatsApp Business API to field officers"     checked={alertChannels.whatsapp} onChange={(v) => setAlertChannels((p) => ({ ...p, whatsapp: v }))} />

            <div className="mt-4 rounded-lg border border-info/30 bg-info/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-info shrink-0" />
                <span className="text-xs font-medium text-info">Channel delivery note</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                SMS and IVR require BSNL routing configuration. WhatsApp requires a verified Business API key.
                Contact IT Cell for activation.
              </p>
            </div>
          </div>
        </div>

        {/* ── Integrations ───────────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 border border-border/60">
          <SectionHeader
            icon={<Plug className="h-4 w-4" />}
            title="Integrations"
            description="Manage external government data feed connections and API sync status."
          />
          <div className="space-y-2">
            {integrations.map((intg) => (
              <div
                key={intg.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background/40 px-4 py-3 hover:bg-background/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 grid place-items-center shrink-0 text-primary">
                    {intg.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{intg.name}</span>
                      <StatusBadge status={intg.enabled ? intg.status : "inactive"} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{intg.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Last sync: {intg.lastSync}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {intg.status === "degraded" && intg.enabled && (
                    <button className="hidden sm:flex items-center gap-1 text-xs text-warning border border-warning/30 rounded-md px-2 py-1 hover:bg-warning/10 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  )}
                  <Switch
                    id={`intg-${intg.id}`}
                    checked={intg.enabled}
                    onCheckedChange={() => toggleIntegration(intg.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Data Sources & Crop Monitoring ─────────────────────────────── */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-6 border border-border/60">
            <SectionHeader
              icon={<Leaf className="h-4 w-4" />}
              title="Monitored Crops"
              description="Select which crops receive AI surveillance and alert coverage."
            />
            <div className="space-y-2">
              {CROPS.map((crop) => {
                const active = monitoredCrops.has(crop);
                return (
                  <button
                    key={crop}
                    id={`crop-toggle-${crop.toLowerCase().replace(" ", "-")}`}
                    onClick={() => toggleCrop(crop)}
                    className={`w-full flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/40 bg-background/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    <span className="font-medium">{crop}</span>
                    {active ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-current opacity-40" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {monitoredCrops.size} of {CROPS.length} crops active for surveillance.
            </p>
          </div>

          {/* ── Data Sources ── */}
          <div className="glass rounded-xl p-6 border border-border/60">
            <SectionHeader
              icon={<Database className="h-4 w-4" />}
              title="Data Sources"
              description="Satellite imagery and spectral index pipeline configuration."
            />
            <div className="space-y-3">
              {[
                { label: "Primary Satellite", value: "Sentinel-2 (10m)", icon: <Satellite className="h-3.5 w-3.5" />, status: "active" as const },
                { label: "Secondary Satellite", value: "Landsat-9 (30m)", icon: <Satellite className="h-3.5 w-3.5" />, status: "active" as const },
                { label: "Weather Source", value: "Open-Meteo + IMD", icon: <CloudRain className="h-3.5 w-3.5" />, status: "active" as const },
                { label: "Ground Data", value: "APRTGS Field Reports", icon: <Landmark className="h-3.5 w-3.5" />, status: "active" as const },
                { label: "ICRISAT Yield DB", value: "Historical 2000–2024", icon: <FileBarChart2 className="h-3.5 w-3.5" />, status: "active" as const },
              ].map((src) => (
                <div key={src.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-background/40 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-primary">{src.icon}</span>
                    <div>
                      <p className="text-xs text-muted-foreground">{src.label}</p>
                      <p className="text-sm font-medium">{src.value}</p>
                    </div>
                  </div>
                  <StatusBadge status={src.status} />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/40">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Satellite Refresh Interval</label>
                <select
                  id="settings-satellite-interval"
                  className="mt-1.5 w-full h-9 rounded-lg border border-input bg-background/60 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  defaultValue="14"
                >
                  <option value="7">Weekly (7 days)</option>
                  <option value="14">Fortnightly (14 days)</option>
                  <option value="30">Monthly (30 days)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── System Preferences ─────────────────────────────────────────── */}
        <div className="glass rounded-xl p-6 border border-border/60">
          <SectionHeader
            icon={<Cpu className="h-4 w-4" />}
            title="System Preferences"
            description="Performance, display, and platform behaviour settings."
          />
          <div className="grid md:grid-cols-2 gap-x-8">
            <div>
              <ToggleRow id="sys-autorefresh"   label="Auto-refresh dashboard"    description="Live data auto-updates every 60 seconds"             checked={system.autoRefresh}       onChange={(v) => setSystem((p) => ({ ...p, autoRefresh: v }))}       />
              <ToggleRow id="sys-satellite"     label="Satellite auto-sync"       description="Pull latest imagery when a new pass is available"    checked={system.satelliteAutoSync} onChange={(v) => setSystem((p) => ({ ...p, satelliteAutoSync: v }))} />
              <ToggleRow id="sys-offline"       label="Offline mode buffer"       description="Cache last 24h of data for low-connectivity areas"   checked={system.offlineMode}       onChange={(v) => setSystem((p) => ({ ...p, offlineMode: v }))}       />
              <ToggleRow id="sys-beta"          label="Beta features"             description="Early access to experimental AI analytics modules"   checked={system.betaFeatures}      onChange={(v) => setSystem((p) => ({ ...p, betaFeatures: v }))}      />
            </div>
            <div>
              <ToggleRow id="sys-compact"       label="Compact display mode"      description="Denser table rows and reduced card padding"          checked={system.compactMode}       onChange={(v) => setSystem((p) => ({ ...p, compactMode: v }))}       />
              <ToggleRow id="sys-contrast"      label="High contrast mode"        description="Increases foreground-background contrast ratios"     checked={system.highContrast}      onChange={(v) => setSystem((p) => ({ ...p, highContrast: v }))}      />
              <ToggleRow id="sys-analytics"     label="Share anonymised analytics" description="Help improve AgriShield AP with usage telemetry"   checked={system.analyticsSharing}  onChange={(v) => setSystem((p) => ({ ...p, analyticsSharing: v }))}  />
            </div>
          </div>
        </div>

        {/* ── System Status Footer ───────────────────────────────────────── */}
        <div className="glass rounded-xl p-5 border border-border/60">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Platform Health</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "API Latency",       value: "38 ms",   color: "text-success" },
              { label: "DB Connections",    value: "12 / 50", color: "text-success" },
              { label: "HF Model Status",   value: "Loaded",  color: "text-success" },
              { label: "Satellite Link",    value: "99.2%",   color: "text-success" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border/40 bg-background/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-sm font-semibold mt-0.5 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            AgriShield AP v2.0 · Backend: FastAPI + PostgreSQL · Frontend: Vite + React · AI: Hugging Face nfnet-f1-plant-disease
          </p>
        </div>

      </div>
    </div>
  );
}
