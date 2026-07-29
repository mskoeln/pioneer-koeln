# Farbkombinationen und Deckbenennung

Grundlage der Farbpunkte vor den Decknamen im Reiter **Alle Decks**. Wer sich beim
Anlegen neuer Decks an diese Namen hält, bekommt die Punkte automatisch.

## Die fünf Farben

| Kürzel | Farbe | Englisch |
|---|---|---|
| `W` | Weiß | White |
| `U` | Blau | Blue — `B` war für Black belegt, daher der zweite Buchstabe |
| `B` | Schwarz | Black |
| `R` | Rot | Red |
| `G` | Grün | Green |

Die kanonische Reihenfolge ist immer **WUBRG**. So werden die Punkte auch gezeichnet,
unabhängig davon, wie der Deckname sie nennt.

## Alle 31 möglichen Kombinationen

Bei fünf Farben gibt es 2⁵ − 1 = **31** nicht-leere Kombinationen. Alle haben einen
etablierten Namen außer den Einzelfarben.

### Eine Farbe (5)

| Schreibweise im Deckname | Farben |
|---|---|
| `Mono W` · `Mono White` | W |
| `Mono U` · `Mono Blue` | U |
| `Mono B` · `Mono Black` | B |
| `Mono R` · `Mono Red` | R |
| `Mono G` · `Mono Green` | G |

### Zwei Farben — die Gilden von Ravnica (10)

| Name | Farben | |
|---|---|---|
| Azorius | W U | Weiß Blau |
| Dimir | U B | Blau Schwarz |
| Rakdos | B R | Schwarz Rot |
| Gruul | R G | Rot Grün |
| Selesnya | G W | Grün Weiß |
| Orzhov | W B | Weiß Schwarz |
| Izzet | U R | Blau Rot |
| Golgari | B G | Schwarz Grün |
| Boros | R W | Rot Weiß |
| Simic | G U | Grün Blau |

Die ersten fünf sind *verbündete* Paare (im Farbkreis benachbart), die letzten fünf
*verfeindete* Paare (gegenüberliegend).

### Drei Farben, verbündet — die Shards von Alara (5)

| Name | Farben | |
|---|---|---|
| Bant | G W U | Grün Weiß Blau |
| Esper | W U B | Weiß Blau Schwarz |
| Grixis | U B R | Blau Schwarz Rot |
| Jund | B R G | Schwarz Rot Grün |
| Naya | R G W | Rot Grün Weiß |

### Drei Farben, verfeindet — die Clans von Tarkir (5)

| Name | Farben | |
|---|---|---|
| Abzan | W B G | Weiß Schwarz Grün |
| Jeskai | U R W | Blau Rot Weiß |
| Sultai | B G U | Schwarz Grün Blau |
| Mardu | R W B | Rot Weiß Schwarz |
| Temur | G U R | Grün Blau Rot |

### Vier Farben — die Nephilim aus Guildpact (5)

Benannt wird meist über die *fehlende* Farbe.

| Name | Farben | fehlt |
|---|---|---|
| Yore-Tiller · `Yore` | W U B R | Grün |
| Glint-Eye · `Glint` | U B R G | Weiß |
| Dune-Brood · `Dune` | B R G W | Blau |
| Ink-Treader · `Ink` | R G W U | Schwarz |
| Witch-Maw · `Witch` | G W U B | Rot |

### Fünf Farben (1)

| Schreibweise | Farben |
|---|---|
| `5c` · `WUBRG` · `Domain` · `Five-Color` | W U B R G |

## Wie der Deckname gelesen wird

Der Reihe nach, der erste Treffer gewinnt:

1. **`Mono` + Buchstabe oder Farbwort** — `Mono B Devotion` → Schwarz,
   `Mono White Tokens` → Weiß
2. **Ein Kombinationsname als ganzes Wort** — `Orzhov Greasefang` → Weiß Schwarz.
   Die Prüfung erfolgt auf ganze Wörter, damit `Yorion Phoenix` nicht als *Yore*
   gelesen wird.
3. **Eine Farbe als Wort** — `Green Devotion` → Grün, `Atarka Red` → Rot
4. **Buchstabengruppe, durchgehend groß geschrieben** — `GW Toolbox` → Grün Weiß,
   `UR+ Creativity` → Blau Rot. Die Großschreibung ist Bedingung, sonst würde ein
   Wort wie „bug" als Sultai gelesen.
5. Sonst **keine Punkte**.

`4c` allein ergibt keine Punkte: die Anzahl ist bekannt, die Farben nicht. Wer das
auflösen will, benennt das Deck nach dem Nephilim, etwa `Witch Zur Overlords` statt
`4c Zur Overlords`.

## Schreibfehler

Zwei Namen in der Mappe sind falsch geschrieben und werden über eine Ausnahmeliste
abgefangen. Besser wäre, sie in der Tabelle zu korrigieren:

| in der Mappe | richtig |
|---|---|
| `Selesyna Company` | Selesnya |
| `Azurios Lotus Field` | Azorius |

## Decks ohne erkennbare Farbe

Namen ohne Farbangabe bekommen keine Punkte. Zwei Wege, das zu ändern:

**Umbenennen** in der Mappe, etwa `Hardened Scales` → `Mono G Hardened Scales`.
Wirkt sofort und dauerhaft, auch rückwirkend für alle alten Turniere.

**Ausnahme eintragen** in `template.html` unter `DECK_COLORS`, etwa:

```js
var DECK_COLORS = {
  "Hardened Scales": "G",
  "Amalia Combo": "WBG"
};
```

Das ist der Notausgang für Namen, die sich nicht ändern lassen sollen.

## Quellen

- [All Magic: The Gathering color combination names explained — Destructoid](https://www.destructoid.com/all-magic-the-gathering-color-combination-names-explained/)
- [Nephilim — MTG Wiki](https://mtg.wiki/page/Nephilim)
