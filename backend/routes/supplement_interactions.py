"""Supplement Interaction Analysis - LLM-powered stack optimizer."""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid
import os
import json

from core.config import db

router = APIRouter()


@router.post("/supplement-plan/{profile_id}/analyze-interactions")
async def analyze_interactions(profile_id: str, lang: str = "de"):
    """Analyze supplement stack for interactions, risks, synergies and optimizations."""
    plan_doc = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    if not plan_doc:
        raise HTTPException(status_code=404, detail="No supplement plan found")

    plan = plan_doc.get("plan", {})
    stack = plan.get("stack", [])
    if not stack:
        raise HTTPException(status_code=400, detail="Supplement stack is empty")

    # Build stack description for LLM
    stack_lines = []
    for s in stack:
        stack_lines.append(
            f"- {s['name']}: {s['dosage']} {s['unit']}, "
            f"Einnahme: {s.get('timing_label', s.get('timing', ''))}, "
            f"{'mit Essen' if s.get('with_food') else 'nuechtern'}, "
            f"Risiko: {s.get('risk_level', 'low')}"
        )
    stack_text = "\n".join(stack_lines)

    # Get profile info for context
    profile = await db.health_profiles.find_one({"profile_id": profile_id}, {"_id": 0})
    if not profile:
        profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})

    profile_context = ""
    if profile:
        meds = profile.get("medications", [])
        meds_text = ", ".join(meds) if meds else "keine"
        profile_context = (
            f"Alter: {profile.get('age', 'unbekannt')}, "
            f"Medikamente: {meds_text}, "
            f"Ernaehrung: {profile.get('diet', 'unbekannt')}"
        )

    analysis = await _run_llm_analysis(stack_text, profile_context, lang)

    # Cache the result
    cache_doc = {
        "profile_id": profile_id,
        "analysis": analysis,
        "lang": lang,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.supplement_interactions.update_one(
        {"profile_id": profile_id},
        {"$set": cache_doc},
        upsert=True
    )

    return analysis


@router.get("/supplement-plan/{profile_id}/interactions")
async def get_cached_interactions(profile_id: str):
    """Get cached interaction analysis."""
    doc = await db.supplement_interactions.find_one(
        {"profile_id": profile_id}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No analysis found. Run analysis first.")
    return doc.get("analysis", {})


async def _run_llm_analysis(stack_text: str, profile_context: str, lang: str) -> dict:
    """Run LLM analysis on the supplement stack."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        ai_config = await db.ai_config.find_one({"_id": "active"})
        provider = ai_config.get("provider", "openai") if ai_config else "openai"
        model = ai_config.get("model", "gpt-4o") if ai_config else "gpt-4o"

        system_msg = _build_system_prompt(lang)
        user_msg = _build_user_prompt(stack_text, profile_context, lang)

        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=session_id,
            system_message=system_msg
        ).with_model(provider, model)

        response = await chat.send_message(UserMessage(text=user_msg))
        raw = response if isinstance(response, str) else str(response)

        # Parse JSON from response
        return _parse_analysis(raw)

    except Exception as e:
        # Return fallback analysis
        return _fallback_analysis(lang, str(e))


def _build_system_prompt(lang: str) -> str:
    if lang == "de":
        return """Du bist ein pharmazeutischer Supplement-Interaktions-Experte. 
Analysiere den Supplement-Stack eines Nutzers und identifiziere:
1. Doppel-Dosierungen und Ueberdosierungsrisiken
2. Gegenseitige Hemmungen (z.B. Calcium hemmt Eisenaufnahme)
3. Positive Synergien (z.B. Vitamin D + K2)
4. Optimierungsvorschlaege fuer Timing, Dosierung und Ersatz

Antworte AUSSCHLIESSLICH mit validem JSON im folgenden Format:
{
  "overall_score": <0-100 Bewertung des Stacks>,
  "score_label": "<kurzes Label fuer den Score>",
  "summary": "<2-3 Saetze Zusammenfassung>",
  "interactions": [
    {
      "severity": "red|yellow|green",
      "title": "<kurzer Titel>",
      "description": "<Erklaerung>",
      "supplements_involved": ["Name1", "Name2"],
      "recommendation": "<konkreter Vorschlag>"
    }
  ],
  "optimizations": [
    {
      "type": "timing|dosage|replace",
      "supplement": "<Name>",
      "current": "<aktueller Zustand>",
      "suggested": "<Vorschlag>",
      "reason": "<Begruendung>"
    }
  ]
}

Wichtig:
- Sortiere interactions: rot zuerst, dann gelb, dann gruen
- Sei spezifisch und evidence-based
- Mindestens 3 interactions und 2 optimizations
- Keine Markdown, nur reines JSON"""
    else:
        return """Sei un esperto farmaceutico di interazioni tra supplementi.
Analizza lo stack di supplementi di un utente e identifica:
1. Doppie dosi e rischi di sovradosaggio
2. Inibizioni reciproche (es. calcio inibisce assorbimento ferro)
3. Sinergie positive (es. Vitamina D + K2)
4. Suggerimenti di ottimizzazione per tempi, dosaggio e sostituzione

Rispondi ESCLUSIVAMENTE con JSON valido nel seguente formato:
{
  "overall_score": <0-100 valutazione dello stack>,
  "score_label": "<etichetta breve per il punteggio>",
  "summary": "<2-3 frasi di riepilogo>",
  "interactions": [
    {
      "severity": "red|yellow|green",
      "title": "<titolo breve>",
      "description": "<spiegazione>",
      "supplements_involved": ["Nome1", "Nome2"],
      "recommendation": "<suggerimento concreto>"
    }
  ],
  "optimizations": [
    {
      "type": "timing|dosage|replace",
      "supplement": "<Nome>",
      "current": "<stato attuale>",
      "suggested": "<suggerimento>",
      "reason": "<motivazione>"
    }
  ]
}

Importante:
- Ordina interactions: rosso prima, poi giallo, poi verde
- Sii specifico e evidence-based
- Almeno 3 interactions e 2 optimizations
- Nessun Markdown, solo JSON puro"""


def _build_user_prompt(stack_text: str, profile_context: str, lang: str) -> str:
    if lang == "de":
        return f"""Analysiere diesen Supplement-Stack:

{stack_text}

Nutzerprofil: {profile_context or 'Keine weiteren Informationen'}

Pruefe auf:
- Doppel-Dosierungen oder Ueberdosierung
- Antagonistische Wechselwirkungen (Hemmungen)
- Synergien zwischen den Supplements
- Optimale Einnahmezeiten
- Dosierungsanpassungen
- Moegliche Ersatz-Supplements

Antworte nur mit JSON."""
    else:
        return f"""Analizza questo stack di supplementi:

{stack_text}

Profilo utente: {profile_context or 'Nessuna informazione aggiuntiva'}

Verifica:
- Doppie dosi o sovradosaggio
- Interazioni antagonistiche (inibizioni)
- Sinergie tra i supplementi
- Tempi di assunzione ottimali
- Aggiustamenti di dosaggio
- Possibili supplementi sostitutivi

Rispondi solo con JSON."""


def _parse_analysis(raw: str) -> dict:
    """Parse the LLM JSON response."""
    # Try to extract JSON from the response
    text = raw.strip()

    # Remove markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass

    # Return raw text as summary if parsing fails
    return {
        "overall_score": 50,
        "score_label": "Analyse verfuegbar",
        "summary": text[:500],
        "interactions": [],
        "optimizations": []
    }


def _fallback_analysis(lang: str, error: str) -> dict:
    """Return fallback analysis when LLM fails."""
    if lang == "de":
        return {
            "overall_score": 0,
            "score_label": "Analyse fehlgeschlagen",
            "summary": f"Die automatische Analyse konnte nicht durchgefuehrt werden. Bitte versuchen Sie es spaeter erneut.",
            "interactions": [],
            "optimizations": [],
            "error": True
        }
    return {
        "overall_score": 0,
        "score_label": "Analisi fallita",
        "summary": f"L'analisi automatica non ha potuto essere eseguita. Si prega di riprovare piu tardi.",
        "interactions": [],
        "optimizations": [],
        "error": True
    }
