"""
Tracking & Fortschritts-Engine
Symptom-Tracking, Supplement-Compliance, Trends, Insights, Meilensteine
"""
from datetime import datetime, timezone, timedelta


def calculate_trend(values: list) -> dict:
    """Calculate trend from a list of numeric values (oldest first)."""
    if len(values) < 2:
        return {"direction": "neutral", "change_pct": 0, "label_de": "Zu wenig Daten", "label_it": "Dati insufficienti"}

    first_half = values[:len(values)//2]
    second_half = values[len(values)//2:]
    avg_first = sum(first_half) / len(first_half)
    avg_second = sum(second_half) / len(second_half)

    if avg_first == 0:
        change_pct = 0
    else:
        change_pct = round(((avg_second - avg_first) / avg_first) * 100, 1)

    if change_pct < -10:
        return {"direction": "improving", "change_pct": abs(change_pct),
                "label_de": f"{abs(change_pct)}% Verbesserung", "label_it": f"{abs(change_pct)}% miglioramento"}
    elif change_pct > 10:
        return {"direction": "worsening", "change_pct": change_pct,
                "label_de": f"{change_pct}% Verschlechterung", "label_it": f"{change_pct}% peggioramento"}
    else:
        return {"direction": "stable", "change_pct": abs(change_pct),
                "label_de": "Stabil", "label_it": "Stabile"}


def calculate_compliance_rate(checks: list, total_expected: int) -> float:
    """Calculate compliance percentage."""
    if total_expected == 0:
        return 0
    taken = sum(1 for c in checks if c.get("taken"))
    return round((taken / total_expected) * 100, 1)


def detect_milestones(streak: int, total_days: int, compliance_rate: float) -> list:
    """Detect achieved milestones."""
    milestones = []

    if streak >= 3:
        milestones.append({"id": "streak_3", "name_de": "3-Tage-Streak", "name_it": "Streak 3 giorni",
                           "icon": "fire", "achieved": True})
    if streak >= 7:
        milestones.append({"id": "streak_7", "name_de": "7-Tage-Streak", "name_it": "Streak 7 giorni",
                           "icon": "star", "achieved": True})
    if streak >= 14:
        milestones.append({"id": "streak_14", "name_de": "14-Tage-Streak", "name_it": "Streak 14 giorni",
                           "icon": "trophy", "achieved": True})
    if streak >= 30:
        milestones.append({"id": "streak_30", "name_de": "30 Tage geschafft!", "name_it": "30 giorni completati!",
                           "icon": "medal", "achieved": True})

    if total_days >= 7 and compliance_rate >= 80:
        milestones.append({"id": "compliance_80", "name_de": "80% Einnahmetreue", "name_it": "80% compliance",
                           "icon": "check-decagram", "achieved": True})
    if total_days >= 14 and compliance_rate >= 90:
        milestones.append({"id": "compliance_90", "name_de": "90% Einnahmetreue", "name_it": "90% compliance",
                           "icon": "shield-check", "achieved": True})

    if total_days >= 1:
        milestones.append({"id": "first_day", "name_de": "Erster Tag!", "name_it": "Primo giorno!",
                           "icon": "flag-checkered", "achieved": True})
    if total_days >= 7:
        milestones.append({"id": "week_1", "name_de": "Erste Woche", "name_it": "Prima settimana",
                           "icon": "calendar-check", "achieved": True})
    if total_days >= 30:
        milestones.append({"id": "month_1", "name_de": "Erster Monat", "name_it": "Primo mese",
                           "icon": "calendar-star", "achieved": True})

    return milestones


def generate_insights(days_tracked: int, symptom_trend: dict, compliance_rate: float,
                      compliance_trend: dict, lang: str = "de") -> list:
    """Generate smart feedback based on tracking data."""
    insights = []

    # 14-day evaluation
    if days_tracked >= 14:
        if symptom_trend["direction"] == "improving":
            insights.append({
                "type": "positive", "icon": "trending-down",
                "title": "Erste Verbesserung!" if lang == "de" else "Primo miglioramento!",
                "text": (f"Ihre Beschwerden haben sich um {symptom_trend['change_pct']}% verbessert. "
                         "Bleiben Sie dran!") if lang == "de" else
                        (f"I tuoi sintomi sono migliorati del {symptom_trend['change_pct']}%. Continua cosi!")
            })
        elif symptom_trend["direction"] == "worsening":
            insights.append({
                "type": "warning", "icon": "alert-circle",
                "title": "Achtung: Verschlechterung" if lang == "de" else "Attenzione: peggioramento",
                "text": ("Ihre Beschwerden zeigen eine Verschlechterung. "
                         "Pruefen Sie Ihre Einnahmetreue und sprechen Sie ggf. mit einem Arzt.") if lang == "de" else
                        ("I tuoi sintomi mostrano un peggioramento. "
                         "Verifica la tua compliance e consulta un medico se necessario.")
            })
        else:
            insights.append({
                "type": "info", "icon": "information",
                "title": "Stabile Phase" if lang == "de" else "Fase stabile",
                "text": ("Ihre Werte sind stabil. Manche Supplements brauchen 4-8 Wochen "
                         "bis zur vollen Wirkung.") if lang == "de" else
                        ("I tuoi valori sono stabili. Alcuni supplementi impiegano 4-8 settimane "
                         "per il pieno effetto.")
            })

    # 30-day optimization
    if days_tracked >= 30:
        if compliance_rate < 70:
            insights.append({
                "type": "suggestion", "icon": "lightbulb",
                "title": "Optimierungstipp" if lang == "de" else "Suggerimento",
                "text": (f"Ihre Einnahmetreue liegt bei {compliance_rate}%. "
                         "Versuchen Sie, feste Zeiten fuer die Einnahme zu etablieren.") if lang == "de" else
                        (f"La tua compliance e al {compliance_rate}%. "
                         "Prova a stabilire orari fissi per l'assunzione.")
            })
        if symptom_trend["direction"] == "stable" and compliance_rate >= 80:
            insights.append({
                "type": "suggestion", "icon": "swap-horizontal",
                "title": "Plan-Anpassung empfohlen" if lang == "de" else "Adattamento piano consigliato",
                "text": ("Trotz guter Einnahmetreue stagnieren Ihre Werte. "
                         "Ueberlegen Sie, Ihren Gesundheits-Check zu wiederholen.") if lang == "de" else
                        ("Nonostante buona compliance i tuoi valori stagnano. "
                         "Considera di ripetere il check salute.")
            })

    # Compliance-Symptom correlation
    if days_tracked >= 7:
        if compliance_rate >= 80 and symptom_trend["direction"] == "improving":
            insights.append({
                "type": "positive", "icon": "link-variant",
                "title": "Zusammenhang erkannt" if lang == "de" else "Correlazione rilevata",
                "text": ("Hohe Einnahmetreue und Symptomverbesserung gehen Hand in Hand. "
                         "Weiter so!") if lang == "de" else
                        ("Alta compliance e miglioramento sintomi vanno di pari passo. "
                         "Continua cosi!")
            })
        elif compliance_rate < 50:
            insights.append({
                "type": "warning", "icon": "alert",
                "title": "Einnahme verbessern" if lang == "de" else "Migliora l'assunzione",
                "text": (f"Nur {compliance_rate}% Einnahmetreue. "
                         "Supplements koennen nur wirken, wenn sie regelmaessig eingenommen werden.") if lang == "de" else
                        (f"Solo {compliance_rate}% di compliance. "
                         "I supplementi funzionano solo con assunzione regolare.")
            })

    # Motivational for early days
    if days_tracked < 7:
        insights.append({
            "type": "motivation", "icon": "arm-flex",
            "title": "Guter Start!" if lang == "de" else "Buon inizio!",
            "text": (f"Sie tracken seit {days_tracked} Tag(en). "
                     "Bleiben Sie mindestens 14 Tage dabei fuer erste Auswertungen.") if lang == "de" else
                    (f"Stai tracciando da {days_tracked} giorno/i. "
                     "Continua per almeno 14 giorni per le prime valutazioni.")
        })

    return insights


def calculate_streak(dates: list) -> int:
    """Calculate current consecutive day streak from a list of date strings."""
    if not dates:
        return 0

    sorted_dates = sorted(set(dates), reverse=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    if sorted_dates[0] != today and sorted_dates[0] != yesterday:
        return 0

    streak = 1
    for i in range(len(sorted_dates) - 1):
        d1 = datetime.strptime(sorted_dates[i], "%Y-%m-%d")
        d2 = datetime.strptime(sorted_dates[i + 1], "%Y-%m-%d")
        if (d1 - d2).days == 1:
            streak += 1
        else:
            break
    return streak


def get_overall_progress(days_tracked: int, compliance_rate: float, symptom_trend: dict) -> float:
    """Calculate overall progress percentage (0-100)."""
    # Weight: 40% time (8 weeks = 56 days), 30% compliance, 30% symptom improvement
    time_score = min(days_tracked / 56, 1.0) * 40
    compliance_score = (compliance_rate / 100) * 30

    if symptom_trend["direction"] == "improving":
        symptom_score = min(symptom_trend["change_pct"] / 30, 1.0) * 30
    elif symptom_trend["direction"] == "stable":
        symptom_score = 15
    else:
        symptom_score = 5

    return round(time_score + compliance_score + symptom_score, 1)
