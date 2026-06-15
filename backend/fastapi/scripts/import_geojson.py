from __future__ import annotations

import json
import sys
from pathlib import Path
from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
ROOT = BACKEND_ROOT.parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.db import engine

DISTRICT_GEOJSON = ROOT / "public" / "data" / "ANDHRA_PRADESH_NEW_DISTRICTS.geojson"
MANDAL_GEOJSON = ROOT / "public" / "data" / "ANDHRA_PRADESH_SUBDISTRICTS.geojson"
VILLAGE_GEOJSON = ROOT / "public" / "data" / "ANDHRA_PRADESH_VILLAGES.geojson"

def setup_postgis_and_tables(conn):
    print("Enabling PostGIS extension...")
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
    
    print("Creating tables...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS district_boundaries (
            id SERIAL PRIMARY KEY,
            dtname VARCHAR(255) NOT NULL,
            geom GEOMETRY(Geometry, 4326)
        );
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS mandal_boundaries (
            id SERIAL PRIMARY KEY,
            dtname VARCHAR(255) NOT NULL,
            sdtname VARCHAR(255) NOT NULL,
            geom GEOMETRY(Geometry, 4326)
        );
    """))
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS village_boundaries (
            id SERIAL PRIMARY KEY,
            dtname VARCHAR(255) NOT NULL,
            sdtname VARCHAR(255) NOT NULL,
            vilname VARCHAR(255) NOT NULL,
            geom GEOMETRY(Geometry, 4326)
        );
    """))
    
    print("Creating spatial indices...")
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_districts_geom ON district_boundaries USING GIST(geom);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_mandals_geom ON mandal_boundaries USING GIST(geom);"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_villages_geom ON village_boundaries USING GIST(geom);"))
    
    # Truncate tables for clean reload
    print("Truncating existing boundaries tables...")
    conn.execute(text("TRUNCATE TABLE district_boundaries, mandal_boundaries, village_boundaries RESTART IDENTITY;"))

def import_districts(conn):
    if not DISTRICT_GEOJSON.exists():
        print(f"Districts GeoJSON not found at {DISTRICT_GEOJSON}")
        return
    
    print(f"Parsing districts from {DISTRICT_GEOJSON}...")
    with open(DISTRICT_GEOJSON, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    features = data.get("features", [])
    print(f"Found {len(features)} districts. Importing...")
    
    inserted = 0
    for feature in features:
        props = feature.get("properties", {})
        # Try multiple common property keys for district name
        dtname = (
            props.get("dtname") or
            props.get("NAME") or
            props.get("name") or
            props.get("DISTRICT") or
            props.get("district") or
            props.get("District")
        )
        geom = feature.get("geometry")
        
        if not dtname or not geom:
            print(f"  Skipping feature with props: {list(props.keys())}")
            continue
            
        conn.execute(
            text("""
                INSERT INTO district_boundaries (dtname, geom)
                VALUES (:dtname, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326));
            """),
            {"dtname": dtname.strip(), "geom_json": json.dumps(geom)}
        )
        inserted += 1
    print(f"Districts imported successfully. ({inserted} records)")



def import_mandals(conn):
    if not MANDAL_GEOJSON.exists():
        print(f"Mandals GeoJSON not found at {MANDAL_GEOJSON}")
        return
        
    print(f"Parsing mandals from {MANDAL_GEOJSON}...")
    with open(MANDAL_GEOJSON, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    features = data.get("features", [])
    print(f"Found {len(features)} mandals. Importing...")
    
    for feature in features:
        props = feature.get("properties", {})
        dtname = props.get("dtname")
        sdtname = props.get("sdtname")
        geom = feature.get("geometry")
        
        if not dtname or not sdtname or not geom:
            continue
            
        conn.execute(
            text("""
                INSERT INTO mandal_boundaries (dtname, sdtname, geom)
                VALUES (:dtname, :sdtname, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326));
            """),
            {
                "dtname": dtname.strip(),
                "sdtname": sdtname.strip(),
                "geom_json": json.dumps(geom)
            }
        )
    print("Mandals imported successfully.")

def import_villages(conn):
    if not VILLAGE_GEOJSON.exists():
        print(f"Villages GeoJSON not found at {VILLAGE_GEOJSON}")
        return
        
    print(f"Parsing villages from {VILLAGE_GEOJSON} (this may take a few moments)...")
    with open(VILLAGE_GEOJSON, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    features = data.get("features", [])
    print(f"Found {len(features)} villages. Importing...")
    
    # Batch inserts to speed up the massive village dataset
    batch = []
    for idx, feature in enumerate(features):
        props = feature.get("properties", {})
        dtname = props.get("dtname")
        sdtname = props.get("sdtname")
        vilname = props.get("vilname11") or props.get("vilnam_soi")
        geom = feature.get("geometry")
        
        if not dtname or not sdtname or not vilname or not geom:
            continue
            
        batch.append({
            "dtname": dtname.strip(),
            "sdtname": sdtname.strip(),
            "vilname": vilname.strip(),
            "geom_json": json.dumps(geom)
        })
        
        # Insert in batches of 200
        if len(batch) >= 200:
            conn.execute(
                text("""
                    INSERT INTO village_boundaries (dtname, sdtname, vilname, geom)
                    VALUES (:dtname, :sdtname, :vilname, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326));
                """),
                batch
            )
            batch = []
            if (idx + 1) % 2000 == 0:
                print(f"Imported {idx + 1} villages...")

    if batch:
        conn.execute(
            text("""
                INSERT INTO village_boundaries (dtname, sdtname, vilname, geom)
                VALUES (:dtname, :sdtname, :vilname, ST_SetSRID(ST_GeomFromGeoJSON(:geom_json), 4326));
            """),
            batch
        )
    print("Villages imported successfully.")

def main():
    print("Connecting to PostgreSQL database...")
    with engine.begin() as conn:
        setup_postgis_and_tables(conn)
        import_districts(conn)
        import_mandals(conn)
        import_villages(conn)
    print("All boundaries imported successfully into PostgreSQL!")

if __name__ == "__main__":
    main()
