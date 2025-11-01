from typing import List, Dict
def _norm_intensity(mm: float) -> float:
    if mm is None:
        return 0.0
    return max(0.0, min(1.0, mm / 5.0))

def compute_umbrella_score(hourly: List[Dict]) -> int:
    first12 = hourly[:12]
    if not first12:
        return 0
    p = max((h.get("precip_prob", 0) or 0) for h in first12) / 100.0
    i = _norm_intensity(max((h.get("precip_mm", 0) or 0) for h in first12))
    w = min(1.0, (max((h.get("wind_kph", 0) or 0) for h in first12) / 40.0))
    d = sum(1 for h in first12 if (h.get("precip_prob", 0) or 0) >= 50) / 12.0
    score = 100 * (0.55*p + 0.25*i + 0.15*d + 0.05*w)
    return round(score)

def make_alerts(hourly: List[Dict]):
    alerts = []
    for h in hourly[:12]:
        if (h.get("precip_prob", 0) or 0) >= 60:
            alerts.append({"time": h["time"], "type": "rain_likely", "prob": h["precip_prob"]})
            break
    return alerts