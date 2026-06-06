from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Indices:
    ndvi: float
    evi: float
    ndre: float
    savi: float


SEVERITY = ("Low", "Medium", "High", "Critical")


def indices_to_health(indices: Indices) -> tuple[float, str, float]:
    """Map vegetation indices to a 0..100 healthScore and a risk/severity bucket.

    This is a placeholder deterministic mapping:
    - High biomass/greenness (NDVI/EVI/NDRE high) => high health
    - Lower indices => more stress
    """

    # Normalize each index into roughly comparable ranges.
    # (In real life, these depend on sensor/product and crop type.)
    ndvi_n = clamp01((indices.ndvi - 0.2) / 0.6)
    evi_n = clamp01((indices.evi - 0.1) / 0.7)
    ndre_n = clamp01((indices.ndre - 0.05) / 0.6)
    savi_n = clamp01((indices.savi - 0.1) / 0.6)

    # UCHI = 0.35 * NDVI + 0.25 * EVI + 0.25 * NDRE + 0.15 * SAVI
    health = round(100.0 * (0.35 * ndvi_n + 0.25 * evi_n + 0.25 * ndre_n + 0.15 * savi_n), 1)

    # Convert to risk bucket based on requirements:
    # 0-40 Critical, 40-60 Moderate Stress (Medium), 60-80 Healthy (Low), 80-100 Excellent (Low)
    if health >= 60:
        risk = "Low"
    elif health >= 40:
        risk = "Medium"
    else:
        risk = "Critical"

    # riskIndex is 0..100 where higher means more risk.
    risk_index = round(100.0 - health, 0)

    return health, risk, risk_index


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x

