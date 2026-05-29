from __future__ import annotations

import csv
import math
import sys
from pathlib import Path

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import SessionLocal
from app import models


OUTPUT_PATH = ROOT / "data" / "parcels.csv"


def _seeded(value: int) -> float:
    x = math.sin(value) * 10000
    return x - math.floor(x)


def _mock_rows() -> list[dict[str, object]]:
    crops = ["Paddy", "Cotton", "Maize", "Chilli", "Red Gram"]
    districts = [
        "Anantapur",
        "Chittoor",
        "East Godavari",
        "Guntur",
        "Krishna",
        "Kurnool",
        "Nellore",
        "Prakasam",
        "Srikakulam",
        "Visakhapatnam",
        "Vizianagaram",
        "West Godavari",
        "YSR Kadapa",
    ]
    farmers = [
        "Ramesh Reddy",
        "Lakshmi Devi",
        "Suresh Naidu",
        "Kavitha Rao",
        "Venkat Rao",
        "Padma Sri",
        "Krishna Murthy",
        "Anjali Kumari",
    ]
    mandals = ["Penukonda", "Tadipatri", "Madanapalle", "Tenali", "Gudivada", "Adoni", "Kavali", "Ongole"]
    lat_min, lat_max = 13.5, 19.1
    lng_min, lng_max = 77.0, 84.7

    rows: list[dict[str, object]] = []
    for index in range(220):
        crop = crops[index % len(crops)]
        lat = lat_min + _seeded(index + 1) * (lat_max - lat_min)
        lng = lng_min + _seeded(index + 7) * (lng_max - lng_min)
        health = round(45 + _seeded(index + 13) * 50, 1)
        risk = "High" if health < 60 else "Medium" if health < 75 else "Low"
        rows.append(
            {
                "parcel_id_str": f"AP-{str(index + 1).zfill(5)}",
                "farmer": farmers[index % len(farmers)],
                "district": districts[index % len(districts)],
                "mandal": mandals[index % len(mandals)],
                "crop": crop,
                "acreage": round(0.8 + _seeded(index + 23) * 9, 2),
                "health": health,
                "risk": risk,
                "confidence": int(78 + _seeded(index + 29) * 21),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "ndvi": round(0.3 + _seeded(index + 37) * 0.5, 2),
                "evi": round(0.2 + _seeded(index + 41) * 0.6, 2),
                "ndre": round(0.15 + _seeded(index + 47) * 0.45, 2),
            }
        )
    return rows


def _db_rows() -> list[dict[str, object]]:
    with SessionLocal() as db:
        rows = db.execute(
            select(
                models.Parcel.parcel_id_str,
                models.Parcel.farmer,
                models.Parcel.district,
                models.Parcel.mandal,
                models.Parcel.crop,
                models.Parcel.acreage,
                models.Parcel.health,
                models.Parcel.risk,
                models.Parcel.confidence,
                models.Parcel.lat,
                models.Parcel.lng,
                models.Parcel.ndvi,
                models.Parcel.evi,
                models.Parcel.ndre,
            ).order_by(models.Parcel.id)
        ).all()

    if not rows:
        return []

    return [
        {
            "parcel_id_str": row[0],
            "farmer": row[1],
            "district": row[2],
            "mandal": row[3],
            "crop": row[4],
            "acreage": row[5],
            "health": row[6],
            "risk": row[7],
            "confidence": row[8],
            "lat": row[9],
            "lng": row[10],
            "ndvi": row[11],
            "evi": row[12],
            "ndre": row[13],
        }
        for row in rows
    ]


def main() -> int:
    try:
        rows = _db_rows()
        source = "database"
    except Exception:
        rows = _mock_rows()
        source = "mock data"

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "parcel_id_str",
        "farmer",
        "district",
        "mandal",
        "crop",
        "acreage",
        "health",
        "risk",
        "confidence",
        "lat",
        "lng",
        "ndvi",
        "evi",
        "ndre",
    ]
    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} parcel rows from {source} to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
