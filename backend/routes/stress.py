from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from core.config import db, logger

router = APIRouter(prefix="/stress", tags=["stress"])


# ── Models ──

class StartSessionRequest(BaseModel):
    profile_id: str
    exercise_id: str
    stress_before: Optional[int] = None  # 1-10

class CompleteSessionRequest(BaseModel):
    stress_after: Optional[int] = None  # 1-10
    mood_after: Optional[str] = None  # calm, focused, relaxed, neutral
    completed: bool = True


# ── Seed exercises on first load ──

SEED_EXERCISES = [
    # A. Atemuebungen
    {
        "id": "breath_box", "name_de": "Box Breathing", "name_it": "Respirazione a scatola",
        "category": "breathing", "duration_seconds": 240, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "animation",
        "description_de": "Atme in einem gleichmaessigen Rhythmus ein, halte, atme aus, halte. Beruhigt das Nervensystem in wenigen Minuten.",
        "description_it": "Respira in un ritmo regolare: inspira, trattieni, espira, trattieni. Calma il sistema nervoso in pochi minuti.",
        "content_json": {
            "type": "breathing",
            "pattern": [
                {"phase": "inhale", "label_de": "Einatmen", "label_it": "Inspira", "seconds": 4},
                {"phase": "hold", "label_de": "Halten", "label_it": "Trattieni", "seconds": 4},
                {"phase": "exhale", "label_de": "Ausatmen", "label_it": "Espira", "seconds": 4},
                {"phase": "hold", "label_de": "Halten", "label_it": "Trattieni", "seconds": 4},
            ],
            "cycles": 15,
        },
        "is_active": True,
    },
    {
        "id": "breath_478", "name_de": "4-7-8 Atmung", "name_it": "Respirazione 4-7-8",
        "category": "breathing", "duration_seconds": 180, "difficulty": "easy",
        "primary_goal": "sleep", "time_of_day": "evening",
        "instruction_type": "animation",
        "description_de": "Eine bewaehrte Atemtechnik fuer tiefe Entspannung. Ideal vor dem Einschlafen.",
        "description_it": "Una tecnica di respirazione comprovata per un rilassamento profondo. Ideale prima di dormire.",
        "content_json": {
            "type": "breathing",
            "pattern": [
                {"phase": "inhale", "label_de": "Einatmen", "label_it": "Inspira", "seconds": 4},
                {"phase": "hold", "label_de": "Halten", "label_it": "Trattieni", "seconds": 7},
                {"phase": "exhale", "label_de": "Ausatmen", "label_it": "Espira", "seconds": 8},
            ],
            "cycles": 10,
        },
        "is_active": True,
    },
    {
        "id": "breath_calm", "name_de": "Ruhige Atmung", "name_it": "Respirazione calma",
        "category": "breathing", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "calm", "time_of_day": "any",
        "instruction_type": "animation",
        "description_de": "Einfache, langsame Atmung um schnell zur Ruhe zu kommen.",
        "description_it": "Respirazione semplice e lenta per calmarsi rapidamente.",
        "content_json": {
            "type": "breathing",
            "pattern": [
                {"phase": "inhale", "label_de": "Einatmen", "label_it": "Inspira", "seconds": 5},
                {"phase": "exhale", "label_de": "Ausatmen", "label_it": "Espira", "seconds": 5},
            ],
            "cycles": 12,
        },
        "is_active": True,
    },
    # B. Mini-Entspannung
    {
        "id": "mini_2min_pause", "name_de": "2 Minuten Pause", "name_it": "Pausa di 2 minuti",
        "category": "mini", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Eine kurze Auszeit fuer zwischendurch. Schliesse die Augen und lass los.",
        "description_it": "Una breve pausa per ricaricarsi. Chiudi gli occhi e lascia andare.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 10, "text_de": "Setze dich bequem hin und schliesse die Augen.", "text_it": "Siediti comodamente e chiudi gli occhi."},
                {"duration": 20, "text_de": "Atme dreimal tief ein und aus.", "text_it": "Fai tre respiri profondi."},
                {"duration": 30, "text_de": "Spuere deinen Koerper. Wo haeltst du Spannung?", "text_it": "Senti il tuo corpo. Dove tieni la tensione?"},
                {"duration": 30, "text_de": "Lass die Spannung mit jedem Ausatmen los.", "text_it": "Lascia andare la tensione con ogni espirazione."},
                {"duration": 20, "text_de": "Hoere auf die Geraeusche um dich herum.", "text_it": "Ascolta i suoni intorno a te."},
                {"duration": 10, "text_de": "Oeffne langsam die Augen. Du bist bereit.", "text_it": "Apri lentamente gli occhi. Sei pronto."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "mini_body_scan", "name_de": "Kurzer Body Scan", "name_it": "Body scan rapido",
        "category": "mini", "duration_seconds": 180, "difficulty": "easy",
        "primary_goal": "calm", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Scanne deinen Koerper von Kopf bis Fuss und loesche Verspannungen.",
        "description_it": "Scansiona il tuo corpo dalla testa ai piedi e rilascia le tensioni.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Schliesse die Augen. Atme ruhig.", "text_it": "Chiudi gli occhi. Respira con calma."},
                {"duration": 25, "text_de": "Spuere deinen Kopf und deine Stirn. Lass sie weich werden.", "text_it": "Senti la tua testa e la fronte. Lasciale ammorbidire."},
                {"duration": 25, "text_de": "Lass deine Schultern sinken. Ganz locker.", "text_it": "Lascia cadere le spalle. Completamente rilassate."},
                {"duration": 25, "text_de": "Spuere deine Arme und Haende. Lass sie schwer werden.", "text_it": "Senti le braccia e le mani. Lasciale diventare pesanti."},
                {"duration": 25, "text_de": "Atme in deinen Bauch. Spuere wie er sich hebt.", "text_it": "Respira nella pancia. Senti come si alza."},
                {"duration": 25, "text_de": "Spuere deine Beine und Fuesse. Ganz entspannt.", "text_it": "Senti le gambe e i piedi. Completamente rilassati."},
                {"duration": 25, "text_de": "Spuere deinen ganzen Koerper. Ruhig und schwer.", "text_it": "Senti tutto il tuo corpo. Calmo e pesante."},
                {"duration": 15, "text_de": "Oeffne langsam die Augen.", "text_it": "Apri lentamente gli occhi."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "mini_shoulders", "name_de": "Schultern lockern", "name_it": "Rilassa le spalle",
        "category": "mini", "duration_seconds": 90, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Schnelle Entspannung fuer verspannte Schultern.",
        "description_it": "Rilassamento rapido per le spalle tese.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Ziehe deine Schultern hoch zu den Ohren.", "text_it": "Alza le spalle verso le orecchie."},
                {"duration": 10, "text_de": "Halte die Spannung.", "text_it": "Mantieni la tensione."},
                {"duration": 15, "text_de": "Lass sie fallen. Spuere die Erleichterung.", "text_it": "Lasciale cadere. Senti il sollievo."},
                {"duration": 15, "text_de": "Wiederhole: Schultern hoch.", "text_it": "Ripeti: spalle su."},
                {"duration": 10, "text_de": "Halten.", "text_it": "Mantieni."},
                {"duration": 15, "text_de": "Loslassen. Spuere die Waerme.", "text_it": "Lascia andare. Senti il calore."},
                {"duration": 10, "text_de": "Atme tief durch. Fertig.", "text_it": "Fai un respiro profondo. Fatto."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "mini_thoughts", "name_de": "Gedanken beruhigen", "name_it": "Calma i pensieri",
        "category": "mini", "duration_seconds": 150, "difficulty": "medium",
        "primary_goal": "calm", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Lass kreisende Gedanken los und finde innere Stille.",
        "description_it": "Lascia andare i pensieri circolari e trova la calma interiore.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Schliesse die Augen. Atme tief ein.", "text_it": "Chiudi gli occhi. Fai un respiro profondo."},
                {"duration": 25, "text_de": "Beobachte deine Gedanken, ohne sie zu bewerten.", "text_it": "Osserva i tuoi pensieri senza giudicarli."},
                {"duration": 25, "text_de": "Stelle dir vor, deine Gedanken sind Wolken am Himmel.", "text_it": "Immagina che i tuoi pensieri siano nuvole nel cielo."},
                {"duration": 25, "text_de": "Lass jede Wolke weiterziehen.", "text_it": "Lascia passare ogni nuvola."},
                {"duration": 25, "text_de": "Konzentriere dich nur auf deinen Atem.", "text_it": "Concentrati solo sul tuo respiro."},
                {"duration": 25, "text_de": "Mit jedem Ausatmen wird es stiller.", "text_it": "Con ogni espirazione diventa piu silenzioso."},
                {"duration": 10, "text_de": "Oeffne die Augen. Ruhe ist in dir.", "text_it": "Apri gli occhi. La calma e in te."},
            ],
        },
        "is_active": True,
    },
    # C. Schlaf-/Abenduebungen
    {
        "id": "sleep_calm_breath", "name_de": "Ruhige Abendroutine", "name_it": "Routine serale calma",
        "category": "sleep", "duration_seconds": 300, "difficulty": "easy",
        "primary_goal": "sleep", "time_of_day": "evening",
        "instruction_type": "animation",
        "description_de": "Sanfte Atemuebung zum Einschlafen. Lass den Tag hinter dir.",
        "description_it": "Dolce esercizio di respirazione per addormentarsi. Lascia andare la giornata.",
        "content_json": {
            "type": "breathing",
            "pattern": [
                {"phase": "inhale", "label_de": "Einatmen", "label_it": "Inspira", "seconds": 4},
                {"phase": "exhale", "label_de": "Ausatmen", "label_it": "Espira", "seconds": 6},
            ],
            "cycles": 30,
        },
        "is_active": True,
    },
    {
        "id": "sleep_let_go", "name_de": "Stress loslassen", "name_it": "Lascia andare lo stress",
        "category": "sleep", "duration_seconds": 240, "difficulty": "easy",
        "primary_goal": "sleep", "time_of_day": "evening",
        "instruction_type": "text",
        "description_de": "Lass den Stress des Tages bewusst los und bereite dich auf erholsamen Schlaf vor.",
        "description_it": "Lascia andare consapevolmente lo stress della giornata e preparati per un sonno ristoratore.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 20, "text_de": "Lege dich hin. Schliesse die Augen.", "text_it": "Sdraiati. Chiudi gli occhi."},
                {"duration": 30, "text_de": "Denke an eine Sache, die dich heute belastet hat.", "text_it": "Pensa a una cosa che ti ha stressato oggi."},
                {"duration": 30, "text_de": "Atme tief ein. Beim Ausatmen: lass es gehen.", "text_it": "Inspira profondamente. Espirando: lascia andare."},
                {"duration": 30, "text_de": "Gibt es noch etwas? Atme es aus.", "text_it": "C'e qualcos'altro? Espiralo."},
                {"duration": 40, "text_de": "Dein Koerper wird schwer. Dein Geist wird ruhig.", "text_it": "Il tuo corpo diventa pesante. La tua mente diventa calma."},
                {"duration": 40, "text_de": "Stille. Nur dein Atem. Nichts anderes zaehlt.", "text_it": "Silenzio. Solo il tuo respiro. Nient'altro conta."},
                {"duration": 30, "text_de": "Lass dich in den Schlaf gleiten.", "text_it": "Lasciati scivolare nel sonno."},
                {"duration": 20, "text_de": "Gute Nacht.", "text_it": "Buonanotte."},
            ],
        },
        "is_active": True,
    },
    # D. Fokus-/Reset-Uebungen
    {
        "id": "focus_activation", "name_de": "Kurze Aktivierung", "name_it": "Attivazione rapida",
        "category": "focus", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "focus", "time_of_day": "morning",
        "instruction_type": "animation",
        "description_de": "Schnelle Atemuebung fuer mehr Energie und Klarheit.",
        "description_it": "Esercizio di respirazione rapido per piu energia e chiarezza.",
        "content_json": {
            "type": "breathing",
            "pattern": [
                {"phase": "inhale", "label_de": "Kraftvoll einatmen", "label_it": "Inspira con forza", "seconds": 3},
                {"phase": "exhale", "label_de": "Kraftvoll ausatmen", "label_it": "Espira con forza", "seconds": 3},
            ],
            "cycles": 20,
        },
        "is_active": True,
    },
    {
        "id": "focus_mental_clarity", "name_de": "Mentale Klarheit", "name_it": "Chiarezza mentale",
        "category": "focus", "duration_seconds": 150, "difficulty": "medium",
        "primary_goal": "focus", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Bringe Ordnung in deine Gedanken und finde Fokus.",
        "description_it": "Metti ordine nei tuoi pensieri e trova il focus.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Atme dreimal tief durch.", "text_it": "Fai tre respiri profondi."},
                {"duration": 25, "text_de": "Was ist gerade die wichtigste Sache?", "text_it": "Qual e la cosa piu importante adesso?"},
                {"duration": 25, "text_de": "Alles andere kann warten. Nur diese eine Sache.", "text_it": "Tutto il resto puo aspettare. Solo questa cosa."},
                {"duration": 25, "text_de": "Stelle dir vor, wie du sie erledigst. Schritt fuer Schritt.", "text_it": "Immagina di completarla. Passo dopo passo."},
                {"duration": 25, "text_de": "Spuere die Energie. Du bist bereit.", "text_it": "Senti l'energia. Sei pronto."},
                {"duration": 20, "text_de": "Oeffne die Augen. Voller Fokus.", "text_it": "Apri gli occhi. Pieno di focus."},
                {"duration": 15, "text_de": "Los geht's.", "text_it": "Andiamo."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "focus_reset", "name_de": "Reset bei Ueberforderung", "name_it": "Reset per sovraccarico",
        "category": "focus", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Wenn alles zu viel wird: stopp, atme, reset.",
        "description_it": "Quando tutto diventa troppo: fermati, respira, reset.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 10, "text_de": "Stopp. Leg alles weg.", "text_it": "Stop. Metti giu tutto."},
                {"duration": 20, "text_de": "Schliesse die Augen. Atme tief ein.", "text_it": "Chiudi gli occhi. Inspira profondamente."},
                {"duration": 20, "text_de": "Langsam ausatmen. Alles raus.", "text_it": "Espira lentamente. Tutto fuori."},
                {"duration": 20, "text_de": "Nochmal. Einatmen.", "text_it": "Di nuovo. Inspira."},
                {"duration": 20, "text_de": "Ausatmen. Lass es gehen.", "text_it": "Espira. Lascia andare."},
                {"duration": 15, "text_de": "Du bist staerker als der Moment.", "text_it": "Sei piu forte del momento."},
                {"duration": 15, "text_de": "Oeffne die Augen. Ein Schritt nach dem anderen.", "text_it": "Apri gli occhi. Un passo alla volta."},
            ],
        },
        "is_active": True,
    },
    # E. Bewegungsbasierte Entspannung
    {
        "id": "move_neck", "name_de": "Nacken lockern", "name_it": "Rilassa il collo",
        "category": "movement", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Loese Verspannungen im Nackenbereich mit sanften Bewegungen.",
        "description_it": "Rilascia le tensioni nel collo con movimenti delicati.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Setze dich aufrecht hin.", "text_it": "Siediti dritto."},
                {"duration": 20, "text_de": "Neige den Kopf langsam nach rechts. Halte 10 Sekunden.", "text_it": "Inclina lentamente la testa a destra. Tieni 10 secondi."},
                {"duration": 20, "text_de": "Zurueck zur Mitte. Jetzt nach links. Halte.", "text_it": "Torna al centro. Ora a sinistra. Mantieni."},
                {"duration": 20, "text_de": "Kreise den Kopf langsam nach rechts. Ganz weich.", "text_it": "Ruota lentamente la testa a destra. Molto dolcemente."},
                {"duration": 20, "text_de": "Jetzt nach links kreisen.", "text_it": "Ora ruota a sinistra."},
                {"duration": 15, "text_de": "Senke das Kinn zur Brust. Spuere die Dehnung.", "text_it": "Abbassa il mento al petto. Senti l'allungamento."},
                {"duration": 10, "text_de": "Zurueck zur Mitte. Fertig.", "text_it": "Torna al centro. Fatto."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "move_stretch", "name_de": "Leichte Dehnung", "name_it": "Stretching leggero",
        "category": "movement", "duration_seconds": 180, "difficulty": "easy",
        "primary_goal": "calm", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Sanfte Ganzkoerper-Dehnung fuer mehr Wohlbefinden.",
        "description_it": "Stretching dolce per tutto il corpo per piu benessere.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Stehe auf. Fuesse schulterbreit.", "text_it": "Alzati. Piedi alla larghezza delle spalle."},
                {"duration": 25, "text_de": "Strecke die Arme nach oben. Ganz lang machen.", "text_it": "Allunga le braccia verso l'alto. Allungati il piu possibile."},
                {"duration": 25, "text_de": "Beuge dich langsam nach vorne. Arme haengen lassen.", "text_it": "Piegati lentamente in avanti. Lascia pendere le braccia."},
                {"duration": 25, "text_de": "Langsam aufrollen. Wirbel fuer Wirbel.", "text_it": "Rialzati lentamente. Vertebra per vertebra."},
                {"duration": 25, "text_de": "Schultern hoch, halten, fallen lassen.", "text_it": "Spalle su, mantieni, lascia cadere."},
                {"duration": 25, "text_de": "Arme seitlich strecken. Kreisen.", "text_it": "Braccia laterali. Ruota."},
                {"duration": 25, "text_de": "Stehe ruhig. Spuere deinen Koerper.", "text_it": "Stai fermo. Senti il tuo corpo."},
                {"duration": 15, "text_de": "Tief durchatmen. Du bist entspannt.", "text_it": "Respira profondamente. Sei rilassato."},
            ],
        },
        "is_active": True,
    },
    {
        "id": "move_shoulders", "name_de": "Schultern entspannen", "name_it": "Rilassa le spalle",
        "category": "movement", "duration_seconds": 120, "difficulty": "easy",
        "primary_goal": "stress", "time_of_day": "any",
        "instruction_type": "text",
        "description_de": "Gezielte Uebung gegen Schulterverspannungen.",
        "description_it": "Esercizio mirato contro le tensioni alle spalle.",
        "content_json": {
            "type": "guided_steps",
            "steps": [
                {"duration": 15, "text_de": "Atme tief ein und ziehe die Schultern hoch.", "text_it": "Inspira profondamente e alza le spalle."},
                {"duration": 10, "text_de": "Halte die Spannung. 5, 4, 3, 2, 1...", "text_it": "Mantieni la tensione. 5, 4, 3, 2, 1..."},
                {"duration": 15, "text_de": "Ausatmen und fallen lassen. Spuere die Erleichterung.", "text_it": "Espira e lascia cadere. Senti il sollievo."},
                {"duration": 20, "text_de": "Rolle die Schultern nach hinten. Langsam. 5 Kreise.", "text_it": "Ruota le spalle all'indietro. Lentamente. 5 cerchi."},
                {"duration": 20, "text_de": "Jetzt nach vorne. 5 Kreise.", "text_it": "Ora in avanti. 5 cerchi."},
                {"duration": 15, "text_de": "Arme schuetteln. Ganz locker.", "text_it": "Scuoti le braccia. Completamente sciolte."},
                {"duration": 15, "text_de": "Stehe still. Schultern tief. Ruhig atmen.", "text_it": "Stai fermo. Spalle basse. Respira con calma."},
                {"duration": 10, "text_de": "Fertig. Du fuehlst dich leichter.", "text_it": "Fatto. Ti senti piu leggero."},
            ],
        },
        "is_active": True,
    },
]

CATEGORY_META = {
    "breathing": {"icon": "weather-windy", "color": "#3B82F6", "label_de": "Atemuebungen", "label_it": "Esercizi di respirazione"},
    "mini": {"icon": "timer-sand", "color": "#8B5CF6", "label_de": "Mini-Entspannung", "label_it": "Mini-rilassamento"},
    "sleep": {"icon": "moon-waning-crescent", "color": "#6366F1", "label_de": "Schlaf & Abend", "label_it": "Sonno & sera"},
    "focus": {"icon": "target", "color": "#F59E0B", "label_de": "Fokus & Reset", "label_it": "Focus & Reset"},
    "movement": {"icon": "human-handsup", "color": "#10B981", "label_de": "Bewegung", "label_it": "Movimento"},
}


async def ensure_exercises_seeded():
    """Seed exercises if collection is empty."""
    count = await db.stress_exercises.count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc).isoformat()
        for ex in SEED_EXERCISES:
            ex["created_at"] = now
            ex["updated_at"] = now
        await db.stress_exercises.insert_many(SEED_EXERCISES)
        logger.info(f"Seeded {len(SEED_EXERCISES)} stress exercises")


# ── Routes ──

@router.get("/exercises")
async def list_exercises(category: str = "", lang: str = "de"):
    """List all active exercises, optionally filtered by category."""
    await ensure_exercises_seeded()
    query = {"is_active": True}
    if category:
        query["category"] = category
    items = await db.stress_exercises.find(query, {"_id": 0}).to_list(100)

    for item in items:
        item["name"] = item.get(f"name_{lang}", item.get("name_de", ""))
        item["description"] = item.get(f"description_{lang}", item.get("description_de", ""))

    return {"exercises": items, "categories": CATEGORY_META}


@router.get("/recommend/{profile_id}")
async def get_recommendation(profile_id: str, lang: str = "de"):
    """Get personalized exercise recommendation based on profile data."""
    await ensure_exercises_seeded()

    # Gather user context
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    symptom = await db.symptom_tracking.find_one(
        {"profile_id": profile_id},
        {"_id": 0},
        sort=[("date", -1)]
    )

    stress_level = 5  # default
    sleep_quality = "moderate"
    energy_level = "moderate"

    if profile:
        stress_level_str = profile.get("stress_level", "moderate")
        stress_map = {"low": 3, "moderate": 5, "high": 7, "very_high": 9}
        stress_level = stress_map.get(stress_level_str, 5)
        sleep_quality = profile.get("sleep_quality", "moderate")
        energy_level = profile.get("energy_level", "moderate")

    if symptom:
        ratings = symptom.get("ratings", {})
        if "Stress" in ratings:
            stress_level = ratings["Stress"]
        overall = symptom.get("overall", 5)
        if overall <= 4:
            stress_level = max(stress_level, 7)

    # Time-based logic
    now = datetime.now(timezone.utc)
    hour = now.hour
    if hour >= 20:
        time_pref = "evening"
    elif hour >= 12:
        time_pref = "afternoon"
    else:
        time_pref = "morning"

    # Build recommendation
    if stress_level >= 7:
        # High stress → quick relief
        query = {"is_active": True, "duration_seconds": {"$lte": 180}, "primary_goal": "stress"}
        reason_de = "Dein Stresslevel ist erhoet. Diese kurze Uebung hilft dir, schnell runterzufahren."
        reason_it = "Il tuo livello di stress e elevato. Questo breve esercizio ti aiuta a calmarti velocemente."
    elif sleep_quality in ("poor", "bad") and hour >= 18:
        query = {"is_active": True, "primary_goal": "sleep"}
        reason_de = "Dein Schlaf war zuletzt nicht optimal. Diese Abenduebung bereitet dich auf erholsamen Schlaf vor."
        reason_it = "Il tuo sonno non e stato ottimale ultimamente. Questo esercizio serale ti prepara per un sonno ristoratore."
    elif energy_level in ("low", "very_low"):
        query = {"is_active": True, "primary_goal": "focus"}
        reason_de = "Dein Energielevel ist niedrig. Diese Uebung gibt dir neue Kraft und Klarheit."
        reason_it = "Il tuo livello di energia e basso. Questo esercizio ti da nuova forza e chiarezza."
    elif hour >= 20:
        query = {"is_active": True, "primary_goal": "sleep"}
        reason_de = "Zeit zum Runterkommen. Diese Abenduebung hilft dir, den Tag loszulassen."
        reason_it = "E ora di rilassarsi. Questo esercizio serale ti aiuta a lasciar andare la giornata."
    else:
        query = {"is_active": True, "primary_goal": {"$in": ["stress", "calm"]}}
        reason_de = "Eine kurze Entspannung tut immer gut. Nimm dir einen Moment fuer dich."
        reason_it = "Un breve momento di relax fa sempre bene. Prenditi un momento per te."

    exercises = await db.stress_exercises.find(query, {"_id": 0}).to_list(10)
    if not exercises:
        exercises = await db.stress_exercises.find({"is_active": True}, {"_id": 0}).to_list(10)

    # Pick one (rotate based on day)
    import hashlib
    day_hash = int(hashlib.md5(f"{profile_id}{now.strftime('%Y-%m-%d')}".encode()).hexdigest(), 16)
    exercise = exercises[day_hash % len(exercises)] if exercises else None

    if exercise:
        exercise["name"] = exercise.get(f"name_{lang}", exercise.get("name_de", ""))
        exercise["description"] = exercise.get(f"description_{lang}", exercise.get("description_de", ""))

    return {
        "recommendation": exercise,
        "reason": reason_de if lang == "de" else reason_it,
        "stress_level": stress_level,
        "categories": CATEGORY_META,
    }


@router.post("/sessions/start")
async def start_session(req: StartSessionRequest):
    """Start a stress management session."""
    session_id = f"stress_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    session_doc = {
        "id": session_id,
        "profile_id": req.profile_id,
        "exercise_id": req.exercise_id,
        "started_at": now,
        "completed_at": None,
        "completion_status": "in_progress",
        "stress_before": req.stress_before,
        "stress_after": None,
        "mood_after": None,
        "duration_completed": 0,
        "created_at": now,
    }
    await db.user_stress_sessions.insert_one(session_doc)
    return {"session_id": session_id}


@router.post("/sessions/{session_id}/complete")
async def complete_session(session_id: str, req: CompleteSessionRequest):
    """Complete a stress management session and grant reward points."""
    session = await db.user_stress_sessions.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    now = datetime.now(timezone.utc).isoformat()
    status = "completed" if req.completed else "abandoned"

    # Calculate duration
    started = datetime.fromisoformat(session["started_at"])
    duration = int((datetime.now(timezone.utc) - started).total_seconds())

    update = {
        "completed_at": now,
        "completion_status": status,
        "stress_after": req.stress_after,
        "mood_after": req.mood_after,
        "duration_completed": duration,
    }
    await db.user_stress_sessions.update_one({"id": session_id}, {"$set": update})

    # Grant reward points if completed
    reward_result = None
    if req.completed and session.get("profile_id"):
        try:
            from routes.rewards import grant_points_internal
            reward_result = await grant_points_internal(
                session["profile_id"], "stress_exercise", session_id
            )
        except Exception as e:
            logger.error(f"Reward grant error: {e}")

    # Calculate improvement
    improvement = None
    if session.get("stress_before") and req.stress_after:
        improvement = session["stress_before"] - req.stress_after

    return {
        "status": status,
        "duration_completed": duration,
        "improvement": improvement,
        "reward": reward_result,
    }


@router.get("/sessions/{profile_id}/history")
async def get_history(profile_id: str, limit: int = 20):
    """Get session history for a user."""
    sessions = await db.user_stress_sessions.find(
        {"profile_id": profile_id, "completion_status": "completed"},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(limit)

    # Enrich with exercise names
    exercise_ids = list(set(s.get("exercise_id", "") for s in sessions))
    exercises = {}
    if exercise_ids:
        for ex in await db.stress_exercises.find({"id": {"$in": exercise_ids}}, {"_id": 0, "id": 1, "name_de": 1, "name_it": 1, "category": 1}).to_list(100):
            exercises[ex["id"]] = ex

    for s in sessions:
        ex = exercises.get(s.get("exercise_id", ""), {})
        s["exercise_name_de"] = ex.get("name_de", "")
        s["exercise_name_it"] = ex.get("name_it", "")
        s["exercise_category"] = ex.get("category", "")

    return {"sessions": sessions}


@router.get("/sessions/{profile_id}/stats")
async def get_stats(profile_id: str):
    """Get quick stats for the user's stress management."""
    total = await db.user_stress_sessions.count_documents(
        {"profile_id": profile_id, "completion_status": "completed"}
    )

    # Average improvement
    pipeline = [
        {"$match": {"profile_id": profile_id, "completion_status": "completed", "stress_before": {"$ne": None}, "stress_after": {"$ne": None}}},
        {"$group": {
            "_id": None,
            "avg_before": {"$avg": "$stress_before"},
            "avg_after": {"$avg": "$stress_after"},
            "total_duration": {"$sum": "$duration_completed"},
        }}
    ]
    agg = await db.user_stress_sessions.aggregate(pipeline).to_list(1)
    avg_data = agg[0] if agg else {}

    # Days with exercises (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent = await db.user_stress_sessions.find(
        {"profile_id": profile_id, "completion_status": "completed", "completed_at": {"$gte": thirty_days_ago}},
        {"_id": 0, "completed_at": 1}
    ).to_list(500)
    unique_days = len(set(s["completed_at"][:10] for s in recent if s.get("completed_at")))

    return {
        "total_sessions": total,
        "avg_stress_before": round(avg_data.get("avg_before", 0), 1),
        "avg_stress_after": round(avg_data.get("avg_after", 0), 1),
        "avg_improvement": round(avg_data.get("avg_before", 0) - avg_data.get("avg_after", 0), 1),
        "total_minutes": round(avg_data.get("total_duration", 0) / 60, 0),
        "active_days_30d": unique_days,
    }
