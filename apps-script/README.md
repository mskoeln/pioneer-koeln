# Turniereingabe (Google Apps Script)

Ein Formular, mit dem Turniere direkt erfasst und korrigiert werden, ohne die
Tabelle zu öffnen. Läuft bei Google, schreibt in den Tab **Tuniere** der
Statistikmappe. Die veröffentlichte Seite baut sich wie gehabt daraus.

```
Formular (script.google.com)  ──schreibt──►  Tab "Tuniere"
                                                  │
                                       build.py + nächtlicher Workflow
                                                  ▼
                                    mskoeln.github.io/pioneer-koeln
```

## Erst ausprobieren

`preview.html` ist das komplette Formular mit echten Daten, aber **ohne
Google-Anbindung**. Speichern und Löschen wirken nur in der geöffneten
Sitzung — die Tabelle wird nicht angefasst. Einfach im Browser öffnen.

Neu bauen, wenn sich die Daten geändert haben:

```bash
python apps-script/build_preview.py
```

## Veröffentlichen

1. [script.google.com](https://script.google.com) öffnen, angemeldet als **mskoeln** → **Neues Projekt**
2. Projekt umbenennen in `Pioneer Turniereingabe`
3. Inhalt von `Code.gs` in die vorhandene Datei `Code.gs` kopieren
4. Links **+** neben *Dateien* → **HTML** → Name `Index` → Inhalt von `Index.html` einfügen
   (der Name muss exakt `Index` lauten, ohne Endung)
5. **Bereitstellen** → **Neue Bereitstellung** → Typ **Web-App**
   - *Ausführen als:* **Ich**
   - *Zugriff:* **Nur ich**
6. Beim ersten Mal fragt Google nach Berechtigungen für Tabellen — bestätigen
7. Die entstandene Adresse aufrufen. Sie endet auf `/exec`

Die Adresse ist lang und hässlich — als Lesezeichen speichern.

## Zugriff später erweitern

Sollen weitere Personen erfassen dürfen, in `Code.gs` eintragen:

```js
var ALLOWED_USERS = ['jemand@gmail.com', 'wer.anders@gmail.com'];
```

und die Bereitstellung auf *Zugriff: Jeder mit Google-Konto* umstellen. Die
Liste im Skript entscheidet dann, wer wirklich hineindarf. Ohne Eintrag in der
Liste bleibt die Tür zu.

## Was das Formular prüft

**Blockierend** — gespeichert wird erst, wenn alles stimmt:

- Datum gesetzt, mindestens zwei Teilnehmer
- kein Spieler doppelt im selben Turnier
- Spieler und Deck ausgefüllt
- pro Zeile mindestens eine Partie
- neue Spieler- oder Decknamen ausdrücklich als neu bestätigt

**Nur als Hinweis** — wird gespeichert:

- unterschiedliche Rundenzahl innerhalb eines Turniers (kommt vor: Ausstieg,
  Freilos — in den bisherigen Daten bei 14 von 124 Turnieren)
- Auflistung der neu angelegten Namen

Die Platzierung ergibt sich aus der Reihenfolge der Zeilen. *Nach Ergebnis
sortieren* ordnet nach Punkten, danach lässt sich per Ziehen an der Platznummer
korrigieren — Feinheiten wie Buchholz kann das Formular nicht kennen.

## Zeilengrenze

Die Formeln der Tabs **Spieler** und **Decks** greifen auf `Tuniere!X$2:X1001`
zu. Jenseits von Zeile 1001 zählen sie neue Turniere nicht mehr mit. Das
Formular warnt, sobald es eng wird.

Betroffen ist nur die Tabelle selbst — die veröffentlichte Seite rechnet über
`build.py` direkt aus den Rohdaten und ist unabhängig davon.

Dauerhaft lösen: in beiden Tabs `1001` durch eine großzügigere Zeile ersetzen,
etwa `5001`. In der Tabelle über *Bearbeiten → Suchen und ersetzen*, mit
aktiviertem *Auch in Formeln suchen*.

## Dateien

| Datei | Zweck |
|---|---|
| `Code.gs` | Serverteil: liest und schreibt die Mappe, prüft alle Eingaben nochmals |
| `Index.html` | Das Formular. Läuft im Apps Script und in der Vorschau |
| `build_preview.py` | Erzeugt `preview.html` aus `Index.html` plus echten Daten |
| `preview.html` | Erzeugt. Zum Ausprobieren ohne Google |
