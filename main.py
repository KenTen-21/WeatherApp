from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import forecast, qa, backtest

app = FastAPI(title="Umbrella.ai", version="0.1.0")

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "app": "Umbrella.ai"}

app.include_router(forecast.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(backtest.router, prefix="/api")