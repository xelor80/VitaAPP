"""
Health Score API - Gesundheits-Score Berechnung mit KI
"""
import os
import re
import json
import uuid
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from core.config import db, logger

load_dotenv()

router = APIRouter()


def _base_score(profile: dict, symptoms_30d: list, compliance_entries: list) -> dict:
    """Calculate base scores from raw data (0-100 each)."""

    # --- Symptom intensity (lower is better) ---
    if symptoms_30d:
        avg_overall = sum(s["overall"] for s in symptoms_30d) / len(symptoms_30d)
        # Scale: overall 1=best -> 100, 10=worst -> 0
        symptom_score = max(0, round((10 - avg_overall) / 9 * 100))
    else:
        symptom_score = 50  # neutral if no data

    # --- Compliance ---
    total_checks = 0
    taken_checks = 0
    for e in compliance_entries:
        for s in e.get("supplements", []):
            total_checks += 1
            if s.get("taken"):
                taken_checks += 1
    compliance_score = round((taken_checks / total_checks * 100)) if total_checks > 0 else 50

    # --- Sleep (from profile) ---
    sleep_q = profile.get("sleep_quality", 5)
    sleep_score = round(sleep_q / 10 * 100)

    # --- Stress (from profile, inverted - lower stress = higher score) ---
    stress_lvl = profile.get("stress_level", 5)
    stress_score = round((10 - stress_lvl) / 9 * 100)

    # --- Energy (from profile) ---
    energy_lvl = profile.get("energy_level", 5)
    energy_score = round(energy_lvl / 10 * 100)

    # --- Mikronährstoff-Risiko ---
    deficiencies = profile.get("known_deficiencies", [])
    complaints = profile.get("complaints", [])
    # More deficiencies + intense complaints = lower score
    deficiency_penalty = min(len(deficiencies) * 12, 50)
    complaint_intensity = sum(c.get("intensity", 5) for c in complaints) / max(len(complaints), 1) if complaints else 0
    complaint_penalty = min(complaint_intensity * 5, 30)
    nutrient_score = max(0, round(100 - deficiency_penalty - complaint_penalty))

    return {
        "symptom": symptom_score,
        "compliance": compliance_score,
        "sleep": sleep_score,
        "stress": stress_score,
        "energy": energy_score,
        "nutrient": nutrient_score,
    }


def _compute_total(base: dict) -> int:
    """Weighted total score."""
    weights = {
        "symptom": 0.25,
        "compliance": 0.20,
        "sleep": 0.15,
        "stress": 0.15,
        "energy": 0.15,
        "nutrient": 0.10,
    }
    total = sum(base[k] * weights[k] for k in weights)
    return max(0, min(100, round(total)))


async def _ai_assessment(total: int, base: dict, profile: dict, lang: str) -> dict:
    """Use LLM to generate textual assessment and refined sub-category scores."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system = """Du bist ein Gesundheitsanalytiker. Basierend auf den Score-Daten:
- Gib eine kurze Einordnung (max 8 Worte, z.B. "Gut, aber Schlaf optimierbar")
- Gib eine kurze Empfehlung (max 2 Sätze)
- Bewerte 4 Unterkategorien (0-100): mikronährstoff_risiko, schlaf, stress, energie

Antworte NUR als JSON:
{
  "label": "Kurze Einordnung",
  "recommendation": "Empfehlung...",
  "categories": {
    "mikronährstoff_risiko": 65,
    "schlaf": 79,
    "stress": 55,
    "energie": 72
  }
}"""

    complaints_str = ", ".join([c.get("name", "") for c in profile.get("complaints", [])[:5]])
    deficiencies_str = ", ".join(profile.get("known_deficiencies", [])[:5])

    prompt = f"""Gesundheits-Score: {total}/100
Teilwerte: Symptome={base['symptom']}, Einnahmetreue={base['compliance']}, Schlaf={base['sleep']}, Stress={base['stress']}, Energie={base['energy']}, Mikronährstoffe={base['nutrient']}
Beschwerden: {complaints_str or 'Keine'}
Bekannte Mängel: {deficiencies_str or 'Keine'}
Alter: {profile.get('age', '?')}, Aktivität: {profile.get('activity_level', '?')}
Sprache: {'Deutsch' if lang == 'de' else 'Italienisch'}"""

    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"hscore-{uuid.uuid4().hex[:8]}",
            system_message=system,
        ).with_model("openai", "gpt-4o")

        resp = await chat.send_message(UserMessage(text=prompt))
        match = re.search(r'\{[\s\S]*\}', resp)
        if match:
            return json.loads(match.group())
    except Exception as e:
        logger.error(f"AI health score assessment failed: {e}")

    # Fallback if AI fails
    label = "Gut" if total >= 70 else ("Optimierbar" if total >= 40 else "Handlungsbedarf")
    return {
        "label": label,
        "recommendation": "",
        "categories": {
            "mikronährstoff_risiko": base["nutrient"],
            "schlaf": base["sleep"],
            "stress": base["stress"],
            "energie": base["energy"],
        }
    }


@router.get("/health-score/{profile_id}")
async def get_health_score(profile_id: str, lang: str = "de"):
    """Calculate comprehensive health score with AI assessment."""

    # Fetch profile
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil nicht gefunden")

    now = datetime.now(timezone.utc)
    date_30d_ago = (now - timedelta(days=30)).strftime("%Y-%m-%d")
    date_60d_ago = (now - timedelta(days=60)).strftime("%Y-%m-%d")

    # Current period (last 30 days)
    symptoms_cur = await db.symptom_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": date_30d_ago}}, {"_id": 0}
    ).sort("date", 1).to_list(90)

    compliance_cur = await db.compliance_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": date_30d_ago}}, {"_id": 0}
    ).sort("date", 1).to_list(90)

    # Previous period (30-60 days ago) for trend comparison
    symptoms_prev = await db.symptom_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": date_60d_ago, "$lt": date_30d_ago}}, {"_id": 0}
    ).to_list(90)

    compliance_prev = await db.compliance_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": date_60d_ago, "$lt": date_30d_ago}}, {"_id": 0}
    ).to_list(90)

    # Calculate current and previous scores
    base_cur = _base_score(profile, symptoms_cur, compliance_cur)
    total_cur = _compute_total(base_cur)

    # Previous period score (for trend)
    trend_change = None
    if symptoms_prev or compliance_prev:
        base_prev = _base_score(profile, symptoms_prev, compliance_prev)
        total_prev = _compute_total(base_prev)
        if total_prev > 0:
            trend_change = total_cur - total_prev

    # AI assessment
    ai = await _ai_assessment(total_cur, base_cur, profile, lang)

    return {
        "score": total_cur,
        "label": ai.get("label", ""),
        "recommendation": ai.get("recommendation", ""),
        "trend_change": trend_change,  # +5 means 5 points better than last month
        "categories": ai.get("categories", {}),
        "base_scores": base_cur,
        "has_tracking_data": len(symptoms_cur) > 0 or len(compliance_cur) > 0,
    }
