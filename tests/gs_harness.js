// Loads apps-script/Code.gs with in-memory fakes of Google's services and checks the security rules.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm'), assert = require('assert');

function makeSheet(name) {
  const rows = [];
  const sh = {
    name, rows,
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    appendRow: r => rows.push(r.slice()),
    getRange: (r, c, nr, nc) => ({ setValues: v => { for (let i = 0; i < nr; i++) { rows[r - 1 + i] = rows[r - 1 + i] || []; for (let j = 0; j < nc; j++) rows[r - 1 + i][c - 1 + j] = v[i][j]; } } }),
    deleteRow: r => rows.splice(r - 1, 1),
    setFrozenRows: () => {}, setName: n => { sh.name = n; }, getLastRow: () => rows.length,
  };
  return sh;
}
const sheets = [];
const TOKENS = {};
const ss = { getSheetByName: n => sheets.find(s => s.name === n) || null, insertSheet: n => { const s = makeSheet(n); sheets.push(s); return s; }, getId: () => 'id', getName: () => 'Tutoring data' };
const store = () => { const m = {}; return { getProperty: k => (k in m ? m[k] : null), setProperty: (k, v) => { m[k] = String(v); }, get: k => (k in m ? m[k] : null), put: (k, v) => { m[k] = String(v); }, remove: k => { delete m[k]; } }; };
const props = store(), cache = store();
props.deleteProperty = k => { props.setProperty(k, ''); };
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  PropertiesService: { getScriptProperties: () => props },
  CacheService: { getScriptCache: () => cache },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Session: { getScriptTimeZone: () => 'Asia/Kolkata' },
  ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' },
    computeDigest: (a, s) => [...crypto.createHash('sha256').update(s, 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)),
    getUuid: () => crypto.randomUUID(),
    formatDate: (d) => d.toISOString().slice(0, 10),
    base64Decode: s => [...Buffer.from(s, 'base64')], newBlob: (b, m, nm) => ({ b, m, nm }),
  },
  DriveApp: (() => { const folders = {}, files = {}; let n = 0;
    const mk = name => ({ name, getFoldersByName: x => { const f = folders[name + '/' + x]; return { hasNext: () => !!f, next: () => f }; },
      createFolder: x => (folders[name + '/' + x] = mk(name + '/' + x)), createFile: blob => { const id = 'F' + (++n); files[id] = { blob, trashed: false }; return { getId: () => id }; } });
    const root = mk('');
    return { files, getFoldersByName: root.getFoldersByName, createFolder: root.createFolder, getFileById: id => ({ setTrashed: t => { files[id].trashed = t; } }) }; })(),
  ScriptApp: {}, console,
  UrlFetchApp: { fetch: (url) => { const tok = decodeURIComponent(url.split('id_token=')[1]); const t = TOKENS[tok];
    return { getResponseCode: () => (t ? 200 : 400), getContentText: () => JSON.stringify(t || {}) }; } },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8') + '\nthis.__h={doPost,doGet,handle,hash,monthlyCleanup,read,put,migrateToTabs};', ctx);
const H = ctx.__h;
const post = o => JSON.parse(H.doPost({ postData: { contents: JSON.stringify(o) } }).text);
const resetRate = () => { Object.keys(cache).length; for (const k of ['rl_' + Math.floor(Date.now() / 60000)]) cache.remove(k); };
let n = 0; const check = (name, fn) => { resetRate(); fn(); n++; console.log('ok', name); };

// teacher PIN as setTeacherPin would set it
props.setProperty('T_SALT', 'salt1'); props.setProperty('T_HASH', H.hash('246810', 'salt1'));
const T = '246810';

check('teacher calls need the PIN', () => {
  assert.strictEqual(post({ action: 'tAll', pin: '000000' }).ok, false);
  assert.strictEqual(post({ action: 'tAll', pin: T }).ok, true);
});
check('no public names list', () => { assert.match(post({ action: 'names' }).error, /Unknown action/); });
check('child PIN stored only as hash, never returned', () => {
  const r = post({ action: 'tPut', pin: T, kind: 'students', o: { id: 's1', name: 'Aarav', pin: '1111', phone: '9876543210', status: 'active' } });
  assert.ok(r.ok && !('pin' in r.data) && !('pinHash' in r.data) && r.data.hasPin);
  const raw = ss.getSheetByName('students').rows[1][1];
  assert.ok(!raw.includes('"pin":') && raw.includes('pinHash') && raw.includes('"v":1'));
  const all = post({ action: 'tAll', pin: T }).data.students[0];
  assert.ok(!('pinHash' in all));
});
check('child login by typed name returns no parent data', () => {
  const r = post({ action: 'login', name: ' aarav ', pin: '1111' });
  assert.ok(r.ok && r.data.name === 'Aarav' && !('phone' in r.data) && !('pinHash' in r.data));
});
check('5 wrong child PINs lock that login', () => {
  for (let i = 0; i < 5; i++) assert.strictEqual(post({ action: 'login', name: 'aarav', pin: '9999' }).error, 'Wrong PIN');
  assert.match(post({ action: 'login', name: 'aarav', pin: '1111' }).error, /Too many/);
  cache.remove('lock_kid_aarav');
});
check('5 wrong teacher PINs lock the console', () => {
  for (let i = 0; i < 5; i++) post({ action: 'tAll', pin: '111111' });
  assert.match(post({ action: 'tAll', pin: T }).error, /Too many/);
  cache.remove('lock_teacher');
});
check('child save can only change practice fields', () => {
  post({ action: 'sSave', name: 'aarav', pin: '1111', id: 's1', patch: { stars: 9, phone: 'hacked', name: 'X' } });
  const s = post({ action: 'tAll', pin: T }).data.students[0];
  assert.ok(s.stars === 9 && s.phone === '9876543210' && s.name === 'Aarav');
});
check('global rate limit', () => {
  let last; for (let i = 0; i < 61; i++) last = post({ action: 'login', name: 'zz', pin: '1' });
  assert.match(last.error, /Too many/);
});
check('public lead: saved, cleaned, deduped, spam trap', () => {
  assert.ok(post({ action: 'lead', o: { id: 'abc12345', parent: 'Ritu <b>', phone: '98220 12345abc', source: 'Website', note: 'x'.repeat(900) } }).ok);
  assert.ok(post({ action: 'lead', o: { id: 'abc12345', parent: 'Again' } }).ok);
  assert.ok(post({ action: 'lead', o: { id: 'bot99999', parent: 'Bot', web: 'http://spam' } }).ok);
  const es = post({ action: 'tAll', pin: T }).data.enquiries;
  assert.strictEqual(es.length, 1);
  assert.ok(es[0].note.length <= 400 && es[0].phone === '98220 12345' && es[0].status === 'New');
});
check('lead cannot read anything back', () => { const r = post({ action: 'lead', o: { id: 'zzz99999', parent: 'P' } }); assert.strictEqual(r.data, true); });
check('leaving sets leftOn; changes are logged', () => {
  post({ action: 'tPut', pin: T, kind: 'students', o: { id: 's1', name: 'Aarav', status: 'left' } });
  const s = post({ action: 'tAll', pin: T }).data.students[0];
  assert.ok(s.leftOn && s.hasPin);
  const log = ss.getSheetByName('log').rows.map(r => r[1]);
  assert.ok(log.includes('save') && log.includes('lead') && log.includes('lockout'));
});
check('monthly clean-up deletes after 12 months and scrubs class logs', () => {
  const st = H.read('students')[0]; st.data.leftOn = '2020-01-01'; H.put('students', st.id, st.data);
  post({ action: 'tPut', pin: T, kind: 'classes', o: { id: 'c1', batch: 'b', date: '2020-01-02', present: ['s1', 's2'], absent: [], notes: { s1: 'note' } } });
  post({ action: 'tPut', pin: T, kind: 'fees', o: { id: 'f_s1_2020-01', sid: 's1', amount: 1500, paid: true } });
  H.monthlyCleanup();
  const d = post({ action: 'tAll', pin: T }).data;
  assert.strictEqual(d.students.length, 0);
  assert.deepStrictEqual(d.classes[0].present, ['s2']); assert.ok(!d.classes[0].notes.s1);
  assert.strictEqual(d.fees.length, 1);
});
check('migrateToTabs moves version 2 data', () => {
  const old = ss.insertSheet('data'); old.appendRow(['kind', 'id', 'json', 'updated']); old.appendRow(['batches', 'b9', '{"id":"b9","name":"Old batch"}', new Date()]);
  H.migrateToTabs();
  assert.ok(post({ action: 'tAll', pin: T }).data.batches.some(b => b.name === 'Old batch'));
});
check('second teacher sees only her batch, no fees or phones', () => {
  post({ action: 'tPut', pin: T, kind: 'batches', o: { id: 'bA', name: 'Grade 3' } });
  post({ action: 'tPut', pin: T, kind: 'batches', o: { id: 'bB', name: 'Grade 6' } });
  post({ action: 'tPut', pin: T, kind: 'students', o: { id: 'k1', name: 'Myra', pin: '1212', batch: 'bA', phone: '9000000001', fee: '1200', status: 'active' } });
  post({ action: 'tPut', pin: T, kind: 'students', o: { id: 'k2', name: 'Vir', pin: '3434', batch: 'bB', phone: '9000000002', status: 'active' } });
  assert.match(post({ action: 'tTeacherPut', pin: T, o: { name: 'Asha', pin: T, batches: ['bA'] } }).error, /different PIN/);
  assert.ok(post({ action: 'tTeacherPut', pin: T, o: { id: 't1', name: 'Asha', pin: '135790', batches: ['bA'] } }).ok);
  const d = post({ action: 'tAll', pin: '135790' }).data;
  assert.strictEqual(d.me.role, 'teacher');
  assert.deepStrictEqual(d.students.map(s => s.name), ['Myra']);
  assert.ok(!('phone' in d.students[0]) && !('fee' in d.students[0]));
  assert.deepStrictEqual(d.fees, []); assert.deepStrictEqual(d.enquiries, []); assert.deepStrictEqual(d.batches.map(b => b.id), ['bA']);
  assert.ok(!JSON.stringify(post({ action: 'tAll', pin: T }).data.teachers).includes('pinHash'));
});
check('second teacher: allowed and blocked writes', () => {
  const A = '135790';
  assert.ok(post({ action: 'tPut', pin: A, kind: 'classes', o: { id: 'cA', batch: 'bA', date: '2026-11-18', present: ['k1'], absent: [] } }).ok);
  assert.match(post({ action: 'tPut', pin: A, kind: 'classes', o: { id: 'cB', batch: 'bB', date: '2026-11-18', present: [], absent: [] } }).error, /Only Chetana/);
  assert.match(post({ action: 'tPut', pin: A, kind: 'fees', o: { id: 'f1', sid: 'k1', paid: true } }).error, /Only Chetana/);
  assert.match(post({ action: 'tPut', pin: A, kind: 'students', o: { id: 'k2', note: 'x' } }).error, /Only Chetana/);
  const r = post({ action: 'tPut', pin: A, kind: 'students', o: { id: 'k1', note: 'Good reader', fee: '1', phone: 'hacked', status: 'left' } });
  assert.ok(r.ok);
  const s = post({ action: 'tAll', pin: T }).data.students.find(x => x.id === 'k1');
  assert.ok(s.note === 'Good reader' && s.fee === '1200' && s.phone === '9000000001' && s.status === 'active');
  assert.match(post({ action: 'tTeacherPut', pin: A, o: { name: 'Evil', pin: '999999' } }).error, /Only Chetana/);
  assert.match(post({ action: 'tDel', pin: A, kind: 'students', id: 'k1' }).error, /Only Chetana/);
  assert.ok(post({ action: 'tTeacherPut', pin: T, o: { id: 't1', name: 'Asha', batches: ['bA'], active: false } }).ok);
  assert.strictEqual(post({ action: 'tAll', pin: A }).error, 'Wrong PIN');
  cache.remove('lock_teacher');
});
check('Google sign-in: token required, checked and matched to the right person', () => {
  props.setProperty('G_CLIENT', 'client-1'); props.setProperty('OWNER_EMAIL', 'chetana@gmail.com');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  TOKENS.good = { aud: 'client-1', email: 'Chetana@gmail.com', email_verified: 'true', iss: 'https://accounts.google.com', exp };
  TOKENS.other = { aud: 'client-1', email: 'someone@gmail.com', email_verified: 'true', iss: 'accounts.google.com', exp };
  TOKENS.wrongapp = { aud: 'client-2', email: 'chetana@gmail.com', email_verified: 'true', iss: 'accounts.google.com', exp };
  assert.match(post({ action: 'tAll', pin: T }).error, /Google sign-in needed/);
  assert.match(post({ action: 'tAll', pin: T, idToken: 'wrongapp' }).error, /expired/);
  assert.strictEqual(post({ action: 'tAll', pin: T, idToken: 'other' }).error, 'Wrong PIN');
  assert.strictEqual(post({ action: 'tAll', pin: T, idToken: 'good' }).data.me.role, 'owner');
  cache.remove('lock_teacher'); props.setProperty('G_CLIENT', '');
});
check('error reports: write-only, clipped, capped', () => {
  assert.strictEqual(post({ action: 'err', e: { m: 'x'.repeat(500), src: 'app.js', line: 12, view: 'home', ua: 'UA' } }).data, true);
  const row = ss.getSheetByName('errors').rows[1];
  assert.ok(row[2].length === 200 && row[1] === 'home');
});
check('documents: upload to Drive, type and size checks, teacher limits, delete trashes file', () => {
  const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
  assert.match(post({ action: 'tUpload', pin: T, o: { sid: 'k1', name: 'x.exe', mime: 'application/x-msdownload', data: pdf } }).error, /not allowed/);
  const r = post({ action: 'tUpload', pin: T, o: { sid: 'k1', subject: 'Maths', name: 'unit test.pdf', mime: 'application/pdf', data: pdf } });
  assert.ok(r.ok && r.data.fileId && r.data.size > 5);
  assert.ok(post({ action: 'tTeacherPut', pin: T, o: { id: 't1', name: 'Asha', batches: ['bA'], active: true, pin: '246824' } }).ok);
  assert.ok(post({ action: 'tUpload', pin: '246824', o: { sid: 'k1', name: 'hw.jpg', mime: 'image/jpeg', data: pdf } }).ok);
  assert.match(post({ action: 'tUpload', pin: '246824', o: { sid: 'k2', name: 'hw.jpg', mime: 'image/jpeg', data: pdf } }).error, /Only Chetana/);
  assert.match(post({ action: 'tDel', pin: '246824', kind: 'docs', id: r.data.id }).error, /Only Chetana/);
  assert.ok(post({ action: 'tDel', pin: T, kind: 'docs', id: r.data.id }).ok);
  assert.strictEqual(ctx.DriveApp.files[r.data.fileId].trashed, true);
  assert.match(post({ action: 'tPut', pin: T, kind: 'docs', o: { id: 'x' } }).error, /Bad request/);
});
check('notes and roadmaps: teacher limited to own batch and own notes', () => {
  const A = '246824';
  assert.ok(post({ action: 'tPut', pin: A, kind: 'notes', o: { id: 'n1', sid: 'k1', tag: 'Win', text: 'Read a page', by: 'Fake' } }).ok);
  assert.strictEqual(post({ action: 'tAll', pin: T }).data.notes.find(x => x.id === 'n1').by, 'Asha');
  assert.match(post({ action: 'tPut', pin: A, kind: 'notes', o: { id: 'n2', sid: 'k2', text: 'x' } }).error, /Only Chetana/);
  post({ action: 'tPut', pin: T, kind: 'notes', o: { id: 'n3', sid: 'k1', text: 'owner note' } });
  assert.match(post({ action: 'tDel', pin: A, kind: 'notes', id: 'n3' }).error, /Only Chetana/);
  assert.ok(post({ action: 'tPut', pin: A, kind: 'roadmaps', o: { id: 'r1', batch: 'bA', subject: 'Maths', chapters: [{ t: 'Fractions', done: '' }] } }).ok);
  assert.match(post({ action: 'tPut', pin: A, kind: 'roadmaps', o: { id: 'r2', batch: 'bB', subject: 'Maths' } }).error, /Only Chetana/);
  const d = post({ action: 'tAll', pin: A }).data;
  assert.deepStrictEqual(d.roadmaps.map(x => x.id), ['r1']);
  assert.ok(d.notes.every(x => x.sid === 'k1'));
});
check('marks and assignments: teacher limits; kid login carries own assignments', () => {
  const A = '246824';
  assert.ok(post({ action: 'tPut', pin: A, kind: 'marks', o: { id: 'm1', sid: 'k1', subject: 'Maths', test: 'UT1', score: 20, outOf: 25 } }).ok);
  assert.match(post({ action: 'tPut', pin: A, kind: 'marks', o: { id: 'm2', sid: 'k2', subject: 'Maths', test: 'UT1', score: 20, outOf: 25 } }).error, /Only Chetana/);
  assert.ok(post({ action: 'tPut', pin: A, kind: 'assign', o: { id: 'a1', target: 'b:bA', mod: 'maths', ch: 6, set: 1, due: '2026-12-01' } }).ok);
  assert.match(post({ action: 'tPut', pin: A, kind: 'assign', o: { id: 'a2', target: 's:k2', mod: 'maths', ch: 6 } }).error, /Only Chetana/);
  post({ action: 'tPut', pin: T, kind: 'assign', o: { id: 'a3', target: 's:k2', mod: 'maths', ch: 2 } });
  const me = post({ action: 'login', name: 'myra', pin: '1212' }).data;
  assert.deepStrictEqual(me.assign.map(a => a.id), ['a1']);
  assert.match(post({ action: 'tDel', pin: A, kind: 'assign', id: 'a3' }).error, /Only Chetana/);
  assert.ok(post({ action: 'tDel', pin: A, kind: 'assign', id: 'a1' }).ok);
});
check('lesson maker: needs key, sends only the topic, daily cap; public list shows published only', () => {
  assert.match(post({ action: 'tGen', pin: T, o: { topic: 'Fractions' } }).error, /not set up/);
  props.setProperty('GEMINI_KEY', 'k'); props.setProperty('GEMINI_MODEL', 'm');
  let sent = null;
  ctx.UrlFetchApp.fetch = (url, opt) => { sent = { url, opt }; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"title":"Fractions","questions":[]}' }] } }] }) }; };
  const r = post({ action: 'tGen', pin: T, o: { topic: 'Fractions', grade: '4', board: 'CBSE', lang: 'en', nq: 20, student: 'Aarav' } });
  assert.strictEqual(r.data.title, 'Fractions');
  assert.ok(sent.url.includes('generativelanguage.googleapis.com') && !sent.url.includes('key=') && sent.opt.headers['x-goog-api-key'] === 'k');
  assert.ok(!sent.opt.payload.includes('Aarav'), 'no student data in the prompt');
  post({ action: 'tPut', pin: T, kind: 'lessons', o: { id: 'L1', no: 1, title: 'A', status: 'published', questions: [], by: '' } });
  post({ action: 'tPut', pin: T, kind: 'lessons', o: { id: 'L2', no: 2, title: 'B', status: 'draft', questions: [], by: '' } });
  const pub = post({ action: 'lessons' }).data;
  assert.deepStrictEqual(pub.map(l => l.id), ['L1']); assert.ok(!('by' in pub[0]));
  assert.match(post({ action: 'tDel', pin: '246824', kind: 'lessons', id: 'L1' }).error, /Only Chetana/);
});
console.log(n + ' checks\nALL OK');
