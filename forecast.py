from fastapi import APIRouter, Query
from ..services.weather_provider import fetch_forecast
from ..services.scoring import compute_umbrella_score, make_alerts

router = APIRouter()

@router.get("/forecast")
async def get_forecast(lat: float = Query(...), lon: float = Query(...)):
    data = await fetch_forecast(lat, lon)
    hourly = data["hourly"][":48"] if "hourly" in data else []
    score = compute_umbrella_score(hourly)
    alerts = make_alerts(hourly)
    return {
        "hourly": hourly,
        "daily": data.get("daily", {}),
        "umbrellaScore": score,
        "alerts": alerts,
        "summary": data.get("summary", ""),
    }