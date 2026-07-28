# Pioneer Statistik Köln

Turnierstatistik der Pioneer-Turniere in Köln als statische Webseite.

**Seite:** https://mskoeln.github.io/pioneer-koeln/

## Wie es funktioniert

Gepflegt wird ausschließlich die Google-Tabelle, Tab **Tuniere**. Alles andere
wird daraus berechnet.

```
Google-Tabelle (Tab "Tuniere")
        │  build.py lädt die Mappe als XLSX
        ▼
    index.html          ← Daten als JSON eingebettet, Kennzahlen im Browser gerechnet
        │
        ▼
   GitHub Pages
```

`index.html` ist eine einzelne Datei ohne externe Abhängigkeiten — keine
Bibliotheken, keine Schriftarten, kein CDN. Sie funktioniert auch offline per
Doppelklick.

## Aktualisieren

Nichts zu tun. Der Workflow [`update.yml`](.github/workflows/update.yml) läuft
täglich um 03:17 UTC, baut die Seite neu und committet sie, falls sich etwas
geändert hat.

Sofort aktualisieren: Reiter **Actions** → *Statistik aktualisieren* → **Run
workflow**.

Lokal bauen:

```bash
python build.py
```

Ohne Netz, gegen eine heruntergeladene Mappe:

```bash
python build.py --offline pioneer.xlsx
```

## Voraussetzung

Die Google-Tabelle muss per Link lesbar bleiben („Jeder, der über den Link
verfügt: Betrachter"). Wird die Freigabe entzogen, schlägt der Workflow fehl —
die zuletzt gebaute Seite bleibt dann online.

## Sicherungen im Build

`build.py` bricht ab, statt eine stillschweigend falsche Seite zu erzeugen, wenn

- die Kopfzeile des Tabs „Tuniere" von `Datum, Platz, Spieler, Deck, S, N, U, Spiele` abweicht,
- in einer Zeile `S + N + U` nicht `Spiele` ergibt,
- weniger als 50 Ergebniszeilen gelesen werden.

## Kennzahlen

| Größe | Formel |
|---|---|
| Anteil der Meta | Spiele des Decks ÷ alle Spiele im Zeitraum |
| Siegquote Deck | Siege ÷ Spiele (Unentschieden zählen wie Niederlagen) |
| Winrate Spieler | (Siege + ½ · Unentschieden) ÷ Spiele |
| Punkte | 3 · Siege + 1 · Unentschieden |
| Punkte pro Spiel | Punkte ÷ Spiele |

Zeitfenster wie „90 Tage" zählen ab dem letzten erfassten Turniertag, nicht ab
heute.

## Dateien

| Datei | Zweck |
|---|---|
| `template.html` | Layout, Stile und die gesamte Auswertungslogik. Hier wird das Aussehen geändert. |
| `build.py` | Holt die Daten und spritzt sie in den Platzhalter `/*__DATA__*/`. |
| `index.html` | Erzeugt. Nicht von Hand bearbeiten — der nächste Build überschreibt es. |
