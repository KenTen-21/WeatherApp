# Umbrella.ai — WeatherApp (local launch instructions)

This repository contains a small FastAPI app that provides a weather "umbrella" forecast and a minimal static GUI.

Quick start (Windows / PowerShell)

1. Open a PowerShell terminal and change to the project root (the folder that contains `main.py`):

```powershell
cd "C:\Users\kenne\OneDrive\Desktop\Hackathon-Weather-App\WeatherApp-4"
```

2. (Optional but recommended) Create and activate a virtual environment:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install Python dependencies:

```powershell
py -3 -m pip install -r .\requirements.txt
```

4. Run the app with Uvicorn (development, auto-reload):

```powershell
py -3 -m uvicorn main:app --reload --port 8000
```

Or run without auto-reload (fewer background processes):

```powershell
py -3 -m uvicorn main:app --port 8000
```

5. Open the GUI in your browser:

http://127.0.0.1:8000/

API basics

- `GET /api/status` — health check JSON
- `GET /api/forecast?city=<city name>` — forecast by city (uses OpenStreetMap Nominatim geocoding)
- `GET /api/forecast?lat=<lat>&lon=<lon>` — forecast by coordinates (fallback option)

Notes and troubleshooting

- The app uses Nominatim for geocoding. Nominatim requires a valid User-Agent header (the app sets a simple User-Agent). For production or heavy usage, please review Nominatim usage policies and add a contact email in requests.
- If you see import errors related to packages like `fastapi`, `httpx`, or `cachetools`, re-run the install step in the activated virtual environment.
- If you previously ran this repository as a package and saw "attempted relative import with no known parent package", this repo now uses absolute imports and should run from the project root.
- Stop the running server with Ctrl+C in the terminal where Uvicorn is running.

Optional quick tests (run from project root):

```powershell
# Sanity import check
py -3 -c "import main; print('IMPORT_OK')"

# Run a tiny in-process test that calls the forecast endpoint (requires dependencies installed)
py -3 -c "from fastapi.testclient import TestClient; from main import app; client=TestClient(app); r=client.get('/api/forecast?city=San%20Francisco'); print(r.status_code, list(r.json().keys()) )"
```

If you want the project converted into a package layout (so relative imports like `from .services import ...` work), I can restructure files into a package and update imports accordingly — tell me and I'll make that change.

Enjoy — let me know if you'd like a prettier GUI, charts, or local city autocomplete.


Sources:
https://open-meteo.com/
https://nominatim.openstreetmap.org/ui/search.html
https://www.openstreetmap.org/copyright
https://operations.osmfoundation.org/policies/nominatim/
https://fonts.google.com/specimen/Inter

Python Sources:
https://fastapi.tiangolo.com/ (FastAPI)
https://uvicorn.dev/ (Uvicorn)
https://www.python-httpx.org/ (httpx)
https://cachetools.readthedocs.io/en/latest/ (cachetools)
https://docs.pydantic.dev/latest/ (pydantic)
https://dateutil.readthedocs.io/en/stable/ (python-dateutil)

Wind chill formula sources:
https://www.weather.gov/epz/windChill
