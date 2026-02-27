"""
Scrapes all individual products from joachimkaeser.it
Extracts: name, price, description, image, application instructions, video URL, tags
"""
import requests
from bs4 import BeautifulSoup
import json
import time
import re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.5",
}

SKIP_SLUGS = {
    "articolazioni-set", "bi-cap-set", "capelli-set", "cellule-attive-set",
    "challenge-set-argento", "challenge-set-bronzo", "challenge-set-oro",
    "metabol-set", "menopausa-set", "polmone-set",
    "buono-regalo", "eco-bag-joachim-kaeser",
    "workbook-90-giorni-di-cambiamento", "workbook-digitale-90-giorni-di-cambiamento",
}

# Map Italian categories based on URL patterns
CATEGORY_MAP = {
    "articolazioni": ["gelenke", "mobilità", "articolazioni"],
    "cartilagine": ["gelenke", "knorpel", "articolazioni"],
    "incenso": ["entzündung", "gelenke", "infiammazione"],
    "microbioma": ["verdauung", "darm", "digestione"],
    "curcuma": ["entzündung", "verdauung", "infiammazione"],
    "epa-vital": ["leber", "entgiftung", "fegato"],
    "green-detox": ["entgiftung", "energie", "detox"],
    "metabol": ["stoffwechsel", "gewicht", "metabolismo"],
    "immuno": ["immunsystem", "erkältung", "sistema immunitario"],
    "echinacea": ["immunsystem", "erkältung", "sistema immunitario"],
    "vitamina-c": ["immunsystem", "energie", "sistema immunitario"],
    "zinco": ["immunsystem", "haut", "sistema immunitario"],
    "b-complex": ["energie", "nerven", "energia"],
    "ferro": ["energie", "müdigkeit", "stanchezza"],
    "factor-d": ["knochen", "immunsystem", "vitamina d"],
    "magnesio": ["muskeln", "nerven", "muscoli"],
    "mental": ["konzentration", "gedächtnis", "memoria"],
    "collagene": ["haut", "schönheit", "pelle"],
    "acido-ialuronico": ["haut", "gelenke", "pelle"],
    "capelli": ["haare", "schönheit", "capelli"],
    "cheratina": ["haare", "nägel", "capelli"],
    "omega": ["herz", "gehirn", "cuore"],
    "cumino": ["verdauung", "immunsystem", "digestione"],
    "q10": ["energie", "herz", "energia"],
    "respira": ["atemwege", "lunge", "respirazione"],
    "visio": ["augen", "sehen", "vista"],
    "osseo": ["knochen", "calcium", "ossa"],
    "glutatione": ["entgiftung", "zellen", "detox"],
    "vene": ["kreislauf", "beine", "circolazione"],
    "pressione": ["kreislauf", "blutdruck", "pressione"],
    "booster": ["energie", "zellen", "energia"],
    "dormire": ["schlaf", "entspannung", "sonno"],
    "slim": ["gewicht", "haut", "dimagrimento"],
    "cortione": ["stress", "cortisol", "cortisolo"],
    "lymsal": ["entgiftung", "lymphe", "drenaggio"],
    "bromelain": ["verdauung", "entzündung", "digestione"],
    "silicio": ["haut", "haare", "pelle"],
    "nattokinasi": ["herz", "kreislauf", "cuore"],
    "sulforafano": ["zellen", "entgiftung", "cellule"],
    "spermidin": ["zellen", "anti-aging", "cellule"],
    "cellule": ["zellen", "energie", "cellule"],
    "vescica": ["blase", "harnwege", "vescica"],
    "klinoptilolith": ["entgiftung", "detox"],
    "contour": ["gewicht", "dimagrimento"],
    "thermo": ["gewicht", "stoffwechsel", "dimagrimento"],
    "amino": ["muskeln", "energie", "muscoli"],
    "basica": ["säure-basen", "detox"],
    "crema": ["haut", "pflege", "pelle"],
    "gel": ["gelenke", "pflege", "articolazioni"],
    "sunny": ["vitamina d", "immunsystem"],
    "oligo": ["minerali", "spurenelemente"],
}


def get_tags(slug):
    tags = []
    for key, tag_list in CATEGORY_MAP.items():
        if key in slug:
            tags.extend(tag_list)
    return list(set(tags)) if tags else ["allgemein", "generale"]


def extract_product_data(html, slug):
    soup = BeautifulSoup(html, "html.parser")
    data = {}

    # Name
    h1 = soup.find("h1")
    data["name"] = h1.get_text(strip=True) if h1 else slug.replace("-", " ").title()

    # Price
    price_el = soup.find("span", class_=lambda c: c and "price-item--regular" in c)
    if not price_el:
        price_el = soup.find("span", class_=lambda c: c and "price-item--sale" in c)
    data["price"] = price_el.get_text(strip=True) if price_el else ""

    # Description (first paragraph after Descrizione heading or meta description)
    meta_desc = soup.find("meta", {"name": "description"})
    data["description"] = meta_desc["content"] if meta_desc and meta_desc.get("content") else ""

    # Image
    og_image = soup.find("meta", {"property": "og:image"})
    data["image_url"] = og_image["content"] if og_image and og_image.get("content") else ""

    # Application instructions (Modalità d'uso)
    for details in soup.find_all("details"):
        summary = details.find("summary")
        if not summary:
            continue
        title = summary.get_text(strip=True).lower()
        if any(kw in title for kw in ("modalità", "applicazione", "uso", "dosaggio")):
            parts = []
            for child in details.children:
                if child.name != "summary" and hasattr(child, "get_text"):
                    t = child.get_text(" ", strip=True)
                    if t:
                        parts.append(t)
            if parts:
                data["application_instructions"] = " ".join(parts)
                break

    if "application_instructions" not in data:
        data["application_instructions"] = ""

    # Video URL - look for YouTube iframes or external_video sources
    video_url = ""
    # Check for YouTube iframes
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src", "")
        if "youtube" in src or "youtu.be" in src:
            video_url = src
            break

    # Check for data attributes with YouTube URLs
    if not video_url:
        for elem in soup.find_all(attrs={"data-youtube-url": True}):
            video_url = elem["data-youtube-url"]
            break

    # Check for external video elements (Shopify pattern)
    if not video_url:
        for source in soup.find_all("source"):
            src = source.get("src", "")
            if "youtube" in src:
                video_url = src
                break

    # Check for YouTube IDs in script tags or data attributes
    if not video_url:
        for script in soup.find_all("script"):
            text = script.string or ""
            yt_match = re.search(r'(?:youtube\.com/embed/|youtu\.be/|youtube\.com/watch\?v=)([\w-]{11})', text)
            if yt_match:
                video_url = f"https://www.youtube.com/watch?v={yt_match.group(1)}"
                break

    # Also check all attributes for YouTube references
    if not video_url:
        html_str = str(soup)
        yt_match = re.search(r'(?:youtube\.com/embed/|youtu\.be/)([\w-]{11})', html_str)
        if yt_match:
            video_url = f"https://www.youtube.com/embed/{yt_match.group(1)}"

    data["video_url"] = video_url

    # Rating
    rating_text = ""
    for el in soup.find_all(text=re.compile(r'\d+\.\d+\s*/\s*5')):
        match = re.search(r'(\d+\.\d+)\s*/\s*5', el)
        if match:
            rating_text = match.group(1)
            break
    data["rating"] = rating_text

    # Review count
    review_text = ""
    for el in soup.find_all(text=re.compile(r'\d+\s*recensioni')):
        match = re.search(r'(\d+)\s*recensioni', el)
        if match:
            review_text = match.group(1)
            break
    data["review_count"] = review_text

    return data


def main():
    # Step 1: Get all product slugs
    print("Step 1: Collecting product URLs...")
    all_slugs = {}
    for page in range(1, 6):
        resp = requests.get(f"https://joachimkaeser.it/collections/all?page={page}", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(resp.text, "html.parser")
        count = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if "/products/" in href:
                slug = href.split("/products/")[-1].split("?")[0].split("#")[0]
                name = a.get_text(strip=True)
                if slug and name and slug not in all_slugs:
                    all_slugs[slug] = name
                    count += 1
        if count == 0 and page > 1:
            break
        time.sleep(0.5)

    # Filter out sets, bundles, non-supplements
    singles = {s: n for s, n in all_slugs.items() if s not in SKIP_SLUGS}
    print(f"Total products: {len(all_slugs)}, Singles: {len(singles)}")

    # Step 2: Scrape each product
    print("\nStep 2: Scraping individual products...")
    products = []
    for i, (slug, name) in enumerate(sorted(singles.items())):
        url = f"https://joachimkaeser.it/products/{slug}"
        print(f"  [{i+1}/{len(singles)}] {name}...", end=" ", flush=True)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            data = extract_product_data(resp.text, slug)
            data["product_id"] = slug
            data["url"] = url
            data["affiliate_url"] = f"{url}?ref=vitaguide&utm_source=vitaguide&utm_medium=app"
            data["tags"] = get_tags(slug)
            products.append(data)
            video_info = f" [VIDEO: {data['video_url'][:50]}]" if data["video_url"] else ""
            instr_info = "INSTR" if data["application_instructions"] else "no-instr"
            print(f"OK ({instr_info}){video_info}")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(0.8)

    # Save results
    with open("/app/backend/products_it.json", "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print(f"\n=== Done: {len(products)} products saved to products_it.json ===")
    print(f"With video: {sum(1 for p in products if p['video_url'])}")
    print(f"With instructions: {sum(1 for p in products if p['application_instructions'])}")


if __name__ == "__main__":
    main()
