import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "dev")
CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "600"))