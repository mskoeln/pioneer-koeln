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

## Neue Spieler und Decks

Die Tabs **Spieler** und **Decks** führen eine von Hand gepflegte Namensliste in
Spalte A. Daneben trägt jede Zeile 30 bzw. 42 Formeln, die aus „Tuniere"
rechnen. Fehlt ein Name dort, gibt es für ihn keine Zeile — er wird in diesen
Tabs nicht gezählt, während die veröffentlichte Seite ihn korrekt anzeigt, weil
sie direkt aus „Tuniere" rechnet.

Die Datenprüfung in „Tuniere" (Spalte C und D) fängt das bei manueller Eingabe
mit einer Fehlermeldung ab. **Ein Skript umgeht diese Prüfung** — der Wert
landet stillschweigend in der Zelle. Darauf darf sich das Formular also nicht
verlassen.

Deshalb pflegt es die Listen selbst: Wird ein bestätigt neuer Name gespeichert,
hängt das Skript ihn in `Spieler!A` bzw. `Decks!A` an und kopiert die Formelzeile
der letzten Datenzeile mit (`copyTo` passt relative Bezüge an, genau wie eine
Kopie per Hand). Anschließend meldet das Formular, was es angelegt hat.

Zwei Eigenheiten der Mappe sind dabei berücksichtigt:

- Der Tab **Decks** hat ab Zeile 141 Hilfszellen unterhalb der Namensliste
  (`I143` = Gesamtspiele). Die Liste endet daher an der ersten Lücke, nicht bei
  `getLastRow()`.
- Kopiert wird aus der **letzten** Datenzeile. In `Spieler!AF66` steht eine
  einzelne verirrte Formel, die es in keiner anderen Zeile gibt; aus Zeile 67
  wird sie nicht mitgeschleppt.

Die Quellbereiche der Datenprüfung reichen bis `Spieler!A205` und
`Decks!A2997` — dort ist auf lange Sicht Platz.

## Seite sofort neu bauen (optional)

Ohne Einrichtung erscheint ein gespeichertes Turnier erst nach dem nächtlichen
Lauf auf der Webseite. Mit einem GitHub-Token stößt das Skript den Neubau
direkt an — dann ist die Seite nach etwa einer Minute aktuell.

**1 · Token erzeugen.** GitHub → *Settings* → *Developer settings* →
*Personal access tokens* → **Fine-grained tokens** → *Generate new token*

- *Repository access:* **Only select repositories** → `pioneer-koeln`
- *Permissions* → *Repository permissions* → **Actions: Read and write**
- Laufzeit nach Geschmack; nach Ablauf greift wieder der nächtliche Lauf

**2 · Token im Skript hinterlegen.** Apps Script → Zahnrad
*Projekteinstellungen* → *Skripteigenschaften* → **Eigenschaft hinzufügen**

| Eigenschaft | Wert |
|---|---|
| `GITHUB_TOKEN` | der erzeugte Token |

Der Token liegt damit auf Googles Servern und wird nie an den Browser
ausgeliefert. Ins Repository gehört er nicht.

**3 · Berechtigung nachholen.** Apps Script vergibt Berechtigungen anhand des
Codes, der beim Zustimmen vorlag. Wurde das Projekt vor dem Einbau von
`UrlFetchApp` freigegeben, fehlt die Berechtigung für externe Verbindungen, und
der Anstoß scheitert mit:

> Sie haben nicht die erforderliche Berechtigung, UrlFetchApp.fetch anzurufen.
> Erforderliche Berechtigungen: `…/auth/script.external_request`

Nachholen: im Editor oben die Funktion **`neubauTesten`** auswählen und
**Ausführen**. Google fragt dann die fehlende Berechtigung ab — bestätigen. Die
Funktion schreibt anschließend ins Ausführungsprotokoll, ob Token und
Repository stimmen, und stößt bei Erfolg einen echten Neubau an.

Der Grund, warum es dafür eine eigene Funktion braucht: `triggerWorkflow_()`
fängt jeden Fehler ab, damit ein gescheiterter Anstoß niemals das Speichern
verhindert. Ein **gefangener** Berechtigungsfehler unterdrückt aber die
Nachfrage von Google. `neubauTesten` ruft `UrlFetchApp` deshalb einmal
ungeschützt auf, damit die Ausnahme durchschlägt und der Dialog erscheint.

Ein erneutes Bereitstellen ist dafür nicht nötig; die Freigabe hängt am Konto,
nicht an der Bereitstellung.

Danach meldet das Formular nach dem Speichern „Die öffentliche Seite wird jetzt
neu gebaut". Schlägt der Anstoß fehl, etwa bei abgelaufenem Token, erscheint ein
Hinweis und der nächtliche Lauf zieht es nach.

**Wenn die Abfrage ausbleibt:** die Berechtigungen lassen sich auch fest
deklarieren. In den *Projekteinstellungen* **„appsscript.json-Manifestdatei im
Editor anzeigen"** einschalten und den Inhalt von
[`appsscript.json`](appsscript.json) übernehmen. Beim nächsten Ausführen fragt
Google dann nach allen dort genannten Berechtigungen.

**Den nächtlichen Lauf würde ich behalten.** Er kostet nichts und ist das Netz
für den Fall, dass ein Anstoß scheitert oder jemand die Tabelle direkt bearbeitet.

## Falle: offene Bereiche im XLSX-Export

Die Formeln der Tabs *Spieler* und *Decks* verwenden **offene Spaltenbereiche**,
etwa `COUNTIF(Tuniere!C$2:C; A2)`. Es gibt also keine Zeilengrenze; neue
Turniere werden beliebig weit unten mitgezählt.

Im XLSX-Export erscheinen dieselben Formeln als `COUNTIF(Tuniere!C$2:C1001; A2)`,
weil offene Bereiche in diesem Format nicht darstellbar sind und auf die
Blattgröße zum Exportzeitpunkt festgeschrieben werden. Wer den Export
analysiert, schließt daraus fälschlich auf eine Grenze bei Zeile 1001.

Maßgeblich ist immer die Formel in der Tabelle selbst, nicht die im Export.

## Dateien

| Datei | Zweck |
|---|---|
| `Code.gs` | Serverteil: liest und schreibt die Mappe, prüft alle Eingaben nochmals |
| `Index.html` | Das Formular. Läuft im Apps Script und in der Vorschau |
| `build_preview.py` | Erzeugt `preview.html` aus `Index.html` plus echten Daten |
| `preview.html` | Erzeugt. Zum Ausprobieren ohne Google |
