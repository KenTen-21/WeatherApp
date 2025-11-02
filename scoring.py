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
            alerts.append({"time": h["time"], "type": "Rain Likely", "prob": h["precip_prob"]})
            break
    return alerts


def _score_from_values(p_prob: float, mm: float, wind_kph: float, dur_flag: float) -> int:
    """Compute umbrella score (0-100) from raw components for a single hour.

    p_prob: precipitation probability in percent (0-100)
    mm: precipitation amount in mm
    wind_kph: wind speed in kph
    dur_flag: 1.0 if precipitation is substantial (e.g. prob>=50), else 0.0
    """
    p = (p_prob or 0) / 100.0
    i = _norm_intensity(mm or 0)
    w = min(1.0, (wind_kph or 0) / 40.0)
    d = 1.0 if (dur_flag or 0) else 0.0
    score = 100 * (0.55 * p + 0.25 * i + 0.15 * d + 0.05 * w)
    return round(score)


def compute_hourly_scores(hourly: List[Dict]) -> List[int]:
    """Return a list of umbrella scores (int 0-100) aligned with `hourly` list.

    This computes a per-hour score using the same weighting as the aggregate
    `compute_umbrella_score`, but applied to that individual hour's values.
    """
    scores = []
    for h in hourly:
        p = (h.get("precip_prob", 0) or 0)
        mm = (h.get("precip_mm", 0) or 0)
        wind = (h.get("wind_kph", 0) or 0)
        dur = 1.0 if p >= 50 else 0.0
        scores.append(_score_from_values(p, mm, wind, dur))
    return scores