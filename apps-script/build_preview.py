#!/usr/bin/env python3
"""Baut preview.html: das Eingabeformular mit echten Daten, aber ohne Google.

Die Vorschau laeuft vollstaendig im Browser gegen eine Kopie der Daten im
Arbeitsspeicher. Speichern und Loeschen wirken nur in der Sitzung — die
Google-Tabelle wird nicht angefasst. Gedacht zum Ausprobieren der Bedienung,
bevor das Skript bei Google veroeffentlicht wird.
"""

import collections
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
MARKER = "<!--__MOCK__-->"

spec = importlib.util.spec_from_file_location("b", ROOT / "build.py")
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


def main():
    offline = sys.argv[1] if len(sys.argv) > 1 else None
    if offline:
        print(f"Lese {offline}")
        blob = Path(offline).read_bytes()
    else:
        print("Lade Mappe")
        blob = b.download(b.EXPORT_URL)

    recs = b.records(b.read_rows(blob, b.TAB))

    by_date = collections.defaultdict(list)
    for r in recs:
        by_date[r["d"]].append(r)
    mock = {"byDate": {}}
    for d, rows in by_date.items():
        rows.sort(key=lambda x: x["p"])
        mock["byDate"][d] = [
            {"player": r["s"], "deck": r["k"], "w": r["w"], "l": r["l"], "t": r["t"]}
            for r in rows
        ]
    print(f"  {len(recs)} Zeilen · {len(mock['byDate'])} Turniere")

    tpl = (HERE / "Index.html").read_text(encoding="utf-8").replace("\r\n", "\n")
    if MARKER not in tpl:
        print(f"FEHLER: Platzhalter {MARKER} fehlt in Index.html", file=sys.stderr)
        sys.exit(1)

    payload = json.dumps(mock, ensure_ascii=False, separators=(",", ":"))
    if "</script" in payload:
        print("FEHLER: Daten enthalten ein script-Tag", file=sys.stderr)
        sys.exit(1)

    banner = (
        '<div style="background:#eda100;color:#0b0b0b;font:600 13px/1.4 system-ui,sans-serif;'
        'padding:9px 20px;text-align:center">'
        'Vorschau mit echten Daten &mdash; Speichern und L&ouml;schen wirken nur in dieser '
        'Sitzung. Die Google-Tabelle wird nicht ge&auml;ndert.</div>'
    )
    inject = banner + "\n<script>window.__MOCK__ = " + payload + ";</script>"

    out = HERE / "preview.html"
    out.write_text(tpl.replace(MARKER, inject), encoding="utf-8", newline="\n")
    print(f"Geschrieben: {out.name} ({out.stat().st_size:,} Bytes)")


if __name__ == "__main__":
    main()
