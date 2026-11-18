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
 * OPTIONAL
 * - Second teacher: Chetana adds them in the website (Setup tab). They get their own PIN and see only their batches,
 *   with no fees, phone numbers or leads.
 * - Google sign-in for the teacher area: see setGoogleSignIn below.
 *
 * UPGRADING FROM VERSION 1 OR 2
 * Paste this file over the old one and save. Run migrateToTabs once, then setupTriggers once.
 * (From version 1 only: also run migratePins.) Then Deploy > Manage deployments > Edit > New version > Deploy.
 *
 * WHAT IT PROTECTS
 * - PINs are stored only as salted SHA-256 hashes. 5 wrong tries locks that login for 15 minutes.
 * - No public list of names. Parent numbers, fees, class logs and leads need the teacher PIN.
 * - At most 60 requests a minute in total. Website enquiries: at most 30 a day, with a spam trap.
 * - Every teacher change, enquiry and lockout is written to the "log" tab. Website errors go to the "errors" tab.
 * - Nightly copy of the Sheet into Drive folder "Tutoring backups" (last 30 kept).
 * - Monthly clean-up: deletes children marked Left for over 12 months (fee entries kept) and old
 *   enquiries that never joined, as promised on the website's Privacy page.
 */
const KINDS = ['students', 'enquiries', 'batches', 'classes', 'fees', 'notes', 'roadmaps', 'docs', 'marks', 'assign'];
const MAX_UPLOAD = 7 * 1024 * 1024;   // ~5 MB file once base64-encoded
const DOC_TYPES = /^(application\/pdf|image\/(jpeg|png|webp)|application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|application\/msword)$/;
const KEEP = ['progress', 'stars', 'sessions', 'teach'];
const SCHEMA = 1;
const MAX_TRIES = 5, LOCK_SECONDS = 15 * 60, MAX_JSON = 50000, LEADS_PER_DAY = 30, KEEP_BACKUPS = 30, RETAIN_DAYS = 365;

/* Optional: require "Sign in with Google" before the PIN. Fill in both, Run once, then redeploy (New version).
   CLIENT_ID comes from Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application),
   with https://palatshahachetana.github.io as an authorised JavaScript origin. To turn it off, run with CLIENT_ID = ''. */
function setGoogleSignIn() {
  const CLIENT_ID = '';            // e.g. 1234-abc.apps.googleusercontent.com
  const OWNER_EMAIL = '';          // Chetana's Gmail address
  const p = PropertiesService.getScriptProperties();
  if (!CLIENT_ID) { p.deleteProperty('G_CLIENT'); log('setup', '', '', 'Google sign-in turned off'); return 'Off'; }
  if (!/@/.test(OWNER_EMAIL)) throw new Error('Add the owner email');
  p.setProperty('G_CLIENT', CLIENT_ID); p.setProperty('OWNER_EMAIL', OWNER_EMAIL.toLowerCase().trim());
  log('setup', '', '', 'Google sign-in turned on');
  return 'On';
}

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
  if (!e || !e.postData || e.postData.contents.length > MAX_UPLOAD) return out({ ok: false, error: 'Bad request' });
  if (e.postData.contents.length > MAX_JSON && e.postData.contents.indexOf('"action":"tUpload"') < 0) return out({ ok: false, error: 'Bad request' });
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
  if (kind === 'notes') return (o.tag || 'Note') + (o.sid ? ' about ' + o.sid : '');
  if (kind === 'roadmaps') return (o.subject || '') + ': ' + (o.chapters || []).filter(function (c) { return c.done; }).length + '/' + (o.chapters || []).length + ' done';
  return '';
}
const today_ = function () { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); };
function safe(s) { const o = JSON.parse(JSON.stringify(s)); delete o.pinHash; delete o.pin; o.hasPin = !!s.pinHash; return o; }
function kidView(s) { const o = { id: s.id, name: s.name, grade: s.grade, level: s.level, note: s.note, mistakes: s.mistakes }; KEEP.forEach(function (k) { o[k] = s[k]; }); return o; }
function clip(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n); }

/* ---------------- requests ---------------- */
/* Verifies a Google ID token (only when Google sign-in is turned on). Returns the verified email. */
function googleEmail(token) {
  const p = PropertiesService.getScriptProperties(), client = p.getProperty('G_CLIENT');
  if (!client) return null;
  if (!token) throw new Error('Google sign-in needed');
  const c = CacheService.getScriptCache(), key = 'gt_' + hash(token, 'g').slice(0, 40), hit = c.get(key);
  if (hit) return hit;
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Google sign-in expired');
  const t = JSON.parse(res.getContentText());
  if (t.aud !== client || String(t.email_verified) !== 'true' || ['accounts.google.com', 'https://accounts.google.com'].indexOf(t.iss) < 0 || Number(t.exp) * 1000 < Date.now())
    throw new Error('Google sign-in expired');
  const email = String(t.email).toLowerCase();
  c.put(key, email, Math.max(60, Math.min(3000, Number(t.exp) - Math.floor(Date.now() / 1000) - 60)));
  return email;
}
/* Who is calling? Chetana (owner) or a teacher she added. Throws on a wrong PIN. */
function whoIs(q) {
  guard('teacher');
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('T_HASH')) throw new Error('Teacher PIN not set up yet. Run setTeacherPin in Apps Script.');
  const email = googleEmail(q.idToken), gOn = !!p.getProperty('G_CLIENT');
  if (hash(q.pin, p.getProperty('T_SALT')) === p.getProperty('T_HASH') && (!gOn || email === p.getProperty('OWNER_EMAIL'))) {
    cleared('teacher'); return { role: 'owner', id: 'owner', name: 'Chetana', batches: [] };
  }
  const h = hash(q.pin, pinSalt());
  const t = read('teachers').map(function (r) { return r.data; }).filter(function (x) {
    return x.active !== false && x.pinHash === h && (!gOn || String(x.email || '').toLowerCase() === email);
  })[0];
  if (!t) fail('teacher');
  cleared('teacher');
  return { role: 'teacher', id: t.id, name: t.name, batches: t.batches || [] };
}
const TEACHER_STUDENT_FIELDS = ['level', 'note', 'mistakes'];

function handle(q) {
  let who = null;
  const teacher = function () { who = whoIs(q); return who; };
  const owner = function () { if (teacher().role !== 'owner') throw new Error('Only Chetana can do this'); };
  const mine = function (batchId) { return who.role === 'owner' || who.batches.indexOf(batchId) >= 0; };
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
      const me = kidCheck(read('students')).data, v = kidView(me);
      v.assign = read('assign').map(function (r) { return r.data; }).filter(function (a) { return a.target === 's:' + me.id || a.target === 'b:' + me.batch; });
      return { ok: true, data: v };
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
    case 'err': {                                      // public: website error report, write-only, no personal data
      const e = q.e || {}, p = PropertiesService.getScriptProperties(), dk = 'errs_' + today_();
      const n = Number(p.getProperty(dk) || 0) + 1;
      if (n > 100) return { ok: true, data: true };
      p.setProperty(dk, String(n));
      let sh = book_().getSheetByName('errors');
      if (!sh) { sh = book_().insertSheet('errors'); sh.appendRow(['time', 'page', 'message', 'file', 'line', 'browser']); sh.setFrozenRows(1); }
      sh.appendRow([new Date(), clip(e.view, 20), clip(e.m, 200), clip(e.src, 60), Number(e.line) || 0, clip(e.ua, 120)]);
      return { ok: true, data: true };
    }
    case 'tAll': {
      teacher();
      const o = { me: who };
      if (who.role === 'owner') {
        KINDS.forEach(function (k) { o[k] = read(k).map(function (r) { return k === 'students' ? safe(r.data) : r.data; }); });
        o.teachers = read('teachers').map(function (r) { const t = JSON.parse(JSON.stringify(r.data)); delete t.pinHash; return t; });
      } else {
        o.batches = read('batches').map(function (r) { return r.data; }).filter(function (b) { return mine(b.id); });
        o.students = read('students').map(function (r) { return r.data; }).filter(function (s) { return s.status !== 'left' && mine(s.batch); })
          .map(function (s) { const x = safe(s); ['phone', 'parent', 'fee', 'school', 'consent', 'start'].forEach(function (k) { delete x[k]; }); return x; });
        o.classes = read('classes').map(function (r) { return r.data; }).filter(function (c) { return mine(c.batch); });
        const ids = o.students.map(function (s) { return s.id; });
        o.notes = read('notes').map(function (r) { return r.data; }).filter(function (n) { return n.sid ? ids.indexOf(n.sid) >= 0 : (n.batch ? mine(n.batch) : n.by === who.name); });
        o.roadmaps = read('roadmaps').map(function (r) { return r.data; }).filter(function (x) { return mine(x.batch); });
        o.docs = read('docs').map(function (r) { return r.data; }).filter(function (d) { return ids.indexOf(d.sid) >= 0; });
        o.marks = read('marks').map(function (r) { return r.data; }).filter(function (m) { return ids.indexOf(m.sid) >= 0; });
        o.assign = read('assign').map(function (r) { return r.data; }).filter(function (a) { return a.target.slice(0, 2) === 'b:' ? mine(a.target.slice(2)) : ids.indexOf(a.target.slice(2)) >= 0; });
        o.fees = []; o.enquiries = []; o.teachers = [];
      }
      return { ok: true, data: o };
    }
    case 'tUpload': {
      teacher();
      const o = q.o || {}, s = read('students').filter(function (r) { return r.id === String(o.sid); })[0];
      if (!s || !mine(s.data.batch)) throw new Error('Only Chetana can do this');
      if (!DOC_TYPES.test(String(o.mime))) throw new Error('That file type is not allowed');
      const bytes = Utilities.base64Decode(String(o.data || ''));
      if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Files must be under 5 MB');
      const root = folder_('Tutoring documents', null), sub = folder_(clip(s.data.name, 30) + ' (' + s.id + ')', root);
      const name = clip(o.name, 80).replace(/[\\/:*?"<>|]/g, '_') || 'document';
      const file = sub.createFile(Utilities.newBlob(bytes, String(o.mime), name));
      const d = { id: 'd' + Date.now().toString(36) + Utilities.getUuid().slice(0, 6), sid: s.id, subject: clip(o.subject, 30), name: name, fileId: file.getId(), mime: String(o.mime), size: bytes.length, date: today_(), by: who.role === 'owner' ? '' : who.name };
      put('docs', d.id, d);
      log('upload', 'docs', d.id, name + ' for ' + s.data.name + (d.by ? ' (by ' + d.by + ')' : ''));
      return { ok: true, data: d };
    }
    case 'tTeacherPut': {
      owner();
      const t = q.o || {}, rows = read('teachers'), old = rows.filter(function (r) { return r.id === String(t.id); })[0];
      const o = { id: clip(t.id, 30) || ('t' + Date.now()), name: clip(t.name, 30), email: clip(t.email, 80).toLowerCase(),
        batches: (t.batches || []).map(function (b) { return clip(b, 40); }), active: t.active !== false };
      if (!o.name) throw new Error('Add a name');
      if (t.pin) {
        if (!/^\d{6,8}$/.test(String(t.pin))) throw new Error('Teacher PINs need 6 to 8 digits');
        const p = PropertiesService.getScriptProperties();
        if (hash(t.pin, p.getProperty('T_SALT')) === p.getProperty('T_HASH')) throw new Error('Choose a different PIN');
        o.pinHash = hash(t.pin, pinSalt());
        if (rows.some(function (r) { return r.id !== o.id && r.data.pinHash === o.pinHash; })) throw new Error('Choose a different PIN');
      } else if (old) o.pinHash = old.data.pinHash;
      else throw new Error('Set a PIN for the new teacher');
      put('teachers', o.id, o, rows);
      log('teacher', 'teachers', o.id, o.name + (o.active ? '' : ' (turned off)') + (t.pin ? ', PIN set' : ''));
      const back = JSON.parse(JSON.stringify(o)); delete back.pinHash;
      return { ok: true, data: back };
    }
    case 'tTeacherDel': {
      owner();
      del('teachers', q.id);
      log('delete', 'teachers', q.id, '');
      return { ok: true, data: true };
    }
    case 'tPut': {
      teacher();
      if (KINDS.indexOf(q.kind) < 0 || !q.o || !q.o.id) throw new Error('Bad request');
      let o = q.o;
      const rows = read(q.kind);
      if (who.role !== 'owner') {
        const old = rows.filter(function (r) { return r.id === String(o.id); })[0];
        const kidMine = function (sid) { const s = read('students').filter(function (r) { return r.id === String(sid); })[0]; return !!s && mine(s.data.batch); };
        if (q.kind === 'classes' || q.kind === 'roadmaps') {
          if (!mine(o.batch) || (old && !mine(old.data.batch))) throw new Error('Only Chetana can do this');
        } else if (q.kind === 'marks') {
          if (!kidMine(o.sid) || (old && !kidMine(old.data.sid))) throw new Error('Only Chetana can do this');
        } else if (q.kind === 'assign') {
          const okT = function (t) { return String(t).slice(0, 2) === 'b:' ? mine(String(t).slice(2)) : kidMine(String(t).slice(2)); };
          if (!okT(o.target) || (old && !okT(old.data.target))) throw new Error('Only Chetana can do this');
        } else if (q.kind === 'notes') {
          if ((o.sid && !kidMine(o.sid)) || (o.batch && !mine(o.batch)) || (old && old.data.by !== who.name)) throw new Error('Only Chetana can do this');
          o.by = who.name;
        } else if (q.kind === 'students') {
          if (!old || !mine(old.data.batch)) throw new Error('Only Chetana can do this');
          const merged = old.data;
          TEACHER_STUDENT_FIELDS.forEach(function (k) { if (k in o) merged[k] = o[k]; });
          put('students', merged.id, merged, rows);
          log('save', 'students', merged.id, 'Notes/level by ' + who.name);
          const x = safe(merged); ['phone', 'parent', 'fee', 'school', 'consent', 'start'].forEach(function (k) { delete x[k]; });
          return { ok: true, data: x };
        } else throw new Error('Only Chetana can do this');
      }
      if (q.kind === 'docs') throw new Error('Bad request');
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
      log('save', q.kind, o.id, summary(q.kind, o) + (who.role === 'owner' ? '' : ' (by ' + who.name + ')'));
      return { ok: true, data: q.kind === 'students' ? safe(o) : o };
    }
    case 'tDel': {
      teacher();
      if (KINDS.indexOf(q.kind) < 0) throw new Error('Bad request');
      if (who.role !== 'owner') {
        const c = ['classes', 'roadmaps', 'notes', 'marks', 'assign'].indexOf(q.kind) >= 0 && read(q.kind).filter(function (r) { return r.id === String(q.id); })[0];
        const kidOk = function (sid) { const s = read('students').filter(function (r) { return r.id === String(sid); })[0]; return !!s && mine(s.data.batch); };
        const allowed = !c ? false : q.kind === 'notes' ? c.data.by === who.name : q.kind === 'marks' ? kidOk(c.data.sid)
          : q.kind === 'assign' ? (String(c.data.target).slice(0, 2) === 'b:' ? mine(String(c.data.target).slice(2)) : kidOk(String(c.data.target).slice(2))) : mine(c.data.batch);
        if (!allowed) throw new Error('Only Chetana can do this');
      }
      if (q.kind === 'docs') {
        const d = read('docs').filter(function (r) { return r.id === String(q.id); })[0];
        if (d) try { DriveApp.getFileById(d.data.fileId).setTrashed(true); } catch (err) {}
      }
      del(q.kind, q.id);
      log('delete', q.kind, q.id, '');
      return { ok: true, data: true };
    }
  }
  throw new Error('Unknown action');
}

function folder_(name, parent) {
  const it = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : (parent ? parent.createFolder(name) : DriveApp.createFolder(name));
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
    read('marks').filter(function (n) { return ids.indexOf(n.data.sid) >= 0; }).sort(function (a, b) { return b.row - a.row; }).forEach(function (n) { tab('marks').deleteRow(n.row); });
    read('notes').filter(function (n) { return ids.indexOf(n.data.sid) >= 0; }).sort(function (a, b) { return b.row - a.row; }).forEach(function (n) { tab('notes').deleteRow(n.row); });
    read('docs').filter(function (d) { return ids.indexOf(d.data.sid) >= 0; }).sort(function (a, b) { return b.row - a.row; }).forEach(function (d) { try { DriveApp.getFileById(d.data.fileId).setTrashed(true); } catch (err) {} tab('docs').deleteRow(d.row); });
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
