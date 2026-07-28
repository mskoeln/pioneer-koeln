#!/usr/bin/env python3
"""Baut index.html aus der veroeffentlichten Google-Tabelle.

Laedt die Mappe als XLSX, liest den Tab "Tuniere" und spritzt die
Ergebniszeilen als JSON in template.html. Nur Standardbibliothek, damit der
GitHub-Action ohne pip install laeuft.

Aufruf:  python build.py [--offline datei.xlsx]
"""

import argparse
import io
import json
import re
import sys
import urllib.request
import zipfile
from datetime import date, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

SHEET_ID = "1Mg7qzBTjSIPBjc_WcJjlr3nrYEwo4gtwE6YAzR7cl_M"
EXPORT_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=xlsx"
TAB = "Tuniere"

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
EPOCH = date(1899, 12, 30)          # Serienzahl-Nullpunkt von Excel/Sheets
HERE = Path(__file__).resolve().parent
PLACEHOLDER = "/*__DATA__*/"

# Erwartete Kopfzeile. Weicht sie ab, hat sich die Mappe geaendert und der
# Build bricht ab, statt eine still verfaelschte Seite zu veroeffentlichen.
EXPECTED_HEADER = ["Datum", "Platz", "Spieler", "Deck", "S", "N", "U", "Spiele"]


def fail(msg):
    print(f"FEHLER: {msg}", file=sys.stderr)
    sys.exit(1)


def download(url):
    req = urllib.request.Request(url, headers={"User-Agent": "pioneer-koeln-build/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def shared_strings(z):
    try:
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(t.text or "" for t in si.iter(f"{NS}t"))
            for si in root.findall(f"{NS}si")]


def sheet_member(z, name):
    wb = z.read("xl/workbook.xml").decode("utf-8")
    pairs = re.findall(r'<sheet[^>]*name="([^"]*)"[^>]*r:id="(rId\d+)"', wb)
    rels = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="([^"]*)"',
                           z.read("xl/_rels/workbook.xml.rels").decode("utf-8")))
    for n, rid in pairs:
        if n == name:
            return "xl/" + rels[rid].lstrip("/")
    fail(f'Tab "{name}" nicht gefunden. Vorhanden: {", ".join(n for n, _ in pairs)}')


def col_index(ref):
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_rows(data, tab):
    z = zipfile.ZipFile(io.BytesIO(data))
    strings = shared_strings(z)
    rows = []
    with z.open(sheet_member(z, tab)) as fh:
        for _, el in ET.iterparse(fh, events=("end",)):
            if el.tag != f"{NS}row":
                continue
            cells = {}
            for c in el.findall(f"{NS}c"):
                idx = col_index(c.get("r"))
                v = c.find(f"{NS}v")
                if c.get("t") == "s" and v is not None:
                    val = strings[int(v.text)]
                elif c.get("t") == "inlineStr":
                    is_el = c.find(f"{NS}is")
                    val = "".join(x.text or "" for x in is_el.iter(f"{NS}t")) if is_el is not None else ""
                else:
                    val = v.text if v is not None else ""
                cells[idx] = (val or "").strip()
            width = max(cells) + 1 if cells else 0
            rows.append([cells.get(i, "") for i in range(width)])
            el.clear()
    return rows


def to_int(x):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def records(rows):
    if not rows:
        fail("Tab ist leer.")
    header = [c for c in rows[0][:8]]
    if header != EXPECTED_HEADER:
        fail(f"Kopfzeile hat sich geaendert.\n  erwartet: {EXPECTED_HEADER}\n  gelesen:  {header}")

    out, skipped = [], 0
    for i, r in enumerate(rows[1:], start=2):
        if len(r) < 8 or not r[0]:
            continue
        serial = to_int(r[0])
        place = to_int(r[1])
        w, l, t, g = (to_int(r[4]), to_int(r[5]), to_int(r[6]), to_int(r[7]))
        if None in (serial, place, w, l, t, g) or not r[2] or not r[3]:
            skipped += 1
            continue
        if w + l + t != g:
            fail(f"Zeile {i}: S+N+U ({w}+{l}+{t}) ergibt nicht Spiele ({g}).")
        out.append({
            "d": (EPOCH + timedelta(days=serial)).isoformat(),
            "p": place, "s": r[2], "k": r[3],
            "w": w, "l": l, "t": t, "g": g,
        })
    if skipped:
        print(f"  {skipped} unvollstaendige Zeile(n) uebersprungen.")
    if len(out) < 50:
        fail(f"Nur {len(out)} Ergebniszeilen gelesen — das sieht nach einem Fehler aus.")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", help="lokale XLSX-Datei statt Download")
    args = ap.parse_args()

    if args.offline:
        print(f"Lese {args.offline}")
        blob = Path(args.offline).read_bytes()
    else:
        print(f"Lade Mappe {SHEET_ID}")
        blob = download(EXPORT_URL)
    print(f"  {len(blob):,} Bytes")

    recs = records(read_rows(blob, TAB))
    dates = sorted({r["d"] for r in recs})
    games = sum(r["g"] for r in recs)
    print(f"  {len(recs)} Ergebnisse · {len(dates)} Turniere · {games} Spiele")
    print(f"  Zeitraum {dates[0]} bis {dates[-1]}")
    print(f"  {len({r['s'] for r in recs})} Spieler · {len({r['k'] for r in recs})} Decks")

    tpl_path = HERE / "template.html"
    if not tpl_path.exists():
        fail("template.html fehlt.")
    tpl = tpl_path.read_text(encoding="utf-8")
    if PLACEHOLDER not in tpl:
        fail(f"Platzhalter {PLACEHOLDER} fehlt in template.html.")

    payload = json.dumps(recs, ensure_ascii=False, separators=(",", ":"))
    if "</script" in payload:
        fail("Daten enthalten ein script-Tag.")

    out = HERE / "index.html"
    out.write_text(tpl.replace(PLACEHOLDER, payload), encoding="utf-8")
    print(f"Geschrieben: {out.name} ({out.stat().st_size:,} Bytes)")


if __name__ == "__main__":
    main()
