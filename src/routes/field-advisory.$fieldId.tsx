import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import {
  type FarmerActionTracking,
  type FieldAdvisoryPayload,
  getFieldAdvisoryPayload,
} from "@/lib/field-advisory";

export const Route = createFileRoute("/field-advisory/$fieldId")({
  head: () => ({
    meta: [
      { title: "Field Advisory · AgriShield AP" },
      {
        name: "description",
        content: "Field-level advisory: AI disease detection, risk prediction, weather alerts, and farmer action tracking.",
      },
    ],
  }),
  component: FieldAdvisoryPage,
});

function riskBadgeTone(tone: FieldAdvisoryPayload["predictedRisk7Days"]["diseaseRisk"]) {
  if (tone === "High") return "border-warning/40 bg-warning/10 text-warning";
  if (tone === "Medium") return "border-info/40 bg-info/10 text-info";
  return "border-success/40 bg-success/10 text-success";
}

function FieldAdvisoryPage() {
  const { fieldId } = Route.useParams();


  const payload = useMemo<FieldAdvisoryPayload>(() => getFieldAdvisoryPayload(fieldId), [fieldId]);

  const [tracking, setTracking] = useState<FarmerActionTracking>({
    treated: false,
    irrigationAdjusted: false,
    validationUploaded: false,
    lastUpdatedAt: new Date().toLocaleString(),
  });

  const [validationFileName, setValidationFileName] = useState<string | null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const completionPct = useMemo(() => {
    const base = 25; // small non-zero to avoid 0 look
    const steps = [tracking.treated, tracking.irrigationAdjusted, tracking.validationUploaded].filter(Boolean)
      .length;
    return clamp(base + steps * 25, 0, 100);
  }, [tracking.treated, tracking.irrigationAdjusted, tracking.validationUploaded]);

  const severity = payload.diseaseDetected.severity;

  return (
    <div>
      <PageHeader
        icon={<ShieldCheck className="h-6 w-6 text-primary" />}
        eyebrow="Field Advisory"
        title={`AgriShield Field Advisory · ${payload.fieldId}`}
        description="Satellite monitoring → AI disease detection → risk prediction → weather alert → action tracking."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Crop</p>
                <h3 className="mt-1 text-lg font-semibold">{payload.crop}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Field area: {payload.diseaseDetected.affectedAreaPct}% affected</p>
              </div>
              <Badge
                variant="outline"
                className={
                  severity === "Critical"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : severity === "High"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : severity === "Medium"
                        ? "border-info/40 bg-info/10 text-info"
                        : "border-success/40 bg-success/10 text-success"
                }
              >
                Severity: {severity}
              </Badge>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Health score</span>
                <span className="font-semibold text-foreground">{payload.healthScorePct}%</span>
              </div>
              <Progress value={payload.healthScorePct} className="mt-2 h-2" />
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Disease Detected</p>
                <h3 className="mt-1 text-lg font-semibold">{payload.diseaseDetected.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Confidence: {payload.diseaseDetected.probabilityPct}%</p>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Model: AgriShield Vision
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Affected</p>
                <p className="mt-1 text-sm font-semibold">{payload.diseaseDetected.affectedAreaPct}%</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Next step</p>
                <p className="mt-1 text-sm font-semibold">Field action plan</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Farmer action tracking</p>
                <h3 className="mt-1 text-lg font-semibold">Progress</h3>
                <p className="mt-1 text-xs text-muted-foreground">Update actions as you respond</p>
              </div>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                {completionPct}% complete
              </Badge>
            </div>

            <div className="mt-4">
              <Progress value={completionPct} className="h-2" />
            </div>

            <div className="mt-4 space-y-2">
              <ToggleRow
                title="Treatment applied"
                checked={tracking.treated}
                icon={<CheckCircle2 className="h-4 w-4" />}
                onToggle={() =>
                  setTracking((t) => ({
                    ...t,
                    treated: !t.treated,
                    lastUpdatedAt: new Date().toLocaleString(),
                  }))
                }
              />

              <ToggleRow
                title="Irrigation adjusted"
                checked={tracking.irrigationAdjusted}
                icon={<Activity className="h-4 w-4" />}
                onToggle={() =>
                  setTracking((t) => ({
                    ...t,
                    irrigationAdjusted: !t.irrigationAdjusted,
                    lastUpdatedAt: new Date().toLocaleString(),
                  }))
                }
              />

              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium truncate">Upload validation image</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={tracking.validationUploaded ? "border-success/40 bg-success/10 text-success" : "border-border/60 text-muted-foreground"}
                  >
                    {tracking.validationUploaded ? "Done" : "Pending"}
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  {validationFileName ? `Selected: ${validationFileName}` : "Upload a new crop image for validation."}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      disabled={localBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setValidationFileName(file.name);
                        setLocalBusy(true);
                        // Simulate validation upload in UI
                        setTimeout(() => {
                          setTracking((t) => ({
                            ...t,
                            validationUploaded: true,
                            lastUpdatedAt: new Date().toLocaleString(),
                          }));
                          setLocalBusy(false);
                        }, 900);
                      }}
                    />
                    <Button size="sm" variant="outline" className="gap-2" disabled={localBusy}>
                      {localBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Validate image
                    </Button>
                  </label>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={localBusy}
                    onClick={() => {
                      setValidationFileName(null);
                      setTracking((t) => ({
                        ...t,
                        validationUploaded: false,
                        lastUpdatedAt: new Date().toLocaleString(),
                      }));
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-muted-foreground">Last updated: {tracking.lastUpdatedAt}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                AI Recommendation
              </h3>
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                Advisory generation
              </Badge>
            </div>

            <p className="mt-2 text-sm text-muted-foreground leading-6">
              Follow the field action plan based on detected Rice Blast risk.
            </p>

            <div className="mt-4 space-y-2">
              {payload.aiRecommendation.steps.map((step, i) => (
                <div key={step} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <div className="text-sm">{step}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              Tip: Upload a new crop image for validation to confirm the advisory.
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Predicted Risk (7 Days)
              </h3>
              <Badge variant="outline" className={riskBadgeTone(payload.predictedRisk7Days.diseaseRisk)}>
                {payload.predictedRisk7Days.diseaseRisk} disease risk
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RiskBox label="Disease Risk" value={payload.predictedRisk7Days.diseaseRisk} tone="warning" />
              <RiskBox label="Pest Risk" value={payload.predictedRisk7Days.pestRisk} tone="info" />
              <RiskBox label="Yield Loss Risk" value={`${payload.predictedRisk7Days.yieldLossRiskPct}%`} tone="danger" />
              <div className="rounded-xl border border-border/60 bg-background/40 p-4">
                <p className="text-xs text-muted-foreground">Affected health score context</p>
                <p className="mt-2 text-sm font-semibold">Health: {payload.healthScorePct}% · Action: Medium priority</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              Weather Alert
            </h3>
            <p className="mt-2 text-sm text-muted-foreground leading-6">{payload.weatherAlert.message}</p>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/40 p-3 text-sm">
              <span className="text-muted-foreground">Guidance:</span> <span className="font-medium">{payload.weatherAlert.guidance}</span>
            </div>
          </div>

          <div className="glass rounded-xl p-5 border border-border/60">
            <h3 className="text-lg font-semibold">Field validation workflow</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-6">
              Monitor after 5 days, then validate with a new crop image to confirm whether the advisory matches the field condition.
            </p>

            <div className="mt-4 space-y-3">
              <WorkflowStep
                title="1) Apply fungicide (per plan)"
                done={tracking.treated}
              />
              <WorkflowStep
                title="2) Avoid over-irrigation"
                done={tracking.irrigationAdjusted}
              />
              <WorkflowStep
                title="3) Upload new crop image for validation"
                done={tracking.validationUploaded}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowStep({ title, done }: { title: string; done: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Update this item after completing the step.</p>
      </div>
      <Badge
        variant="outline"
        className={done ? "border-success/40 bg-success/10 text-success" : "border-border/60 text-muted-foreground"}
      >
        {done ? "Done" : "Pending"}
      </Badge>
    </div>
  );
}

function ToggleRow({
  title,
  checked,
  icon,
  onToggle,
}: {
  title: string;
  checked: boolean;
  icon: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full text-left rounded-lg border border-border/60 bg-background/40 p-3 transition hover:border-primary/30"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <p className="text-sm font-medium truncate">{title}</p>
        </div>
        <Badge
          variant="outline"
          className={checked ? "border-success/40 bg-success/10 text-success" : "border-border/60 text-muted-foreground"}
        >
          {checked ? "Done" : "Mark"}
        </Badge>
      </div>
    </button>
  );
}

function RiskBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "warning" | "info" | "danger";
}) {
  const chip =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning"
      : tone === "info"
        ? "border-info/40 bg-info/10 text-info"
        : "border-destructive/40 bg-destructive/10 text-destructive";
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${chip}`}>{value}</p>
    </div>
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

