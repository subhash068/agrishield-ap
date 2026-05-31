from __future__ import annotations

import csv
import argparse
import json
import math
import random
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
GEOJSON_PATH = ROOT / "data" / "ANDHRA PRADESH_NEW_DISTRICTS.geojson"
OUTPUT_PATH = ROOT / "data" / "west_godavari_parcels.csv"


MANDALS = [
    "Achanta",
    "Akiveedu",
    "Attili",
    "Bhimavaram",
    "Elamanchili",
    "Iragavaram",
    "Mogalthur",
    "Narasapuram",
    "Palacoderu",
    "Palacole",
    "Pentapadu",
    "Penugonda",
    "Penumantra",
    "Poduru",
    "Tadepalligudem",
    "Tanuku",
    "Undi",
    "Veeravasaram",
    "Ganapavaram",
    "Kalla",
]

FARMERS = [
    "Srinivasa Rao",
    "Lakshmi Devi",
    "Venkata Ramana",
    "Sailaja",
    "Ramesh Babu",
    "Padma Priya",
    "Kiran Kumar",
    "Anitha",
    "Satyanarayana",
    "Rajeshwari",
    "Mohan Rao",
    "Divya",
    "Prasad",
    "Swapna",
    "Naresh",
    "Bhavani",
]

CROPS = [
    ("Paddy", 0.60),
    ("Cotton", 0.12),
    ("Maize", 0.10),
    ("Chilli", 0.08),
    ("Red Gram", 0.10),
]


def _load_west_godavari_polygon() -> list[tuple[float, float]]:
    with GEOJSON_PATH.open(encoding="utf-8") as handle:
        geojson = json.load(handle)

    feature = next(
        item
        for item in geojson["features"]
        if item.get("properties", {}).get("NAME") == "West Godavari"
    )
    coordinates = feature["geometry"]["coordinates"][0]
    return [(float(lng), float(lat)) for lng, lat in coordinates]


def _point_in_ring(x: float, y: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    prev_x, prev_y = ring[-1]
    for curr_x, curr_y in ring:
        crosses = ((curr_y > y) != (prev_y > y)) and (
            x < (prev_x - curr_x) * (y - curr_y) / ((prev_y - curr_y) or 1e-12) + curr_x
        )
        if crosses:
            inside = not inside
        prev_x, prev_y = curr_x, curr_y
    return inside


def _sample_point(rng: random.Random, ring: list[tuple[float, float]]) -> tuple[float, float]:
    xs = [point[0] for point in ring]
    ys = [point[1] for point in ring]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    for _ in range(20_000):
        x = rng.uniform(min_x, max_x)
        y = rng.uniform(min_y, max_y)
        if _point_in_ring(x, y, ring):
            return round(y, 6), round(x, 6)

    center_x = sum(xs) / len(xs)
    center_y = sum(ys) / len(ys)
    return round(center_y, 6), round(center_x, 6)


def _pick_crop(rng: random.Random) -> str:
    roll = rng.random()
    cumulative = 0.0
    for crop, weight in CROPS:
        cumulative += weight
        if roll <= cumulative:
            return crop
    return CROPS[-1][0]


def _health_for_crop(rng: random.Random, crop: str, lat: float, lng: float) -> float:
    crop_bias = {
        "Paddy": 8.0,
        "Cotton": -2.0,
        "Maize": 2.5,
        "Chilli": -1.0,
        "Red Gram": 1.0,
    }[crop]
    geo_bias = (lat - 16.6) * 2.5 - (lng - 81.0) * 1.6
    base = 70.0 + crop_bias + geo_bias
    health = base + rng.uniform(-12.0, 12.0)
    return round(max(45.0, min(98.0, health)), 1)


def _generate_rows(total_rows: int) -> list[dict[str, object]]:
    rng = random.Random(20260529)
    ring = _load_west_godavari_polygon()
    rows: list[dict[str, object]] = []

    for index in range(total_rows):
        district_index = index % len(MANDALS)
        crop = _pick_crop(rng)
        lat, lng = _sample_point(rng, ring)
        health = _health_for_crop(rng, crop, lat, lng)
        risk = "High" if health < 60 else "Medium" if health < 75 else "Low"
        ndvi = round(max(0.25, min(0.92, 0.44 + health / 180.0 + rng.uniform(-0.08, 0.08))), 2)
        evi = round(max(0.18, min(0.85, ndvi - 0.07 + rng.uniform(-0.05, 0.05))), 2)
        ndre = round(max(0.12, min(0.75, 0.28 + health / 260.0 + rng.uniform(-0.06, 0.06))), 2)

        rows.append(
            {
                "parcel_id_str": f"WG-{str(index + 1).zfill(5)}",
                "farmer": FARMERS[district_index % len(FARMERS)],
                "district": "West Godavari",
                "mandal": MANDALS[district_index],
                "crop": crop,
                "acreage": round(rng.uniform(0.75, 12.0), 2),
                "health": health,
                "risk": risk,
                "confidence": int(round(max(78, min(99, 84 + (health - 60) * 0.35 + rng.uniform(-5, 5))))),
                "lat": lat,
                "lng": lng,
                "ndvi": ndvi,
                "evi": evi,
                "ndre": ndre,
            }
        )

    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate West Godavari parcel CSV data.")
    parser.add_argument("--rows", type=int, default=220, help="Number of rows to generate.")
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help="Output CSV path.",
    )
    args = parser.parse_args()

    rows = _generate_rows(args.rows)
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
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

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} West Godavari parcel rows to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
