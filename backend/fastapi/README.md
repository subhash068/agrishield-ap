FastAPI + PostgreSQL backend for AgriShield AP

Run (dev):
1) cd backend/fastapi
2) python -m venv .venv
3) .venv\\Scripts\\activate
4) pip install -r requirements.txt
5) uvicorn backend.fastapi.app.main:app --reload --port 8000

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
- GET  /weather/live
- GET  /predictions
- POST /disease/detect (multipart file: "file")

Note: This version auto-creates tables and seeds from frontend mock-data on first run.

Hugging Face disease model:
- Default model: `Arko007/nfnet-f1-plant-disease`
- Optional env vars:
  - `HF_DISEASE_MODEL_ID`
  - `HF_API_TOKEN`
  - `HF_DISEASE_TOP_K`

The backend now loads the Hugging Face image classifier at startup/runtime using `AutoModelForImageClassification` and `AutoImageProcessor`. If the model cannot be loaded, the endpoint falls back to the local heuristic image analyzer so the UI still responds.
The disease image processor is loaded with `use_fast=False` to preserve the model's saved slow-processor behavior and avoid output drift.

Fine-tuning your own crop images:
- Install the train extras: `pip install -r requirements-train.txt`
- Organize images as `data_dir/<crop>/<disease>/*.jpg` or `data_dir/<label>/*.jpg`
- Run:
  `python scripts/finetune_disease_model.py --data-dir C:\path\to\your\data --output-dir C:\path\to\exported-model`
- The script saves a standard Hugging Face image-classification checkpoint plus `disease-training-metadata.json`
- Point `HF_DISEASE_MODEL_ID` at the exported folder to use your fine-tuned model locally
