from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy import inspect, text

ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import SessionLocal, engine
from app import models


DEFAULT_CSV = ROOT / "data" / "west_godavari_parcels_1200.csv"


def _float(value: str) -> float:
    return float(value.strip())


def _int(value: str) -> int:
    return int(float(value.strip()))


def load_rows(csv_path: Path) -> list[models.Parcel]:
    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        parcels: list[models.Parcel] = []
        for row in reader:
            parcels.append(
                models.Parcel(
                    parcel_id_str=row["parcel_id_str"].strip(),
                    farmer=row["farmer"].strip(),
                    district=row["district"].strip(),
                    mandal=row["mandal"].strip(),
                    crop=row["crop"].strip(),
                    acreage=_float(row["acreage"]),
                    health=_float(row["health"]),
                    risk=row["risk"].strip(),
                    confidence=_int(row["confidence"]),
                    lat=_float(row["lat"]),
                    lng=_float(row["lng"]),
                    ndvi=_float(row["ndvi"]),
                    evi=_float(row["evi"]),
                    ndre=_float(row["ndre"]),
                )
            )
    return parcels


def ensure_parcel_schema() -> None:
    with SessionLocal() as db:
        inspector = inspect(db.get_bind())
        parcel_columns = {column["name"] for column in inspector.get_columns("parcels")}
        alterations: list[str] = []

        if "evi" not in parcel_columns:
            alterations.append("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS evi double precision")
        if "ndre" not in parcel_columns:
            alterations.append("ALTER TABLE parcels ADD COLUMN IF NOT EXISTS ndre double precision")

        for statement in alterations:
            db.execute(text(statement))

        if alterations:
            db.commit()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import parcel CSV rows into the backend database.")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Source CSV file.")
    parser.add_argument(
        "--truncate",
        action="store_true",
        default=True,
        help="Delete existing parcel rows before import.",
    )
    parser.add_argument(
        "--keep-existing",
        dest="truncate",
        action="store_false",
        help="Append to existing parcel rows instead of replacing them.",
    )
    args = parser.parse_args()

    models.Base.metadata.create_all(bind=engine)
    ensure_parcel_schema()
    parcels = load_rows(args.csv)

    with SessionLocal() as db:
        if args.truncate:
            db.execute(delete(models.Parcel))
            db.commit()

        db.add_all(parcels)
        db.commit()

    print(f"Imported {len(parcels)} parcel rows from {args.csv} into the database")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
