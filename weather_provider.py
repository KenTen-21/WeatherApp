import httpx
from ..utils.cache import memo_async

# Using Open-Meteo
# Docs: https://open-meteo.com/en/docs

@memo_async(ttl_seconds=600)
async def fetch_forecast(lat: float, lon: float):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,precipitation_probability,precipitation,cloudcover,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_gusts_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max",
        "forecast_days": 3,
        "timezone": "auto",
    }
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
        r.raise_for_status()
        raw = r.json()

    # Normalize structure to simple hourly list
    hourly = []
    times = raw.get("hourly", {}).get("time", [])
    for i, ts in enumerate(times):
        hourly.append({
            "time": ts,
            "temp_c": raw["hourly"].get("temperature_2m", [None])[i],
            "precip_prob": raw["hourly"].get("precipitation_probability", [0])[i],
            "precip_mm": raw["hourly"].get("precipitation", [0])[i],
            "cloud": raw["hourly"].get("cloudcover", [0])[i],
            "humidity": raw["hourly"].get("relative_humidity_2m", [0])[i],
            "pressure": raw["hourly"].get("pressure_msl", [0])[i],
            "wind_kph": raw["hourly"].get("wind_speed_10m", [0])[i],
            "gust_kph": raw["hourly"].get("wind_gusts_10m", [0])[i],
        })
    daily = raw.get("daily", {})
    return {"hourly": hourly, "daily": daily, "summary": ""}