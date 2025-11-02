from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import httpx

from weather_provider import fetch_forecast
from scoring import compute_umbrella_score, make_alerts

router = APIRouter()

@router.get("/forecast")
async def get_forecast(lat: Optional[float] = Query(None), lon: Optional[float] = Query(None), city: Optional[str] = Query(None)):
    """
    Get forecast by latitude/longitude or by city name.
    If `city` is provided, we geocode it using Nominatim (OpenStreetMap).
    """
    # Treat empty/whitespace-only city as not provided
    if city is not None and city.strip():
        # Geocode city using Nominatim
        async with httpx.AsyncClient(timeout=10) as client:
            params = {"format": "json", "q": city, "limit": 1}
            headers = {"User-Agent": "umbrella-ai/1.0 (your-email@example.com)"}
            r = await client.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers)
            r.raise_for_status()
            results = r.json()
        if not results:
            raise HTTPException(status_code=404, detail=f"Could not geocode city '{city}'")
        lat = float(results[0]["lat"])
        lon = float(results[0]["lon"])
    elif city is not None and not city.strip():
        # Explicit empty city provided -> treat as bad request
        raise HTTPException(status_code=400, detail="City parameter is empty; provide a valid city name or lat/lon")

    if lat is None or lon is None:
        raise HTTPException(status_code=400, detail="Provide either city or both lat and lon")

    data = await fetch_forecast(lat, lon)
    hourly = data["hourly"][:48] if "hourly" in data else []
    score = compute_umbrella_score(hourly)
    alerts = make_alerts(hourly)
    return {
        "hourly": hourly,
        "daily": data.get("daily", {}),
        "umbrellaScore": score,
        "alerts": alerts,
        "summary": data.get("summary", ""),
    }