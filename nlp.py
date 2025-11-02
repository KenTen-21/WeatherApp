import re
from datetime import datetime
from dateutil import parser as dtparser
from weather_provider import fetch_forecast

# Regex base parser for time window e.g. "before 6pm" or "tomorrow morning"

WINDOW_PATTERNS = [
    (re.compile(r"before (\d{1,2})(?::(\d{2}))?\s*(am|pm)?", re.I), "before"),
    (re.compile(r"by (\d{1,2})(?::(\d{2}))?\s*(am|pm)?", re.I), "before"),
    (re.compile(r"(tomorrow) (morning|afternoon|evening|night)", re.I), "tomorrow_part"),
]

PART_TO_RANGE = {
    "morning": (6, 12),
    "afternoon": (12, 18),
    "evening": (18, 22),
    "night": (22, 24),
}

async def answer_question(question: str, lat: float, lon: float):
    data = await fetch_forecast(lat, lon)
    hourly = data.get("hourly", [])

    # Default: Next 6 hour window
    start = datetime.utcnow()
    end = None

    q = question.lower()
    cond = "rain" if any(w in q for w in ["rain", "shower", "drizzle"]) else None

    for pat, kind in WINDOW_PATTERNS:
        m = pat.search(q)
        if m:
            if kind in ("before",):
                hr = int(m.group(1))
                mi = int(m.group(2) or 0)
                ap = (m.group(3) or "").lower()
                if ap == "pm" and hr < 12:
                    hr += 12
                end = start.replace(hour=hr, minute=mi, second=0, microsecond=0)
            elif kind == "tomorrow_part":
                part = m.group(2).lower()
                sh, eh = PART_TO_RANGE[part]
                # Tomorrow in UTC
                from datetime import timedelta
                tomorrow = start + timedelta(days=1)
                start = tomorrow.replace(hour=sh, minute=0, second=0, microsecond=0)
                end = tomorrow.replace(hour=eh, minute=0, second=0, microsecond=0)
            break

    # Evaluate window
    def in_window(ts_iso: str):
        t = dtparser.isoparse(ts_iso)
        if end is None:
            return (t - start).total_seconds() <= 6*3600 and t >= start
        return start <= t <= end

    window_hours = [h for h in hourly if in_window(h["time"])]
    if not window_hours:
        window_hours = hourly[:6]

    if cond == "rain" or cond is None:
        max_prob = max((h.get("precip_prob", 0) or 0) for h in window_hours) if window_hours else 0
        answer = (
            f"Rain likely ({max_prob}%)" if max_prob >= 60 else
            f"Low rain risk ({max_prob}%)" if max_prob < 30 else
            f"Possible showers ({max_prob}%)"
        )
        return {"answer": answer, "maxRainProb": max_prob}

    return {"answer": "I can check rain, wind, or temperature."}