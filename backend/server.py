from fastapi import FastAPI, APIRouter, Request, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import time
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class SymptomInput(BaseModel):
    text: str = ""
    tags: List[str] = []
    duration: str = ""
    intensity: str = ""

class ClickEventInput(BaseModel):
    product_id: str
    affiliate_url: str
    source: str = "app"

# ===================== PRODUCT CATALOG =====================

PRODUCT_CATALOG = [
    {
        "product_id": "vitanatura-d3k2",
        "name": "VitaNatura Vitamin D3 + K2 Tropfen",
        "description": "Hochdosiertes Vitamin D3 mit K2 für Knochen und Immunsystem",
        "affiliate_url": "https://shop.vitanatura.example/d3-k2?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["vitamin-d", "knochen", "immunsystem", "müdigkeit", "winter"],
        "price": "24,90 €"
    },
    {
        "product_id": "vitanatura-omega3",
        "name": "VitaNatura Omega-3 Premium Kapseln",
        "description": "Hochwertiges Fischöl mit EPA und DHA",
        "affiliate_url": "https://shop.vitanatura.example/omega3?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["omega-3", "herz", "gehirn", "entzündung", "gelenke"],
        "price": "29,90 €"
    },
    {
        "product_id": "vitanatura-magnesium",
        "name": "VitaNatura Magnesium Komplex 400",
        "description": "Magnesiumcitrat und -bisglycinat für Muskeln und Nerven",
        "affiliate_url": "https://shop.vitanatura.example/magnesium?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["magnesium", "muskeln", "krämpfe", "schlaf", "stress", "nerven"],
        "price": "19,90 €"
    },
    {
        "product_id": "vitanatura-vc-zink",
        "name": "VitaNatura Vitamin C + Zink",
        "description": "Immunsupport mit natürlichem Vitamin C aus Acerola",
        "affiliate_url": "https://shop.vitanatura.example/vc-zink?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["vitamin-c", "zink", "immunsystem", "erkältung", "haut"],
        "price": "16,90 €"
    },
    {
        "product_id": "vitanatura-b-komplex",
        "name": "VitaNatura B-Komplex Forte",
        "description": "Alle 8 B-Vitamine in bioaktiver Form",
        "affiliate_url": "https://shop.vitanatura.example/b-komplex?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["b-vitamine", "energie", "nerven", "müdigkeit", "konzentration"],
        "price": "21,90 €"
    },
    {
        "product_id": "vitanatura-eisen",
        "name": "VitaNatura Eisen + Vitamin C",
        "description": "Gut verträgliches Eisenbisglycinat mit Vitamin C",
        "affiliate_url": "https://shop.vitanatura.example/eisen?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["eisen", "müdigkeit", "blutarmut", "frauen", "energie"],
        "price": "18,90 €"
    },
    {
        "product_id": "vitanatura-probiotika",
        "name": "VitaNatura Probiotika Balance",
        "description": "20 Milliarden KBE mit 15 Bakterienstämmen",
        "affiliate_url": "https://shop.vitanatura.example/probiotika?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["probiotika", "darm", "verdauung", "immunsystem", "blähungen"],
        "price": "27,90 €"
    },
    {
        "product_id": "vitanatura-kurkuma",
        "name": "VitaNatura Kurkuma Extrakt",
        "description": "Hochdosierter Curcumin-Extrakt mit Piperin",
        "affiliate_url": "https://shop.vitanatura.example/kurkuma?ref=app&utm_source=vitaguide&utm_medium=app",
        "tags": ["kurkuma", "entzündung", "gelenke", "antioxidantien", "verdauung"],
        "price": "22,90 €"
    }
]

# ===================== SYSTEM PROMPT =====================

SYSTEM_PROMPT = """Du bist ein Ernährungs- und Gesundheitsinformations-Assistent der App "VitaGuide".

WICHTIGE REGELN:
- Du bist KEIN Arzt und KEIN Medizinprodukt
- Stelle KEINE Diagnosen
- Gib KEINE personalisierten medizinischen Behandlungsanweisungen
- Mache KEINE Heilversprechen
- Nenne bei Nahrungsergänzungsmitteln nur "übliche Tageszufuhr laut Etikett" und verweise auf Arzt/Apotheke
- Empfehle bei ernsthaften Symptomen IMMER einen Arzt aufzusuchen

RED-FLAG-SYMPTOME (bei diesen IMMER sofort Arzt/Notarzt empfehlen, KEINE Produktempfehlungen geben):
- Brustschmerzen, Atemnot, Herzrasen
- Neurologische Ausfälle (Sehstörungen, Lähmungen, Sprachstörungen)
- Blut im Stuhl, Urin oder Erbrochenen
- Hohes Fieber >3 Tage oder >40°C
- Starke Dehydrierung
- Bewusstlosigkeit oder Ohnmacht
- Schwere allergische Reaktionen
- Suizidgedanken oder schwere psychische Krisen
- Unerklärlicher starker Gewichtsverlust

BESONDERE VORSICHT bei:
- Schwangerschaft und Stillzeit
- Kindern unter 18
- Chronischen Erkrankungen (Diabetes, Nieren-, Lebererkrankungen)
- Medikamenteneinnahme (Wechselwirkungen!)
Bei diesen Fällen: IMMER Warnhinweis und Verweis auf Arzt/Apotheke.

VERFÜGBARE MARKENPRODUKTE (nur diese empfehlen wenn passend und KEINE Red Flags):
""" + json.dumps([{"product_id": p["product_id"], "name": p["name"], "description": p["description"], "tags": p["tags"]} for p in PRODUCT_CATALOG], ensure_ascii=False, indent=2) + """

DEINE AUFGABE:
1. Analysiere die beschriebenen Symptome allgemein (NICHT diagnostizieren)
2. Gib evidenzbasierte, allgemeine Ernährungstipps
3. Nenne allgemeine Informationen zu relevanten Vitaminen/Nährstoffen
4. Schlage 1-2 passende, einfache Rezepte vor
5. Empfehle passende Produkte aus dem Katalog (wenn angemessen und KEINE Red Flags)
6. Erkenne Red Flags und priorisiere SICHERHEIT

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt. Kein Markdown, kein zusätzlicher Text.
Das JSON muss exakt dieses Schema haben:
{
  "summary": "Kurze, einfühlsame Zusammenfassung (2-3 Sätze)",
  "red_flags": [{"flag": "Beschreibung", "action": "Handlungsempfehlung"}],
  "supplements_general_info": [
    {"nutrient": "Name", "why": "Warum relevant", "cautions": "Vorsichtshinweise", "evidence_level": "low|medium|high", "food_sources": ["Quelle1"]}
  ],
  "brand_products": [
    {"product_id": "ID aus Katalog", "name": "Produktname", "reason": "Warum passend", "affiliate_url": "", "note": "Hinweis"}
  ],
  "nutrition_tips": ["Tipp 1", "Tipp 2"],
  "recipes": [
    {"id": "rezept_1", "title": "Name", "time_min": 30, "ingredients": ["200g Zutat"], "steps": ["Schritt 1"], "tags": ["tag"]}
  ],
  "disclaimer_short": "Dieser Inhalt dient nur der allgemeinen Information und ersetzt keine ärztliche Beratung."
}"""

# ===================== HELPERS =====================

rate_limits: dict = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 10


def check_rate_limit(ip: str) -> bool:
    now = time.time()
    rate_limits[ip] = [t for t in rate_limits[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(rate_limits[ip]) >= RATE_LIMIT_MAX:
        return False
    rate_limits[ip].append(now)
    return True


def parse_llm_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {
        "summary": "Die Analyse konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.",
        "red_flags": [],
        "supplements_general_info": [],
        "brand_products": [],
        "nutrition_tips": [
            "Achten Sie auf eine ausgewogene Ernährung mit viel Obst und Gemüse.",
            "Trinken Sie ausreichend Wasser (1,5-2 Liter pro Tag)."
        ],
        "recipes": [],
        "disclaimer_short": "Dieser Inhalt dient nur der allgemeinen Information und ersetzt keine ärztliche Beratung."
    }


# ===================== ENDPOINTS =====================

@api_router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@api_router.post("/symptoms/analyze")
async def analyze_symptoms(data: SymptomInput, request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte warten Sie einen Moment.")

    if not data.text.strip() and not data.tags:
        raise HTTPException(status_code=400, detail="Bitte beschreiben Sie Ihre Symptome oder wählen Sie Bereiche aus.")

    user_text = f"Meine Symptome: {data.text}"
    if data.tags:
        user_text += f"\nBereiche: {', '.join(data.tags)}"
    if data.duration:
        user_text += f"\nDauer: {data.duration}"
    if data.intensity:
        user_text += f"\nIntensität: {data.intensity}"

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        session_id = str(uuid.uuid4())
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=session_id,
            system_message=SYSTEM_PROMPT
        ).with_model("openai", "gpt-4o")

        response_text = await chat.send_message(UserMessage(text=user_text))
        parsed = parse_llm_response(response_text)
    except Exception as e:
        logger.error(f"LLM Error: {e}")
        parsed = {
            "summary": "Die Analyse konnte momentan nicht durchgeführt werden. Bitte versuchen Sie es später erneut.",
            "red_flags": [],
            "supplements_general_info": [],
            "brand_products": [],
            "nutrition_tips": [
                "Achten Sie auf eine ausgewogene Ernährung mit viel Obst und Gemüse.",
                "Trinken Sie ausreichend Wasser.",
                "Regelmäßige Bewegung unterstützt das allgemeine Wohlbefinden."
            ],
            "recipes": [],
            "disclaimer_short": "Dieser Inhalt dient nur der allgemeinen Information und ersetzt keine ärztliche Beratung."
        }

    # Enrich brand_products with catalog data
    enriched_products = []
    for p in parsed.get("brand_products", []):
        cat = next((c for c in PRODUCT_CATALOG if c["product_id"] == p.get("product_id")), None)
        if cat:
            enriched_products.append({
                "product_id": cat["product_id"],
                "name": cat["name"],
                "reason": p.get("reason", ""),
                "affiliate_url": cat["affiliate_url"],
                "note": p.get("note", ""),
                "price": cat.get("price", ""),
                "description": cat.get("description", "")
            })

    result = {
        "id": str(uuid.uuid4()),
        "summary": parsed.get("summary", ""),
        "red_flags": parsed.get("red_flags", []),
        "supplements_general_info": parsed.get("supplements_general_info", []),
        "brand_products": enriched_products,
        "nutrition_tips": parsed.get("nutrition_tips", []),
        "recipes": parsed.get("recipes", []),
        "disclaimer_short": parsed.get("disclaimer_short", "Allgemeine Information, keine ärztliche Beratung."),
        "input_text": data.text,
        "input_tags": data.tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prompt_version": "1.0",
        "model": "gpt-4o"
    }

    db_doc = {**result}
    await db.analyses.insert_one(db_doc)

    return result


@api_router.get("/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    result = await db.analyses.find_one({"id": analysis_id}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail="Analyse nicht gefunden")
    return result


@api_router.get("/products")
async def get_products(tags: str = ""):
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        filtered = [p for p in PRODUCT_CATALOG if any(t in p.get("tags", []) for t in tag_list)]
        return filtered if filtered else PRODUCT_CATALOG
    return PRODUCT_CATALOG


@api_router.get("/recipes")
async def get_recipes(tags: str = ""):
    analyses = await db.analyses.find(
        {}, {"_id": 0, "recipes": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    all_recipes = []
    for a in analyses:
        for r in a.get("recipes", []):
            all_recipes.append(r)
    if tags:
        tag_list = [t.strip().lower() for t in tags.split(",")]
        all_recipes = [
            r for r in all_recipes
            if any(t in [rt.lower() for rt in r.get("tags", [])] for t in tag_list)
        ]
    return all_recipes


@api_router.post("/track/click")
async def track_click(event: ClickEventInput):
    click_data = {
        "id": str(uuid.uuid4()),
        "product_id": event.product_id,
        "affiliate_url": event.affiliate_url,
        "source": event.source,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    db_doc = {**click_data}
    await db.click_events.insert_one(db_doc)
    return click_data


# ===================== APP SETUP =====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def seed_data():
    count = await db.products.count_documents({})
    if count == 0:
        for p in PRODUCT_CATALOG:
            await db.products.insert_one({**p})
        logger.info("Product catalog seeded successfully")


@app.on_event("shutdown")
async def shutdown():
    client.close()
