FastAPI + PostgreSQL backend for AgriShield AP

Run (dev):
1) cd backend/fastapi
2) python -m venv .venv
3) .venv\\Scripts\\activate
4) pip install -r requirements.txt
5) uvicorn app.main:app --reload --port 8000

Endpoints:
- GET  /health
- GET  /districts
- GET  /alerts
- GET  /schemes
- GET  /dashboard-data
- GET  /district-rankings
- GET  /crop-distribution
- GET  /spectral-trend
- GET  /parcels
- GET  /weather
- GET  /predictions
- POST /disease/detect (multipart file: "file")

Note: This version auto-creates tables and seeds from frontend mock-data on first run.

