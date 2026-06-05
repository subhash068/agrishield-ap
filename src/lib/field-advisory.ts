import { PARCELS } from "@/lib/mock-data";
import type { Prediction } from "@/lib/api";
import { getFieldAdvisory } from "@/lib/api";

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

function buildDefaultAdvisory(fieldId: string): FieldAdvisoryPayload {
  const p = PARCELS.find((x) => x.id === fieldId) ?? PARCELS[0];
  const health = p?.health ?? 65;

  // Disease name per crop (same mapping as backend PoC).
  const diseaseNameMap: Record<string, string> = {
    Paddy: "Rice Blast",
    Cotton: "Cotton Bollworm",
    Chilli: "Chilli Leaf Curl",
    Maize: "Fall Armyworm",
    "Red Gram": "Red Gram Wilt",
  };
  const diseaseName = diseaseNameMap[p.crop] ?? "Crop Disease";

  // Approximate backend probabilityPct formula:
  // disease_probability (from analytics) * 0.6 + satellite_conf * 0.15 + 8.0
  // clamped to [15, 65]. For mock parcel with health ~65, disease_probability ~0.3,
  // satellite_confidence ~60 → ~15-25% range → diseaseRisk = Low.
  const baseDiseaseProb = clamp((100 - health) / 100.0, 0.1, 0.9);
  const satelliteConf = p.confidence ?? 80;
  const probabilityPct = clamp(baseDiseaseProb * 60 + satelliteConf * 0.15 + 8.0, 15, 65);

  function bandFromScore(score: number): "Low" | "Medium" | "High" {
    if (score >= 65) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  }

  function sevFromProb(pct: number): "Low" | "Medium" | "High" | "Critical" {
    if (pct >= 80) return "Critical";
    if (pct >= 65) return "High";
    if (pct >= 45) return "Medium";
    return "Low";
  }

  const diseaseRisk = bandFromScore(probabilityPct);

  // Approximate biotic/abiotic from health
  const bioticStress = clamp(100 - health + (100 - health) * 0.3, 0, 100);
  const pestRisk = bandFromScore(bioticStress);

  // Yield loss: (100 - health) * 0.22 + biotic * 0.08 + abiotic * 0.05
  const abioticStress = clamp((100 - health) * 0.8, 0, 100);
  const yieldLossRiskPct = clamp(
    (100 - health) * 0.22 + bioticStress * 0.08 + abioticStress * 0.05,
    0,
    100,
  );

  // Affected area ≈ (100 - health) * 0.18 + anomaly * 0.07
  const anomalyScore = clamp(Math.abs(baseDiseaseProb - 0.3) * 100, 0, 40);
  const affectedAreaPct = clamp(
    (100 - health) * 0.18 + anomalyScore * 0.07,
    0.5,
    45,
  );

  return {
    fieldId,
    crop: p.crop,
    healthScorePct: health,
    diseaseDetected: {
      name: diseaseName,
      probabilityPct: Math.round(probabilityPct * 10) / 10,
      severity: sevFromProb(probabilityPct),
      affectedAreaPct: Math.round(affectedAreaPct * 10) / 10,
    },
    aiRecommendation: {
      title: "Follow the field action plan based on detected " + diseaseName + " risk.",
      steps: [
        "Continue routine monitoring.",
        "Conduct weekly scouting.",
        "Upload a new geo-tagged crop image after 5 days to validate the advisory.",
      ],
    },
    predictedRisk7Days: {
      diseaseRisk,
      pestRisk,
      yieldLossRiskPct: Math.round(yieldLossRiskPct * 10) / 10,
    },
    weatherAlert: {
      tone: "warning",
      message: "High drought risk over the next few days.",
      guidance: "Prioritise irrigation scheduling and avoid water stress during peak hours.",
    },
  };
}

export function getFieldAdvisoryPayload(fieldId: string): FieldAdvisoryPayload {
  // Mock fallback for cases where we can't load backend data.
  return buildDefaultAdvisory(fieldId);
}

export async function getFieldAdvisoryPayloadAsync(fieldId: string): Promise<FieldAdvisoryPayload> {
  try {
    const res = await getFieldAdvisory(fieldId);
    return {
      fieldId: res.fieldId,
      crop: res.crop,
      healthScorePct: res.healthScorePct,
      diseaseDetected: {
        name: res.diseaseDetected.name,
        probabilityPct: res.diseaseDetected.probabilityPct,
        severity: res.diseaseDetected.severity,
        affectedAreaPct: res.diseaseDetected.affectedAreaPct,
      },
      aiRecommendation: {
        title: res.aiRecommendation.title,
        steps: res.aiRecommendation.steps,
      },
      predictedRisk7Days: {
        diseaseRisk: res.predictedRisk7Days.diseaseRisk,
        pestRisk: res.predictedRisk7Days.pestRisk,
        yieldLossRiskPct: res.predictedRisk7Days.yieldLossRiskPct,
      },
      weatherAlert: {
        tone: res.weatherAlert.tone,
        message: res.weatherAlert.message,
        guidance: res.weatherAlert.guidance,
      },
    };
  } catch {
    return buildDefaultAdvisory(fieldId);
  }
}

export function getPredictedRiskLabels(pred: Prediction) {
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
