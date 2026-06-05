import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Beaker,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  Loader2,
  Sprout,
  TrendingUp,
  Zap,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getFertilizerRecommendation,
  type FertilizerRecoRequest,
  type FertilizerRecoResponse,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type CropOption = "Paddy" | "Cotton" | "Groundnut" | "Red Gram";
type SoilHealthOption = "Poor" | "Moderate" | "Good";
type GrowthStageOption = "Vegetative" | "Flowering" | "Grain Filling" | "Maturity";
type RiskOption = "Low" | "Medium" | "High";

const crops: CropOption[] = ["Paddy", "Cotton", "Groundnut", "Red Gram"];
const soilHealthOptions: SoilHealthOption[] = ["Poor", "Moderate", "Good"];
const growthStages: GrowthStageOption[] = ["Vegetative", "Flowering", "Grain Filling", "Maturity"];
const riskOptions: RiskOption[] = ["Low", "Medium", "High"];

const cropIcons: Record<CropOption, string> = {
  Paddy: "🌾",
  Cotton: "🌿",
  Groundnut: "🥜",
  "Red Gram": "🫘",
};

export const Route = createFileRoute("/fertilizer")({
  head: () => ({
    meta: [
      { title: "Fertilizer Recommendation · AgriShield AP" },
      {
        name: "description",
        content: "AI-powered fertilizer recommendations for Paddy, Cotton, Groundnut, and Red Gram with nutrient balancing.",
      },
    ],
  }),
  component: FertilizerRecoPage,
});

function FertilizerRecoPage() {
  const [crop, setCrop] = useState<CropOption>("Paddy");
  const [soilHealth, setSoilHealth] = useState<SoilHealthOption>("Moderate");
  const [growthStage, setGrowthStage] = useState<GrowthStageOption>("Vegetative");
  const [rainfall, setRainfall] = useState<string>("50");
  const [healthIndex, setHealthIndex] = useState<string>("65");
  const [abioticStress, setAbioticStress] = useState<string>("40");
  const [soilMoisture, setSoilMoisture] = useState<string>("55");
  const [diseaseRisk, setDiseaseRisk] = useState<RiskOption>("Medium");
  const [pestRisk, setPestRisk] = useState<RiskOption>("Medium");
  const [showResult, setShowResult] = useState(false);

  const [requestParams, setRequestParams] = useState<FertilizerRecoRequest>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["fertilizer-reco", requestParams],
    queryFn: () => getFertilizerRecommendation(requestParams),
    enabled: Object.keys(requestParams).length > 0,
    staleTime: 10 * 60 * 1000,
  });

  const handleRecommend = () => {
    setRequestParams({
      crop,
      soil_health: soilHealth,
      growth_stage: growthStage,
      weather_rainfall_mm: parseFloat(rainfall) || undefined,
      satellite_unified_health_index_pct: parseFloat(healthIndex) || undefined,
      satellite_abiotic_stress_score_pct: parseFloat(abioticStress) || undefined,
      satellite_soil_moisture_score_pct: parseFloat(soilMoisture) || undefined,
      disease_risk: diseaseRisk,
      pest_risk: pestRisk,
    });
    setShowResult(true);
  };

  return (
    <div>
      <PageHeader
        icon={<Beaker className="h-6 w-6 text-primary" />}
        eyebrow="Fertilizer Engine"
        title="AI Fertilizer Recommendation"
        description="Intelligent nutrient dosing for Paddy, Cotton, Groundnut, and Red Gram based on crop, soil health, growth stage, weather, and satellite stress proxies."
      />

      <div className="px-6 lg:px-10 py-6 space-y-6">
        {/* Input Form */}
        <div className="glass rounded-xl p-5 border border-border/60">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Input Parameters
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust the parameters below to get a personalized fertilizer recommendation.
              </p>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              PoC Engine v1
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Crop */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Crop</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={crop}
                onChange={(e) => setCrop(e.target.value as CropOption)}
              >
                {crops.map((c) => (
                  <option key={c} value={c}>
                    {cropIcons[c]} {c}
                  </option>
                ))}
              </select>
            </label>

            {/* Soil Health */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Soil Health</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={soilHealth}
                onChange={(e) => setSoilHealth(e.target.value as SoilHealthOption)}
              >
                {soilHealthOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            {/* Growth Stage */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Growth Stage</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value as GrowthStageOption)}
              >
                {growthStages.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            {/* Rainfall */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Rainfall (mm)</span>
              <input
                type="number"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={rainfall}
                onChange={(e) => setRainfall(e.target.value)}
                placeholder="e.g. 50"
              />
            </label>

            {/* Health Index */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Crop Health Index (%)
              </span>
              <input
                type="number"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={healthIndex}
                onChange={(e) => setHealthIndex(e.target.value)}
                placeholder="e.g. 65"
                min={0}
                max={100}
              />
            </label>

            {/* Abiotic Stress */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Abiotic Stress Score (%)
              </span>
              <input
                type="number"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={abioticStress}
                onChange={(e) => setAbioticStress(e.target.value)}
                placeholder="e.g. 40"
                min={0}
                max={100}
              />
            </label>

            {/* Soil Moisture */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Soil Moisture Score (%)
              </span>
              <input
                type="number"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={soilMoisture}
                onChange={(e) => setSoilMoisture(e.target.value)}
                placeholder="e.g. 55"
                min={0}
                max={100}
              />
            </label>

            {/* Disease Risk */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Disease Risk</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={diseaseRisk}
                onChange={(e) => setDiseaseRisk(e.target.value as RiskOption)}
              >
                {riskOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {/* Pest Risk */}
            <label className="grid gap-1.5 text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Pest Risk</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={pestRisk}
                onChange={(e) => setPestRisk(e.target.value as RiskOption)}
              >
                {riskOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              className="gap-2 glow-primary"
              onClick={handleRecommend}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Beaker className="h-4 w-4" />
              )}
              Get Recommendation
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setCrop("Paddy");
                setSoilHealth("Moderate");
                setGrowthStage("Vegetative");
                setRainfall("50");
                setHealthIndex("65");
                setAbioticStress("40");
                setSoilMoisture("55");
                setDiseaseRisk("Medium");
                setPestRisk("Medium");
                setShowResult(false);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Results */}
        {showResult && (
          <>
            {isLoading ? (
              <div className="glass rounded-xl p-10 border border-border/60 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Computing fertilizer recommendation...</p>
              </div>
            ) : error ? (
              <div className="glass rounded-xl p-6 border border-destructive/40 bg-destructive/10">
                <p className="text-destructive">Failed to fetch recommendation. Please try again.</p>
              </div>
            ) : data ? (
              <FertilizerResult data={data} />
            ) : null}
          </>
        )}

        {/* Default empty state */}
        {showResult && !isLoading && !data && !error && (
          <div className="glass rounded-xl p-10 border border-border/60 flex flex-col items-center justify-center gap-4 text-center">
            <Sprout className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Click "Get Recommendation" to see AI-powered fertilizer guidance for your crop.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FertilizerResult({ data }: { data: FertilizerRecoResponse }) {
  const nDef = data.nitrogen_deficiency_probability;
  const pDef = data.phosphate_deficiency_probability;
  const kDef = data.potassium_deficiency_probability;
  const maxDef = Math.max(nDef, pDef, kDef);

  const severityColor = (severity: string) => {
    if (severity === "High") return "text-destructive";
    if (severity === "Moderate") return "text-warning";
    return "text-success";
  };

  return (
    <>
      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 border border-border/60 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended Fertilizer</p>
          <p className="mt-1 text-base font-bold text-primary leading-tight">{data.fertilizer_name}</p>
          <Badge variant="outline" className="mt-2 border-primary/30 bg-primary/10 text-primary text-[10px]">
            {data.confidence}% confidence
          </Badge>
        </div>

        <div className="glass rounded-xl p-4 border border-border/60 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dosage</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {data.dosage_kg_per_acre}
            <span className="text-xs font-normal text-muted-foreground ml-1">kg/acre</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Total: {data.dosage_kg_total} kg</p>
        </div>

        <div className="glass rounded-xl p-4 border border-border/60 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Cost</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-accent">
            ₹{data.cost_rs_per_acre}
            <span className="text-xs font-normal text-muted-foreground ml-1">/acre</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Application cost</p>
        </div>

        <div className="glass rounded-xl p-4 border border-border/60 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Expected Yield Gain</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-success">
            +{data.expected_yield_gain_percent}%
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">vs. no fertilization</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Dosage Card + Application Details */}
        <div className="glass rounded-xl p-5 border border-border/60">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              Fertilizer Recommendation
            </h3>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              {data.crop}
            </Badge>
          </div>

          <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Product</p>
                <h4 className="mt-1 text-xl font-bold">{data.fertilizer_name}</h4>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{data.reason}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Dosage</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
                  {data.dosage_kg_per_acre}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
                </p>
                <p className="text-xs text-muted-foreground">per acre</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wider">Timing</p>
              </div>
              <p className="mt-2 text-sm font-semibold">{data.timing}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/50 p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wider">Method</p>
              </div>
              <p className="mt-2 text-sm font-semibold">{data.application_method}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs uppercase tracking-wider">Yield Impact</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Expected yield gain</p>
              <p className="text-sm font-bold text-success">+{data.expected_yield_gain_percent}%</p>
            </div>
            <Progress value={Math.min(data.expected_yield_gain_percent * 5, 100)} className="mt-2 h-2" />
          </div>
        </div>

        {/* Nutrient Balance Chart */}
        <div className="glass rounded-xl p-5 border border-border/60">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Nutrient Deficiency Analysis
            </h3>
            <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
              3 nutrients
            </Badge>
          </div>

          <div className="space-y-4">
            {[
              {
                nutrient: "Nitrogen (N)",
                prob: nDef,
                icon: <ArrowUp className="h-4 w-4 text-info" />,
                color: "bg-info",
                deficiency: (data.nutrient_deficiencies ?? []).find((n) => n.nutrient.includes("Nitrogen")),
              },
              {
                nutrient: "Phosphate (P)",
                prob: pDef,
                icon: <ArrowDown className="h-4 w-4 text-accent" />,
                color: "bg-accent",
                deficiency: (data.nutrient_deficiencies ?? []).find((n) => n.nutrient.includes("Phosphate")),
              },
              {
                nutrient: "Potassium (K)",
                prob: kDef,
                icon: <Sprout className="h-4 w-4 text-success" />,
                color: "bg-success",
                deficiency: (data.nutrient_deficiencies ?? []).find((n) => n.nutrient.includes("Potassium")),
              },
            ].map((item) => {
              const deficiency = item.deficiency;
              const severity = deficiency?.severity ?? "Low";
              return (
                <div key={item.nutrient}>
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <p className="text-sm font-medium">{item.nutrient}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {(item.prob * 100).toFixed(0)}%
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          severity === "High"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : severity === "Moderate"
                              ? "border-warning/40 bg-warning/10 text-warning"
                              : "border-success/40 bg-success/10 text-success"
                        }`}
                      >
                        {severity}
                      </Badge>
                    </div>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                      style={{ width: `${item.prob * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recommendation basis</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.reason}</p>
          </div>
        </div>
      </div>

      {/* Application Timeline */}
      <div className="glass rounded-xl p-5 border border-border/60">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Application Timeline
          </h3>
          <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
            {data.growth_stage ?? "Full season"}
          </Badge>
        </div>

        <div className="relative">
          {/* Timeline track */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" />

          <div className="space-y-6">
            {getTimelineSteps(data).map((step, i) => (
              <div key={step.label} className="flex items-start gap-4 pl-2">
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                    step.done
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-primary/30 bg-primary/5 text-primary"
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{step.timing}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function getTimelineSteps(data: FertilizerRecoResponse) {
  const crop = data.crop?.toLowerCase() ?? "paddy";
  const isPaddy = crop === "paddy";
  const isCotton = crop === "cotton";
  const isGroundnut = crop === "groundnut";
  const isRedGram = crop === "red gram";

  const baseLabel = data.fertilizer_name;

  return [
    {
      label: "Basal application",
      timing: isPaddy ? "0 DAT (Transplanting day)" : isCotton ? "0 DAS (Sowing day)" : "0 DAS",
      detail: `Apply ${data.dosage_kg_per_acre} kg/acre of ${baseLabel}. ${data.application_method}.`,
      done: true,
    },
    {
      label: "Second dressing",
      timing: isPaddy ? "21 DAT" : "25-30 DAS",
      detail: "Check crop response and apply foliar spray if deficiency persists.",
      done: false,
    },
    {
      label: "Growth stage boost",
      timing: isPaddy ? "45-50 DAT (Panicle initiation)" : isCotton ? "45-50 DAS (Flowering)" : "40-45 DAS",
      detail: "Monitor satellite health index. Apply second dose if health index drops below 60%.",
      done: false,
    },
    {
      label: "Pre-harvest evaluation",
      timing: isPaddy ? "70-80 DAT" : "65-75 DAS",
      detail: "Assess yield response. Do not apply fertilizer after this stage.",
      done: false,
    },
  ];
}
