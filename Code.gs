/**
 * Chetana's Tutoring: private data store on a Google Sheet. Version 3.
 *
 * FIRST-TIME SETUP
 * 1. New Google Sheet > Extensions > Apps Script. Paste this whole file. Save.
 * 2. setTeacherPin: put 6-8 digits in NEW_PIN, choose setTeacherPin in the toolbar, Run, approve.
 *    Then set NEW_PIN back to '' and save.
 * 3. setupTriggers: choose it in the toolbar and Run once (nightly backup + monthly clean-up).
 * 4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the URL into config.js.
 *
 * UPGRADING FROM VERSION 1 OR 2
 * Paste this file over the old one and save. Run migrateToTabs once, then setupTriggers once.
 * (From version 1 only: also run migratePins.) Then Deploy > Manage deployments > Edit > New version > Deploy.
 *
 * WHAT IT PROTECTS
 * - PINs are stored only as salted SHA-256 hashes. 5 wrong tries locks that login for 15 minutes.
 * - No public list of names. Parent numbers, fees, class logs and leads need the teacher PIN.
 * - At most 60 requests a minute in total. Website enquiries: at most 30 a day, with a spam trap.
 * - Every teacher change, enquiry and lockout is written to the "log" tab.
 * - Nightly copy of the Sheet into Drive folder "Tutoring backups" (last 30 kept).
 * - Monthly clean-up: deletes children marked Left for over 12 months (fee entries kept) and old
 *   enquiries that never joined, as promised on the website's Privacy page.
 */
const KINDS = ['students', 'enquiries', 'batches', 'classes', 'fees'];
const KEEP = ['progress', 'stars', 'sessions', 'teach'];
const SCHEMA = 1;
const MAX_TRIES = 5, LOCK_SECONDS = 15 * 60, MAX_JSON = 50000, LEADS_PER_DAY = 30, KEEP_BACKUPS = 30, RETAIN_DAYS = 365;

function setTeacherPin() {
  const NEW_PIN = '';           // 6 to 8 digits; Run once, then clear it again
  if (!/^\d{6,8}$/.test(NEW_PIN)) throw new Error('Use 6 to 8 digits');
  const p = PropertiesService.getScriptProperties();
  const salt = Utilities.getUuid();
  p.setProperty('T_SALT', salt);
  p.setProperty('T_HASH', hash(NEW_PIN, salt));
  pinSalt();
  log('setup', '', '', 'Teacher PIN changed');
  return 'Teacher PIN set';
}

/* ---------------- web entry points ---------------- */
function doPost(e) {
  if (!e || !e.postData || e.postData.contents.length > MAX_JSON) return out({ ok: false, error: 'Bad request' });
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    rateLimit();
    return out(handle(JSON.parse(e.postData.contents)));
  } catch (err) {
    return out({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}
function doGet() { return out({ ok: true, data: 'running', version: 3 }); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- security helpers ---------------- */
function hash(pin, salt) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + String(pin));
  return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}
function pinSalt() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('P_SALT');
  if (!s) { s = Utilities.getUuid(); p.setProperty('P_SALT', s); }
  return s;
}
function rateLimit() {
  const c = CacheService.getScriptCache(), k = 'rl_' + Math.floor(Date.now() / 60000);
  const n = Number(c.get(k) || 0) + 1;
  c.put(k, String(n), 120);
  if (n > 60) throw new Error('Too many tries. Wait a minute.');
}
function guard(key) {
  if (Number(CacheService.getScriptCache().get('lock_' + key) || 0) >= MAX_TRIES) throw new Error('Too many tries. Wait 15 minutes.');
}
function fail(key) {
  const c = CacheService.getScriptCache(), n = Number(c.get('lock_' + key) || 0) + 1;
  c.put('lock_' + key, String(n), LOCK_SECONDS);
  if (n === MAX_TRIES) log('lockout', '', key.replace(/^kid_/, 'child: '), MAX_TRIES + ' wrong PINs, locked 15 minutes');
  throw new Error('Wrong PIN');
}
function cleared(key) { CacheService.getScriptCache().remove('lock_' + key); }

/* ---------------- storage: one tab per kind ---------------- */
function book_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tab(kind) {
  let sh = book_().getSheetByName(kind);
  if (!sh) { sh = book_().insertSheet(kind); sh.appendRow(['id', 'json', 'updated']); sh.setFrozenRows(1); }
  return sh;
}
function read(kind) {
  const v = tab(kind).getDataRange().getValues();
  const outRows = [];
  for (let i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    let d; try { d = JSON.parse(v[i][1] || '{}'); } catch (e) { continue; }
    outRows.push({ row: i + 1, id: String(v[i][0]), data: upgrade(kind, d) });
  }
  return outRows;
}
function upgrade(kind, d) {          // schema migrations go here; v1 is the current shape
  if (!d.v) d.v = 1;
  return d;
}
function put(kind, id, data, rowsCache) {
  data.v = SCHEMA;
  const sh = tab(kind), rows = rowsCache || read(kind);
  const hit = rows.filter(function (r) { return r.id === String(id); })[0];
  const line = [String(id), JSON.stringify(data), new Date()];
  if (hit) sh.getRange(hit.row, 1, 1, 3).setValues([line]); else sh.appendRow(line);
}
function del(kind, id) {
  const hit = read(kind).filter(function (r) { return r.id === String(id); })[0];
  if (hit) tab(kind).deleteRow(hit.row);
}
function log(action, kind, id, summary) {
  let sh = book_().getSheetByName('log');
  if (!sh) { sh = book_().insertSheet('log'); sh.appendRow(['time', 'action', 'kind', 'id', 'details']); sh.setFrozenRows(1); }
  sh.appendRow([new Date(), action, kind, String(id || ''), String(summary || '').slice(0, 200)]);
}
function summary(kind, o) {
  if (kind === 'students') return (o.name || '') + (o.status === 'left' ? ' (left)' : '') + (o.fee ? ', fee ' + o.fee : '');
  if (kind === 'fees') return (o.paid ? 'paid ' : '') + (o.amount || '') + ' ' + (o.mode || '') + ' for ' + (o.month || '');
  if (kind === 'classes') return (o.date || '') + ': ' + (o.present || []).length + ' present, ' + (o.absent || []).length + ' absent';
  if (kind === 'batches') return o.name || '';
  if (kind === 'enquiries') return (o.parent || '') + ' - ' + (o.status || '');
  return '';
}
const today_ = function () { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); };
function safe(s) { const o = JSON.parse(JSON.stringify(s)); delete o.pinHash; delete o.pin; o.hasPin = !!s.pinHash; return o; }
function kidView(s) { const o = { id: s.id, name: s.name, grade: s.grade, level: s.level, note: s.note, mistakes: s.mistakes }; KEEP.forEach(function (k) { o[k] = s[k]; }); return o; }
function clip(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }

/* ---------------- requests ---------------- */
function handle(q) {
  const teacher = function () {
    guard('teacher');
    const p = PropertiesService.getScriptProperties();
    if (!p.getProperty('T_HASH')) throw new Error('Teacher PIN not set up yet. Run setTeacherPin in Apps Script.');
    if (hash(q.pin, p.getProperty('T_SALT')) !== p.getProperty('T_HASH')) fail('teacher');
    cleared('teacher');
  };
  const kidCheck = function (students) {
    const name = clip(q.name, 30).toLowerCase(), key = 'kid_' + (q.id ? String(q.id) : name);
    guard(key);
    if (!/^\d{4}$/.test(String(q.pin))) fail(key);
    const h = hash(q.pin, pinSalt());
    const s = students.filter(function (r) {
      return q.id ? r.id === String(q.id) : (String(r.data.name || '').trim().toLowerCase() === name && r.data.pinHash === h);
    })[0];
    if (!s || s.data.status === 'left' || s.data.pinHash !== h) fail(key);
    cleared(key);
    return s;
  };

  switch (q.action) {
    case 'login': {
      return { ok: true, data: kidView(kidCheck(read('students')).data) };
    }
    case 'sSave': {
      const students = read('students'), s = kidCheck(students);
      KEEP.forEach(function (k) { if (q.patch && k in q.patch) s.data[k] = q.patch[k]; });
      put('students', s.id, s.data, students);
      return { ok: true, data: true };
    }
    case 'lead': {                                     // public: website enquiry, write-only
      const o = q.o || {};
      if (o.web) return { ok: true, data: true };      // spam trap filled in: pretend success
      const p = PropertiesService.getScriptProperties(), dk = 'leads_' + today_();
      const n = Number(p.getProperty(dk) || 0) + 1;
      if (n > LEADS_PER_DAY) throw new Error('Please message Chetana on WhatsApp instead.');
      p.setProperty(dk, String(n));
      const id = 'w_' + clip(o.id, 24).replace(/[^a-z0-9]/gi, '');
      if (id.length < 8) throw new Error('Bad request');
      const rows = read('enquiries');
      if (rows.some(function (r) { return r.id === id; })) return { ok: true, data: true };
      const e = { id: id, parent: clip(o.parent, 40) || '(not given)', child: clip(o.child, 20), grade: clip(o.grade, 12),
        phone: clip(o.phone, 16).replace(/[^\d+ ]/g, ''), source: o.source === 'Starting check' ? 'Starting check' : 'Website',
        note: clip(o.note, 400), status: 'New', date: today_() };
      put('enquiries', id, e, rows);
      log('lead', 'enquiries', id, e.source + ': ' + e.parent);
      return { ok: true, data: true };
    }
    case 'tAll': {
      teacher();
      const o = {};
      KINDS.forEach(function (k) { o[k] = read(k).map(function (r) { return k === 'students' ? safe(r.data) : r.data; }); });
      return { ok: true, data: o };
    }
    case 'tPut': {
      teacher();
      if (KINDS.indexOf(q.kind) < 0 || !q.o || !q.o.id) throw new Error('Bad request');
      const o = q.o, rows = read(q.kind);
      if (q.kind === 'students') {
        const old = rows.filter(function (r) { return r.id === String(o.id); })[0];
        if (old) KEEP.forEach(function (k) { if (k in old.data) o[k] = old.data[k]; });
        if (o.pin) {
          if (!/^\d{4}$/.test(String(o.pin))) throw new Error('The PIN must be 4 digits');
          o.pinHash = hash(o.pin, pinSalt());
          if (old) log('pin', 'students', o.id, 'PIN changed for ' + (o.name || ''));
        } else if (old) o.pinHash = old.data.pinHash;
        delete o.pin; delete o.hasPin;
        if (o.status === 'left' && !o.leftOn) o.leftOn = today_();
        if (o.status !== 'left') delete o.leftOn;
      }
      put(q.kind, o.id, o, rows);
      log('save', q.kind, o.id, summary(q.kind, o));
      return { ok: true, data: q.kind === 'students' ? safe(o) : o };
    }
    case 'tDel': {
      teacher();
      if (KINDS.indexOf(q.kind) < 0) throw new Error('Bad request');
      del(q.kind, q.id);
      log('delete', q.kind, q.id, '');
      return { ok: true, data: true };
    }
  }
  throw new Error('Unknown action');
}

/* ---------------- scheduled jobs ---------------- */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['nightlyBackup', 'monthlyCleanup'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('nightlyBackup').timeBased().everyDays(1).atHour(2).create();
  ScriptApp.newTrigger('monthlyCleanup').timeBased().onMonthDay(1).atHour(3).create();
  log('setup', '', '', 'Nightly backup and monthly clean-up scheduled');
  return 'Scheduled';
}
function nightlyBackup() {
  const ss = book_(), name = 'Tutoring backups';
  const it = DriveApp.getFoldersByName(name), folder = it.hasNext() ? it.next() : DriveApp.createFolder(name);
  DriveApp.getFileById(ss.getId()).makeCopy(ss.getName() + ' backup ' + today_(), folder);
  const files = [], f = folder.getFiles();
  while (f.hasNext()) files.push(f.next());
  files.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  files.slice(KEEP_BACKUPS).forEach(function (x) { x.setTrashed(true); });
}
function monthlyCleanup() {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 864e5), cut = Utilities.formatDate(cutoff, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const gone = [];
  read('students').forEach(function (r) {
    if (r.data.status !== 'left') return;
    if (!r.data.leftOn) { r.data.leftOn = today_(); put('students', r.id, r.data); return; }   // start the clock
    if (r.data.leftOn < cut) gone.push(r);
  });
  if (gone.length) {
    const ids = gone.map(function (r) { return r.id; });
    read('classes').forEach(function (c) {
      const d = c.data, before = JSON.stringify(d);
      d.present = (d.present || []).filter(function (x) { return ids.indexOf(x) < 0; });
      d.absent = (d.absent || []).filter(function (x) { return ids.indexOf(x) < 0; });
      ids.forEach(function (x) { if (d.notes) delete d.notes[x]; });
      if (JSON.stringify(d) !== before) put('classes', c.id, d);
    });
    gone.sort(function (a, b) { return b.row - a.row; }).forEach(function (r) { tab('students').deleteRow(r.row); log('retention', 'students', r.id, 'Deleted: left over 12 months ago'); });
  }
  read('enquiries').filter(function (r) { return r.data.status !== 'Joined' && (r.data.date || '9') < cut; })
    .sort(function (a, b) { return b.row - a.row; })
    .forEach(function (r) { tab('enquiries').deleteRow(r.row); log('retention', 'enquiries', r.id, 'Deleted: older than 12 months'); });
}

/* ---------------- one-time upgrades ---------------- */
function migrateToTabs() {
  const old = book_().getSheetByName('data');
  if (!old) return 'Nothing to migrate';
  const v = old.getDataRange().getValues();
  const by = {};
  v.slice(1).forEach(function (r) { if (r[0] && KINDS.indexOf(String(r[0])) >= 0) (by[r[0]] = by[r[0]] || []).push([String(r[1]), r[2], r[3] || new Date()]); });
  Object.keys(by).forEach(function (k) { const sh = tab(k); sh.getRange(sh.getLastRow() + 1, 1, by[k].length, 3).setValues(by[k]); });
  old.setName('data_old_' + today_());
  log('setup', '', '', 'Moved data into one tab per kind');
  return 'Migrated';
}
function migratePins() {
  read('students').forEach(function (r) {
    if (r.data.pin) { r.data.pinHash = hash(r.data.pin, pinSalt()); delete r.data.pin; put('students', r.id, r.data); }
  });
}
