/**
 * Turniereingabe für die Pioneer-Statistik Köln.
 *
 * Serverseitiger Teil. Läuft unter dem Google-Konto des Eigentümers und
 * schreibt in den Tab "Tuniere" der Statistikmappe. Der Browser bekommt nie
 * Zugriff auf die Mappe — er ruft nur die Funktionen hier auf.
 */

var SHEET_ID = '1Mg7qzBTjSIPBjc_WcJjlr3nrYEwo4gtwE6YAzR7cl_M';
var TAB = 'Tuniere';
var COLS = 8;                 // A..H: Datum, Platz, Spieler, Deck, S, N, U, Spiele
var DATE_FORMAT = 'dd.MM.yyyy';

/*
 * Hinweis fuer spaetere Analysen: die Formeln der Tabs "Spieler" und "Decks"
 * verwenden offene Spaltenbereiche (Tuniere!C$2:C). Es gibt also KEINE
 * Zeilengrenze. Im XLSX-Export erscheinen sie faelschlich als C$2:C1001, weil
 * offene Bereiche in diesem Format nicht darstellbar sind und auf die
 * damalige Blattgroesse festgeschrieben werden. Nicht darauf hereinfallen.
 */

/** Leer lassen = nur der Eigentümer. Sonst Google-Adressen eintragen. */
var ALLOWED_USERS = [];

var MAX_ROWS_PER_TOURNAMENT = 64;


/* ------------------------------------------------------------------ */
/* Einstieg                                                            */
/* ------------------------------------------------------------------ */

function doGet() {
  assertAllowed_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Turniereingabe · Pioneer Köln')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function assertAllowed_() {
  if (!ALLOWED_USERS.length) return;          // Zugriff regelt die Freigabe
  var me = Session.getEffectiveUser().getEmail();
  if (ALLOWED_USERS.indexOf(me) === -1) {
    throw new Error('Kein Zugriff für ' + me + '.');
  }
}


/* ------------------------------------------------------------------ */
/* Lesen                                                               */
/* ------------------------------------------------------------------ */

function sheet_() {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB);
  if (!sh) throw new Error('Tab "' + TAB + '" nicht gefunden.');
  return sh;
}

function tz_() {
  return SpreadsheetApp.openById(SHEET_ID).getSpreadsheetTimeZone();
}

function iso_(d) {
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}

/** Alle Ergebniszeilen mit ihrer echten Zeilennummer in der Mappe. */
function readRows_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, COLS).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    if (!(r[0] instanceof Date)) continue;
    if (!String(r[2]).trim() || !String(r[3]).trim()) continue;
    out.push({
      row: i + 2,
      date: iso_(r[0]),
      place: Number(r[1]) || 0,
      player: String(r[2]).trim(),
      deck: String(r[3]).trim(),
      w: Number(r[4]) || 0,
      l: Number(r[5]) || 0,
      t: Number(r[6]) || 0,
      g: Number(r[7]) || 0
    });
  }
  return out;
}

/** Namen nach Häufigkeit sortiert — Gebräuchliches steht oben in der Auswahl. */
function byFrequency_(rows, key) {
  var count = {};
  rows.forEach(function (r) { count[r[key]] = (count[r[key]] || 0) + 1; });
  return Object.keys(count)
    .sort(function (a, b) {
      return count[b] - count[a] || a.localeCompare(b, 'de');
    })
    .map(function (name) { return { name: name, n: count[name] }; });
}

/** Alles, was die Oberfläche beim Start braucht. */
function getBootstrap() {
  assertAllowed_();
  var rows = readRows_();
  var byDate = {};
  rows.forEach(function (r) {
    (byDate[r.date] = byDate[r.date] || []).push(r);
  });
  var dates = Object.keys(byDate).sort().reverse();

  return {
    user: Session.getEffectiveUser().getEmail(),
    players: byFrequency_(rows, 'player'),
    decks: byFrequency_(rows, 'deck'),
    tournaments: dates.map(function (d) {
      var t = byDate[d];
      return {
        date: d,
        count: t.length,
        winner: (t.filter(function (x) { return x.place === 1; })[0] || {}).player || ''
      };
    })
  };
}

/** Ein einzelnes Turnier zum Bearbeiten. */
function getTournament(date) {
  assertAllowed_();
  var rows = readRows_().filter(function (r) { return r.date === date; });
  rows.sort(function (a, b) { return a.place - b.place; });
  return rows.map(function (r) {
    return { player: r.player, deck: r.deck, w: r.w, l: r.l, t: r.t };
  });
}


/* ------------------------------------------------------------------ */
/* Prüfen                                                              */
/* ------------------------------------------------------------------ */

function validate_(date, entries) {
  var errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push('Ungültiges Datum.');
  if (!entries || !entries.length) errors.push('Keine Teilnehmer erfasst.');
  if (entries && entries.length > MAX_ROWS_PER_TOURNAMENT) {
    errors.push('Mehr als ' + MAX_ROWS_PER_TOURNAMENT + ' Teilnehmer.');
  }

  var seen = {};
  (entries || []).forEach(function (e, i) {
    var pos = 'Platz ' + (i + 1) + ': ';
    var player = String(e.player || '').trim();
    var deck = String(e.deck || '').trim();
    if (!player) errors.push(pos + 'kein Spieler.');
    if (!deck) errors.push(pos + 'kein Deck.');
    if (player) {
      var key = player.toLowerCase();
      if (seen[key]) errors.push(pos + '"' + player + '" ist doppelt.');
      seen[key] = true;
    }
    ['w', 'l', 't'].forEach(function (k) {
      var v = e[k];
      if (typeof v !== 'number' || !isFinite(v) || v < 0 || v !== Math.floor(v)) {
        errors.push(pos + 'S/N/U müssen ganze Zahlen ab 0 sein.');
      }
    });
    if ((e.w + e.l + e.t) <= 0) errors.push(pos + 'keine Partien eingetragen.');
  });
  return errors;
}


/* ------------------------------------------------------------------ */
/* Namenslisten in den Tabs "Spieler" und "Decks" mitpflegen            */
/* ------------------------------------------------------------------ */
/*
 * Beide Tabs fuehren eine von Hand gepflegte Namensliste in Spalte A; jede
 * Zeile traegt daneben ~30 bzw. ~42 Formeln, die aus "Tuniere" rechnen. Fehlt
 * ein Name dort, existiert fuer ihn keine Zeile und er wird in diesen Tabs
 * nicht gezaehlt — waehrend die veroeffentlichte Seite ihn korrekt zeigt, weil
 * sie direkt aus "Tuniere" rechnet. Genau dieses stille Auseinanderlaufen
 * verhindern die folgenden Funktionen.
 *
 * Die Datenpruefung in "Tuniere" (Spalte C/D, Quelle Spieler!A2:A205 bzw.
 * Decks!A2:A2997) greift nur bei manueller Eingabe. Ein Skript umgeht sie —
 * darum darf sich das Formular nicht darauf verlassen.
 */

var NAME_TABS = { player: 'Spieler', deck: 'Decks' };

/** Letzte Zeile der Namensliste. Endet an der ersten Luecke, damit
 *  Hilfszellen weiter unten (Decks ab Zeile 141) nicht mitgezaehlt werden. */
function lastNameRow_(sh) {
  var colA = sh.getRange(1, 1, sh.getMaxRows(), 1).getValues();
  var last = 1;
  for (var i = 1; i < colA.length; i++) {
    if (String(colA[i][0]).trim() === '') break;
    last = i + 1;
  }
  return last;
}

function listNames_(sh) {
  var last = lastNameRow_(sh);
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (v) { return v !== ''; });
}

/**
 * Haengt einen Namen an, falls er fehlt, und uebernimmt die Formelzeile der
 * letzten Datenzeile. Rueckgabe: true, wenn angelegt wurde.
 */
function ensureName_(sh, name) {
  var wanted = String(name).trim();
  if (!wanted) return false;
  var existing = listNames_(sh);
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].toLowerCase() === wanted.toLowerCase()) return false;
  }

  var from = lastNameRow_(sh);
  var to = from + 1;
  if (to > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);

  var width = sh.getLastColumn();
  if (width > 1) {
    // Formeln uebernehmen; copyTo passt relative Bezuege wie eine Kopie per Hand an
    sh.getRange(from, 2, 1, width - 1).copyTo(sh.getRange(to, 2, 1, width - 1));
  }
  sh.getRange(to, 1).setValue(wanted);
  return true;
}

/** Pflegt alle in einem Turnier verwendeten Namen ein. */
function ensureNames_(ss, entries) {
  var created = { players: [], decks: [] };
  var pSheet = ss.getSheetByName(NAME_TABS.player);
  var dSheet = ss.getSheetByName(NAME_TABS.deck);
  if (!pSheet || !dSheet) {
    throw new Error('Tab "' + NAME_TABS.player + '" oder "' + NAME_TABS.deck + '" fehlt.');
  }

  var seenP = {}, seenD = {};
  entries.forEach(function (e) {
    var p = String(e.player).trim(), d = String(e.deck).trim();
    if (p && !seenP[p.toLowerCase()]) {
      seenP[p.toLowerCase()] = true;
      if (ensureName_(pSheet, p)) created.players.push(p);
    }
    if (d && !seenD[d.toLowerCase()]) {
      seenD[d.toLowerCase()] = true;
      if (ensureName_(dSheet, d)) created.decks.push(d);
    }
  });
  return created;
}


/* ------------------------------------------------------------------ */
/* Schreiben                                                           */
/* ------------------------------------------------------------------ */

function removeDate_(sh, date) {
  var rows = readRows_().filter(function (r) { return r.date === date; });
  // von unten nach oben löschen, damit die Zeilennummern gültig bleiben
  rows.map(function (r) { return r.row; })
      .sort(function (a, b) { return b - a; })
      .forEach(function (n) { sh.deleteRow(n); });
  return rows.length;
}

/** Erste Zeile, deren Datum nach dem Zieldatum liegt — dort wird eingefügt. */
function insertionRow_(date) {
  var rows = readRows_();
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].date > date) return rows[i].row;
  }
  return (rows.length ? rows[rows.length - 1].row : 1) + 1;
}

/**
 * Speichert ein Turnier. Ein bereits vorhandenes Turnier desselben Datums
 * wird ersetzt. originalDate erlaubt das Verschieben auf ein anderes Datum.
 */
function saveTournament(payload) {
  assertAllowed_();
  var date = String(payload.date || '');
  var entries = payload.entries || [];
  var errors = validate_(date, entries);
  if (errors.length) return { ok: false, errors: errors };

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, errors: ['Die Mappe ist gerade belegt. Bitte erneut versuchen.'] };
  }
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(TAB);
    if (!sh) throw new Error('Tab "' + TAB + '" nicht gefunden.');

    // Erst die Namenslisten, dann die Ergebniszeilen: so passen die Werte in
    // Spalte C/D anschliessend zur Datenpruefung der Mappe.
    var created = ensureNames_(ss, entries);

    var replaced = 0;
    if (payload.originalDate && payload.originalDate !== date) {
      replaced += removeDate_(sh, payload.originalDate);
    }
    replaced += removeDate_(sh, date);

    var at = insertionRow_(date);
    /* insertRowsBefore verlangt eine existierende Zeile. Liegt die
       Einfügestelle hinter dem Blattende, wird zuerst angehängt. */
    if (at > sh.getMaxRows()) {
      sh.insertRowsAfter(sh.getMaxRows(), at - sh.getMaxRows() + entries.length);
    } else {
      sh.insertRowsBefore(at, entries.length);
    }

    var values = entries.map(function (e, i) {
      var p = date.split('-');
      return [
        new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])),
        i + 1,
        String(e.player).trim(),
        String(e.deck).trim(),
        e.w, e.l, e.t,
        e.w + e.l + e.t
      ];
    });
    sh.getRange(at, 1, values.length, COLS).setValues(values);
    sh.getRange(at, 1, values.length, 1).setNumberFormat(DATE_FORMAT);

    return {
      ok: true,
      written: values.length,
      replaced: replaced,
      created: created
    };
  } finally {
    lock.releaseLock();
  }
}

function deleteTournament(date) {
  assertAllowed_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, errors: ['Die Mappe ist gerade belegt. Bitte erneut versuchen.'] };
  }
  try {
    var removed = removeDate_(sheet_(), String(date));
    return { ok: true, removed: removed };
  } finally {
    lock.releaseLock();
  }
}
