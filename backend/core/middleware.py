"""Security & Performance middleware for VitaGuide API."""
import time
from collections import defaultdict
from functools import wraps
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# ── Rate Limiting ─────────────────────────────────────────────

# Tiered rate limits: (max_requests, window_seconds)
RATE_TIERS = {
    "expensive": (5, 60),     # AI endpoints: TTS, analysis, diary analyze
    "write": (20, 60),        # POST/PUT endpoints
    "default": (60, 60),      # General GET endpoints
}

EXPENSIVE_PATHS = {
    "/api/tts/generate",
    "/api/analyze",
    "/api/diary/analyze",
    "/api/label-analysis/analyze",
    "/api/supplement-plan/generate",
}

_buckets: dict[str, list[float]] = defaultdict(list)


def _get_tier(path: str, method: str) -> str:
    for exp in EXPENSIVE_PATHS:
        if path.startswith(exp):
            return "expensive"
    if method in ("POST", "PUT", "DELETE", "PATCH"):
        return "write"
    return "default"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
        path = request.url.path
        method = request.method

        tier = _get_tier(path, method)
        max_req, window = RATE_TIERS[tier]
        key = f"{ip}:{tier}"

        now = time.time()
        _buckets[key] = [t for t in _buckets[key] if now - t < window]

        if len(_buckets[key]) >= max_req:
            return Response(
                content='{"detail":"Rate limit exceeded. Please wait."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": str(window)}
            )

        _buckets[key].append(now)
        return await call_next(request)


# ── Simple In-Memory Cache ────────────────────────────────────

_cache: dict[str, tuple[float, any]] = {}
DEFAULT_TTL = 300  # 5 minutes


def cached(ttl: int = DEFAULT_TTL):
    """Decorator for caching async function results."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{args}:{kwargs}"
            now = time.time()
            if key in _cache:
                cached_time, cached_val = _cache[key]
                if now - cached_time < ttl:
                    return cached_val
            result = await func(*args, **kwargs)
            _cache[key] = (now, result)
            return result
        return wrapper
    return decorator


def invalidate_cache(prefix: str = ""):
    """Clear cache entries matching prefix, or all if empty."""
    if not prefix:
        _cache.clear()
        return
    keys_to_del = [k for k in _cache if k.startswith(prefix)]
    for k in keys_to_del:
        del _cache[k]


# ── Admin Token Expiry ────────────────────────────────────────

TOKEN_TTL = 86400  # 24 hours
_admin_tokens: dict[str, float] = {}


def create_admin_token(token: str):
    _admin_tokens[token] = time.time()


def verify_admin_token(token: str) -> bool:
    if token not in _admin_tokens:
        return False
    if time.time() - _admin_tokens[token] > TOKEN_TTL:
        del _admin_tokens[token]
        return False
    return True


def cleanup_expired_tokens():
    now = time.time()
    expired = [t for t, ts in _admin_tokens.items() if now - ts > TOKEN_TTL]
    for t in expired:
        del _admin_tokens[t]
