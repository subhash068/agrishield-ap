# TODO - AgriShield AP Backend + DB + Frontend Integration

## Step 1 — Backend DB fix
- [x] Verify `/disease/detect` references a model that exists in `backend/fastapi/app/models.py`.
- [x] `DiseaseDetection` SQLAlchemy model exists.
- [x] Response/DB fields match (`top_k_json` stored as json text).
- [x] (Dev note) Any DB schema changes require a fresh DB since we rely on `create_all`.

## Step 2 — Frontend ↔ Backend wiring
- [x] `src/lib/api.ts` updated earlier to call FastAPI endpoints.
- [x] multipart upload implemented in `detectDisease`.
- [ ] Dashboard hero/spectral/kpi to be served from backend (remove reliance on `mock-data.ts`).

## Step 3 — Satellite indices & crop health workflow (NDVI/EVI/NDRE)
- [x] Extend `Parcel` model with `evi` and `ndre`.
- [x] Update `ParcelOut`/schema types to include `evi` and `ndre`.
- [x] Update `seed.py` to seed `evi` and `ndre`.
- [ ] Add backend endpoint `GET /spectral-trend` returning time series points `{day, ndvi, evi, ndre}`.
- [ ] Add backend KPI endpoint or include KPIs in `GET /dashboard` (or update existing dashboard assembly).
- [ ] Update parcel `health`/`risk` derivation from indices (threshold-based scoring).

## Step 4 — Local verification
- [ ] Start FastAPI backend and verify `/health`, `/alerts`, `/parcels`, `/predictions`, `/spectral-trend`.
- [ ] Start Vite frontend and verify dashboard renders without mock-data.
- [ ] Test `POST /disease/detect` with a sample image.

