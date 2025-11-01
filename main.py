from fastapi import FastAPI
import httpx, os, time
from functools import lru_cache

app = FastAPI()
API_KEY - os.getenv("")

@lru_cache(maxsize=256)
def _cache_key(lat, lon, hour):
    return f"{round(lat, 3)}:{round(lon, 3)}:{hour}"

@app.get("/api/forecast")
async def forecast(lat: float, long: float):
    # Fetch from provider
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get("", params={"lat": lat, "lon": lon, "key": API_KEY})
        data = r.json()
    # Compute Umbrella Score + Alerts
    hourly = data["hourly"][:48]
    score = compute_umbrella_score(hourly)
    alerts = make_alerts(hourly)
    summary = make_summary(data)
    return {"hourly": hourly, "daily": data.get("daily", []), "summary": summary, "umbrellaScore": score, "alerts": alerts}

def compute_umbrella_score(hourly):
    def norm_intensity(mm):
        return max(0, min(1, mm / 5.0))
    p = max(h.get("precip_prob", 0) for h in hourly[:12]) / 100.0
    i = norm_intensity(max(h.get("precip_mm", 0) for h in hourly[:12]))
    w = min(1.0, (max(h.get("wind_kph", 0) for h in hourly[:12]) / 40.0))
    d = sum(1 for h in hourly[:12] if h.get("precip_prob", 0) >= 50) / 12.0
    return round(100 * (0.55*p + 0.25*i + 0.15*d + 0.05*w))