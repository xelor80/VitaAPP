import re
import json
import time
from collections import defaultdict

rate_limits: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10


def check_rate_limit(ip: str) -> bool:
    now = time.time()
    rate_limits[ip] = [t for t in rate_limits[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limits[ip]) >= RATE_LIMIT_MAX:
        return False
    rate_limits[ip].append(now)
    return True


def parse_llm_response(text: str) -> dict:
    if not text:
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```$', '', cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', cleaned)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {"summary": cleaned, "red_flags": [], "supplements_general_info": [],
            "brand_products": [], "nutrition_tips": [], "recipes": [],
            "disclaimer_short": "Dieser Inhalt dient nur der allgemeinen Information."}
