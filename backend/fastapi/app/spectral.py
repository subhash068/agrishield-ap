from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Indices:
    ndvi: float
    evi: float
    ndre: float


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

    # Weighted health score.
    health = round(100.0 * (0.45 * ndvi_n + 0.35 * evi_n + 0.20 * ndre_n), 1)

    # Convert to risk bucket.
    # Thresholds tuned for demo.
    if health >= 78:
        risk = "Low"
    elif health >= 62:
        risk = "Medium"
    elif health >= 45:
        risk = "High"
    else:
        risk = "Critical"

    # riskIndex is 0..100 where higher means more risk.
    risk_index = round(100.0 - health, 0)

    return health, risk, risk_index


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x

