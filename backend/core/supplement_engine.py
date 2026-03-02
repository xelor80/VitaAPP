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
        "med_interactions": {"blood_thinners": {"de": "Kann Wirkung beeinflussen", "it": "Puo influenzare l'effetto"}, "diuretics": {"de": "Erhoehtes Kalziumrisiko", "it": "Aumento rischio calcio"}},
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
        "med_interactions": {"blood_thinners": {"de": "KONTRAINDIZIERT - Hebt Wirkung von Vitamin-K-Antagonisten auf", "it": "CONTROINDICATO - Annulla l'effetto degli antagonisti della vitamina K"}},
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
        "med_interactions": {"antibiotics": {"de": "2h Abstand halten", "it": "Mantenere 2h di distanza"}, "diuretics": {"de": "Verstaerkter Magnesiummangel", "it": "Carenza di magnesio accentuata"}},
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
        "med_interactions": {"blood_thinners": {"de": "Kann Blutungsrisiko erhoehen - Arzt konsultieren", "it": "Puo aumentare rischio sanguinamento - consultare medico"}},
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
        "med_interactions": {"ppi": {"de": "PPI reduzieren B12-Aufnahme", "it": "I PPI riducono l'assorbimento di B12"}, "metformin": {"de": "Metformin reduziert B12-Aufnahme", "it": "Metformina riduce l'assorbimento di B12"}},
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
        "med_interactions": {"ppi": {"de": "Reduzierte Aufnahme", "it": "Assorbimento ridotto"}, "antibiotics": {"de": "2h Abstand halten", "it": "Mantenere 2h di distanza"}, "thyroid_medication": {"de": "2h Abstand", "it": "2h di distanza"}},
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
        "med_interactions": {"antibiotics": {"de": "2h Abstand halten", "it": "Mantenere 2h di distanza"}, "diuretics": {"de": "Verstaerkter Zinkmangel", "it": "Carenza di zinco accentuata"}},
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
        "med_interactions": {"antidepressants": {"de": "B6 kann Wirkung beeinflussen", "it": "B6 puo influenzare l'effetto"}},
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
        "med_interactions": {"thyroid_medication": {"de": "4h Abstand", "it": "4h di distanza"}, "antibiotics": {"de": "2h Abstand", "it": "2h di distanza"}},
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
        "med_interactions": {"metformin": {"de": "Kann Folsaeurespiegel senken", "it": "Puo abbassare i livelli di acido folico"}},
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
        "med_interactions": {"blood_thinners": {"de": "Kann Wirkung beeinflussen", "it": "Puo influenzare l'effetto"}, "statins": {"de": "Statine senken Q10-Spiegel", "it": "Le statine abbassano i livelli di Q10"}},
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
        "med_interactions": {"antibiotics": {"de": "2h Abstand halten", "it": "Mantenere 2h di distanza"}},
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
        "med_interactions": {"thyroid_medication": {"de": "Kann Schilddruesenfunktion beeinflussen", "it": "Puo influenzare la funzione tiroidea"}, "antidepressants": {"de": "Vorsicht - kann Wirkung verstaerken", "it": "Attenzione - puo potenziare l'effetto"}},
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
        "med_interactions": {"thyroid_medication": {"de": "Nur nach aerztlicher Ruecksprache", "it": "Solo dopo consulto medico"}},
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
        "med_interactions": {"statins": {"de": "Kann Wirkung beeinflussen", "it": "Puo influenzare l'effetto"}},
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
        "med_interactions": {"blood_thinners": {"de": "Kann Blutungsrisiko erhoehen", "it": "Puo aumentare il rischio di sanguinamento"}},
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


COMPLAINT_LABELS = {
    "fatigue": {"de": "Chronische Muedigkeit", "it": "Stanchezza cronica"},
    "sleep": {"de": "Schlechte Schlafqualitaet", "it": "Scarsa qualita del sonno"},
    "stress": {"de": "Hoher Stresslevel", "it": "Alto livello di stress"},
    "digestive": {"de": "Verdauungsbeschwerden", "it": "Problemi digestivi"},
    "muscle": {"de": "Muskelverspannungen", "it": "Tensioni muscolari"},
    "concentration": {"de": "Konzentrationsprobleme", "it": "Problemi di concentrazione"},
    "immune": {"de": "Haeufige Infekte", "it": "Infezioni frequenti"},
    "mood": {"de": "Stimmungsschwankungen", "it": "Sbalzi d'umore"},
    "skin": {"de": "Hautprobleme", "it": "Problemi cutanei"},
    "hair": {"de": "Haarausfall", "it": "Perdita di capelli"},
    "joint": {"de": "Gelenkbeschwerden", "it": "Problemi articolari"},
    "headache": {"de": "Kopfschmerzen", "it": "Mal di testa"},
    "anxiety": {"de": "Angst/Unruhe", "it": "Ansia/irrequietezza"},
}

# Maps supplements to complaint/profile triggers
SUPPLEMENT_TRIGGERS = {
    "magnesium": {"complaints": ["fatigue", "sleep", "stress", "muscle", "headache", "anxiety"],
                  "stress_threshold": 6, "sleep_threshold": 5},
    "b_vitamins": {"complaints": ["fatigue", "stress", "concentration", "mood", "anxiety"],
                   "stress_threshold": 5, "sleep_threshold": None},
    "vitamin_c": {"complaints": ["immune", "fatigue", "skin", "stress"],
                  "stress_threshold": 7, "sleep_threshold": None},
    "ashwagandha": {"complaints": ["stress", "sleep", "anxiety", "fatigue"],
                    "stress_threshold": 7, "sleep_threshold": 5},
    "zinc": {"complaints": ["immune", "skin", "hair", "concentration"],
             "stress_threshold": None, "sleep_threshold": None},
    "omega3": {"complaints": ["concentration", "mood", "joint", "immune", "skin"],
               "stress_threshold": None, "sleep_threshold": None},
    "probiotics": {"complaints": ["digestive", "immune", "mood", "skin"],
                   "stress_threshold": None, "sleep_threshold": None},
    "vitamin_d": {"complaints": ["fatigue", "immune", "mood", "muscle"],
                  "stress_threshold": None, "sleep_threshold": None},
    "iron": {"complaints": ["fatigue", "concentration", "hair", "headache"],
             "stress_threshold": None, "sleep_threshold": None},
    "vitamin_b12": {"complaints": ["fatigue", "concentration", "mood"],
                    "stress_threshold": None, "sleep_threshold": None},
    "folate": {"complaints": ["fatigue", "mood", "concentration"],
               "stress_threshold": None, "sleep_threshold": None},
    "vitamin_k2": {"complaints": [], "stress_threshold": None, "sleep_threshold": None},
    "calcium": {"complaints": ["muscle", "joint"], "stress_threshold": None, "sleep_threshold": None},
    "vitamin_e": {"complaints": ["skin", "immune"], "stress_threshold": None, "sleep_threshold": None},
    "selenium": {"complaints": ["immune", "hair", "skin"], "stress_threshold": None, "sleep_threshold": None},
    "iodine": {"complaints": ["fatigue", "concentration"], "stress_threshold": None, "sleep_threshold": None},
    "coq10": {"complaints": ["fatigue", "muscle"], "stress_threshold": None, "sleep_threshold": None},
}


def _build_recommendation_reasons(profile: dict, assessment: dict, deficiencies: list, lang: str) -> dict:
    """Build personalized recommendation reasons for each supplement based on user data."""
    complaints = profile.get("complaints", []) or []
    complaint_names = [c.get("name", "") if isinstance(c, dict) else c for c in complaints]
    stress = profile.get("stress_level") or 5
    sleep = profile.get("sleep_quality") or 7
    diet = profile.get("diet", "omnivore")
    age = profile.get("age") or 30

    # Build deficiency lookup
    def_lookup = {}
    for d in deficiencies:
        def_lookup[d.get("nutrient", "")] = d

    result = {}
    for nutrient, triggers in SUPPLEMENT_TRIGGERS.items():
        reasons = []

        # Check deficiency score
        if nutrient in def_lookup:
            score = def_lookup[nutrient].get("score", 0)
            risk = def_lookup[nutrient].get("risk_level", "low")
            if risk == "high":
                r = {"de": "Hohes Mangelrisiko laut Gesundheitsprofil", "it": "Alto rischio di carenza secondo il profilo"}
                reasons.append(r[lang])
            elif risk == "medium":
                r = {"de": "Erhoehtes Mangelrisiko erkannt", "it": "Rischio di carenza elevato rilevato"}
                reasons.append(r[lang])

        # Check complaints
        for comp in complaint_names:
            if comp in triggers.get("complaints", []):
                label = COMPLAINT_LABELS.get(comp, {}).get(lang, comp)
                reasons.append(label)

        # Check stress
        threshold = triggers.get("stress_threshold")
        if threshold and stress >= threshold:
            r = {"de": f"Hoher Stresswert ({stress}/10)", "it": f"Alto livello di stress ({stress}/10)"}
            reasons.append(r[lang])

        # Check sleep
        s_threshold = triggers.get("sleep_threshold")
        if s_threshold and sleep <= s_threshold:
            r = {"de": f"Niedrige Schlafqualitaet ({sleep}/10)", "it": f"Bassa qualita del sonno ({sleep}/10)"}
            reasons.append(r[lang])

        # Diet-based reasons
        if diet in ("vegan", "vegetarian") and nutrient in ("vitamin_b12", "iron", "zinc", "omega3"):
            r = {"de": f"Pflanzliche Ernaehrung ({diet})", "it": f"Alimentazione vegetale ({diet})"}
            reasons.append(r[lang])

        # Age-based reasons
        if age >= 50 and nutrient in ("vitamin_d", "vitamin_b12", "calcium", "coq10"):
            r = {"de": f"Altersbedingt erhoehter Bedarf (Alter: {age})", "it": f"Fabbisogno aumentato per eta ({age})"}
            reasons.append(r[lang])

        # Synergy reason (if Vitamin K2 is added because of Vitamin D)
        if nutrient == "vitamin_k2" and "vitamin_d" in def_lookup:
            r = {"de": "Synergie mit Vitamin D (verbesserte Aufnahme)", "it": "Sinergia con Vitamina D (assorbimento migliorato)"}
            reasons.append(r[lang])

        # Deduplicate and limit
        seen = set()
        unique = []
        for r in reasons:
            if r not in seen:
                seen.add(r)
                unique.append(r)
        result[nutrient] = unique[:4]

    return result


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

    # Build reason mapping from profile data
    reason_map = _build_recommendation_reasons(profile, assessment, deficiencies, lang)

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
                # med_interactions are now bilingual dicts: {"de": "...", "it": "..."}
                interaction_text = interaction[lang] if isinstance(interaction, dict) else interaction
                interaction_de = interaction.get("de", interaction_text) if isinstance(interaction, dict) else interaction
                if "KONTRAINDIZIERT" in interaction_de or "CONTROINDICATO" in interaction_text:
                    w_text = f"{info[f'name_{lang}']}: {interaction_text}"
                    warnings.append(w_text)
                    skip = True
                    break
                else:
                    warning_de = interaction["de"] if isinstance(interaction, dict) else interaction
                    warning_it = interaction["it"] if isinstance(interaction, dict) else interaction
                    med_warnings.append({"med": med, "warning_de": warning_de, "warning_it": warning_it})
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
            "category": info["category"],
            "recommendation_reasons": reason_map.get(nutrient, [])[:4]
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
