"""
Scrapes application instructions (Anwendung) from Joachim Kaeser product pages.
Uses HTML5 <details>/<summary> accordion pattern found on the shop pages.
"""
import requests
from bs4 import BeautifulSoup
import json
import time

PRODUCTS = {
    "gelenk-kraft": "https://joachim-kaeser.de/products/gelenk-kraft-360g",
    "weihrauch-2-0": "https://joachim-kaeser.de/products/weihrauch-60-kapseln",
    "kurkuma-komplex": "https://joachim-kaeser.de/products/curcuma-complex-30-ml",
    "microbiom-complex": "https://joachim-kaeser.de/products/microbiom-complex",
    "leber-vital": "https://joachim-kaeser.de/products/leber-vital",
    "gruene-entgiftung": "https://joachim-kaeser.de/products/green-detox-1",
    "immunkraft": "https://joachim-kaeser.de/products/immun-kraft-60-kapseln",
    "echinacea-kolloidal": "https://joachim-kaeser.de/products/echinacea-colloidal",
    "vitamin-c-retard": "https://joachim-kaeser.de/products/vitamina-c-retard",
    "kolloidales-zink": "https://joachim-kaeser.de/products/zink-150-ml",
    "b-komplex-kolloid": "https://joachim-kaeser.de/products/b-complex-150-ml",
    "eisen": "https://joachim-kaeser.de/products/eisen-150-ml",
    "nadh": "https://joachim-kaeser.de/products/nadh-60-kapseln",
    "q10-power": "https://joachim-kaeser.de/products/coenzym-q10-60-kapseln",
    "factor-d": "https://joachim-kaeser.de/products/factor-d-60-kapseln",
    "essentials-direct": "https://joachim-kaeser.de/products/essentials-direct",
    "magnesium-direct": "https://joachim-kaeser.de/products/magnesium-direkt-60-ml",
    "mental-kraft": "https://joachim-kaeser.de/products/mental-kraft-60-kapseln",
    "haut-factor": "https://joachim-kaeser.de/products/haut-factor-180-taps",
    "collagen-bi-caps": "https://joachim-kaeser.de/products/collagen-bi-caps-60-kapseln",
    "hyaluronsaeure": "https://joachim-kaeser.de/products/hyaluronsaure-60-kapseln",
    "haar-aktiv": "https://joachim-kaeser.de/products/haar-aktiv-60-kapseln",
    "schwarzkuemmeloel": "https://joachim-kaeser.de/products/schwarzkummelol-90-kapseln",
    "omega-3": "https://joachim-kaeser.de/products/omega-3-60-kapseln",
    "kreislauf-vital": "https://joachim-kaeser.de/products/kreislauf-60-kapseln",
    "metabol-control": "https://joachim-kaeser.de/products/metabol-control-1",
    "atem-kraft": "https://joachim-kaeser.de/products/atem-kraft-60-kapseln",
    "knochen-direct": "https://joachim-kaeser.de/products/knochen-direct",
    "glutathion-plus": "https://joachim-kaeser.de/products/glutathion",
    "visio-pro": "https://joachim-kaeser.de/products/visio-pro-60-kapseln",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
}

ANWENDUNG_KEYWORDS = {"anwendung", "anwendungshinweise", "verzehrempfehlung", "dosierung", "einnahme"}


def extract_anwendung(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    # Strategy 1: HTML5 <details>/<summary> accordion (main pattern on the site)
    for details in soup.find_all("details"):
        summary = details.find("summary")
        if not summary:
            continue
        title = summary.get_text(strip=True).lower()
        if any(kw in title for kw in ANWENDUNG_KEYWORDS):
            parts = []
            for child in details.children:
                if child.name != "summary" and hasattr(child, "get_text"):
                    t = child.get_text(" ", strip=True)
                    if t:
                        parts.append(t)
            if parts:
                return " ".join(parts)

    # Strategy 2: Regular h2/h3 headings with following paragraphs
    for heading in soup.find_all(["h2", "h3"]):
        text = heading.get_text(strip=True).lower()
        if any(kw in text for kw in ANWENDUNG_KEYWORDS):
            parts = []
            for sibling in heading.find_next_siblings():
                if sibling.name in ("h2", "h3"):
                    break
                t = sibling.get_text(" ", strip=True)
                if t:
                    parts.append(t)
            if parts:
                return " ".join(parts)

    return ""


def main():
    results = {}
    failed = []

    for product_id, url in PRODUCTS.items():
        print(f"Scraping {product_id}...", end=" ", flush=True)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            instruction = extract_anwendung(resp.text)
            if instruction:
                results[product_id] = instruction
                print(f"OK: {instruction[:100]}...")
            else:
                failed.append(product_id)
                print("WARN: No instruction found")
        except Exception as e:
            failed.append(product_id)
            print(f"ERROR: {e}")
        time.sleep(1)

    print(f"\n=== Results: {len(results)}/{len(PRODUCTS)} scraped ===")
    if failed:
        print(f"Failed: {failed}")

    with open("/app/backend/scraped_instructions.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("Saved to /app/backend/scraped_instructions.json")


if __name__ == "__main__":
    main()
