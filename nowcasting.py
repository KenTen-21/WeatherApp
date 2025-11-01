from typing import List, Dict
from statistics import mean
from .weather_provider import fetch_forecast

async def backtest_simple(lat: float, lng: float, days: int = 7):
    # Demo: Compute a tiny metric from the latest forecast as placeholder
    data = await fetch_forecast(lat, lng)
    hourly: List[Dict] = data.get("hourly", [])
    temps = [h.get("temp_c") for h in hourly if h.get("temp_c") is not None]
    out = {
        "tempMAE": 1.8, # Demo placeholder
        "rainPrecision": 0.72,
        "rainRecall": 0.61,
        "avgTemp": round(mean(temps), 1) if temps else None,
    }
    return out