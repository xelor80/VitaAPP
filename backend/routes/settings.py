from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel

from core.config import db

router = APIRouter(prefix="/settings", tags=["settings"])


# ============== MODELS ==============
class TranslationUpdate(BaseModel):
    key: str
    de: str
    it: str


class SymptomChipUpdate(BaseModel):
    id: str
    de: str
    it: str
    icon: str = "circle"
    order: int = 0


class DisclaimerUpdate(BaseModel):
    lang: str  # 'de' or 'it'
    title: str
    items: list[dict]  # [{"title": "...", "text": "...", "icon": "..."}]
    accept_button: str


class AIConfigUpdate(BaseModel):
    provider: str  # 'openai', 'anthropic', 'google'
    model: str  # 'gpt-4o', 'claude-sonnet-4', 'gemini-2.0-flash', etc.
    enabled: bool = True


# ============== TRANSLATIONS ==============
@router.get("/translations")
async def get_translations():
    """Get all translations."""
    translations = await db.translations.find({}, {"_id": 0}).to_list(100)
    if not translations:
        # Return defaults if empty
        return {"translations": get_default_translations()}
    return {"translations": translations}


@router.put("/translations/{key}")
async def update_translation(key: str, data: TranslationUpdate):
    """Update a translation."""
    await db.translations.update_one(
        {"key": key},
        {"$set": {"key": key, "de": data.de, "it": data.it, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True, "key": key}


@router.post("/translations/reset")
async def reset_translations():
    """Reset translations to defaults."""
    await db.translations.delete_many({})
    defaults = get_default_translations()
    if defaults:
        await db.translations.insert_many(defaults)
    return {"success": True, "count": len(defaults)}


def get_default_translations():
    return [
        {"key": "home_subtitle", "de": "Natürliche Gesundheitsinformationen", "it": "Informazioni naturali sulla salute"},
        {"key": "symptom_placeholder", "de": "Beschreiben Sie Ihre Symptome oder Ihr Anliegen...", "it": "Descrivi i tuoi sintomi o le tue preoccupazioni..."},
        {"key": "analyze_btn", "de": "Analyse starten", "it": "Avvia analisi"},
        {"key": "analyzing", "de": "Analysiere...", "it": "Analizzando..."},
        {"key": "diary_btn", "de": "Symptom-Tagebuch", "it": "Diario dei sintomi"},
        {"key": "disclaimer_footer", "de": "Dieser Inhalt dient nur der allgemeinen Information und ersetzt keine ärztliche Beratung.", "it": "Questo contenuto è solo a scopo informativo e non sostituisce il parere medico."},
        {"key": "results_title", "de": "Ihre Analyse", "it": "La tua analisi"},
        {"key": "back_btn", "de": "Zurück", "it": "Indietro"},
        {"key": "tab_overview", "de": "Übersicht", "it": "Panoramica"},
        {"key": "tab_supplements", "de": "Nährstoffe", "it": "Nutrienti"},
        {"key": "tab_nutrition", "de": "Ernährung", "it": "Nutrizione"},
        {"key": "tab_recipes", "de": "Rezepte", "it": "Ricette"},
    ]


# ============== SYMPTOM CHIPS ==============
@router.get("/symptom-chips")
async def get_symptom_chips():
    """Get all symptom chips."""
    chips = await db.symptom_chips.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    if not chips:
        return {"chips": get_default_chips()}
    return {"chips": chips}


@router.post("/symptom-chips")
async def create_symptom_chip(data: SymptomChipUpdate):
    """Create a new symptom chip."""
    existing = await db.symptom_chips.find_one({"id": data.id})
    if existing:
        raise HTTPException(status_code=400, detail="Chip with this ID already exists")
    
    await db.symptom_chips.insert_one({
        "id": data.id, "de": data.de, "it": data.it, 
        "icon": data.icon, "order": data.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"success": True, "id": data.id}


@router.put("/symptom-chips/{chip_id}")
async def update_symptom_chip(chip_id: str, data: SymptomChipUpdate):
    """Update a symptom chip."""
    result = await db.symptom_chips.update_one(
        {"id": chip_id},
        {"$set": {"de": data.de, "it": data.it, "icon": data.icon, "order": data.order, 
                  "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Chip not found")
    return {"success": True, "id": chip_id}


@router.delete("/symptom-chips/{chip_id}")
async def delete_symptom_chip(chip_id: str):
    """Delete a symptom chip."""
    result = await db.symptom_chips.delete_one({"id": chip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chip not found")
    return {"success": True, "deleted": chip_id}


@router.post("/symptom-chips/reset")
async def reset_symptom_chips():
    """Reset symptom chips to defaults."""
    await db.symptom_chips.delete_many({})
    defaults = get_default_chips()
    if defaults:
        await db.symptom_chips.insert_many(defaults)
    return {"success": True, "count": len(defaults)}


def get_default_chips():
    return [
        {"id": "muedigkeit", "de": "Müdigkeit", "it": "Stanchezza", "icon": "sleep", "order": 0},
        {"id": "kopfschmerzen", "de": "Kopfschmerzen", "it": "Mal di testa", "icon": "head-flash-outline", "order": 1},
        {"id": "verdauung", "de": "Verdauung", "it": "Digestione", "icon": "stomach", "order": 2},
        {"id": "gelenke", "de": "Gelenkschmerzen", "it": "Dolori articolari", "icon": "bone", "order": 3},
        {"id": "schlaf", "de": "Schlafprobleme", "it": "Problemi di sonno", "icon": "weather-night", "order": 4},
        {"id": "stress", "de": "Stress", "it": "Stress", "icon": "lightning-bolt-outline", "order": 5},
        {"id": "erkaeltung", "de": "Erkältung", "it": "Raffreddore", "icon": "thermometer", "order": 6},
        {"id": "haut", "de": "Hautprobleme", "it": "Problemi della pelle", "icon": "hand-front-right-outline", "order": 7},
        {"id": "ruecken", "de": "Rückenschmerzen", "it": "Mal di schiena", "icon": "human", "order": 8},
        {"id": "konzentration", "de": "Konzentration", "it": "Concentrazione", "icon": "head-cog-outline", "order": 9},
    ]


# ============== DISCLAIMER ==============
@router.get("/disclaimer")
async def get_disclaimer():
    """Get disclaimer settings for both languages."""
    de = await db.disclaimer.find_one({"lang": "de"}, {"_id": 0})
    it = await db.disclaimer.find_one({"lang": "it"}, {"_id": 0})
    
    if not de:
        de = get_default_disclaimer("de")
    if not it:
        it = get_default_disclaimer("it")
    
    return {"de": de, "it": it}


@router.put("/disclaimer/{lang}")
async def update_disclaimer(lang: str, data: DisclaimerUpdate):
    """Update disclaimer for a language."""
    if lang not in ("de", "it"):
        raise HTTPException(status_code=400, detail="Invalid language")
    
    await db.disclaimer.update_one(
        {"lang": lang},
        {"$set": {
            "lang": lang, "title": data.title, "items": data.items,
            "accept_button": data.accept_button,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "lang": lang}


@router.post("/disclaimer/reset")
async def reset_disclaimer():
    """Reset disclaimer to defaults."""
    await db.disclaimer.delete_many({})
    await db.disclaimer.insert_one(get_default_disclaimer("de"))
    await db.disclaimer.insert_one(get_default_disclaimer("it"))
    return {"success": True}


def get_default_disclaimer(lang: str):
    if lang == "de":
        return {
            "lang": "de",
            "title": "Wichtiger Hinweis",
            "items": [
                {"title": "Kein Medizinprodukt", "text": "Diese App ist kein Medizinprodukt und ersetzt keine ärztliche Beratung, Diagnose oder Behandlung.", "icon": "medical-bag"},
                {"title": "Allgemeine Informationen", "text": "Die bereitgestellten Informationen dienen nur der allgemeinen Gesundheitsinformation und Ernährungsberatung.", "icon": "information-outline"},
                {"title": "Im Zweifel zum Arzt", "text": "Bei Beschwerden oder Symptomen wenden Sie sich bitte an einen Arzt oder qualifizierte Fachperson.", "icon": "alert-circle-outline"},
            ],
            "accept_button": "Verstanden & Zustimmen"
        }
    else:
        return {
            "lang": "it",
            "title": "Avviso Importante",
            "items": [
                {"title": "Non è un dispositivo medico", "text": "Questa app non è un dispositivo medico e non sostituisce consulenza, diagnosi o trattamento medico.", "icon": "medical-bag"},
                {"title": "Informazioni generali", "text": "Le informazioni fornite sono solo a scopo informativo generale sulla salute e la nutrizione.", "icon": "information-outline"},
                {"title": "In caso di dubbio, consultare un medico", "text": "In caso di disturbi o sintomi, si prega di consultare un medico o un professionista qualificato.", "icon": "alert-circle-outline"},
            ],
            "accept_button": "Capito e Accetto"
        }


# ============== AI CONFIG ==============
@router.get("/ai-config")
async def get_ai_config():
    """Get AI configuration."""
    config = await db.ai_config.find_one({"_id": "active"}, {"_id": 0})
    if not config:
        config = get_default_ai_config()
    
    # Available providers and models
    available = {
        "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
        "anthropic": ["claude-sonnet-4", "claude-sonnet-4-5", "claude-haiku-4"],
        "google": ["gemini-2.0-flash", "gemini-1.5-pro"],
    }
    
    return {"current": config, "available": available}


@router.put("/ai-config")
async def update_ai_config(data: AIConfigUpdate):
    """Update AI configuration."""
    await db.ai_config.update_one(
        {"_id": "active"},
        {"$set": {
            "provider": data.provider, "model": data.model, "enabled": data.enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True, "provider": data.provider, "model": data.model}


def get_default_ai_config():
    return {"provider": "openai", "model": "gpt-4o", "enabled": True}
