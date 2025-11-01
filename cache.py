import time
from cachetools import TTLCache
from functools import wraps

_cache = TTLCache(maxsize=256, ttl=600)

def memo_async(ttl_seconds: int = 600):
    def decorator(fn):
        @wraps(fn)
        async def wrapper(*args, **kwargs):
            key = (fn.__name__, args, tuple(sorted(kwargs.items())))
            item = _cache.get(key)
            if item:
                return item
            result = await fn(*args, **kwargs)
            _cache.ttl = ttl_seconds
            _cache[key] = result
            return result
        return wrapper
    return decorator