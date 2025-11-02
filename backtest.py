from fastapi import APIRouter, Query
from nowcasting import backtest_simple

router = APIRouter()

@router.get("/backtest")
async def backtest(lat: float = Query(...), lon: float = Query(...), days: int = 7):
    return await backtest_simple(lat, lon, days)