import csv
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class YieldSeries:
    # sorted by year ascending
    years: List[int]
    yields_kg_per_ha: List[float]
    production_1000_tons: List[float]
    area_1000_ha: List[float]


@dataclass(frozen=True)
class PredictRequest:
    district: str
    crop: str
    year: int
    rainfall_mm: float


@dataclass(frozen=True)
class PredictResponse:
    district: str
    crop: str
    input_year: int
    rainfall_mm: float
    predicted_yield_kg_per_ha: float
    predicted_production_1000_tons: float
    risk_level: str
    yield_reduction_percent: float
    explanation: str


_CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "data",
    "ICRISAT-District Level Data.csv",
)


def _clean(s: str) -> str:
    return " ".join(s.replace("\ufeff", "").split()).strip()


def _crop_key_from_header(header: str) -> Optional[str]:
    header = _clean(header)
    # e.g. "RICE YIELD (Kg per ha)" -> "RICE"
    if header.endswith("YIELD (Kg per ha)"):
        return header.replace(" YIELD (Kg per ha)", "").strip()
    if header.endswith(" YIELD (Kg per ha)"):
        return header.replace(" YIELD (Kg per ha)", "").strip()
    return None


def _find_crop_columns(fieldnames: List[str]) -> Dict[str, Dict[str, str]]:
    # return { crop: {area_col, prod_col, yield_col} }
    cols: Dict[str, Dict[str, str]] = {}
    for fn in fieldnames:
        fn_clean = _clean(fn)
        if fn_clean.endswith(" AREA (1000 ha)"):
            crop = fn_clean[: -len(" AREA (1000 ha)")]
            cols.setdefault(crop, {})["area"] = fn
        elif fn_clean.endswith(" PRODUCTION (1000 tons)"):
            crop = fn_clean[: -len(" PRODUCTION (1000 tons)")]
            cols.setdefault(crop, {})["production"] = fn
        elif fn_clean.endswith(" YIELD (Kg per ha)"):
            crop = fn_clean[: -len(" YIELD (Kg per ha)")]
            cols.setdefault(crop, {})["yield"] = fn

    # ensure all three exist
    return {k: v for k, v in cols.items() if {"area", "production", "yield"}.issubset(set(v.keys()))}


@lru_cache(maxsize=1)
def load_icrisat_table() -> Tuple[Dict[Tuple[str, str], YieldSeries], List[str]]:
    if not os.path.exists(_CSV_PATH):
        raise FileNotFoundError(f"ICRISAT CSV not found: {_CSV_PATH}")

    with open(_CSV_PATH, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        crop_cols = _find_crop_columns(fieldnames)

        series_map: Dict[Tuple[str, str], List[Tuple[int, float, float, float]]] = {}

        for row in reader:
            dist = _clean(row.get("Dist Name", ""))
            year_raw = row.get("Year", "")
            if not dist or not year_raw:
                continue
            try:
                year = int(float(year_raw))
            except Exception:
                continue

            for crop, colmap in crop_cols.items():
                try:
                    yld = float(row.get(colmap["yield"], "0") or 0)
                    prod = float(row.get(colmap["production"], "0") or 0)
                    area = float(row.get(colmap["area"], "0") or 0)
                except Exception:
                    continue

                # Skip all-zero crops (keeps demo tidy)
                if yld == 0 and prod == 0 and area == 0:
                    continue

                key = (dist, crop)
                series_map.setdefault(key, []).append((year, yld, prod, area))

    # finalize
    out: Dict[Tuple[str, str], YieldSeries] = {}
    for key, items in series_map.items():
        items.sort(key=lambda t: t[0])
        years = [t[0] for t in items]
        yields = [t[1] for t in items]
        prods = [t[2] for t in items]
        areas = [t[3] for t in items]
        out[key] = YieldSeries(
            years=years,
            yields_kg_per_ha=yields,
            production_1000_tons=prods,
            area_1000_ha=areas,
        )

    crops = sorted({crop for _, crop in out.keys()})
    return out, crops


def _risk_from_reduction(reduction_percent: float) -> str:
    if reduction_percent < 5:
        return "Low"
    if reduction_percent < 10:
        return "Medium"
    if reduction_percent < 15:
        return "High"
    return "Critical"


def _normalize_rainfall(rainfall_mm: float) -> float:
    # Map rainfall to 0..1 where 0 = drought (low) and 1 = adequate
    # With no crop-specific agri norms in dataset, keep it simple & stable for demo.
    # 500mm -> 1.0, 100mm -> 0.0 (clamped)
    return max(0.0, min(1.0, (rainfall_mm - 100.0) / 400.0))


def _predict_for_series(
    district: str,
    crop: str,
    year: int,
    rainfall_mm: float,
    series: YieldSeries,
) -> PredictResponse:
    # Historical baseline: moving average over last 5 years prior to input year if available, else last 5.
    prior = [(y, yd, pr, ar) for y, yd, pr, ar in zip(series.years, series.yields_kg_per_ha, series.production_1000_tons, series.area_1000_ha) if y < year]
    if not prior:
        prior = list(zip(series.years, series.yields_kg_per_ha, series.production_1000_tons, series.area_1000_ha))[-5:]

    prior = prior[-5:]
    base_yield = sum(t[1] for t in prior) / len(prior)
    base_prod = sum(t[2] for t in prior) / len(prior)
    base_area = sum(t[3] for t in prior) / len(prior)

    rain_ok = _normalize_rainfall(rainfall_mm)
    # If rainfall is low, reduce yield. If rainfall is high, slight uplift.
    # reduction_factor in 0..0.35
    if rain_ok >= 0.8:
        uplift = (rain_ok - 0.8) / 0.2 * 0.06  # up to +6%
        predicted_yield = base_yield * (1.0 + uplift)
    else:
        drought_factor = 1.0 - rain_ok  # 0..1
        predicted_yield = base_yield * (1.0 - drought_factor * 0.30)

    # Production scales with area and yield.
    # Keep area roughly baseline; demo remains stable.
    predicted_production = predicted_yield * base_area / 1000.0  # kg/ha * 1000ha -> ton*? (approx); dataset units demo only

    # Yield reduction vs baseline
    reduction_percent = ((base_yield - predicted_yield) / base_yield) * 100.0 if base_yield else 0.0
    reduction_percent = max(0.0, reduction_percent)

    risk = _risk_from_reduction(reduction_percent)

    explanation = (
        f"Baseline moving-average yield for {district}/{crop} uses the last {len(prior)} available years. "
        f"Rainfall signal {rainfall_mm:.1f}mm normalized={rain_ok:.2f}. "
        f"Predicted yield adjusts vs drought sensitivity (demo heuristic)."
    )

    return PredictResponse(
        district=district,
        crop=crop,
        input_year=year,
        rainfall_mm=rainfall_mm,
        predicted_yield_kg_per_ha=round(predicted_yield, 2),
        predicted_production_1000_tons=round(predicted_production, 2),
        risk_level=risk,
        yield_reduction_percent=round(reduction_percent, 1),
        explanation=explanation,
    )


@lru_cache(maxsize=256)
def get_yield_series(district: str, crop: str) -> Optional[YieldSeries]:
    table, _ = load_icrisat_table()
    return table.get((_clean(district), crop))


def list_districts_and_crops() -> Tuple[List[str], List[str]]:
    table, crops = load_icrisat_table()
    districts = sorted({dist for dist, _ in table.keys()})
    return districts, crops


def yield_history(district: str, crop: str) -> List[Dict[str, float]]:
    series = get_yield_series(district, crop)
    if not series:
        return []
    return [
        {"year": float(y), "yieldKgPerHa": yd, "production1000Tons": pr, "area1000Ha": ar}
        for y, yd, pr, ar in zip(series.years, series.yields_kg_per_ha, series.production_1000_tons, series.area_1000_ha)
    ]


def predict_yield(district: str, crop: str, year: int, rainfall_mm: float) -> PredictResponse:
    series = get_yield_series(district, crop)
    if not series:
        # Fallback deterministic response for missing combos
        return PredictResponse(
            district=_clean(district),
            crop=crop,
            input_year=year,
            rainfall_mm=rainfall_mm,
            predicted_yield_kg_per_ha=0.0,
            predicted_production_1000_tons=0.0,
            risk_level="Low",
            yield_reduction_percent=0.0,
            explanation="No historical data found for that district/crop pair in ICRISAT CSV.",
        )

    return _predict_for_series(_clean(district), crop, year, rainfall_mm, series)

