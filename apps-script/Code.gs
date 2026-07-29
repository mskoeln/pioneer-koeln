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

/**
 * Die Formeln der Tabs "Spieler" und "Decks" greifen auf Tuniere!X$2:X1001 zu.
 * Jenseits davon zählen sie neue Zeilen nicht mehr mit. Die Oberfläche warnt,
 * sobald es eng wird.
 */
var FORMULA_LIMIT = 1001;

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

  var lastRow = rows.length ? rows[rows.length - 1].row : 1;
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
    }),
    capacity: {
      lastRow: lastRow,
      limit: FORMULA_LIMIT,
      free: Math.max(0, FORMULA_LIMIT - lastRow)
    }
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
    var sh = sheet_();
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

    var last = sh.getLastRow();
    return {
      ok: true,
      written: values.length,
      replaced: replaced,
      capacity: { lastRow: last, limit: FORMULA_LIMIT, free: Math.max(0, FORMULA_LIMIT - last) }
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
