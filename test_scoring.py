from app.services.scoring import compute_umbrella_score

HOURLY = [{"precip_prob": 70, "precip_mm": 2.0, "wind_kph": 10} for _ in range(12)]

def test_score_smoke():
    score = compute_umbrella_score(HOURLY)
    assert 60 <= score <= 100