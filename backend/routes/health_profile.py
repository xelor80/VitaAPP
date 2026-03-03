from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.config import db
from core.health_engine import generate_health_assessment, calculate_risk_scores

router = APIRouter()


class HealthProfileCreate(BaseModel):
    # Personal
    first_name: Optional[str] = None
    # Basic data
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, diverse
    height: Optional[float] = None  # cm
    weight: Optional[float] = None  # kg
    
    # Lifestyle
    diet: Optional[str] = None  # omnivore, vegetarian, vegan, pescetarian, keto, paleo
    activity_level: Optional[str] = None  # sedentary, light, moderate, active, very_active, professional_athlete
    
    # Sleep
    sleep_quality: Optional[int] = None  # 1-10
    sleep_duration: Optional[float] = None  # hours
    sleep_issues: Optional[list[str]] = []  # falling_asleep, staying_asleep, early_waking
    
    # Stress
    stress_level: Optional[int] = None  # 1-10
    stress_type: Optional[list[str]] = []  # work, private, financial, health
    energy_level: Optional[int] = None  # 1-10
    
    # Health
    conditions: Optional[list[str]] = []
    medications: Optional[list[str]] = []
    allergies: Optional[list[str]] = []
    
    # Complaints
    complaints: Optional[list[dict]] = []  # [{name, intensity}]
    
    # Lab values (optional)
    known_deficiencies: Optional[list[str]] = []
    lab_values: Optional[dict] = {}
    
    # Language
    lang: str = "de"


class HealthProfileUpdate(HealthProfileCreate):
    pass


@router.post("/health-profile")
async def create_health_profile(data: HealthProfileCreate):
    """Create or update a health profile and get assessment."""
    
    profile_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    profile_doc = {
        "id": profile_id,
        "first_name": data.first_name,
        "age": data.age,
        "gender": data.gender,
        "height": data.height,
        "weight": data.weight,
        "diet": data.diet,
        "activity_level": data.activity_level,
        "sleep_quality": data.sleep_quality,
        "sleep_duration": data.sleep_duration,
        "sleep_issues": data.sleep_issues or [],
        "stress_level": data.stress_level,
        "stress_type": data.stress_type or [],
        "energy_level": data.energy_level,
        "conditions": data.conditions or [],
        "medications": data.medications or [],
        "allergies": data.allergies or [],
        "complaints": data.complaints or [],
        "known_deficiencies": data.known_deficiencies or [],
        "lab_values": data.lab_values or {},
        "lang": data.lang,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    # Generate assessment
    assessment = generate_health_assessment(profile_doc, data.lang)
    
    # Store profile
    await db.health_profiles.insert_one({**profile_doc})
    
    # Store assessment
    assessment_doc = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "assessment": assessment,
        "risk_scores": calculate_risk_scores(profile_doc),
        "created_at": now.isoformat()
    }
    await db.health_assessments.insert_one({**assessment_doc})
    
    return {
        "profile_id": profile_id,
        "assessment": assessment,
        "created_at": now.isoformat()
    }


@router.get("/health-profile/{profile_id}")
async def get_health_profile(profile_id: str):
    """Get a health profile by ID."""
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get latest assessment
    assessment = await db.health_assessments.find_one(
        {"profile_id": profile_id}, 
        {"_id": 0}
    )
    
    return {
        "profile": profile,
        "assessment": assessment.get("assessment") if assessment else None
    }


@router.put("/health-profile/{profile_id}")
async def update_health_profile(profile_id: str, data: HealthProfileUpdate):
    """Update a health profile and regenerate assessment."""
    
    existing = await db.health_profiles.find_one({"id": profile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        "first_name": data.first_name,
        "age": data.age,
        "gender": data.gender,
        "height": data.height,
        "weight": data.weight,
        "diet": data.diet,
        "activity_level": data.activity_level,
        "sleep_quality": data.sleep_quality,
        "sleep_duration": data.sleep_duration,
        "sleep_issues": data.sleep_issues or [],
        "stress_level": data.stress_level,
        "stress_type": data.stress_type or [],
        "energy_level": data.energy_level,
        "conditions": data.conditions or [],
        "medications": data.medications or [],
        "allergies": data.allergies or [],
        "complaints": data.complaints or [],
        "known_deficiencies": data.known_deficiencies or [],
        "lab_values": data.lab_values or {},
        "lang": data.lang,
        "updated_at": now.isoformat()
    }
    
    await db.health_profiles.update_one({"id": profile_id}, {"$set": update_data})
    
    # Generate new assessment
    profile_doc = {**existing, **update_data}
    assessment = generate_health_assessment(profile_doc, data.lang)
    
    # Store new assessment
    assessment_doc = {
        "id": str(uuid.uuid4()),
        "profile_id": profile_id,
        "assessment": assessment,
        "risk_scores": calculate_risk_scores(profile_doc),
        "created_at": now.isoformat()
    }
    await db.health_assessments.insert_one({**assessment_doc})
    
    return {
        "profile_id": profile_id,
        "assessment": assessment,
        "updated_at": now.isoformat()
    }


@router.get("/health-profile/{profile_id}/assessment")
async def get_health_assessment(profile_id: str, lang: str = "de"):
    """Get or regenerate health assessment for a profile."""
    
    profile = await db.health_profiles.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    assessment = generate_health_assessment(profile, lang)
    
    return {
        "profile_id": profile_id,
        "assessment": assessment
    }


# ============== ONBOARDING OPTIONS ==============
@router.get("/onboarding/options")
async def get_onboarding_options(lang: str = "de"):
    """Get all available options for onboarding form."""
    
    options = {
        "genders": [
            {"value": "male", "label_de": "Männlich", "label_it": "Maschile"},
            {"value": "female", "label_de": "Weiblich", "label_it": "Femminile"},
            {"value": "diverse", "label_de": "Divers", "label_it": "Diverso"}
        ],
        "diets": [
            {"value": "omnivore", "label_de": "Allesfresser", "label_it": "Onnivoro"},
            {"value": "vegetarian", "label_de": "Vegetarisch", "label_it": "Vegetariano"},
            {"value": "vegan", "label_de": "Vegan", "label_it": "Vegano"},
            {"value": "pescetarian", "label_de": "Pescetarisch", "label_it": "Pescetariano"},
            {"value": "keto", "label_de": "Ketogen", "label_it": "Chetogenica"},
            {"value": "paleo", "label_de": "Paleo", "label_it": "Paleo"},
            {"value": "low_carb", "label_de": "Low Carb", "label_it": "Low Carb"}
        ],
        "activity_levels": [
            {"value": "sedentary", "label_de": "Sitzend (kaum Bewegung)", "label_it": "Sedentario (poco movimento)"},
            {"value": "light", "label_de": "Leicht aktiv (1-2x/Woche)", "label_it": "Leggermente attivo (1-2x/settimana)"},
            {"value": "moderate", "label_de": "Moderat aktiv (3-4x/Woche)", "label_it": "Moderatamente attivo (3-4x/settimana)"},
            {"value": "active", "label_de": "Aktiv (5-6x/Woche)", "label_it": "Attivo (5-6x/settimana)"},
            {"value": "very_active", "label_de": "Sehr aktiv (täglich)", "label_it": "Molto attivo (quotidiano)"},
            {"value": "professional_athlete", "label_de": "Leistungssportler", "label_it": "Atleta professionista"}
        ],
        "sleep_issues": [
            {"value": "falling_asleep", "label_de": "Einschlafprobleme", "label_it": "Difficoltà ad addormentarsi"},
            {"value": "staying_asleep", "label_de": "Durchschlafprobleme", "label_it": "Difficoltà a mantenere il sonno"},
            {"value": "early_waking", "label_de": "Frühes Aufwachen", "label_it": "Risveglio precoce"},
            {"value": "not_rested", "label_de": "Nicht erholt aufwachen", "label_it": "Svegliarsi non riposati"}
        ],
        "stress_types": [
            {"value": "work", "label_de": "Beruflich", "label_it": "Lavorativo"},
            {"value": "private", "label_de": "Privat/Familie", "label_it": "Privato/Famiglia"},
            {"value": "financial", "label_de": "Finanziell", "label_it": "Finanziario"},
            {"value": "health", "label_de": "Gesundheitlich", "label_it": "Salute"}
        ],
        "conditions": [
            {"value": "diabetes", "label_de": "Diabetes", "label_it": "Diabete"},
            {"value": "hypothyroidism", "label_de": "Schilddrüsenunterfunktion", "label_it": "Ipotiroidismo"},
            {"value": "hashimoto", "label_de": "Hashimoto", "label_it": "Hashimoto"},
            {"value": "osteoporosis", "label_de": "Osteoporose", "label_it": "Osteoporosi"},
            {"value": "anemia", "label_de": "Anämie/Blutarmut", "label_it": "Anemia"},
            {"value": "ibs", "label_de": "Reizdarmsyndrom", "label_it": "Sindrome intestino irritabile"},
            {"value": "depression", "label_de": "Depression", "label_it": "Depressione"},
            {"value": "anxiety", "label_de": "Angststörung", "label_it": "Disturbo d'ansia"},
            {"value": "migraine", "label_de": "Migräne", "label_it": "Emicrania"},
            {"value": "pcos", "label_de": "PCOS", "label_it": "PCOS"},
            {"value": "high_blood_pressure", "label_de": "Bluthochdruck", "label_it": "Ipertensione"},
            {"value": "heart_disease", "label_de": "Herzerkrankung", "label_it": "Malattia cardiaca"}
        ],
        "medications": [
            {"value": "ppi", "label_de": "Magensäureblocker (PPI)", "label_it": "Inibitori pompa protonica (PPI)"},
            {"value": "metformin", "label_de": "Metformin", "label_it": "Metformina"},
            {"value": "statins", "label_de": "Statine (Cholesterin)", "label_it": "Statine (colesterolo)"},
            {"value": "blood_thinners", "label_de": "Blutverdünner", "label_it": "Anticoagulanti"},
            {"value": "diuretics", "label_de": "Diuretika (Entwässerung)", "label_it": "Diuretici"},
            {"value": "antacids", "label_de": "Antazida", "label_it": "Antiacidi"},
            {"value": "birth_control", "label_de": "Verhütungspille", "label_it": "Pillola anticoncezionale"},
            {"value": "antidepressants", "label_de": "Antidepressiva", "label_it": "Antidepressivi"},
            {"value": "antibiotics", "label_de": "Antibiotika (regelmäßig)", "label_it": "Antibiotici (regolarmente)"},
            {"value": "thyroid_medication", "label_de": "Schilddrüsenmedikamente", "label_it": "Farmaci tiroidei"}
        ],
        "complaints": [
            {"value": "fatigue", "label_de": "Müdigkeit/Erschöpfung", "label_it": "Stanchezza/Affaticamento"},
            {"value": "headache", "label_de": "Kopfschmerzen", "label_it": "Mal di testa"},
            {"value": "digestive", "label_de": "Verdauungsprobleme", "label_it": "Problemi digestivi"},
            {"value": "joint_pain", "label_de": "Gelenkschmerzen", "label_it": "Dolori articolari"},
            {"value": "muscle_pain", "label_de": "Muskelschmerzen", "label_it": "Dolori muscolari"},
            {"value": "skin_problems", "label_de": "Hautprobleme", "label_it": "Problemi della pelle"},
            {"value": "hair_loss", "label_de": "Haarausfall", "label_it": "Perdita di capelli"},
            {"value": "concentration", "label_de": "Konzentrationsprobleme", "label_it": "Problemi di concentrazione"},
            {"value": "mood_swings", "label_de": "Stimmungsschwankungen", "label_it": "Sbalzi d'umore"},
            {"value": "anxiety_symptoms", "label_de": "Angstzustände", "label_it": "Ansia"},
            {"value": "sleep_problems", "label_de": "Schlafprobleme", "label_it": "Problemi di sonno"},
            {"value": "weight_issues", "label_de": "Gewichtsprobleme", "label_it": "Problemi di peso"},
            {"value": "immune_weakness", "label_de": "Häufige Infekte", "label_it": "Infezioni frequenti"},
            {"value": "cold_hands_feet", "label_de": "Kalte Hände/Füße", "label_it": "Mani/piedi freddi"}
        ],
        "known_deficiencies": [
            {"value": "vitamin_d", "label_de": "Vitamin D", "label_it": "Vitamina D"},
            {"value": "vitamin_b12", "label_de": "Vitamin B12", "label_it": "Vitamina B12"},
            {"value": "iron", "label_de": "Eisen", "label_it": "Ferro"},
            {"value": "magnesium", "label_de": "Magnesium", "label_it": "Magnesio"},
            {"value": "zinc", "label_de": "Zink", "label_it": "Zinco"},
            {"value": "folate", "label_de": "Folsäure", "label_it": "Acido folico"},
            {"value": "omega3", "label_de": "Omega-3", "label_it": "Omega-3"},
            {"value": "calcium", "label_de": "Calcium", "label_it": "Calcio"}
        ]
    }
    
    return options
