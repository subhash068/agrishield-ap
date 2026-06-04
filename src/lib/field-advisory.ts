import type { Parcel } from "@/lib/api";
import { DISEASES, PARCELS } from "@/lib/mock-data";
import type { Prediction } from "@/lib/api";

export type FarmerActionTracking = {
  treated: boolean;
  irrigationAdjusted: boolean;
  validationUploaded: boolean;
  lastUpdatedAt: string;
};

export type FieldAdvisoryPayload = {
  fieldId: string;
  crop: string;
  healthScorePct: number;
  diseaseDetected: {
    name: string;
    probabilityPct: number;
    severity: "Low" | "Medium" | "High" | "Critical";
    affectedAreaPct: number;
  };
  aiRecommendation: {
    title: string;
    steps: string[];
  };
  predictedRisk7Days: {
    diseaseRisk: "Low" | "Medium" | "High";
    pestRisk: "Low" | "Medium" | "High";
    yieldLossRiskPct: number;
  };
  weatherAlert: {
    tone: "info" | "warning";
    message: string;
    guidance: string;
  };
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function severityFromHealth(healthScorePct: number): "Low" | "Medium" | "High" {
  if (healthScorePct >= 75) return "Low";
  if (healthScorePct >= 60) return "Medium";
  return "High";
}

function mapSeverityToModelSeverity(sev: "Low" | "Medium" | "High") {
  if (sev === "Low") return "Low";
  if (sev === "Medium") return "Medium";
  return "High";
}

function buildDefaultAdvisory(fieldId: string): FieldAdvisoryPayload {
  const p = PARCELS.find((x) => x.id === fieldId) ?? PARCELS[0];
  const health = p?.health ?? 65;

  // Deterministic-ish mapping to match your example payload closely.
  const disease = DISEASES.find((d) => d.crop === p.crop) ?? DISEASES[0];
  const diseaseProbability = clamp(Math.round(70 + (100 - health) * 0.6), 55, 94);
  const sev = severityFromHealth(health);

  return {
    fieldId,
    crop: p.crop,
    healthScorePct: health,
    diseaseDetected: {
      name: "Rice Blast",
      probabilityPct: diseaseProbability,
      severity: (mapSeverityToModelSeverity(sev) === "Low"
        ? "Medium"
        : (mapSeverityToModelSeverity(sev) as any)) as "Low" | "Medium" | "High" | "Critical",
      affectedAreaPct: 12,
    },
    aiRecommendation: {
      title: "AI Recommendation",
      steps: [
        "Apply fungicide treatment.",
        "Avoid over-irrigation.",
        "Monitor field after 5 days.",
        "Upload new crop image for validation.",
      ],
    },
    predictedRisk7Days: {
      diseaseRisk: "High",
      pestRisk: "Medium",
      yieldLossRiskPct: 10,
    },
    weatherAlert: {
      tone: "warning",
      message: "Heavy rainfall expected in 48 hours.",
      guidance: "Delay pesticide application until rainfall ends.",
    },
  };
}

export function getFieldAdvisoryPayload(fieldId: string): FieldAdvisoryPayload {
  // For now: use mock payload structure.
  return buildDefaultAdvisory(fieldId);
}

export function getPredictedRiskLabels(pred: Prediction): {
  diseaseRisk: "Low" | "Medium" | "High";
  pestRisk: "Low" | "Medium" | "High";
  yieldLossRiskPct: number;
} {
  // Placeholder helper for future backend mapping.
  const prob = pred.probability;
  const toBand = (p: number) => (p >= 75 ? "High" : p >= 55 ? "Medium" : "Low");
  const yieldLossRiskPct = pred.label.toLowerCase().includes("yield") ? pred.probability : 10;
  return {
    diseaseRisk: toBand(prob) as "Low" | "Medium" | "High",
    pestRisk: "Medium",
    yieldLossRiskPct: clamp(yieldLossRiskPct, 0, 100),
  };
}

