from fastapi import APIRouter
from datetime import datetime, timezone, timedelta

from core.config import db, logger
from routes.wearable_scoring import compute_scores_for_date

router = APIRouter(prefix="/coach", tags=["smart-coach"])


async def _load_wearable_context(profile_id: str) -> dict:
    """Fetch latest VitaGuide wearable scores + baselines for the coach.

    Returns a compact dict `{ available, in_learning_phase, days_of_data,
    readiness, recovery, sleep, activity, hrv_delta_pct, rhr_delta_pct,
    battery_level, last_sync_at }` or `{ available: False, ... }`.
    """
    device = await db.wearable_devices.find_one(
        {"user_id": profile_id}, {"_id": 0}, sort=[("paired_at", -1)]
    )
    if not device:
        return {"available": False, "reason": "no_device_paired"}
    try:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        scores = await compute_scores_for_date(profile_id, today)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Wearable coach context error: {e}")
        return {"available": False, "reason": "scoring_error"}

    def _v(k: str):
        return (scores.get("scores", {}).get(k) or {}).get("value")

    hrv_b = (scores.get("baselines") or {}).get("hrv") or {}
    rhr_b = (scores.get("baselines") or {}).get("resting_heart_rate") or {}

    return {
        "available": True,
        "device_name": device.get("name"),
        "battery_level": device.get("battery_level"),
        "last_sync_at": device.get("last_sync_at"),
        "in_learning_phase": scores.get("in_learning_phase"),
        "days_of_data": scores.get("days_of_data"),
        "data_completeness": scores.get("data_completeness"),
        "readiness": _v("readiness"),
        "recovery": _v("recovery"),
        "sleep": _v("sleep"),
        "activity": _v("activity"),
        "hrv_delta_pct": hrv_b.get("delta_pct"),
        "rhr_delta_pct": rhr_b.get("delta_pct"),
        "hrv_sufficient": hrv_b.get("sufficient", False),
    }


@router.get("/{profile_id}")
async def get_coach_insights(profile_id: str, lang: str = "de"):
    """Smart Coach: Analyze user data and return personalized recommendations."""
    t = lambda de, it: it if lang == "it" else de
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    insights = []

    # Load profile data
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    p = profile.get("profile", profile) if profile else {}
    sleep = p.get("sleep_quality", 5)
    energy = p.get("energy_level", 5)
    stress_val = p.get("stress_level", 5)
    water_intake = p.get("water_intake", 5)

    # 7-day trends
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d")

    # Water trend
    water_docs = await db.water_tracking.find(
        {"profile_id": profile_id, "date": {"$gte": week_ago}}, {"_id": 0}
    ).to_list(7)
    goal_doc = await db.water_goals.find_one({"profile_id": profile_id}, {"_id": 0})
    water_goal = goal_doc["daily_goal_ml"] if goal_doc else 2400
    water_days_reached = sum(1 for w in water_docs if w.get("total_ml", 0) >= water_goal)
    avg_water = sum(w.get("total_ml", 0) for w in water_docs) / max(1, len(water_docs)) if water_docs else 0

    # Supplement adherence
    supp_plan = await db.supplement_plans.find_one({"profile_id": profile_id}, {"_id": 0})
    supp_adherence = None
    if supp_plan:
        schedule = supp_plan.get("plan", {}).get("weekly_schedule", {})
        total_items = 0
        for timing in ["morning", "noon", "evening"]:
            section = schedule.get(timing, {})
            items = section.get("items", []) if isinstance(section, dict) else (section if isinstance(section, list) else [])
            total_items += len(items)
        if total_items > 0:
            supp_logs_count = await db.supplement_check_ins.count_documents(
                {"profile_id": profile_id, "date": {"$gte": week_ago}}
            )
            supp_adherence = min(100, round(supp_logs_count / (total_items * 7) * 100))

    # Stress sessions
    stress_sessions = await db.user_stress_sessions.find(
        {"profile_id": profile_id, "started_at": {"$gte": week_ago}, "completion_status": "completed"},
        {"_id": 0}
    ).to_list(50)
    stress_count = len(stress_sessions)
    avg_improvement = 0
    if stress_count > 0:
        improvements = [s.get("stress_before", 0) - s.get("stress_after", 0) for s in stress_sessions if s.get("stress_before") and s.get("stress_after")]
        avg_improvement = round(sum(improvements) / len(improvements), 1) if improvements else 0

    # Generate smart insights
    priority = 0

    # Critical: High stress + poor sleep
    if stress_val >= 7 and sleep <= 3:
        priority += 1
        insights.append({
            "type": "critical",
            "icon": "alert-circle",
            "color": "#DC2626",
            "title": t("Stress & Schlaf", "Stress e sonno"),
            "text": t(
                "Dein Stresslevel ist hoch und du schlaefst schlecht. Versuche heute Abend eine Entspannungsuebung vor dem Schlafen.",
                "Il tuo livello di stress e alto e dormi male. Prova un esercizio di rilassamento stasera prima di dormire."
            ),
            "action": "stress",
            "priority": priority,
        })

    # Low water
    if water_days_reached < 3:
        priority += 1
        insights.append({
            "type": "warning",
            "icon": "water-alert",
            "color": "#F59E0B",
            "title": t("Mehr trinken", "Bevi di piu"),
            "text": t(
                f"Du hast diese Woche nur {water_days_reached}/7 Tage dein Wasserziel erreicht. Stelle eine Flasche auf deinen Schreibtisch!",
                f"Questa settimana hai raggiunto l'obiettivo acqua solo {water_days_reached}/7 giorni. Tieni una bottiglia sulla scrivania!"
            ),
            "action": "water-tracking",
            "priority": priority,
        })

    # Low supplement adherence
    if supp_adherence is not None and supp_adherence < 60:
        priority += 1
        insights.append({
            "type": "warning",
            "icon": "pill",
            "color": "#F59E0B",
            "title": t("Einnahmetreue verbessern", "Migliora l'aderenza"),
            "text": t(
                f"Deine Supplement-Einnahme liegt bei {supp_adherence}%. Setze dir feste Zeiten oder aktiviere Erinnerungen.",
                f"La tua aderenza ai supplementi e del {supp_adherence}%. Imposta orari fissi o attiva i promemoria."
            ),
            "action": "plan",
            "priority": priority,
        })

    # No stress exercises
    if stress_count == 0 and stress_val >= 5:
        priority += 1
        insights.append({
            "type": "suggestion",
            "icon": "weather-windy",
            "color": "#8B5CF6",
            "title": t("Entspannung einbauen", "Inserisci il relax"),
            "text": t(
                "Du hast diese Woche keine Entspannungsuebung gemacht. Schon 2 Minuten taeglich machen einen Unterschied.",
                "Non hai fatto esercizi di rilassamento questa settimana. Anche 2 minuti al giorno fanno la differenza."
            ),
            "action": "stress",
            "priority": priority,
        })

    # Good performance
    if supp_adherence and supp_adherence >= 80 and water_days_reached >= 5:
        insights.append({
            "type": "praise",
            "icon": "star",
            "color": "#22C55E",
            "title": t("Tolle Woche!", "Ottima settimana!"),
            "text": t(
                f"Supplement-Einnahme {supp_adherence}% und Wasserziel {water_days_reached}/7 Tage erreicht. Weiter so!",
                f"Aderenza supplementi {supp_adherence}% e obiettivo acqua {water_days_reached}/7 giorni. Continua cosi!"
            ),
            "action": None,
            "priority": 99,
        })

    # Stress improving
    if stress_count >= 3 and avg_improvement > 1:
        insights.append({
            "type": "praise",
            "icon": "trending-down",
            "color": "#22C55E",
            "title": t("Stress sinkt", "Stress in calo"),
            "text": t(
                f"{stress_count} Uebungen, durchschnittlich {avg_improvement} Punkte Stressreduktion. Dein Koerper dankt dir.",
                f"{stress_count} esercizi, in media {avg_improvement} punti di riduzione stress. Il tuo corpo ti ringrazia."
            ),
            "action": None,
            "priority": 98,
        })

    # Low energy suggestion
    if energy <= 3:
        priority += 1
        insights.append({
            "type": "suggestion",
            "icon": "battery-low",
            "color": "#F97316",
            "title": t("Energie aufladen", "Ricarica energia"),
            "text": t(
                "Dein Energielevel ist niedrig. Trinke ein Glas Wasser, mache eine kurze Pause oder geh kurz an die frische Luft.",
                "Il tuo livello di energia e basso. Bevi un bicchiere d'acqua, fai una pausa o prendi aria fresca."
            ),
            "action": "water-tracking",
            "priority": priority,
        })

    # ------------------------------------------------------------------
    # Wearable-based insights (only when a band is paired)
    # ------------------------------------------------------------------
    wearable = await _load_wearable_context(profile_id)

    if wearable.get("available") and not wearable.get("in_learning_phase"):
        readiness = wearable.get("readiness")
        recovery = wearable.get("recovery")
        sleep_score = wearable.get("sleep")
        hrv_delta = wearable.get("hrv_delta_pct") or 0
        rhr_delta = wearable.get("rhr_delta_pct") or 0

        # Low readiness → training-easy day
        if readiness is not None and readiness < 45:
            priority += 1
            insights.append({
                "type": "warning",
                "icon": "flash-off",
                "color": "#B45309",
                "title": t("Heute ruhiger angehen", "Oggi meglio piu calmi"),
                "text": t(
                    f"Dein Readiness-Score liegt bei {int(readiness)}/100. Ein ruhiger Tag mit Yoga, Spaziergang oder Atemuebungen tut dir heute besser als hartes Training.",
                    f"Il tuo Readiness e {int(readiness)}/100. Oggi yoga, camminata o esercizi di respirazione ti fanno bene piu di un allenamento duro."
                ),
                "action": "wearable-dashboard",
                "priority": priority,
                "source": "wearable",
            })
        # High readiness → good training day
        elif readiness is not None and readiness >= 75:
            priority += 1
            insights.append({
                "type": "praise",
                "icon": "rocket-launch",
                "color": "#059669",
                "title": t("Bester Tag fuers Training", "Giorno ideale per allenarsi"),
                "text": t(
                    f"Readiness {int(readiness)}/100 – dein Koerper ist erholt. Wenn du heute Sport machen kannst, ist es ein guter Tag dafuer.",
                    f"Readiness {int(readiness)}/100 – il tuo corpo e recuperato. Se puoi allenarti oggi, e un ottimo giorno."
                ),
                "action": "wearable-dashboard",
                "priority": priority + 20,   # positive → later
                "source": "wearable",
            })

        # HRV significantly below baseline
        if wearable.get("hrv_sufficient") and hrv_delta <= -15:
            priority += 1
            insights.append({
                "type": "warning",
                "icon": "sine-wave",
                "color": "#B45309",
                "title": t("HRV unter deinem Normalwert", "HRV sotto il tuo valore normale"),
                "text": t(
                    f"Deine HRV ist {abs(hrv_delta):.0f}% niedriger als deine Basislinie. Achte heute auf Schlaf, sanfte Bewegung und ausreichend Wasser.",
                    f"La tua HRV e piu bassa del {abs(hrv_delta):.0f}% rispetto alla tua baseline. Cura oggi il sonno, muoviti dolcemente, bevi acqua."
                ),
                "action": "wearable-dashboard",
                "priority": priority,
                "source": "wearable",
            })

        # Resting heart rate elevated → possible strain
        if rhr_delta >= 10:
            priority += 1
            insights.append({
                "type": "suggestion",
                "icon": "heart-pulse",
                "color": "#F97316",
                "title": t("Ruhepuls etwas erhoeht", "Frequenza a riposo un po alta"),
                "text": t(
                    f"Dein Ruhepuls liegt {rhr_delta:.0f}% ueber deiner Basislinie. Das kann an Stress, wenig Schlaf oder beginnender Belastung liegen.",
                    f"La tua frequenza a riposo e piu alta del {rhr_delta:.0f}% rispetto alla baseline. Puo dipendere da stress, poco sonno o affaticamento."
                ),
                "action": "wearable-dashboard",
                "priority": priority,
                "source": "wearable",
            })

        # Poor sleep score from band
        if sleep_score is not None and sleep_score < 55:
            priority += 1
            insights.append({
                "type": "suggestion",
                "icon": "power-sleep",
                "color": "#4338CA",
                "title": t("Schlaf war heute knapp", "Sonno oggi scarso"),
                "text": t(
                    f"Dein Band bewertet den Schlaf mit {int(sleep_score)}/100. Ein 20-min-Powernap oder ein frueherer Feierabend kann helfen.",
                    f"Il band valuta il sonno {int(sleep_score)}/100. Un powernap di 20 min o andare a dormire prima puo aiutare."
                ),
                "action": "wearable-dashboard",
                "priority": priority,
                "source": "wearable",
            })

    insights.sort(key=lambda x: x["priority"])

    return {
        "insights": insights[:4],
        "summary": {
            "sleep": sleep,
            "energy": energy,
            "stress": stress_val,
            "water_days": water_days_reached,
            "supp_adherence": supp_adherence,
            "stress_sessions": stress_count,
            "avg_water_ml": round(avg_water),
        },
        "wearable": wearable,
    }
