"""
Evidenzbasierter Supplement-Strategie-Planer
Generiert personalisierte 8-Wochen-Supplement-Plaene basierend auf Gesundheitsprofil
"""

# Vollstaendige Supplement-Wissensdatenbank
SUPPLEMENT_DB = {
    "vitamin_d": {
        "name_de": "Vitamin D3",
        "name_it": "Vitamina D3",
        "dosage_default": {"amount": 2000, "unit": "IE", "unit_it": "UI"},
        "dosage_high_risk": {"amount": 4000, "unit": "IE", "unit_it": "UI"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["vitamin_k2", "magnesium", "calcium"],
        "antagonists": ["iron", "zinc"],
        "evidence_level": "high",
        "reason_de": "Unterstuetzt Immunsystem, Knochengesundheit und Stimmung. In Mitteleuropa haeufig defizitaer.",
        "reason_it": "Supporta sistema immunitario, salute ossea e umore. Frequentemente carente in Europa centrale.",
        "side_effects_de": ["Uebelkeit bei Ueberdosierung", "Hyperkalzaemie bei Langzeit-Ueberdosierung"],
        "side_effects_it": ["Nausea in caso di sovradosaggio", "Ipercalcemia in caso di sovradosaggio prolungato"],
        "contraindications": ["hypercalcemia", "sarcoidosis", "kidney_stones"],
        "med_interactions": {"blood_thinners": "Kann Wirkung beeinflussen", "diuretics": "Erhoehtes Kalziumrisiko"},
        "category": "vitamin"
    },
    "vitamin_k2": {
        "name_de": "Vitamin K2 (MK-7)",
        "name_it": "Vitamina K2 (MK-7)",
        "dosage_default": {"amount": 100, "unit": "mcg", "unit_it": "mcg"},
        "dosage_high_risk": {"amount": 200, "unit": "mcg", "unit_it": "mcg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["vitamin_d", "calcium"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Lenkt Kalzium in die Knochen statt in die Arterien. Wichtiger Synergist zu Vitamin D.",
        "reason_it": "Dirige il calcio nelle ossa invece che nelle arterie. Importante sinergia con Vitamina D.",
        "side_effects_de": ["Sehr selten Unvertraeglichkeiten"],
        "side_effects_it": ["Molto raramente intolleranze"],
        "contraindications": [],
        "med_interactions": {"blood_thinners": "KONTRAINDIZIERT - Hebt Wirkung von Vitamin-K-Antagonisten auf"},
        "category": "vitamin"
    },
    "magnesium": {
        "name_de": "Magnesium (Glycinat)",
        "name_it": "Magnesio (Glicinato)",
        "dosage_default": {"amount": 300, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 400, "unit": "mg", "unit_it": "mg"},
        "timing": "evening",
        "with_food": False,
        "duration_weeks": 8,
        "onset_weeks": 2,
        "synergies": ["vitamin_d", "vitamin_b6", "zinc"],
        "antagonists": ["calcium"],
        "evidence_level": "high",
        "reason_de": "Beteiligt an ueber 300 Enzymreaktionen. Unterstuetzt Muskeln, Nerven und Schlaf.",
        "reason_it": "Coinvolto in oltre 300 reazioni enzimatiche. Supporta muscoli, nervi e sonno.",
        "side_effects_de": ["Weicher Stuhl bei zu hoher Dosis", "Magen-Darm-Beschwerden"],
        "side_effects_it": ["Feci molli a dosi elevate", "Disturbi gastrointestinali"],
        "contraindications": ["kidney_disease"],
        "med_interactions": {"antibiotics": "2h Abstand halten", "diuretics": "Verstaerkter Magnesiummangel"},
        "category": "mineral"
    },
    "omega3": {
        "name_de": "Omega-3 (EPA/DHA)",
        "name_it": "Omega-3 (EPA/DHA)",
        "dosage_default": {"amount": 1000, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 2000, "unit": "mg", "unit_it": "mg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 6,
        "synergies": ["vitamin_d", "vitamin_e"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Essentiell fuer Gehirn, Herz und Entzuendungsregulation. Kann nicht vom Koerper hergestellt werden.",
        "reason_it": "Essenziale per cervello, cuore e regolazione infiammazione. Non puo essere prodotto dal corpo.",
        "side_effects_de": ["Fischiges Aufstossen", "Leichte Verdauungsbeschwerden"],
        "side_effects_it": ["Eruttazione di pesce", "Lievi disturbi digestivi"],
        "contraindications": [],
        "med_interactions": {"blood_thinners": "Kann Blutungsrisiko erhoehen - Arzt konsultieren"},
        "category": "fatty_acid"
    },
    "vitamin_b12": {
        "name_de": "Vitamin B12 (Methylcobalamin)",
        "name_it": "Vitamina B12 (Metilcobalamina)",
        "dosage_default": {"amount": 500, "unit": "mcg", "unit_it": "mcg"},
        "dosage_high_risk": {"amount": 1000, "unit": "mcg", "unit_it": "mcg"},
        "timing": "morning",
        "with_food": False,
        "duration_weeks": 8,
        "onset_weeks": 3,
        "synergies": ["folate", "iron"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Wichtig fuer Nervensystem und Blutbildung. Besonders bei pflanzlicher Ernaehrung essentiell.",
        "reason_it": "Importante per sistema nervoso e formazione del sangue. Essenziale con alimentazione vegetale.",
        "side_effects_de": ["Sehr selten allergische Reaktionen"],
        "side_effects_it": ["Molto raramente reazioni allergiche"],
        "contraindications": [],
        "med_interactions": {"ppi": "PPI reduzieren B12-Aufnahme", "metformin": "Metformin reduziert B12-Aufnahme"},
        "category": "vitamin"
    },
    "iron": {
        "name_de": "Eisen (Bisglycinat)",
        "name_it": "Ferro (Bisglicinato)",
        "dosage_default": {"amount": 14, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 20, "unit": "mg", "unit_it": "mg"},
        "timing": "morning",
        "with_food": False,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["vitamin_c", "vitamin_b12"],
        "antagonists": ["calcium", "zinc", "magnesium"],
        "evidence_level": "high",
        "reason_de": "Essentiell fuer Sauerstofftransport und Energieproduktion.",
        "reason_it": "Essenziale per trasporto ossigeno e produzione energia.",
        "side_effects_de": ["Verstopfung", "Magen-Darm-Beschwerden", "Dunkler Stuhl"],
        "side_effects_it": ["Stitichezza", "Disturbi gastrointestinali", "Feci scure"],
        "contraindications": ["hemochromatosis"],
        "med_interactions": {"ppi": "Reduzierte Aufnahme", "antibiotics": "2h Abstand halten", "thyroid_medication": "2h Abstand"},
        "category": "mineral"
    },
    "zinc": {
        "name_de": "Zink (Picolinat)",
        "name_it": "Zinco (Picolinato)",
        "dosage_default": {"amount": 15, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 25, "unit": "mg", "unit_it": "mg"},
        "timing": "evening",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 3,
        "synergies": ["vitamin_c", "magnesium"],
        "antagonists": ["iron", "calcium", "copper"],
        "evidence_level": "high",
        "reason_de": "Unterstuetzt Immunsystem, Haut und ueber 200 Enzymreaktionen.",
        "reason_it": "Supporta sistema immunitario, pelle e oltre 200 reazioni enzimatiche.",
        "side_effects_de": ["Uebelkeit auf leeren Magen", "Kupfermangel bei Langzeiteinnahme"],
        "side_effects_it": ["Nausea a stomaco vuoto", "Carenza di rame con assunzione prolungata"],
        "contraindications": [],
        "med_interactions": {"antibiotics": "2h Abstand halten", "diuretics": "Verstaerkter Zinkmangel"},
        "category": "mineral"
    },
    "vitamin_c": {
        "name_de": "Vitamin C",
        "name_it": "Vitamina C",
        "dosage_default": {"amount": 500, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 1000, "unit": "mg", "unit_it": "mg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 1,
        "synergies": ["iron", "vitamin_e", "zinc"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Starkes Antioxidans, foerdert Eisenaufnahme und Kollagenbildung.",
        "reason_it": "Potente antiossidante, promuove assorbimento ferro e formazione collagene.",
        "side_effects_de": ["Magen-Darm-Beschwerden bei hoher Dosis", "Durchfall"],
        "side_effects_it": ["Disturbi gastrointestinali ad alte dosi", "Diarrea"],
        "contraindications": ["kidney_stones_oxalate"],
        "med_interactions": {},
        "category": "vitamin"
    },
    "b_vitamins": {
        "name_de": "Vitamin B-Komplex",
        "name_it": "Complesso Vitaminico B",
        "dosage_default": {"amount": 1, "unit": "Kapsel", "unit_it": "capsula"},
        "dosage_high_risk": {"amount": 1, "unit": "Kapsel", "unit_it": "capsula"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 2,
        "synergies": ["magnesium", "vitamin_c"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Essentiell fuer Energiestoffwechsel, Nervensystem und Stressbewaeltigung.",
        "reason_it": "Essenziale per metabolismo energetico, sistema nervoso e gestione stress.",
        "side_effects_de": ["Gelbfaerbung des Urins (harmlos)", "Selten Hautreaktionen"],
        "side_effects_it": ["Colorazione gialla urine (innocuo)", "Raramente reazioni cutanee"],
        "contraindications": [],
        "med_interactions": {"antidepressants": "B6 kann Wirkung beeinflussen"},
        "category": "vitamin"
    },
    "calcium": {
        "name_de": "Calcium (Citrat)",
        "name_it": "Calcio (Citrato)",
        "dosage_default": {"amount": 500, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 800, "unit": "mg", "unit_it": "mg"},
        "timing": "evening",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 8,
        "synergies": ["vitamin_d", "vitamin_k2"],
        "antagonists": ["iron", "zinc", "magnesium"],
        "evidence_level": "high",
        "reason_de": "Wichtig fuer Knochen, Zaehne und Muskelfunktion.",
        "reason_it": "Importante per ossa, denti e funzione muscolare.",
        "side_effects_de": ["Verstopfung", "Blaehungen"],
        "side_effects_it": ["Stitichezza", "Gonfiore"],
        "contraindications": ["hypercalcemia", "kidney_stones"],
        "med_interactions": {"thyroid_medication": "4h Abstand", "antibiotics": "2h Abstand"},
        "category": "mineral"
    },
    "folate": {
        "name_de": "Folat (5-MTHF)",
        "name_it": "Folato (5-MTHF)",
        "dosage_default": {"amount": 400, "unit": "mcg", "unit_it": "mcg"},
        "dosage_high_risk": {"amount": 800, "unit": "mcg", "unit_it": "mcg"},
        "timing": "morning",
        "with_food": False,
        "duration_weeks": 8,
        "onset_weeks": 3,
        "synergies": ["vitamin_b12", "iron"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Wichtig fuer Zellteilung, DNA-Synthese und besonders in der Schwangerschaft.",
        "reason_it": "Importante per divisione cellulare, sintesi DNA e specialmente in gravidanza.",
        "side_effects_de": ["Sehr selten Unvertraeglichkeiten"],
        "side_effects_it": ["Molto raramente intolleranze"],
        "contraindications": [],
        "med_interactions": {"metformin": "Kann Folsaeurespiegel senken"},
        "category": "vitamin"
    },
    "coq10": {
        "name_de": "Coenzym Q10 (Ubiquinol)",
        "name_it": "Coenzima Q10 (Ubiquinolo)",
        "dosage_default": {"amount": 100, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 200, "unit": "mg", "unit_it": "mg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["omega3", "magnesium"],
        "antagonists": [],
        "evidence_level": "medium",
        "reason_de": "Unterstuetzt zellulaere Energieproduktion. Besonders wichtig bei Statineinnahme.",
        "reason_it": "Supporta produzione energetica cellulare. Particolarmente importante con statine.",
        "side_effects_de": ["Selten Magen-Darm-Beschwerden", "Schlaflosigkeit bei abendlicher Einnahme"],
        "side_effects_it": ["Raramente disturbi gastrointestinali", "Insonnia se assunto di sera"],
        "contraindications": [],
        "med_interactions": {"blood_thinners": "Kann Wirkung beeinflussen", "statins": "Statine senken Q10-Spiegel"},
        "category": "antioxidant"
    },
    "probiotics": {
        "name_de": "Probiotika (Multi-Stamm)",
        "name_it": "Probiotici (Multi-ceppo)",
        "dosage_default": {"amount": 10, "unit": "Mrd. KBE", "unit_it": "mld. UFC"},
        "dosage_high_risk": {"amount": 20, "unit": "Mrd. KBE", "unit_it": "mld. UFC"},
        "timing": "morning",
        "with_food": False,
        "duration_weeks": 8,
        "onset_weeks": 2,
        "synergies": ["vitamin_c", "zinc"],
        "antagonists": [],
        "evidence_level": "medium",
        "reason_de": "Unterstuetzt Darmgesundheit und Immunsystem. Besonders nach Antibiotika-Einnahme.",
        "reason_it": "Supporta salute intestinale e sistema immunitario. Specialmente dopo antibiotici.",
        "side_effects_de": ["Anfangs Blaehungen moeglich", "Leichte Verdauungsaenderungen"],
        "side_effects_it": ["Inizialmente possibile gonfiore", "Lievi cambiamenti digestivi"],
        "contraindications": [],
        "med_interactions": {"antibiotics": "2h Abstand halten"},
        "category": "probiotic"
    },
    "ashwagandha": {
        "name_de": "Ashwagandha (KSM-66)",
        "name_it": "Ashwagandha (KSM-66)",
        "dosage_default": {"amount": 300, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 600, "unit": "mg", "unit_it": "mg"},
        "timing": "evening",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["magnesium", "b_vitamins"],
        "antagonists": [],
        "evidence_level": "medium",
        "reason_de": "Adaptogen zur Stressreduktion und Verbesserung der Schlafqualitaet.",
        "reason_it": "Adattogeno per riduzione stress e miglioramento qualita del sonno.",
        "side_effects_de": ["Magen-Darm-Beschwerden", "Schlafrigkeit"],
        "side_effects_it": ["Disturbi gastrointestinali", "Sonnolenza"],
        "contraindications": ["hashimoto", "hypothyroidism"],
        "med_interactions": {"thyroid_medication": "Kann Schilddruesenfunktion beeinflussen", "antidepressants": "Vorsicht - kann Wirkung verstaerken"},
        "category": "adaptogen"
    },
    "iodine": {
        "name_de": "Jod (Kaliumjodid)",
        "name_it": "Iodio (Ioduro di potassio)",
        "dosage_default": {"amount": 150, "unit": "mcg", "unit_it": "mcg"},
        "dosage_high_risk": {"amount": 200, "unit": "mcg", "unit_it": "mcg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["selenium"],
        "antagonists": [],
        "evidence_level": "high",
        "reason_de": "Essentiell fuer die Schilddruesenfunktion und den Stoffwechsel.",
        "reason_it": "Essenziale per funzione tiroidea e metabolismo.",
        "side_effects_de": ["Schilddruesenueberfunktion bei Ueberdosierung"],
        "side_effects_it": ["Ipertiroidismo in caso di sovradosaggio"],
        "contraindications": ["hashimoto", "hyperthyroidism"],
        "med_interactions": {"thyroid_medication": "Nur nach aerztlicher Ruecksprache"},
        "category": "mineral"
    },
    "selenium": {
        "name_de": "Selen (Selenomethionin)",
        "name_it": "Selenio (Selenometionina)",
        "dosage_default": {"amount": 100, "unit": "mcg", "unit_it": "mcg"},
        "dosage_high_risk": {"amount": 200, "unit": "mcg", "unit_it": "mcg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["iodine", "vitamin_e"],
        "antagonists": [],
        "evidence_level": "medium",
        "reason_de": "Wichtig fuer Schilddruese und als Antioxidans. Unterstuetzt Immunfunktion.",
        "reason_it": "Importante per tiroide e come antiossidante. Supporta funzione immunitaria.",
        "side_effects_de": ["Knoblauchartiger Atem bei Ueberdosierung", "Haarausfall bei chronischer Ueberdosis"],
        "side_effects_it": ["Alito agliaceo in caso di sovradosaggio", "Perdita capelli con sovradosaggio cronico"],
        "contraindications": [],
        "med_interactions": {"statins": "Kann Wirkung beeinflussen"},
        "category": "mineral"
    },
    "vitamin_e": {
        "name_de": "Vitamin E (Tocopherol-Mix)",
        "name_it": "Vitamina E (Mix Tocoferoli)",
        "dosage_default": {"amount": 12, "unit": "mg", "unit_it": "mg"},
        "dosage_high_risk": {"amount": 20, "unit": "mg", "unit_it": "mg"},
        "timing": "morning",
        "with_food": True,
        "duration_weeks": 8,
        "onset_weeks": 4,
        "synergies": ["vitamin_c", "selenium"],
        "antagonists": [],
        "evidence_level": "medium",
        "reason_de": "Antioxidans zum Schutz der Zellmembranen.",
        "reason_it": "Antiossidante per protezione membrane cellulari.",
        "side_effects_de": ["Erhoehtes Blutungsrisiko bei hoher Dosis"],
        "side_effects_it": ["Aumento rischio sanguinamento ad alte dosi"],
        "contraindications": [],
        "med_interactions": {"blood_thinners": "Kann Blutungsrisiko erhoehen"},
        "category": "vitamin"
    }
}

TIMING_LABELS = {
    "morning": {"de": "Morgens", "it": "Mattina"},
    "noon": {"de": "Mittags", "it": "Mezzogiorno"},
    "evening": {"de": "Abends", "it": "Sera"},
}

EVIDENCE_LABELS = {
    "high": {"de": "Hoch - Gut belegt durch Studien", "it": "Alto - Ben supportato da studi"},
    "medium": {"de": "Mittel - Moderate Evidenz", "it": "Medio - Evidenza moderata"},
    "exploratory": {"de": "Explorativ - Erste Hinweise", "it": "Esplorativo - Prime indicazioni"}
}


def generate_supplement_plan(profile: dict, assessment: dict, lang: str = "de") -> dict:
    """
    Generate a personalized 8-week supplement plan based on health profile and assessment.
    """
    deficiencies = assessment.get("deficiencies", [])
    medications = profile.get("medications", []) or []
    conditions = profile.get("conditions", []) or []
    complaints = profile.get("complaints", []) or []
    diet = profile.get("diet", "omnivore")
    stress_level = profile.get("stress_level") or 5
    sleep_quality = profile.get("sleep_quality") or 7
    age = profile.get("age") or 30
    gender = profile.get("gender") or ""

    # Select supplements based on deficiency risk scores
    selected = []
    for d in deficiencies:
        nutrient = d.get("nutrient", "")
        risk_level = d.get("risk_level", "low")
        score = d.get("score", 0)
        if nutrient in SUPPLEMENT_DB and score >= 0.3:
            selected.append({"nutrient": nutrient, "risk_level": risk_level, "score": score})

    # Add stress adaptogen if high stress
    if stress_level >= 7 and "ashwagandha" not in [s["nutrient"] for s in selected]:
        contraindicated = any(c in ["hashimoto", "hypothyroidism"] for c in conditions)
        if not contraindicated:
            selected.append({"nutrient": "ashwagandha", "risk_level": "medium", "score": 0.5})

    # Add probiotics if digestive complaints or antibiotics
    complaint_names = [c.get("name", "") for c in complaints]
    if ("digestive" in complaint_names or "antibiotics" in medications) and "probiotics" not in [s["nutrient"] for s in selected]:
        selected.append({"nutrient": "probiotics", "risk_level": "medium", "score": 0.4})

    # Add Vitamin K2 if Vitamin D is in plan (synergy)
    nutrient_names = [s["nutrient"] for s in selected]
    if "vitamin_d" in nutrient_names and "vitamin_k2" not in nutrient_names:
        # Check blood thinner contraindication
        if "blood_thinners" not in medications:
            selected.append({"nutrient": "vitamin_k2", "risk_level": "low", "score": 0.3})

    # Build supplement stack
    stack = []
    warnings = []

    for item in selected:
        nutrient = item["nutrient"]
        info = SUPPLEMENT_DB[nutrient]
        risk = item["risk_level"]
        high_risk = risk in ("high", "medium") and item["score"] >= 0.5

        dosage = info["dosage_high_risk"] if high_risk else info["dosage_default"]
        unit = dosage["unit_it"] if lang == "it" else dosage["unit"]

        # Check contraindications
        skip = False
        for contra in info.get("contraindications", []):
            if contra in conditions:
                w_text = {
                    "de": f"{info['name_de']}: Kontraindikation wegen {contra}. Bitte Arzt konsultieren.",
                    "it": f"{info['name_it']}: Controindicazione per {contra}. Consultare un medico."
                }
                warnings.append(w_text[lang])
                skip = True
                break
        if skip:
            continue

        # Check medication interactions
        med_warnings = []
        for med in medications:
            if med in info.get("med_interactions", {}):
                interaction = info["med_interactions"][med]
                if "KONTRAINDIZIERT" in interaction:
                    w_text = {
                        "de": f"{info['name_de']}: {interaction}",
                        "it": f"{info['name_it']}: Controindicato con {med}"
                    }
                    warnings.append(w_text[lang])
                    skip = True
                    break
                else:
                    med_warnings.append({"med": med, "warning_de": interaction, "warning_it": interaction})
        if skip:
            continue

        # Build synergy list
        synergy_names = []
        for syn in info.get("synergies", []):
            if syn in SUPPLEMENT_DB:
                synergy_names.append(SUPPLEMENT_DB[syn][f"name_{lang}"])

        entry = {
            "id": nutrient,
            "name": info[f"name_{lang}"],
            "dosage": dosage["amount"],
            "unit": unit,
            "timing": info["timing"],
            "timing_label": TIMING_LABELS[info["timing"]][lang],
            "with_food": info["with_food"],
            "with_food_label": ("Mit Mahlzeit" if lang == "de" else "Con pasto") if info["with_food"] else ("Nuechtern" if lang == "de" else "A digiuno"),
            "duration_weeks": info["duration_weeks"],
            "onset_weeks": info["onset_weeks"],
            "onset_label": (f"Wirkung nach ca. {info['onset_weeks']} Wochen" if lang == "de" else f"Effetto dopo ca. {info['onset_weeks']} settimane"),
            "synergies": synergy_names,
            "evidence_level": info["evidence_level"],
            "evidence_label": EVIDENCE_LABELS[info["evidence_level"]][lang],
            "reason": info[f"reason_{lang}"],
            "side_effects": info[f"side_effects_{lang}"],
            "med_warnings": med_warnings,
            "risk_level": risk,
            "score": item["score"],
            "category": info["category"]
        }
        stack.append(entry)

    # Sort: high risk first, then medium, then low
    risk_order = {"high": 0, "medium": 1, "low": 2}
    stack.sort(key=lambda x: (risk_order.get(x["risk_level"], 3), -x["score"]))

    # Build weekly schedule
    weekly_schedule = _build_weekly_schedule(stack, lang)

    # Build 8-week phasing (loading vs maintenance)
    phases = _build_phases(stack, lang)

    return {
        "stack": stack[:10],  # Max 10 supplements
        "warnings": warnings,
        "weekly_schedule": weekly_schedule,
        "phases": phases,
        "total_supplements": len(stack[:10]),
        "plan_duration_weeks": 8,
    }


def _build_weekly_schedule(stack: list, lang: str) -> dict:
    """Build daily schedule grouped by timing."""
    schedule = {"morning": [], "noon": [], "evening": []}

    for item in stack[:10]:
        timing = item["timing"]
        entry = {
            "id": item["id"],
            "name": item["name"],
            "dosage": item["dosage"],
            "unit": item["unit"],
            "with_food": item["with_food"],
            "with_food_label": item["with_food_label"],
        }
        schedule[timing].append(entry)

    return {
        "morning": {
            "label": TIMING_LABELS["morning"][lang],
            "items": schedule["morning"]
        },
        "noon": {
            "label": TIMING_LABELS["noon"][lang],
            "items": schedule["noon"]
        },
        "evening": {
            "label": TIMING_LABELS["evening"][lang],
            "items": schedule["evening"]
        }
    }


def _build_phases(stack: list, lang: str) -> list:
    """Build 8-week plan with loading and maintenance phases."""
    phases = []

    # Phase 1: Weeks 1-2 - Start with basics
    p1_items = [s["name"] for s in stack[:10] if s["onset_weeks"] <= 2]
    if not p1_items:
        p1_items = [s["name"] for s in stack[:3]]

    phases.append({
        "weeks": "1-2",
        "title": "Aufbauphase" if lang == "de" else "Fase di avvio",
        "description": ("Sanfter Einstieg mit den wichtigsten Naehrstoffen." if lang == "de"
                        else "Inizio graduale con i nutrienti piu importanti."),
        "supplements": [s["name"] for s in stack[:10]],
        "note": ("Beginnen Sie mit halber Dosierung in Woche 1, volle Dosierung ab Woche 2." if lang == "de"
                 else "Inizia con meta dosaggio nella settimana 1, dosaggio pieno dalla settimana 2.")
    })

    # Phase 2: Weeks 3-4 - Full regimen
    phases.append({
        "weeks": "3-4",
        "title": "Vollphase" if lang == "de" else "Fase completa",
        "description": ("Alle Supplements in voller Dosierung." if lang == "de"
                        else "Tutti i supplementi a dosaggio pieno."),
        "supplements": [s["name"] for s in stack[:10]],
        "note": ("Beobachten Sie Ihr Befinden. Erste Verbesserungen bei Magnesium und B-Vitaminen moeglich." if lang == "de"
                 else "Osserva il tuo benessere. Primi miglioramenti possibili con magnesio e vitamine B.")
    })

    # Phase 3: Weeks 5-6 - Consolidation
    phases.append({
        "weeks": "5-6",
        "title": "Stabilisierung" if lang == "de" else "Stabilizzazione",
        "description": ("Koerper passt sich an, weitere Verbesserungen erwartet." if lang == "de"
                        else "Il corpo si adatta, ulteriori miglioramenti previsti."),
        "supplements": [s["name"] for s in stack[:10]],
        "note": ("Vitamin D und Omega-3 zeigen ab jetzt spuerbare Effekte." if lang == "de"
                 else "Vitamina D e Omega-3 mostrano effetti percepibili da ora.")
    })

    # Phase 4: Weeks 7-8 - Evaluation
    phases.append({
        "weeks": "7-8",
        "title": "Bewertung & Anpassung" if lang == "de" else "Valutazione e adattamento",
        "description": ("Evaluierung der Fortschritte. Ggf. Plan anpassen." if lang == "de"
                        else "Valutazione dei progressi. Eventualmente adattare il piano."),
        "supplements": [s["name"] for s in stack[:10]],
        "note": ("Empfehlung: Nach 8 Wochen Blutwerte pruefen lassen und Plan mit Arzt besprechen." if lang == "de"
                 else "Raccomandazione: Dopo 8 settimane controllare i valori ematici e discutere il piano con il medico.")
    })

    return phases
