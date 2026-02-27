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
    # ===== GELENKE & MOBILITÄT =====
    {
        "product_id": "gelenk-kraft",
        "name": "Gelenk Kraft",
        "description": "Bestseller für Gelenke und Beweglichkeit. Schweizer Qualität, 100% natürlich.",
        "affiliate_url": "https://joachim-kaeser.de/products/gelenk-kraft-360g?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["gelenke", "gelenkschmerzen", "mobilität", "rückenschmerzen", "knochen", "arthrose"],
        "price": "32,90 €",
        "rating": "4.82/5 (71)"
    },
    {
        "product_id": "weihrauch-2-0",
        "name": "Weihrauch 2.0",
        "description": "Hochdosierter Weihrauchextrakt bei Gelenkbeschwerden und Entzündungsprozessen.",
        "affiliate_url": "https://joachim-kaeser.de/products/weihrauch-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["gelenke", "entzündung", "gelenkschmerzen", "rückenschmerzen", "weihrauch"],
        "price": "32,90 €",
        "rating": "4.76/5 (38)"
    },
    {
        "product_id": "kurkuma-komplex",
        "name": "Kurkuma-Komplex",
        "description": "Flüssiger Curcuma-Komplex – bekannt für entzündungshemmende Eigenschaften.",
        "affiliate_url": "https://joachim-kaeser.de/products/curcuma-complex-30-ml?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["kurkuma", "entzündung", "gelenke", "verdauung", "antioxidantien"],
        "price": "24,90 €"
    },
    # ===== VERDAUUNG & DETOX =====
    {
        "product_id": "microbiom-complex",
        "name": "Microbiom Complex",
        "description": "Probiotischer Komplex für gesunde Darmflora und Verdauung.",
        "affiliate_url": "https://joachim-kaeser.de/products/microbiom-complex?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["verdauung", "darm", "probiotika", "blähungen", "immunsystem", "microbiom"],
        "price": "32,90 €",
        "rating": "4.85/5 (27)"
    },
    {
        "product_id": "leber-vital",
        "name": "Leber Vital",
        "description": "Natürliche Unterstützung der Leberfunktion und Entgiftung.",
        "affiliate_url": "https://joachim-kaeser.de/products/leber-vital?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["leber", "entgiftung", "verdauung", "detox"],
        "price": "29,90 €",
        "rating": "5.0/5 (7)"
    },
    {
        "product_id": "gruene-entgiftung",
        "name": "Grüne Entgiftung",
        "description": "Natürliches Detox-Supplement mit grünen Superfoods.",
        "affiliate_url": "https://joachim-kaeser.de/products/green-detox-1?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["detox", "entgiftung", "verdauung", "superfoods"],
        "price": "32,90 €",
        "rating": "5.0/5 (1)"
    },
    # ===== IMMUNSYSTEM & ERKÄLTUNG =====
    {
        "product_id": "immunkraft",
        "name": "Immunkraft",
        "description": "Natürliche Stärkung des Immunsystems – ideal in der kalten Jahreszeit.",
        "affiliate_url": "https://joachim-kaeser.de/products/immun-kraft-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["immunsystem", "erkältung", "abwehr", "winter", "grippe"],
        "price": "15,90 €"
    },
    {
        "product_id": "echinacea-kolloidal",
        "name": "Echinacea Kolloidal",
        "description": "Kolloidale Echinacea zur Unterstützung der Abwehrkräfte.",
        "affiliate_url": "https://joachim-kaeser.de/products/echinacea-colloidal?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["immunsystem", "erkältung", "echinacea", "abwehr"],
        "price": "21,90 €"
    },
    {
        "product_id": "vitamin-c-retard",
        "name": "Vitamin C Retard",
        "description": "Depot-Vitamin C mit langsamer Freisetzung für anhaltende Versorgung.",
        "affiliate_url": "https://joachim-kaeser.de/products/vitamina-c-retard?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["vitamin-c", "immunsystem", "erkältung", "haut", "antioxidantien"],
        "price": "31,90 €"
    },
    {
        "product_id": "kolloidales-zink",
        "name": "Kolloidales Zink",
        "description": "Kolloidales Zink für Immunsystem, Haut und Stoffwechsel.",
        "affiliate_url": "https://joachim-kaeser.de/products/zink-150-ml?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["zink", "immunsystem", "haut", "erkältung", "stoffwechsel"],
        "price": "21,90 €"
    },
    # ===== ENERGIE & MÜDIGKEIT =====
    {
        "product_id": "b-komplex-kolloid",
        "name": "B-Komplex-Kolloid",
        "description": "Kolloidaler B-Vitamin-Komplex für Energie, Nerven und Konzentration.",
        "affiliate_url": "https://joachim-kaeser.de/products/b-complex-150-ml?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["b-vitamine", "energie", "müdigkeit", "nerven", "konzentration", "stress"],
        "price": "21,90 €"
    },
    {
        "product_id": "eisen",
        "name": "Eisen",
        "description": "Flüssiges Eisen-Supplement – gut verträglich und hochbioverfügbar. 150 ml.",
        "affiliate_url": "https://joachim-kaeser.de/products/eisen-150-ml?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["eisen", "müdigkeit", "energie", "blutarmut", "frauen"],
        "price": "21,90 €"
    },
    {
        "product_id": "nadh",
        "name": "NADH",
        "description": "Coenzym NADH für zelluläre Energie und geistige Leistungsfähigkeit. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/nadh-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["energie", "müdigkeit", "konzentration", "zellerneuerung", "leistung"],
        "price": "29,90 €",
        "rating": "5.0/5 (1)"
    },
    {
        "product_id": "q10-power",
        "name": "Q10 Power",
        "description": "Coenzym Q10 – unterstützt die Energieproduktion in jeder Zelle.",
        "affiliate_url": "https://joachim-kaeser.de/products/coenzym-q10-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["q10", "energie", "herz", "müdigkeit", "anti-aging", "zellen"],
        "price": "32,90 €",
        "rating": "4.67/5 (6)"
    },
    {
        "product_id": "factor-d",
        "name": "Factor D",
        "description": "Hochdosiertes Vitamin D3 – wichtig für Knochen, Immunsystem und Wohlbefinden. 90 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/factor-d-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["vitamin-d", "knochen", "immunsystem", "müdigkeit", "winter", "stimmung"],
        "price": "31,90 €",
        "rating": "5.0/5 (10)"
    },
    {
        "product_id": "essentials-direct",
        "name": "Essentials Direct",
        "description": "Flüssige Grundversorgung mit essentiellen Mineralien und Spurenelementen.",
        "affiliate_url": "https://joachim-kaeser.de/products/essentials-direct?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["mineralstoffe", "grundversorgung", "müdigkeit", "energie", "immunsystem"],
        "price": "32,90 €",
        "rating": "5.0/5 (4)"
    },
    # ===== STRESS & SCHLAF =====
    {
        "product_id": "magnesium-direct",
        "name": "Magnesium Direct",
        "description": "Flüssiges Magnesium zum Trinken – für Muskeln, Nerven und erholsamen Schlaf.",
        "affiliate_url": "https://joachim-kaeser.de/products/magnesium-direkt-60-ml?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["magnesium", "schlaf", "stress", "muskeln", "krämpfe", "nerven", "kopfschmerzen"],
        "price": "34,90 €",
        "rating": "4.75/5 (4)"
    },
    {
        "product_id": "mental-kraft",
        "name": "Mental Kraft",
        "description": "Natürliche Unterstützung für Gedächtnis, Konzentration und mentale Stärke.",
        "affiliate_url": "https://joachim-kaeser.de/products/mental-kraft-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["konzentration", "gedächtnis", "stress", "nerven", "mental", "gehirn"],
        "price": "32,90 €",
        "rating": "5.0/5 (1)"
    },
    # ===== HAUT, HAARE & SCHÖNHEIT =====
    {
        "product_id": "haut-factor",
        "name": "Haut Factor",
        "description": "Speziell für gesunde, strahlende Haut von innen. 90 Presslinge.",
        "affiliate_url": "https://joachim-kaeser.de/products/haut-factor-180-taps?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["haut", "hautprobleme", "schönheit", "anti-aging"],
        "price": "36,90 €",
        "rating": "4.88/5 (8)"
    },
    {
        "product_id": "collagen-bi-caps",
        "name": "Collagen Bi-Caps",
        "description": "Kollagen-Kapseln für Haut, Haare und Bindegewebe. Kapsel-in-Kapsel-Technologie.",
        "affiliate_url": "https://joachim-kaeser.de/products/collagen-bi-caps-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["kollagen", "haut", "haare", "bindegewebe", "anti-aging", "hautprobleme"],
        "price": "35,90 €",
        "rating": "4.5/5 (6)"
    },
    {
        "product_id": "hyaluronsaeure",
        "name": "Hyaluronsäure",
        "description": "Hochdosierte Hyaluronsäure-Kapseln für Haut und Gelenke. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/hyaluronsaure-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["hyaluronsäure", "haut", "gelenke", "feuchtigkeit", "anti-aging", "hautprobleme"],
        "price": "29,90 €",
        "rating": "5.0/5 (1)"
    },
    {
        "product_id": "haar-aktiv",
        "name": "Haar Aktiv",
        "description": "Kapseln für kräftiges, gesundes Haar von innen. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/haar-aktiv-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["haare", "haarausfall", "nägel", "schönheit", "hautprobleme"],
        "price": "32,90 €",
        "rating": "4.52/5 (21)"
    },
    {
        "product_id": "schwarzkuemmeloel",
        "name": "Schwarzkümmelöl",
        "description": "Kaltgepresstes Schwarzkümmelöl – traditionell bei Haut- und Allergiethemen. 90 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/schwarzkummelol-90-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["schwarzkümmel", "haut", "allergie", "immunsystem", "entzündung", "hautprobleme"],
        "price": "26,90 €",
        "rating": "5.0/5 (1)"
    },
    # ===== HERZ & KREISLAUF =====
    {
        "product_id": "omega-3",
        "name": "Omega 3",
        "description": "Hochwertige Omega-3-Kapseln für Herz, Gehirn und Gelenke. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/omega-3-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["omega-3", "herz", "gehirn", "gelenke", "entzündung", "konzentration", "kopfschmerzen"],
        "price": "32,90 €",
        "rating": "5.0/5 (1)"
    },
    {
        "product_id": "kreislauf-vital",
        "name": "Kreislauf Vital",
        "description": "Natürliche Unterstützung für einen gesunden Kreislauf. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/kreislauf-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["kreislauf", "herz", "blutdruck", "venen", "durchblutung"],
        "price": "32,90 €"
    },
    # ===== GEWICHTSKONTROLLE =====
    {
        "product_id": "metabol-control",
        "name": "Metabol Control",
        "description": "Unterstützt den Stoffwechsel und die natürliche Gewichtskontrolle.",
        "affiliate_url": "https://joachim-kaeser.de/products/metabol-control-1?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["stoffwechsel", "gewicht", "verdauung", "metabolismus"],
        "price": "32,90 €",
        "rating": "4.57/5 (14)"
    },
    # ===== WEITERE SPEZIALPRODUKTE =====
    {
        "product_id": "atem-kraft",
        "name": "Atem Kraft",
        "description": "Natürliche Unterstützung für freie Atemwege und Lungengesundheit.",
        "affiliate_url": "https://joachim-kaeser.de/products/atem-kraft-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["atemwege", "lunge", "erkältung", "husten", "bronchien"],
        "price": "31,90 €"
    },
    {
        "product_id": "knochen-direct",
        "name": "Knochen Direct",
        "description": "Flüssiges Supplement für starke Knochen und Gelenke.",
        "affiliate_url": "https://joachim-kaeser.de/products/knochen-direct?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["knochen", "gelenke", "calcium", "vitamin-d", "osteoporose"],
        "price": "34,90 €",
        "rating": "4.7/5 (10)"
    },
    {
        "product_id": "glutathion-plus",
        "name": "Glutathion +",
        "description": "Starkes Antioxidans für Entgiftung und Zellschutz.",
        "affiliate_url": "https://joachim-kaeser.de/products/glutathion?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["antioxidantien", "entgiftung", "zellschutz", "immunsystem", "leber"],
        "price": "32,90 €",
        "rating": "4.86/5 (7)"
    },
    {
        "product_id": "visio-pro",
        "name": "Visio Pro",
        "description": "Nährstoffe für gesunde Augen und gutes Sehvermögen. 60 Kapseln.",
        "affiliate_url": "https://joachim-kaeser.de/products/visio-pro-60-kapseln?ref=vitaguide&utm_source=vitaguide&utm_medium=app",
        "tags": ["augen", "sehkraft", "bildschirmarbeit", "konzentration"],
        "price": "31,90 €",
        "rating": "4.23/5 (13)"
    }
]

# ===================== PRODUCT IMAGES =====================
PRODUCT_IMAGES = {
    "gelenk-kraft": "https://joachim-kaeser.de/cdn/shop/files/GelenkKraftJoachimKaeser_DE.webp?v=1762436300&width=300",
    "weihrauch-2-0": "https://joachim-kaeser.de/cdn/shop/files/Weihrauch2.0.webp?v=1762441777&width=300",
    "kurkuma-komplex": "https://joachim-kaeser.de/cdn/shop/files/CurcumaComplexJoachimKaeser_1.webp?v=1762441896&width=300",
    "microbiom-complex": "https://joachim-kaeser.de/cdn/shop/files/MicrobiomComplex.webp?v=1762441373&width=300",
    "leber-vital": "https://joachim-kaeser.de/cdn/shop/files/LeberVital.webp?v=1762441521&width=300",
    "gruene-entgiftung": "https://joachim-kaeser.de/cdn/shop/files/GreenDetoX.webp?v=1762439283&width=300",
    "immunkraft": "https://joachim-kaeser.de/cdn/shop/files/ImmunKraftJoachimKaeser.png?v=1762363785&width=300",
    "echinacea-kolloidal": "https://joachim-kaeser.de/cdn/shop/files/echinacea_bottiglia.webp?v=1750429572&width=300",
    "vitamin-c-retard": "https://joachim-kaeser.de/cdn/shop/files/VitaminaCRetardo-Joachim-Kaeser.webp?v=1757951672&width=300",
    "kolloidales-zink": "https://joachim-kaeser.de/cdn/shop/files/BestensgewappnetfuerdiekalteJahreszeit_1.png?v=1762363753&width=300",
    "b-komplex-kolloid": "https://joachim-kaeser.de/cdn/shop/files/BComplexJoachimKaeser.png?v=1762363783&width=300",
    "eisen": "https://joachim-kaeser.de/cdn/shop/files/Eisen.png?v=1762363769&width=300",
    "nadh": "https://joachim-kaeser.de/cdn/shop/files/NADHJoachimKaeser.png?v=1762363799&width=300",
    "q10-power": "https://joachim-kaeser.de/cdn/shop/files/Q10Power.webp?v=1762439871&width=300",
    "factor-d": "https://joachim-kaeser.de/cdn/shop/files/FactorDShopbilder.png?v=1762969675&width=300",
    "essentials-direct": "https://joachim-kaeser.de/cdn/shop/files/oligo_Diretto.webp?v=1752847106&width=300",
    "magnesium-direct": "https://joachim-kaeser.de/cdn/shop/files/MagnesiumDirektDrops.png?v=1762363759&width=300",
    "mental-kraft": "https://joachim-kaeser.de/cdn/shop/files/MentalKraftJoachimKaeser.png?v=1762363798&width=300",
    "haut-factor": "https://joachim-kaeser.de/cdn/shop/files/HautFactor90PresslingeJoachimKaeser_843697a9-b4e4-4067-9b7e-9a7a5a8204dc.webp?v=1762435015&width=300",
    "collagen-bi-caps": "https://joachim-kaeser.de/cdn/shop/files/collagen-bl-caps_1_1d356d47-c308-439a-908f-857e792b87fd.webp?v=1762438194&width=300",
    "hyaluronsaeure": "https://joachim-kaeser.de/cdn/shop/files/HyaluronsaureJoachimKaeser.png?v=1762363831&width=300",
    "haar-aktiv": "https://joachim-kaeser.de/cdn/shop/files/HaarAktivJoachimKaeser.png?v=1762363827&width=300",
    "schwarzkuemmeloel": "https://joachim-kaeser.de/cdn/shop/files/Schwarzkuemmeloel.png?v=1762363818&width=300",
    "omega-3": "https://joachim-kaeser.de/cdn/shop/files/Omega3.webp?v=1762436180&width=300",
    "kreislauf-vital": "https://joachim-kaeser.de/cdn/shop/files/KreislaufVitalJoachimKaeser.png?v=1762363788&width=300",
    "metabol-control": "https://joachim-kaeser.de/cdn/shop/files/metabol-control-Glp-1.webp?v=1759405768&width=300",
    "atem-kraft": "https://joachim-kaeser.de/cdn/shop/files/AtemKraft.webp?v=1762438886&width=300",
    "knochen-direct": "https://joachim-kaeser.de/cdn/shop/files/Osseo-diretto.webp?v=1752847449&width=300",
    "glutathion-plus": "https://joachim-kaeser.de/cdn/shop/files/Glutathione.webp?v=1762514734&width=300",
    "visio-pro": "https://joachim-kaeser.de/cdn/shop/files/VisioPro.webp?v=1762437282&width=300",
}

# ===================== APPLICATION INSTRUCTIONS (scraped from shop) =====================
APPLICATION_INSTRUCTIONS = {
    "gelenk-kraft": "1 Messlöffel (12 g) pro Tag in 200 ml Wasser. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "weihrauch-2-0": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "kurkuma-komplex": "0,5 ml pro Tag (= 10 Tropfen) mit ca. 100 ml Wasser einnehmen, vor Gebrauch gut schütteln. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "microbiom-complex": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "leber-vital": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "gruene-entgiftung": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "immunkraft": "Nehmen Sie täglich 2 Kapseln mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "echinacea-kolloidal": "Sprühen Sie einmal täglich 15 Sprühstöße oder zweimal täglich 7-8 Sprühstöße direkt unter die Zunge. Überschreiten Sie nicht die empfohlene Tagesdosis.",
    "vitamin-c-retard": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "kolloidales-zink": "Sprühen Sie einmal täglich 15 Sprühstöße direkt unter die Zunge oder direkt auf die Haut. Überschreiten Sie nicht die empfohlene Tagesdosis.",
    "b-komplex-kolloid": "Sprühen Sie einmal täglich 15 Sprühstöße direkt unter die Zunge. Überschreiten Sie nicht die empfohlene Tagesdosis.",
    "eisen": "Sprühen Sie einmal täglich 15 Sprühstöße direkt unter die Zunge. Überschreiten Sie nicht die empfohlene Tagesdosis.",
    "nadh": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "q10-power": "Nehmen Sie täglich 2 Kapseln mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "factor-d": "Nehmen Sie täglich 1 Kapsel mit ausreichend Flüssigkeit ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "essentials-direct": "1 ml pro Tag (etwa 1 Pipette) pur unter der Zunge oder verdünnt in Wasser, Smoothie oder Joghurt. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Alkohol und Medikamente konsumiert werden.",
    "magnesium-direct": "1 ml pro Tag (etwa 1 Pipette) pur unter der Zunge oder verdünnt in Wasser, Smoothie oder Joghurt. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Alkohol und Medikamente konsumiert werden.",
    "mental-kraft": "Nehmen Sie täglich 2 Kapseln mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "haut-factor": "Nehmen Sie täglich 3 Tabletten mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "collagen-bi-caps": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "hyaluronsaeure": "Nehmen Sie täglich 2 Kapseln mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "haar-aktiv": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "schwarzkuemmeloel": "Nehmen Sie täglich 3 Kapseln mit ausreichend Flüssigkeit ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "omega-3": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "kreislauf-vital": "Nehmen Sie täglich 2 Kapseln mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "metabol-control": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "atem-kraft": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "knochen-direct": "2 ml pro Tag (etwa 2 Pipetten) pur unter der Zunge oder verdünnt in Wasser, Smoothie oder Joghurt. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Alkohol und Medikamente konsumiert werden.",
    "glutathion-plus": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
    "visio-pro": "Nehmen Sie täglich 1 Kapsel mit reichlich Wasser ein. Nach der Einnahme 30 Minuten warten, bevor Kaffee, Tee, Milch, Alkohol und Medikamente konsumiert werden.",
}

for _p in PRODUCT_CATALOG:
    if _p["product_id"] in PRODUCT_IMAGES:
        _p["image_url"] = PRODUCT_IMAGES[_p["product_id"]]
    if _p["product_id"] in APPLICATION_INSTRUCTIONS:
        _p["application_instructions"] = APPLICATION_INSTRUCTIONS[_p["product_id"]]


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

MARKE: Joachim Kaeser – Natürliche Nahrungsergänzungsmittel aus der Schweiz, entwickelt mit über 40 Jahren Erfahrung in Ernährungswissenschaft und Phytotherapie. 100% natürlich, kontrollierte Qualität.

VERFÜGBARE PRODUKTE von Joachim Kaeser (nur diese empfehlen wenn passend und KEINE Red Flags):
""" + json.dumps([{"product_id": p["product_id"], "name": p["name"], "description": p["description"], "tags": p["tags"], "application_instructions": p.get("application_instructions", "")} for p in PRODUCT_CATALOG], ensure_ascii=False, indent=2) + """

DEINE AUFGABE:
1. Analysiere die beschriebenen Symptome allgemein (NICHT diagnostizieren)
2. Gib evidenzbasierte, allgemeine Ernährungstipps
3. Nenne allgemeine Informationen zu relevanten Vitaminen/Nährstoffen
4. Schlage 1-2 passende, einfache Rezepte vor
5. Empfehle passende Produkte aus dem Katalog (wenn angemessen und KEINE Red Flags)
6. Erstelle einen Einnahmeplan für die empfohlenen Produkte basierend auf den offiziellen Anwendungshinweisen (application_instructions) der Produkte
7. Erkenne Red Flags und priorisiere SICHERHEIT

WICHTIG zum Einnahmeplan:
- Verwende die offiziellen "application_instructions" der Produkte für Dosierung und Einnahmehinweise
- Gib die EXAKTE Dosierung aus den application_instructions wieder (z.B. "1 Kapsel", "15 Sprühstöße", "10 Tropfen", "1 Messlöffel (12g)")
- IMMER den Hinweis "Rücksprache mit Arzt/Apotheke empfohlen" hinzufügen
- Keine therapeutischen Dosierungen, die über die Herstellerangaben hinausgehen
- Bei Wechselwirkungen zwischen Produkten hinweisen

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
  "supplement_schedule": [
    {"time": "Morgens|Mittags|Abends|Vor dem Schlafen", "product_name": "Produktname", "dosage": "z.B. 1 Kapsel", "instruction": "z.B. zum Frühstück mit Wasser", "product_id": "ID aus Katalog"}
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
                "description": cat.get("description", ""),
                "image_url": cat.get("image_url", ""),
                "rating": cat.get("rating", "")
            })

    # Enrich supplement_schedule with product images and official instructions
    enriched_schedule = []
    for item in parsed.get("supplement_schedule", []):
        cat = next((c for c in PRODUCT_CATALOG if c["product_id"] == item.get("product_id")), None)
        schedule_entry = {
            "time": item.get("time", ""),
            "product_name": item.get("product_name", ""),
            "dosage": item.get("dosage", ""),
            "instruction": item.get("instruction", ""),
            "product_id": item.get("product_id", ""),
        }
        if cat:
            schedule_entry["image_url"] = cat.get("image_url", "")
            schedule_entry["affiliate_url"] = cat.get("affiliate_url", "")
            schedule_entry["price"] = cat.get("price", "")
            schedule_entry["application_instructions"] = cat.get("application_instructions", "")
        enriched_schedule.append(schedule_entry)

    result = {
        "id": str(uuid.uuid4()),
        "summary": parsed.get("summary", ""),
        "red_flags": parsed.get("red_flags", []),
        "supplements_general_info": parsed.get("supplements_general_info", []),
        "brand_products": enriched_products,
        "supplement_schedule": enriched_schedule,
        "nutrition_tips": parsed.get("nutrition_tips", []),
        "recipes": parsed.get("recipes", []),
        "disclaimer_short": parsed.get("disclaimer_short", "Allgemeine Information, keine ärztliche Beratung."),
        "input_text": data.text,
        "input_tags": data.tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prompt_version": "1.1",
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


# ===================== DIARY MODELS =====================

class DiaryEntryInput(BaseModel):
    mood: int = 3        # 1-5 (1=sehr schlecht, 5=sehr gut)
    sleep: int = 3       # 1-5
    stress: int = 3      # 1-5 (1=sehr hoch, 5=sehr entspannt)
    water: int = 4       # Gläser (0-12)
    exercise: int = 0    # Minuten (0-180)
    notes: str = ""


# ===================== DIARY ENDPOINTS =====================

@api_router.post("/diary")
async def save_diary_entry(data: DiaryEntryInput, request: Request):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # Upsert: one entry per day - check if entry exists first
    existing = await db.diary.find_one({"date": today}, {"_id": 0})
    
    entry = {
        "id": existing["id"] if existing else str(uuid.uuid4()),
        "date": today,
        "mood": max(1, min(5, data.mood)),
        "sleep": max(1, min(5, data.sleep)),
        "stress": max(1, min(5, data.stress)),
        "water": max(0, min(12, data.water)),
        "exercise": max(0, min(180, data.exercise)),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.diary.update_one({"date": today}, {"$set": entry})
    else:
        db_doc = {**entry}
        await db.diary.insert_one(db_doc)
    return entry


@api_router.get("/diary")
async def get_diary_entries(days: int = 14):
    days = min(days, 90)
    entries = await db.diary.find(
        {}, {"_id": 0}
    ).sort("date", -1).limit(days).to_list(days)
    return entries


@api_router.get("/diary/trends")
async def get_diary_trends(request: Request):
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Zu viele Anfragen.")

    entries = await db.diary.find(
        {}, {"_id": 0}
    ).sort("date", -1).limit(14).to_list(14)

    if len(entries) < 3:
        return {
            "entries": entries,
            "tips": [],
            "summary": "Bitte tragen Sie mindestens 3 Tage ein, um Trends und Tipps zu erhalten."
        }

    # Build LLM prompt for lifestyle tips
    entries_text = "\n".join([
        f"Datum: {e['date']} | Befinden: {e['mood']}/5 | Schlaf: {e['sleep']}/5 | "
        f"Stress: {e['stress']}/5 (5=entspannt) | Wasser: {e['water']} Gläser | "
        f"Bewegung: {e['exercise']} Min." + (f" | Notiz: {e['notes']}" if e.get('notes') else "")
        for e in reversed(entries)
    ])

    trend_prompt = f"""Hier sind die Tagebuch-Einträge eines Nutzers der letzten Tage:

{entries_text}

Analysiere die Trends und gib 3-5 allgemeine Lifestyle-Tipps. KEINE medizinischen Ratschläge, KEINE Diagnosen.
Fokussiere auf: Schlafgewohnheiten, Stressmanagement, Hydration, Bewegung, allgemeines Wohlbefinden.

Antworte NUR als JSON:
{{
  "summary": "Kurze Zusammenfassung der Trends (2-3 Sätze)",
  "tips": ["Tipp 1", "Tipp 2", "Tipp 3"],
  "patterns": [
    {{"area": "Bereich", "trend": "aufwärts|abwärts|stabil", "note": "Kurze Beobachtung"}}
  ]
}}"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=os.environ['EMERGENT_LLM_KEY'],
            session_id=str(uuid.uuid4()),
            system_message="Du bist ein freundlicher Wellness-Coach. Gib nur allgemeine Lifestyle-Tipps, KEINE medizinischen Ratschläge oder Diagnosen."
        ).with_model("openai", "gpt-4o")

        response_text = await chat.send_message(UserMessage(text=trend_prompt))
        parsed = parse_llm_response(response_text)
    except Exception as e:
        logger.error(f"Diary LLM Error: {e}")
        parsed = {
            "summary": "Trend-Analyse aktuell nicht verfügbar.",
            "tips": ["Regelmäßiger Schlaf unterstützt das Wohlbefinden.", "Ausreichend Wasser trinken."],
            "patterns": []
        }

    return {
        "entries": entries,
        "summary": parsed.get("summary", ""),
        "tips": parsed.get("tips", []),
        "patterns": parsed.get("patterns", [])
    }



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
