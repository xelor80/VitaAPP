"""Correlation Analysis - Supplement intake vs symptom progression."""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
import os
import json
import uuid

from core.config import db

router = APIRouter()


@router.get("/tracking/correlation-analysis/{profile_id}")
async def get_correlation_analysis(profile_id: str, days: int = 30, lang: str = "de"):
    """Analyze correlations between supplement compliance and symptom trends."""
    if days not in (14, 30, 60):
        days = 30

    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    symptoms = await db.symptom_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": cutoff}}, {"_id": 0}
    ).sort("date", 1).to_list(days)

    compliance = await db.compliance_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": cutoff}}, {"_id": 0}
    ).sort("date", 1).to_list(days)

    if len(symptoms) < 3:
        min_days = 3
        msg = (f"Mindestens {min_days} Tage Tracking-Daten benoetigt. "
               f"Aktuell: {len(symptoms)} Eintraege.") if lang == "de" else \
              (f"Servono almeno {min_days} giorni di dati. "
               f"Attualmente: {len(symptoms)} voci.")
        return {"status": "insufficient_data", "message": msg, "entries": len(symptoms)}

    # Calculate per-supplement compliance
    supplement_compliance = _calc_supplement_compliance(compliance)

    # Calculate per-symptom trends (first half vs second half)
    symptom_trends = _calc_symptom_trends(symptoms)

    # Calculate overall metrics
    overall_trend = _calc_overall_trend(symptoms)

    # Build correlations between supplements and symptom changes
    correlations = _build_correlations(supplement_compliance, symptom_trends, symptoms, compliance)

    # Get LLM interpretation
    llm_insights = await _get_llm_insights(
        supplement_compliance, symptom_trends, correlations, overall_trend, days, lang
    )

    return {
        "status": "ok",
        "period_days": days,
        "data_points": len(symptoms),
        "supplement_compliance": supplement_compliance,
        "symptom_trends": symptom_trends,
        "overall_trend": overall_trend,
        "correlations": correlations,
        "llm_insights": llm_insights,
    }


def _calc_supplement_compliance(compliance: list) -> dict:
    """Calculate compliance rate per supplement."""
    counts = {}
    for entry in compliance:
        for s in entry.get("supplements", []):
            sid = s["id"]
            if sid not in counts:
                counts[sid] = {"taken": 0, "total": 0, "name": sid}
            counts[sid]["total"] += 1
            if s.get("taken"):
                counts[sid]["taken"] += 1

    result = {}
    for sid, c in counts.items():
        rate = round((c["taken"] / c["total"]) * 100, 1) if c["total"] > 0 else 0
        result[sid] = {"rate": rate, "taken": c["taken"], "total": c["total"]}
    return result


def _calc_symptom_trends(symptoms: list) -> dict:
    """Calculate trend per symptom category."""
    if len(symptoms) < 2:
        return {}

    mid = len(symptoms) // 2
    first_half = symptoms[:mid]
    second_half = symptoms[mid:]
    all_keys = set()
    for s in symptoms:
        all_keys.update(s.get("ratings", {}).keys())

    result = {}
    for key in all_keys:
        vals_first = [s["ratings"].get(key, 5) for s in first_half if key in s.get("ratings", {})]
        vals_second = [s["ratings"].get(key, 5) for s in second_half if key in s.get("ratings", {})]

        if not vals_first or not vals_second:
            continue

        avg_first = sum(vals_first) / len(vals_first)
        avg_second = sum(vals_second) / len(vals_second)

        if avg_first == 0:
            change_pct = 0
        else:
            change_pct = round(((avg_second - avg_first) / avg_first) * 100, 1)

        if change_pct > 5:
            direction = "improving"
        elif change_pct < -5:
            direction = "worsening"
        else:
            direction = "stable"

        result[key] = {
            "avg_start": round(avg_first, 1),
            "avg_end": round(avg_second, 1),
            "change_pct": change_pct,
            "direction": direction,
        }
    return result


def _calc_overall_trend(symptoms: list) -> dict:
    """Calculate overall wellbeing trend."""
    if len(symptoms) < 2:
        return {"direction": "neutral", "change_pct": 0}

    mid = len(symptoms) // 2
    avg_first = sum(s["overall"] for s in symptoms[:mid]) / mid
    avg_second = sum(s["overall"] for s in symptoms[mid:]) / (len(symptoms) - mid)

    if avg_first == 0:
        change_pct = 0
    else:
        change_pct = round(((avg_second - avg_first) / avg_first) * 100, 1)

    if change_pct > 5:
        direction = "improving"
    elif change_pct < -5:
        direction = "worsening"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "change_pct": change_pct,
        "avg_start": round(avg_first, 1),
        "avg_end": round(avg_second, 1),
    }


def _build_correlations(supplement_compliance, symptom_trends, symptoms, compliance):
    """Build supplement-to-symptom correlations."""
    correlations = []
    for sid, comp in supplement_compliance.items():
        for sym, trend in symptom_trends.items():
            strength = "none"
            # High compliance + improving = positive correlation
            if comp["rate"] >= 80 and trend["direction"] == "improving":
                strength = "strong_positive"
            elif comp["rate"] >= 60 and trend["direction"] == "improving":
                strength = "moderate_positive"
            elif comp["rate"] < 50 and trend["direction"] == "worsening":
                strength = "negative_indicator"
            elif comp["rate"] >= 80 and trend["direction"] == "stable":
                strength = "neutral"

            if strength != "none":
                correlations.append({
                    "supplement": sid,
                    "symptom": sym,
                    "compliance_rate": comp["rate"],
                    "symptom_change_pct": trend["change_pct"],
                    "symptom_direction": trend["direction"],
                    "strength": strength,
                })

    # Sort: strong positive first, then moderate, then negative
    priority = {"strong_positive": 0, "moderate_positive": 1, "neutral": 2, "negative_indicator": 3}
    correlations.sort(key=lambda c: priority.get(c["strength"], 4))
    return correlations


SUPPLEMENT_NAMES = {
    "magnesium": "Magnesium",
    "b_vitamins": "Vitamin B-Komplex",
    "vitamin_c": "Vitamin C",
    "ashwagandha": "Ashwagandha",
    "zinc": "Zink",
    "omega3": "Omega-3",
    "probiotics": "Probiotika",
}

SYMPTOM_NAMES_DE = {
    "energy": "Energie",
    "sleep": "Schlaf",
    "mood": "Stimmung",
    "concentration": "Konzentration",
    "digestion": "Verdauung",
}

SYMPTOM_NAMES_IT = {
    "energy": "Energia",
    "sleep": "Sonno",
    "mood": "Umore",
    "concentration": "Concentrazione",
    "digestion": "Digestione",
}


async def _get_llm_insights(supplement_compliance, symptom_trends, correlations, overall_trend, days, lang):
    """Get LLM-powered personalized insights."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        ai_config = await db.ai_config.find_one({"_id": "active"})
        provider = ai_config.get("provider", "openai") if ai_config else "openai"
        model = ai_config.get("model", "gpt-4o") if ai_config else "gpt-4o"

        sym_names = SYMPTOM_NAMES_DE if lang == "de" else SYMPTOM_NAMES_IT

        # Build data summary for LLM
        lines = []
        lines.append(f"Zeitraum: {days} Tage" if lang == "de" else f"Periodo: {days} giorni")
        lines.append(f"Gesamttrend: {overall_trend['direction']}, {overall_trend['change_pct']}%"
                     if lang == "de" else
                     f"Trend generale: {overall_trend['direction']}, {overall_trend['change_pct']}%")

        lines.append("\nSupplement-Einnahmetreue:" if lang == "de" else "\nCompliance supplementi:")
        for sid, comp in supplement_compliance.items():
            name = SUPPLEMENT_NAMES.get(sid, sid)
            lines.append(f"- {name}: {comp['rate']}% ({comp['taken']}/{comp['total']} Tage)")

        lines.append("\nSymptom-Veraenderungen:" if lang == "de" else "\nVariazioni sintomi:")
        for sym, trend in symptom_trends.items():
            name = sym_names.get(sym, sym)
            lines.append(f"- {name}: {trend['avg_start']} -> {trend['avg_end']} ({trend['change_pct']:+.1f}%)")

        data_text = "\n".join(lines)

        system_msg = _build_system_prompt(lang)
        user_msg = f"Analysiere diese Daten und erstelle personalisierte Insights:\n\n{data_text}\n\nAntworte nur mit JSON." if lang == "de" else \
                   f"Analizza questi dati e crea insights personalizzati:\n\n{data_text}\n\nRispondi solo con JSON."

        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY', ''),
            session_id=session_id,
            system_message=system_msg
        ).with_model(provider, model)

        response = await chat.send_message(UserMessage(text=user_msg))
        raw = response if isinstance(response, str) else str(response)
        return _parse_insights(raw)

    except Exception as e:
        return _fallback_insights(supplement_compliance, symptom_trends, overall_trend, days, lang)


def _build_system_prompt(lang: str) -> str:
    if lang == "de":
        return """Du bist ein Health-Data-Analyst. Analysiere die Korrelation zwischen Supplement-Einnahme und Symptomverlauf.

Antworte AUSSCHLIESSLICH mit validem JSON:
{
  "headline": "<Haupterkenntnis in einem Satz>",
  "insights": [
    {
      "type": "correlation|improvement|warning|tip",
      "icon": "trending-up|trending-down|alert|lightbulb|link-variant|check-circle",
      "text": "<Personalisierter Insight-Text, z.B. 'Seit Beginn der Magnesium-Einnahme hat sich dein Schlaf um 26% verbessert.'>",
      "severity": "positive|neutral|negative"
    }
  ],
  "recommendation": "<1-2 Saetze Handlungsempfehlung>"
}

Regeln:
- Beziehe dich auf konkrete Supplements und Symptome mit deren Namen
- Nenne konkrete Prozentwerte
- Formuliere persoenlich (du/dein)
- Mindestens 3, maximal 6 Insights
- ALLE Texte auf Deutsch
- Keine Markdown, nur JSON"""
    else:
        return """Sei un analista di dati sanitari. Analizza la correlazione tra assunzione di supplementi e andamento dei sintomi.

Rispondi ESCLUSIVAMENTE con JSON valido:
{
  "headline": "<Scoperta principale in una frase>",
  "insights": [
    {
      "type": "correlation|improvement|warning|tip",
      "icon": "trending-up|trending-down|alert|lightbulb|link-variant|check-circle",
      "text": "<Insight personalizzato, es. 'Da quando prendi il Magnesio, il tuo sonno e migliorato del 26%.'>",
      "severity": "positive|neutral|negative"
    }
  ],
  "recommendation": "<1-2 frasi di raccomandazione>"
}

Regole:
- Riferisciti a supplementi e sintomi specifici con i loro nomi
- Cita percentuali concrete
- Formula in modo personale (tu/tuo)
- Minimo 3, massimo 6 insights
- TUTTI i testi in italiano
- Nessun Markdown, solo JSON"""


def _parse_insights(raw: str) -> dict:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    return {"headline": text[:200], "insights": [], "recommendation": ""}


def _fallback_insights(supplement_compliance, symptom_trends, overall_trend, days, lang):
    """Generate basic insights without LLM."""
    sym_names = SYMPTOM_NAMES_DE if lang == "de" else SYMPTOM_NAMES_IT
    insights = []

    for sym, trend in symptom_trends.items():
        name = sym_names.get(sym, sym)
        if trend["direction"] == "improving" and trend["change_pct"] > 10:
            text = (f"Dein {name}-Wert hat sich um {trend['change_pct']}% verbessert "
                    f"(von {trend['avg_start']} auf {trend['avg_end']}).") if lang == "de" else \
                   (f"Il tuo {name} e migliorato del {trend['change_pct']}% "
                    f"(da {trend['avg_start']} a {trend['avg_end']}).")
            insights.append({"type": "improvement", "icon": "trending-up", "text": text, "severity": "positive"})
        elif trend["direction"] == "worsening":
            text = (f"Dein {name}-Wert hat sich um {abs(trend['change_pct'])}% verschlechtert. "
                    f"Optimierung empfohlen.") if lang == "de" else \
                   (f"Il tuo {name} e peggiorato del {abs(trend['change_pct'])}%. "
                    f"Ottimizzazione consigliata.")
            insights.append({"type": "warning", "icon": "trending-down", "text": text, "severity": "negative"})

    if overall_trend["direction"] == "stable":
        text = ("Keine signifikante Veraenderung deiner Gesamtwerte – "
                "Optimierung empfohlen.") if lang == "de" else \
               ("Nessun cambiamento significativo nei valori complessivi – "
                "ottimizzazione consigliata.")
        insights.append({"type": "tip", "icon": "lightbulb", "text": text, "severity": "neutral"})

    headline = (f"Dein Wohlbefinden hat sich in {days} Tagen um "
                f"{overall_trend['change_pct']}% veraendert.") if lang == "de" else \
               (f"Il tuo benessere e cambiato del {overall_trend['change_pct']}% in {days} giorni.")

    return {
        "headline": headline,
        "insights": insights[:6],
        "recommendation": ("Bleibe bei deiner Einnahmeroutine fuer optimale Ergebnisse." if lang == "de"
                          else "Mantieni la tua routine di assunzione per risultati ottimali."),
    }
