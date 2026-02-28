"""
Health Profile Risk Assessment Engine
Evidence-based micronutrient deficiency risk scoring
"""
from typing import Optional
from datetime import datetime, timezone

# Risk factor weights based on scientific evidence
RISK_WEIGHTS = {
    # Diet-related risks
    "diet": {
        "vegan": {
            "vitamin_b12": 0.9, "iron": 0.7, "zinc": 0.6, "omega3": 0.8,
            "vitamin_d": 0.5, "calcium": 0.5, "iodine": 0.6
        },
        "vegetarian": {
            "vitamin_b12": 0.6, "iron": 0.5, "zinc": 0.4, "omega3": 0.6
        },
        "keto": {
            "fiber": 0.7, "vitamin_c": 0.5, "potassium": 0.6, "magnesium": 0.5
        },
        "pescetarian": {
            "vitamin_b12": 0.2, "iron": 0.3
        }
    },
    
    # Activity level impacts
    "activity": {
        "sedentary": {
            "vitamin_d": 0.4, "metabolism": 0.3
        },
        "athletic": {
            "magnesium": 0.5, "iron": 0.4, "zinc": 0.4, "b_vitamins": 0.4,
            "electrolytes": 0.5, "protein": 0.3
        },
        "professional_athlete": {
            "magnesium": 0.7, "iron": 0.6, "zinc": 0.5, "b_vitamins": 0.6,
            "electrolytes": 0.7, "coq10": 0.5, "protein": 0.5
        }
    },
    
    # Sleep quality impacts
    "sleep_poor": {  # sleep_quality <= 4
        "magnesium": 0.5, "vitamin_d": 0.4, "b_vitamins": 0.4,
        "melatonin_precursors": 0.5, "cortisol_regulation": 0.4
    },
    
    # Stress impacts
    "stress_high": {  # stress_level >= 7
        "magnesium": 0.6, "b_vitamins": 0.6, "vitamin_c": 0.5,
        "zinc": 0.4, "omega3": 0.4, "adaptogens": 0.5
    },
    
    # Age-related risks
    "age_senior": {  # age >= 60
        "vitamin_b12": 0.5, "vitamin_d": 0.6, "calcium": 0.5,
        "coq10": 0.4, "omega3": 0.4
    },
    "age_young": {  # age <= 25
        "vitamin_d": 0.3, "iron": 0.3  # especially females
    },
    
    # Gender-specific
    "female": {
        "iron": 0.4, "folate": 0.3, "calcium": 0.3
    },
    "female_fertile": {  # female, age 15-50
        "iron": 0.6, "folate": 0.5
    }
}

# Nutrient info database
NUTRIENT_INFO = {
    "vitamin_b12": {
        "name_de": "Vitamin B12",
        "name_it": "Vitamina B12",
        "why_de": "Wichtig für Nervensystem, Blutbildung und Energiestoffwechsel",
        "why_it": "Importante per sistema nervoso, formazione del sangue e metabolismo energetico",
        "food_sources_de": ["Fleisch", "Fisch", "Eier", "Milchprodukte"],
        "food_sources_it": ["Carne", "Pesce", "Uova", "Latticini"],
        "contraindications": []
    },
    "iron": {
        "name_de": "Eisen",
        "name_it": "Ferro",
        "why_de": "Essentiell für Sauerstofftransport und Energieproduktion",
        "why_it": "Essenziale per trasporto ossigeno e produzione energia",
        "food_sources_de": ["Rotes Fleisch", "Hülsenfrüchte", "Spinat", "Kürbiskerne"],
        "food_sources_it": ["Carne rossa", "Legumi", "Spinaci", "Semi di zucca"],
        "contraindications": ["hemochromatosis"]
    },
    "magnesium": {
        "name_de": "Magnesium",
        "name_it": "Magnesio",
        "why_de": "Wichtig für Muskelfunktion, Nervensystem und über 300 Enzymreaktionen",
        "why_it": "Importante per funzione muscolare, sistema nervoso e oltre 300 reazioni enzimatiche",
        "food_sources_de": ["Nüsse", "Vollkornprodukte", "Bananen", "Dunkle Schokolade"],
        "food_sources_it": ["Noci", "Cereali integrali", "Banane", "Cioccolato fondente"],
        "contraindications": ["kidney_disease"]
    },
    "vitamin_d": {
        "name_de": "Vitamin D",
        "name_it": "Vitamina D",
        "why_de": "Wichtig für Knochengesundheit, Immunsystem und Stimmung",
        "why_it": "Importante per salute ossea, sistema immunitario e umore",
        "food_sources_de": ["Fetter Fisch", "Eigelb", "Pilze", "Sonnenlicht"],
        "food_sources_it": ["Pesce grasso", "Tuorlo d'uovo", "Funghi", "Luce solare"],
        "contraindications": ["hypercalcemia", "sarcoidosis"]
    },
    "omega3": {
        "name_de": "Omega-3-Fettsäuren",
        "name_it": "Acidi grassi Omega-3",
        "why_de": "Wichtig für Gehirn, Herz und Entzündungsregulation",
        "why_it": "Importante per cervello, cuore e regolazione infiammazione",
        "food_sources_de": ["Fetter Fisch", "Leinsamen", "Walnüsse", "Chiasamen"],
        "food_sources_it": ["Pesce grasso", "Semi di lino", "Noci", "Semi di chia"],
        "contraindications": ["blood_thinners"]
    },
    "zinc": {
        "name_de": "Zink",
        "name_it": "Zinco",
        "why_de": "Wichtig für Immunsystem, Wundheilung und Stoffwechsel",
        "why_it": "Importante per sistema immunitario, guarigione ferite e metabolismo",
        "food_sources_de": ["Austern", "Rindfleisch", "Kürbiskerne", "Linsen"],
        "food_sources_it": ["Ostriche", "Manzo", "Semi di zucca", "Lenticchie"],
        "contraindications": []
    },
    "b_vitamins": {
        "name_de": "B-Vitamine",
        "name_it": "Vitamine del gruppo B",
        "why_de": "Wichtig für Energiestoffwechsel und Nervensystem",
        "why_it": "Importante per metabolismo energetico e sistema nervoso",
        "food_sources_de": ["Vollkornprodukte", "Hülsenfrüchte", "Eier", "Fleisch"],
        "food_sources_it": ["Cereali integrali", "Legumi", "Uova", "Carne"],
        "contraindications": []
    },
    "calcium": {
        "name_de": "Calcium",
        "name_it": "Calcio",
        "why_de": "Wichtig für Knochen, Zähne und Muskelfunktion",
        "why_it": "Importante per ossa, denti e funzione muscolare",
        "food_sources_de": ["Milchprodukte", "Grünes Gemüse", "Mandeln", "Tofu"],
        "food_sources_it": ["Latticini", "Verdure verdi", "Mandorle", "Tofu"],
        "contraindications": ["hypercalcemia", "kidney_stones"]
    },
    "vitamin_c": {
        "name_de": "Vitamin C",
        "name_it": "Vitamina C",
        "why_de": "Wichtig für Immunsystem, Kollagenbildung und Antioxidation",
        "why_it": "Importante per sistema immunitario, formazione collagene e antiossidazione",
        "food_sources_de": ["Zitrusfrüchte", "Paprika", "Brokkoli", "Beeren"],
        "food_sources_it": ["Agrumi", "Peperoni", "Broccoli", "Frutti di bosco"],
        "contraindications": ["kidney_stones_oxalate"]
    },
    "iodine": {
        "name_de": "Jod",
        "name_it": "Iodio",
        "why_de": "Wichtig für Schilddrüsenfunktion und Stoffwechsel",
        "why_it": "Importante per funzione tiroidea e metabolismo",
        "food_sources_de": ["Seefisch", "Meeresfrüchte", "Jodsalz", "Algen"],
        "food_sources_it": ["Pesce di mare", "Frutti di mare", "Sale iodato", "Alghe"],
        "contraindications": ["thyroid_disease", "hashimoto"]
    },
    "folate": {
        "name_de": "Folsäure",
        "name_it": "Acido folico",
        "why_de": "Wichtig für Zellteilung und besonders in der Schwangerschaft",
        "why_it": "Importante per divisione cellulare e specialmente in gravidanza",
        "food_sources_de": ["Grünes Blattgemüse", "Hülsenfrüchte", "Vollkorn"],
        "food_sources_it": ["Verdure a foglia verde", "Legumi", "Cereali integrali"],
        "contraindications": []
    },
    "coq10": {
        "name_de": "Coenzym Q10",
        "name_it": "Coenzima Q10",
        "why_de": "Wichtig für zelluläre Energieproduktion und Herzgesundheit",
        "why_it": "Importante per produzione energia cellulare e salute cardiaca",
        "food_sources_de": ["Innereien", "Rindfleisch", "Sardinen", "Spinat"],
        "food_sources_it": ["Frattaglie", "Manzo", "Sardine", "Spinaci"],
        "contraindications": ["blood_thinners"]
    }
}

# Medication interactions
MEDICATION_INTERACTIONS = {
    "ppi": ["vitamin_b12", "magnesium", "calcium", "iron"],  # Proton pump inhibitors
    "metformin": ["vitamin_b12"],
    "statins": ["coq10"],
    "blood_thinners": ["vitamin_k", "omega3", "vitamin_e"],
    "diuretics": ["magnesium", "potassium", "zinc"],
    "antacids": ["vitamin_b12", "iron", "calcium"],
    "birth_control": ["b_vitamins", "magnesium", "zinc"],
    "antidepressants": ["b_vitamins", "omega3"],
    "antibiotics": ["probiotics", "b_vitamins"]
}

# Condition-related risks
CONDITION_RISKS = {
    "diabetes": {"magnesium": 0.5, "vitamin_d": 0.4, "b_vitamins": 0.4, "chromium": 0.5},
    "hypothyroidism": {"iodine": 0.6, "selenium": 0.5, "zinc": 0.4},
    "osteoporosis": {"calcium": 0.7, "vitamin_d": 0.7, "vitamin_k": 0.5, "magnesium": 0.4},
    "anemia": {"iron": 0.8, "vitamin_b12": 0.6, "folate": 0.5},
    "ibs": {"probiotics": 0.6, "vitamin_d": 0.4, "magnesium": 0.4},
    "depression": {"omega3": 0.5, "vitamin_d": 0.5, "b_vitamins": 0.5, "magnesium": 0.4},
    "anxiety": {"magnesium": 0.6, "b_vitamins": 0.5, "omega3": 0.4},
    "migraine": {"magnesium": 0.6, "coq10": 0.5, "vitamin_b2": 0.5},
    "pcos": {"vitamin_d": 0.5, "inositol": 0.6, "omega3": 0.4},
    "hashimoto": {"selenium": 0.6, "vitamin_d": 0.5, "zinc": 0.4}
}


def calculate_risk_scores(profile: dict) -> dict:
    """
    Calculate micronutrient deficiency risk scores based on health profile.
    Returns scores from 0-1 for each nutrient.
    """
    scores = {}
    
    # Diet-based risks
    diet = profile.get("diet", "omnivore")
    if diet in RISK_WEIGHTS["diet"]:
        for nutrient, weight in RISK_WEIGHTS["diet"][diet].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    
    # Activity level
    activity = profile.get("activity_level", "moderate")
    if activity == "sedentary":
        for nutrient, weight in RISK_WEIGHTS["activity"]["sedentary"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    elif activity in ("athletic", "very_active"):
        for nutrient, weight in RISK_WEIGHTS["activity"]["athletic"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    elif activity == "professional_athlete":
        for nutrient, weight in RISK_WEIGHTS["activity"]["professional_athlete"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    
    # Sleep quality (1-10 scale) - use 7 as default if None
    sleep_quality = profile.get("sleep_quality")
    if sleep_quality is None:
        sleep_quality = 7
    if sleep_quality <= 4:
        for nutrient, weight in RISK_WEIGHTS["sleep_poor"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    elif sleep_quality <= 6:
        for nutrient, weight in RISK_WEIGHTS["sleep_poor"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight * 0.5
    
    # Stress level (1-10 scale) - use 5 as default if None
    stress_level = profile.get("stress_level")
    if stress_level is None:
        stress_level = 5
    if stress_level >= 7:
        for nutrient, weight in RISK_WEIGHTS["stress_high"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    elif stress_level >= 5:
        for nutrient, weight in RISK_WEIGHTS["stress_high"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight * 0.5
    
    # Age-related - use 30 as default if None
    age = profile.get("age")
    if age is None:
        age = 30
    if age >= 60:
        for nutrient, weight in RISK_WEIGHTS["age_senior"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
    
    # Gender-specific
    gender = profile.get("gender") or ""
    if gender == "female":
        for nutrient, weight in RISK_WEIGHTS["female"].items():
            scores[nutrient] = scores.get(nutrient, 0) + weight
        if 15 <= age <= 50:
            for nutrient, weight in RISK_WEIGHTS["female_fertile"].items():
                scores[nutrient] = scores.get(nutrient, 0) + weight
    
    # Pre-existing conditions
    conditions = profile.get("conditions", [])
    for condition in conditions:
        if condition in CONDITION_RISKS:
            for nutrient, weight in CONDITION_RISKS[condition].items():
                scores[nutrient] = scores.get(nutrient, 0) + weight
    
    # Medications
    medications = profile.get("medications", [])
    for med in medications:
        if med in MEDICATION_INTERACTIONS:
            for nutrient in MEDICATION_INTERACTIONS[med]:
                scores[nutrient] = scores.get(nutrient, 0) + 0.4
    
    # Normalize scores to 0-1 range (cap at 1.0)
    for nutrient in scores:
        scores[nutrient] = min(scores[nutrient], 1.0)
    
    return scores


def get_risk_level(score: float) -> str:
    """Convert numeric score to risk level."""
    if score >= 0.7:
        return "high"
    elif score >= 0.4:
        return "medium"
    else:
        return "low"


def generate_health_assessment(profile: dict, lang: str = "de") -> dict:
    """
    Generate comprehensive health assessment based on profile.
    """
    scores = calculate_risk_scores(profile)
    
    # Sort by risk score
    sorted_nutrients = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    # Build deficiency list
    deficiencies = []
    for nutrient, score in sorted_nutrients:
        if score < 0.3:
            continue  # Skip very low risks
        
        info = NUTRIENT_INFO.get(nutrient, {})
        risk_level = get_risk_level(score)
        
        deficiencies.append({
            "nutrient": nutrient,
            "name": info.get(f"name_{lang}", nutrient),
            "score": round(score, 2),
            "risk_level": risk_level,
            "why": info.get(f"why_{lang}", ""),
            "food_sources": info.get(f"food_sources_{lang}", []),
        })
    
    # Check for contraindications
    warnings = []
    conditions = profile.get("conditions", [])
    medications = profile.get("medications", [])
    
    for nutrient, score in sorted_nutrients:
        if score < 0.4:
            continue
        info = NUTRIENT_INFO.get(nutrient, {})
        for contra in info.get("contraindications", []):
            if contra in conditions or contra in medications:
                warning_text = {
                    "de": f"Vorsicht bei {info.get('name_de', nutrient)}: Mögliche Kontraindikation aufgrund Ihrer Angaben. Bitte Rücksprache mit Arzt.",
                    "it": f"Attenzione con {info.get('name_it', nutrient)}: Possibile controindicazione in base ai tuoi dati. Consultare un medico."
                }
                warnings.append(warning_text[lang])
    
    # Calculate BMI if data available
    bmi = None
    bmi_category = None
    if profile.get("height") and profile.get("weight"):
        height_m = profile["height"] / 100
        bmi = round(profile["weight"] / (height_m ** 2), 1)
        if bmi < 18.5:
            bmi_category = "underweight"
        elif bmi < 25:
            bmi_category = "normal"
        elif bmi < 30:
            bmi_category = "overweight"
        else:
            bmi_category = "obese"
    
    # Priority action areas
    priority_areas = []
    sleep_qual_check = profile.get("sleep_quality")
    if sleep_qual_check is not None and sleep_qual_check <= 5:
        priority_areas.append({
            "area": "sleep" if lang == "de" else "sonno",
            "title": "Schlafqualität verbessern" if lang == "de" else "Migliorare qualità del sonno",
            "priority": "high"
        })
    stress_check = profile.get("stress_level")
    if stress_check is not None and stress_check >= 7:
        priority_areas.append({
            "area": "stress",
            "title": "Stressmanagement" if lang == "de" else "Gestione dello stress",
            "priority": "high"
        })
    if profile.get("activity_level") == "sedentary":
        priority_areas.append({
            "area": "activity" if lang == "de" else "attività",
            "title": "Bewegung steigern" if lang == "de" else "Aumentare movimento",
            "priority": "medium"
        })
    
    return {
        "deficiencies": deficiencies[:8],  # Top 8 risks
        "warnings": warnings,
        "priority_areas": priority_areas,
        "bmi": bmi,
        "bmi_category": bmi_category,
        "profile_completeness": calculate_profile_completeness(profile)
    }


def calculate_profile_completeness(profile: dict) -> int:
    """Calculate how complete the health profile is (0-100%)."""
    fields = [
        "age", "gender", "height", "weight", "diet", "activity_level",
        "sleep_quality", "stress_level", "conditions", "medications", "complaints"
    ]
    filled = sum(1 for f in fields if profile.get(f))
    return int((filled / len(fields)) * 100)
