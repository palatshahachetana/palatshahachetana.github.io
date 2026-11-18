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
const ss = { getSheetByName: n => sheets.find(s => s.name === n) || null, insertSheet: n => { const s = makeSheet(n); sheets.push(s); return s; }, getId: () => 'id', getName: () => 'Tutoring data' };
const store = () => { const m = {}; return { getProperty: k => (k in m ? m[k] : null), setProperty: (k, v) => { m[k] = String(v); }, get: k => (k in m ? m[k] : null), put: (k, v) => { m[k] = String(v); }, remove: k => { delete m[k]; } }; };
const props = store(), cache = store();
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
  },
  DriveApp: {}, ScriptApp: {}, console,
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
console.log(n + ' checks\nALL OK');
