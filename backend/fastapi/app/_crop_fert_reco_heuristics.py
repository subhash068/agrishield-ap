from __future__ import annotations
from dataclasses import dataclass
from typing import Literal
import os
import csv

Risk = Literal["Low", "Medium", "High"]
SoilHealth = Literal["Poor", "Moderate", "Good"]
GrowthStage = Literal["Vegetative", "Flowering", "Grain Filling", "Maturity"]

# Supported crops
SUPPORTED_CROPS = {"paddy", "cotton", "groundnut", "red gram", "chilli", "maize", "tomato", "sugarcane", "soybean", "mustard", "potato", "wheat", "sunflower", "apple", "grape", "pepper", "brinjal", "pea", "guava", "pumpkin", "mango"}


@dataclass(frozen=True)
class CropRecoHeuristicInput:
    detected_crop: str | None
    weather_rainfall_mm: float | None
    satellite_unified_health_index_pct: float | None
    satellite_satellite_confidence_pct: float | None
    disease_risk: Risk
    pest_risk: Risk


@dataclass(frozen=True)
class FertilizerRecoHeuristicInput:
    crop: str | None
    weather_rainfall_mm: float | None
    satellite_unified_health_index_pct: float | None
    satellite_abiotic_stress_score_pct: float | None
    satellite_soil_moisture_score_pct: float | None
    disease_risk: Risk
    pest_risk: Risk
    soil_health: SoilHealth = "Moderate"
    growth_stage: GrowthStage = "Vegetative"


# ── Crop metadata ──────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class CropMeta:
    name: str
    n_requirement_kg_ha: float
    p_requirement_kg_ha: float
    k_requirement_kg_ha: float
    base_yield_t_ha: float
    yield_gain_factor: float


CROP_METADATA: dict[str, CropMeta] = {
    "paddy": CropMeta(
        name="Paddy",
        n_requirement_kg_ha=80.0,
        p_requirement_kg_ha=40.0,
        k_requirement_kg_ha=40.0,
        base_yield_t_ha=4.5,
        yield_gain_factor=0.045,
    ),
    "cotton": CropMeta(
        name="Cotton",
        n_requirement_kg_ha=100.0,
        p_requirement_kg_ha=50.0,
        k_requirement_kg_ha=50.0,
        base_yield_t_ha=2.0,
        yield_gain_factor=0.035,
    ),
    "groundnut": CropMeta(
        name="Groundnut",
        n_requirement_kg_ha=20.0,
        p_requirement_kg_ha=45.0,
        k_requirement_kg_ha=30.0,
        base_yield_t_ha=1.8,
        yield_gain_factor=0.04,
    ),
    "red gram": CropMeta(
        name="Red Gram",
        n_requirement_kg_ha=25.0,
        p_requirement_kg_ha=50.0,
        k_requirement_kg_ha=30.0,
        base_yield_t_ha=1.5,
        yield_gain_factor=0.038,
    ),
    "chilli": CropMeta(
        name="Chilli",
        n_requirement_kg_ha=120.0,
        p_requirement_kg_ha=60.0,
        k_requirement_kg_ha=60.0,
        base_yield_t_ha=2.5,
        yield_gain_factor=0.05,
    ),
    "maize": CropMeta(
        name="Maize",
        n_requirement_kg_ha=150.0,
        p_requirement_kg_ha=60.0,
        k_requirement_kg_ha=60.0,
        base_yield_t_ha=5.0,
        yield_gain_factor=0.04,
    ),
    "tomato": CropMeta(name="Tomato", n_requirement_kg_ha=120.0, p_requirement_kg_ha=60.0, k_requirement_kg_ha=60.0, base_yield_t_ha=20.0, yield_gain_factor=0.06),
    "sugarcane": CropMeta(name="Sugarcane", n_requirement_kg_ha=250.0, p_requirement_kg_ha=100.0, k_requirement_kg_ha=100.0, base_yield_t_ha=80.0, yield_gain_factor=0.03),
    "soybean": CropMeta(name="Soybean", n_requirement_kg_ha=30.0, p_requirement_kg_ha=60.0, k_requirement_kg_ha=40.0, base_yield_t_ha=2.5, yield_gain_factor=0.04),
    "mustard": CropMeta(name="Mustard", n_requirement_kg_ha=80.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=40.0, base_yield_t_ha=1.5, yield_gain_factor=0.035),
    "potato": CropMeta(name="Potato", n_requirement_kg_ha=150.0, p_requirement_kg_ha=80.0, k_requirement_kg_ha=100.0, base_yield_t_ha=20.0, yield_gain_factor=0.04),
    "wheat": CropMeta(name="Wheat", n_requirement_kg_ha=120.0, p_requirement_kg_ha=60.0, k_requirement_kg_ha=40.0, base_yield_t_ha=3.5, yield_gain_factor=0.04),
    "sunflower": CropMeta(name="Sunflower", n_requirement_kg_ha=80.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=40.0, base_yield_t_ha=1.8, yield_gain_factor=0.038),
    "apple": CropMeta(name="Apple", n_requirement_kg_ha=100.0, p_requirement_kg_ha=50.0, k_requirement_kg_ha=100.0, base_yield_t_ha=15.0, yield_gain_factor=0.04),
    "grape": CropMeta(name="Grape", n_requirement_kg_ha=80.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=80.0, base_yield_t_ha=10.0, yield_gain_factor=0.04),
    "pepper": CropMeta(name="Pepper", n_requirement_kg_ha=100.0, p_requirement_kg_ha=50.0, k_requirement_kg_ha=50.0, base_yield_t_ha=1.5, yield_gain_factor=0.05),
    "brinjal": CropMeta(name="Brinjal", n_requirement_kg_ha=100.0, p_requirement_kg_ha=50.0, k_requirement_kg_ha=50.0, base_yield_t_ha=20.0, yield_gain_factor=0.05),
    "pea": CropMeta(name="Pea", n_requirement_kg_ha=20.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=20.0, base_yield_t_ha=1.5, yield_gain_factor=0.04),
    "guava": CropMeta(name="Guava", n_requirement_kg_ha=80.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=80.0, base_yield_t_ha=15.0, yield_gain_factor=0.04),
    "pumpkin": CropMeta(name="Pumpkin", n_requirement_kg_ha=80.0, p_requirement_kg_ha=40.0, k_requirement_kg_ha=60.0, base_yield_t_ha=15.0, yield_gain_factor=0.04),
    "mango": CropMeta(name="Mango", n_requirement_kg_ha=100.0, p_requirement_kg_ha=50.0, k_requirement_kg_ha=100.0, base_yield_t_ha=10.0, yield_gain_factor=0.04),
}

# ── Fertilizer products ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class FertilizerProduct:
    name: str
    n_pct: float
    p_pct: float
    k_pct: float
    cost_rs_per_kg: float
    label: str


FERTILIZERS: dict[str, FertilizerProduct] = {
    "urea": FertilizerProduct(name="Urea", n_pct=46.0, p_pct=0.0, k_pct=0.0, cost_rs_per_kg=6.0, label="Urea (46% N)"),
    "dap": FertilizerProduct(name="DAP", n_pct=18.0, p_pct=46.0, k_pct=0.0, cost_rs_per_kg=27.0, label="DAP (18% N, 46% P)"),
    "npk": FertilizerProduct(name="NPK", n_pct=10.0, p_pct=26.0, k_pct=26.0, cost_rs_per_kg=22.0, label="NPK (10-26-26)"),
    "mop": FertilizerProduct(name="MOP", n_pct=0.0, p_pct=0.0, k_pct=60.0, cost_rs_per_kg=18.0, label="MOP (60% K)"),
    "gypsum": FertilizerProduct(name="Gypsum", n_pct=0.0, p_pct=0.0, k_pct=18.0, cost_rs_per_kg=3.0, label="Gypsum (CaSO4)"),
    "complex": FertilizerProduct(name="NPK Complex", n_pct=12.0, p_pct=32.0, k_pct=16.0, cost_rs_per_kg=24.0, label="NPK Complex (12-32-16)"),
}


# ── Timing schedules by crop and growth stage ───────────────────────────────────

TIMING_SCHEDULES: dict[str, dict[GrowthStage, tuple[str, str]]] = {
    "paddy": {
        "Vegetative": ("Basal + 21 days after transplanting", "Broadcast and incorporate into soil"),
        "Flowering": ("Panicle initiation (45-50 DAT)", "Foliar spray preferred"),
        "Grain Filling": ("Grain filling stage (70-80 DAT)", "Foliar spray only"),
        "Maturity": ("Last dressing 90 DAT", "Not recommended"),
    },
    "cotton": {
        "Vegetative": ("Basal + 30 DAS", "Side-dressing near root zone"),
        "Flowering": ("First flowering (45-50 DAS)", "Dibble method"),
        "Grain Filling": ("Peak boll development (70-90 DAS)", "Foliar spray"),
        "Maturity": ("First open boll stage", "Foliar spray only"),
    },
    "groundnut": {
        "Vegetative": ("Basal + 20 DAS", "Band placement near rows"),
        "Flowering": ("Pegging stage (30-35 DAS)", "Side dressing"),
        "Grain Filling": ("Pod filling (50-60 DAS)", "Foliar spray"),
        "Maturity": ("No application after 70 DAS", "Not recommended"),
    },
    "red gram": {
        "Vegetative": ("Basal + 25 DAS", "Band placement"),
        "Flowering": ("First flowering (40-45 DAS)", "Side-dressing"),
        "Grain Filling": ("Pod development (60-70 DAS)", "Foliar spray"),
        "Maturity": ("Pod maturity stage", "Not recommended"),
    },
    "chilli": {
        "Vegetative": ("Basal + 30 DAT", "Band placement"),
        "Flowering": ("First flowering (45-50 DAT)", "Side-dressing"),
        "Grain Filling": ("Fruit development (60-80 DAT)", "Foliar spray"),
        "Maturity": ("Harvest stage", "Not recommended"),
    },
    "maize": {
        "Vegetative": ("Knee high stage (30 DAS)", "Side-dressing"),
        "Flowering": ("Tasseling (50-55 DAS)", "Broadcast"),
        "Grain Filling": ("Silking/Grain filling (65-75 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "tomato": {
        "Vegetative": ("Basal + 20 DAT", "Band placement"),
        "Flowering": ("Early flowering (30-40 DAT)", "Side-dressing"),
        "Grain Filling": ("Fruit setting (50-60 DAT)", "Foliar spray"),
        "Maturity": ("Harvest stage", "Not recommended"),
    },
    "sugarcane": {
        "Vegetative": ("Basal + 45 DAS", "Band placement"),
        "Flowering": ("Tillering (90-120 DAS)", "Side-dressing"),
        "Grain Filling": ("Grand growth (150-180 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "soybean": {
        "Vegetative": ("Basal", "Band placement"),
        "Flowering": ("Pre-flowering (35-40 DAS)", "Foliar spray"),
        "Grain Filling": ("Pod filling (55-65 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "mustard": {
        "Vegetative": ("Basal + 25 DAS", "Band placement"),
        "Flowering": ("Pre-flowering (40-45 DAS)", "Side-dressing"),
        "Grain Filling": ("Siliqua formation (60-70 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "potato": {
        "Vegetative": ("Basal + 25 DAS", "Band placement"),
        "Flowering": ("Tuber initiation (40-45 DAS)", "Side-dressing"),
        "Grain Filling": ("Tuber bulking (60-70 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "wheat": {
        "Vegetative": ("Basal + 21 DAS (CRI stage)", "Top dressing"),
        "Flowering": ("Late jointing / Booting (60-65 DAS)", "Top dressing"),
        "Grain Filling": ("Milking stage (80-85 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "sunflower": {
        "Vegetative": ("Basal + 30 DAS", "Band placement"),
        "Flowering": ("Star bud stage (40-45 DAS)", "Side-dressing"),
        "Grain Filling": ("Seed filling (60-70 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "apple": {
        "Vegetative": ("Spring / Bud break", "Soil application"),
        "Flowering": ("Petal fall", "Foliar spray"),
        "Grain Filling": ("Fruit development", "Foliar spray"),
        "Maturity": ("Pre-harvest", "Not recommended"),
    },
    "grape": {
        "Vegetative": ("Bud burst", "Soil application"),
        "Flowering": ("Pre-bloom", "Foliar spray"),
        "Grain Filling": ("Berry development", "Foliar spray"),
        "Maturity": ("Veraison / Ripening", "Not recommended"),
    },
    "pepper": {
        "Vegetative": ("Basal + 30 DAT", "Band placement"),
        "Flowering": ("First flowering (45-50 DAT)", "Side-dressing"),
        "Grain Filling": ("Fruit development (60-80 DAT)", "Foliar spray"),
        "Maturity": ("Harvest stage", "Not recommended"),
    },
    "brinjal": {
        "Vegetative": ("Basal + 30 DAT", "Band placement"),
        "Flowering": ("First flowering (45-50 DAT)", "Side-dressing"),
        "Grain Filling": ("Fruit development (60-80 DAT)", "Foliar spray"),
        "Maturity": ("Harvest stage", "Not recommended"),
    },
    "pea": {
        "Vegetative": ("Basal", "Band placement"),
        "Flowering": ("First flowering (35-40 DAS)", "Foliar spray"),
        "Grain Filling": ("Pod filling (50-60 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "guava": {
        "Vegetative": ("Pre-monsoon", "Soil application"),
        "Flowering": ("Flowering stage", "Foliar spray"),
        "Grain Filling": ("Fruit development", "Foliar spray"),
        "Maturity": ("Ripening", "Not recommended"),
    },
    "pumpkin": {
        "Vegetative": ("Basal + 20 DAS", "Band placement"),
        "Flowering": ("Vining / Flowering (35-40 DAS)", "Side-dressing"),
        "Grain Filling": ("Fruit development (50-60 DAS)", "Foliar spray"),
        "Maturity": ("Maturity stage", "Not recommended"),
    },
    "mango": {
        "Vegetative": ("Post-harvest / Pre-monsoon", "Soil application"),
        "Flowering": ("Pre-bloom (Panicle emergence)", "Foliar spray"),
        "Grain Filling": ("Fruit set (Pea/Marble stage)", "Foliar spray"),
        "Maturity": ("Maturation", "Not recommended"),
    },
}


# ── Crop recommendation ────────────────────────────────────────────────────────

def recommend_crop_poc(inp: CropRecoHeuristicInput) -> tuple[str, int]:
    crop = (inp.detected_crop or "").strip()

    health = inp.satellite_unified_health_index_pct if inp.satellite_unified_health_index_pct is not None else 60.0
    sat_conf = inp.satellite_satellite_confidence_pct if inp.satellite_satellite_confidence_pct is not None else 60.0

    stress_proxy = max(0.0, min(100.0, 100.0 - health))
    conf = 45 + (sat_conf * 0.35) - (stress_proxy * 0.25)

    if crop:
        if inp.disease_risk == "High" or inp.pest_risk == "High":
            conf += 6
        else:
            conf += 2
    else:
        if inp.disease_risk == "High" or inp.pest_risk == "High":
            crop = "Red Gram"
        elif inp.disease_risk == "Medium" or inp.pest_risk == "Medium":
            crop = "Cotton"
        else:
            crop = "Paddy"
        conf -= 10

    conf_int = int(round(max(25, min(96, conf))))
    return crop, conf_int


# ── Nutrient deficiency proxies ────────────────────────────────────────────────

def _n_deficiency_prob(
    disease_risk: Risk,
    pest_risk: Risk,
    unified_health_index_pct: float | None,
    abiotic_stress_score_pct: float | None,
    soil_moisture_score_pct: float | None,
) -> float:
    health = unified_health_index_pct if unified_health_index_pct is not None else 60.0
    abiotic = abiotic_stress_score_pct if abiotic_stress_score_pct is not None else 45.0
    moisture = soil_moisture_score_pct if soil_moisture_score_pct is not None else 55.0

    stress_from_health = max(0.0, min(100.0, 100.0 - health))
    score = 0.45 * (abiotic / 100.0) + 0.35 * (stress_from_health / 100.0) + 0.20 * (1.0 - moisture / 100.0)

    if disease_risk == "High":
        score += 0.07
    if pest_risk == "High":
        score += 0.05
    if disease_risk == "Low" and pest_risk == "Low":
        score -= 0.04

    return max(0.0, min(1.0, score))


def _p_deficiency_prob(
    soil_health: SoilHealth,
    growth_stage: GrowthStage,
    rainfall_mm: float | None,
) -> float:
    base: float = {"Poor": 0.65, "Moderate": 0.42, "Good": 0.22}[soil_health]

    if growth_stage == "Vegetative":
        base += 0.12
    elif growth_stage == "Flowering":
        base -= 0.05
    elif growth_stage == "Maturity":
        base -= 0.10

    rain = rainfall_mm if rainfall_mm is not None else 50.0
    if rain < 20:
        base += 0.08
    elif rain > 150:
        base -= 0.06

    return max(0.0, min(1.0, base))


def _k_deficiency_prob(
    soil_health: SoilHealth,
    disease_risk: Risk,
    rainfall_mm: float | None,
) -> float:
    base: float = {"Poor": 0.58, "Moderate": 0.38, "Good": 0.18}[soil_health]

    if disease_risk == "High":
        base += 0.09
    elif disease_risk == "Low":
        base -= 0.05

    rain = rainfall_mm if rainfall_mm is not None else 50.0
    if rain > 200:
        base += 0.10
    elif rain < 30:
        base += 0.07

    return max(0.0, min(1.0, base))


def _deficiency_severity(prob: float) -> Literal["Low", "Moderate", "High"]:
    if prob >= 0.60:
        return "High"
    elif prob >= 0.40:
        return "Moderate"
    return "Low"


# ── Fertilizer recommendation ──────────────────────────────────────────────────

def _select_fertilizer(
    n_prob: float,
    p_prob: float,
    k_prob: float,
) -> tuple[FertilizerProduct, str]:
    if n_prob >= 0.62:
        if p_prob >= 0.55:
            return FERTILIZERS["dap"], "High nitrogen and phosphate deficiency detected; DAP provides both N and P immediately."
        return FERTILIZERS["urea"], "Severe nitrogen deficiency proxy detected (high abiotic stress and low crop health index)."

    if n_prob >= 0.42:
        if k_prob >= 0.55:
            return FERTILIZERS["npk"], "Moderate nutrient stress proxy; balanced NPK recommended to address N, P, and K gaps."
        return FERTILIZERS["dap"], "Moderate N deficiency; DAP provides quick nitrogen and phosphorus boost."

    if p_prob >= 0.58:
        return FERTILIZERS["dap"], "Phosphate deficiency detected (poor soil or early growth stage); DAP recommended."
    if k_prob >= 0.58:
        return FERTILIZERS["mop"], "Potassium deficiency detected (high rainfall or disease stress); MOP recommended."

    return FERTILIZERS["npk"], "Low nutrient deficiency proxy; maintain balanced fertilization with NPK."


def _base_dosage_kg_ha(crop_meta: CropMeta, soil_health: SoilHealth, growth_stage: GrowthStage) -> float:
    health_factor: float = {"Poor": 1.30, "Moderate": 1.0, "Good": 0.78}[soil_health]
    stage_factor: float = {
        "Vegetative": 1.15,
        "Flowering": 1.0,
        "Grain Filling": 0.80,
        "Maturity": 0.30,
    }[growth_stage]
    return (crop_meta.n_requirement_kg_ha / 0.46) * health_factor * stage_factor


def _dosage_for_product(
    product: FertilizerProduct,
    base_dosage_kg_ha: float,
    n_prob: float,
    crop_meta: CropMeta,
) -> float:
    if product.n_pct > 0:
        n_base = base_dosage_kg_ha * (product.n_pct / 46.0)
        return round(max(10.0, n_base), 1)

    if product.p_pct > 0:
        p_base = (crop_meta.p_requirement_kg_ha / product.p_pct) * 100.0
        return round(max(10.0, p_base * (0.7 + n_prob * 0.3)), 1)

    if product.k_pct > 0:
        k_base = (crop_meta.k_requirement_kg_ha / product.k_pct) * 100.0
        return round(max(8.0, k_base), 1)

    return round(max(15.0, base_dosage_kg_ha * 0.5), 1)


def recommend_fertilizer_poc(inp: FertilizerRecoHeuristicInput) -> dict:
    """
    Full fertilizer recommendation engine.

    Inputs:
      - Crop (Paddy, Cotton, Groundnut, Red Gram)
      - Soil Health (Poor, Moderate, Good)
      - Growth Stage (Vegetative, Flowering, Grain Filling, Maturity)
      - Weather rainfall (mm)
      - Satellite health/stress scores

    Outputs:
      - Fertilizer name, dosage, timing, cost, expected yield gain
      - Nutrient deficiency breakdown (N, P, K)
    """
    crop_raw = (inp.crop or "").strip() or "Paddy"
    crop_key = crop_raw.lower()
    if crop_key not in SUPPORTED_CROPS:
        crop_key = "paddy"

    crop_meta = CROP_METADATA[crop_key]

    n_prob = _n_deficiency_prob(
        disease_risk=inp.disease_risk,
        pest_risk=inp.pest_risk,
        unified_health_index_pct=inp.satellite_unified_health_index_pct,
        abiotic_stress_score_pct=inp.satellite_abiotic_stress_score_pct,
        soil_moisture_score_pct=inp.satellite_soil_moisture_score_pct,
    )
    p_prob = _p_deficiency_prob(
        soil_health=inp.soil_health,
        growth_stage=inp.growth_stage,
        rainfall_mm=inp.weather_rainfall_mm,
    )
    k_prob = _k_deficiency_prob(
        soil_health=inp.soil_health,
        disease_risk=inp.disease_risk,
        rainfall_mm=inp.weather_rainfall_mm,
    )

    product, reason = _select_fertilizer(n_prob, p_prob, k_prob)

    base_kg_ha = _base_dosage_kg_ha(crop_meta, inp.soil_health, inp.growth_stage)
    dosage_per_kg_ha = _dosage_for_product(product, base_kg_ha, n_prob, crop_meta)
    dosage_per_acre = round(dosage_per_kg_ha / 2.471, 1)

    timing_schedule = TIMING_SCHEDULES.get(crop_key, TIMING_SCHEDULES["paddy"])
    timing_label, method = timing_schedule.get(inp.growth_stage, timing_schedule["Vegetative"])

    cost_per_acre = round(dosage_per_acre * product.cost_rs_per_kg, 0)

    # --- CSV Override ---
    csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "public", "data", "AI_Crop_Disease_Fertilizer_Dataset.csv")
    csv_fertilizer_name = product.label
    csv_reason = reason
    if os.path.exists(csv_path):
        matches = []
        with open(csv_path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                c = row.get("crop_name", "").lower()
                if crop_key in c or c in crop_key:
                    matches.append(row)
        
        if matches:
            # Pick a match (e.g. first one, or second if High risk for variety)
            match = matches[1] if inp.disease_risk == "High" and len(matches) > 1 else matches[0]
            csv_fertilizer_name = match.get("recommended_fertilizer", product.label)
            try:
                dosage_per_acre = float(match.get("dosage_per_acre_kg", dosage_per_acre))
            except:
                pass
            method = match.get("application_method", method)
            disease = match.get("disease_name", "disease")
            csv_reason = f"AI Dataset Recommendation: Specifically optimal for {crop_meta.name} to prevent/treat {disease} under current risk profiles."

    nutrient_balance = (1.0 - n_prob) * 0.4 + (1.0 - p_prob) * 0.3 + (1.0 - k_prob) * 0.3
    yield_gain_pct = round(crop_meta.yield_gain_factor * 100 * nutrient_balance * (1.0 + n_prob * 0.3), 2)

    conf = int(round(68 + n_prob * 14 + (1.0 - p_prob) * 8 + (1.0 - k_prob) * 8))

    nutrient_deficiencies = [
        {"nutrient": "Nitrogen (N)", "severity": _deficiency_severity(n_prob), "probability": round(n_prob, 3)},
        {"nutrient": "Phosphate (P)", "severity": _deficiency_severity(p_prob), "probability": round(p_prob, 3)},
        {"nutrient": "Potassium (K)", "severity": _deficiency_severity(k_prob), "probability": round(k_prob, 3)},
    ]

    return {
        "crop": crop_meta.name,
        "fertilizer_name": csv_fertilizer_name,
        "dosage_kg_per_acre": dosage_per_acre,
        "dosage_kg_total": dosage_per_acre,
        "timing": timing_label,
        "application_method": method,
        "cost_rs_per_acre": cost_per_acre,
        "expected_yield_gain_percent": yield_gain_pct,
        "confidence": conf,
        "reason": csv_reason,
        "nutrient_deficiencies": nutrient_deficiencies,
        "nitrogen_deficiency_probability": round(n_prob, 3),
        "phosphate_deficiency_probability": round(p_prob, 3),
        "potassium_deficiency_probability": round(k_prob, 3),
    }
