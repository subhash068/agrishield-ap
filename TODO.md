# TODO - Fix CORS / /parcels 500

- [x] Update FastAPI CORS middleware config in `backend/fastapi/app/main.py` to reliably return CORS headers in dev.
- [x] Add logging to the global exception handler and `/parcels` endpoint to capture the real underlying error.
- [x] Make `/parcels` query resilient by only selecting columns that exist on the SQLAlchemy model.

- [ ] Run backend and verify `GET /parcels` returns `200` and includes `Access-Control-Allow-Origin` for `http://localhost:8080`.
- [ ] (After verification) run frontend and ensure CORS error disappears.
