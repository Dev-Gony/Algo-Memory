(function () {
'use strict';

/* ============ utils ============ */
var $ = function (s) { return document.querySelector(s); };
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad(n) { return String(n).padStart(2, '0'); }
function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return dstr(new Date()); }
function addDays(ds, n) {
  var p = ds.split('-').map(Number), dt = new Date(p[0], p[1] - 1, p[2]);
  dt.setDate(dt.getDate() + n); return dstr(dt);
}
function dayDiff(a, b) {
  var x = a.split('-').map(Number), y = b.split('-').map(Number);
  return Math.round((Date.UTC(y[0], y[1] - 1, y[2]) - Date.UTC(x[0], x[1] - 1, x[2])) / 86400000);
}
function relDate(ds) {
  var d = dayDiff(today(), ds);
  if (d === 0) return '오늘'; if (d === 1) return '내일'; if (d === -1) return '어제';
  if (d < 0) return Math.abs(d) + '일 지남';
  return ds.slice(5).replace('-', '/');
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('on'); }, 2200);
}
function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
function num(id, dflt) { var v = parseInt(val(id), 10); return isNaN(v) ? (dflt || 0) : v; }

var CATS = ['구현', '완전탐색', 'DFS', 'BFS', '백트래킹', '이분탐색', '투포인터', '정렬', '그리디',
  'DP', '그래프', '최단경로', '최소신장트리', '분리집합', '문자열', '자료구조', '수학', '비트마스킹', '트리', '우선순위큐'];
var LANGS = ['python', 'sql', 'java', 'cpp', 'javascript', 'kotlin'];
var LANG_LABEL = { python: 'Python', sql: 'SQL', java: 'Java', cpp: 'C++', javascript: 'JavaScript', kotlin: 'Kotlin' };

/* ============ state ============ */
var CATALOG = /*__CATALOG__*/[];

var LANGS_USED = [
  { id: 'python', name: '파이썬', sub: '코딩테스트 알고리즘' },
  { id: 'sql', name: 'SQL', sub: 'MySQL 기준' }
];
var LEVELS_BY_LANG = {
  python: [
    { n: 1, name: '첫걸음', sub: '코딩 시작', desc: '변수·if·for·리스트·딕셔너리처럼 모든 코드의 바닥이 되는 문법. 한 편이 5~10줄이라 오늘 하나는 확실히 끝낼 수 있습니다.' },
    { n: 2, name: '입문', sub: 'Lv1 준비', desc: '리스트 컴프리헨션, enumerate·zip, 2차원 배열, 정렬 기본. 문법은 아는데 손이 안 따라갈 때 그 간격을 메웁니다.' },
    { n: 3, name: '초보', sub: 'Lv1 통과선', desc: '해시·누적합·그리디·슬라이딩 윈도우·약수와 소수·빠른 입력. Lv1을 안정적으로 통과하는 최소 도구함.' },
    { n: 4, name: '중급', sub: 'Lv2 핵심', desc: 'BFS·DFS·스택·조합과 순열 재귀·기본 DP·이분탐색. Lv1과 Lv2를 가르는 지점이 정확히 여기입니다.' },
    { n: 5, name: '고급', sub: 'Lv3 이상', desc: '다익스트라·위상정렬·MST·LIS·KMP·비트마스크 DP.' },
    { n: 6, name: '코테 실전', sub: '시험장 패턴', desc: '빠른 입출력·상태 추가 BFS·경로 복원·좌표 압축.' }
  ],
  sql: [
    { n: 1, name: '첫걸음', sub: '조회의 기본', desc: 'SELECT·WHERE·ORDER BY·LIMIT·별칭·NULL·LIKE. 한 편이 3~5줄이라 하루에 두세 개는 무리 없이 끝납니다.' },
    { n: 2, name: '입문', sub: '집계', desc: 'COUNT·SUM·AVG, GROUP BY 와 HAVING, CASE 조건 분기, 조건부 집계. SQL 문제의 절반이 여기 걸려 있습니다.' },
    { n: 3, name: '초보', sub: 'JOIN', desc: 'INNER·LEFT JOIN, 조인 후 집계, 날짜와 문자열 함수. 표가 두 개 이상 나오면 여기가 필요합니다.' },
    { n: 4, name: '중급', sub: '서브쿼리', desc: 'WHERE·IN·EXISTS·FROM 서브쿼리, 셀프 조인, UNION. 한 번에 안 되는 계산을 나눠 쓰는 단계.' },
    { n: 5, name: '고급', sub: '윈도우 함수', desc: 'RANK·ROW_NUMBER·PARTITION BY, 누적합, LAG/LEAD, CTE(WITH). MySQL 8.0 이상.' },
    { n: 6, name: '코테 실전', sub: '복합 유형', desc: '그룹별 상위 N개, 조건부 집계 피벗, 없는 것 찾기, 각자의 최신 기록. 실제 출제 형태 그대로.' }
  ]
};
var LEVELS = LEVELS_BY_LANG.python;
function levelsOf(lang) { return LEVELS_BY_LANG[lang] || LEVELS_BY_LANG.python; }
function levelName(lang, n) {
  var L = levelsOf(lang)[n - 1];
  return L ? L.name : '직접 등록';
}



var COURSES = [
  { id: 'c1', lang: 'python', lv: 1, name: '기초 코스', sub: '파이썬을 손에 붙인다', pace: 2, need: '',
    goal: '변수·조건문·반복문·리스트·딕셔너리를 아무것도 안 보고 쓸 수 있게 됩니다.',
    after: '프로그래머스 Lv0 문제를 읽고 바로 코드로 옮길 수 있습니다. 문법이 막혀서 멈추는 일이 사라집니다.' },
  { id: 'c2', lang: 'python', lv: 2, name: '입문 코스', sub: 'Lv1을 풀 준비', pace: 2, need: '기초 코스',
    goal: '리스트 컴프리헨션, enumerate·zip, 2차원 배열, 정렬 키를 손에 붙입니다.',
    after: '문법은 아는데 손이 안 따라가던 구간이 메워집니다. Lv1 문제를 읽고 30분 안에 접근법이 잡힙니다.' },
  { id: 'c3', lang: 'python', lv: 3, name: 'Lv1 통과 코스', sub: '도구함 채우기', pace: 2, need: '입문 코스',
    goal: '해시·누적합·그리디·슬라이딩 윈도우·약수와 소수·빠른 입력을 익힙니다.',
    after: '프로그래머스 Lv1을 안정적으로 통과합니다. 시간 초과가 왜 나는지 감이 잡히기 시작합니다.' },
  { id: 'c4', lang: 'python', lv: 4, name: 'Lv2 돌파 코스', sub: 'Lv1과 Lv2의 경계', pace: 2, need: 'Lv1 통과 코스',
    goal: 'BFS·DFS·스택·조합과 순열 재귀·기본 DP·이분탐색을 통째로 외웁니다.',
    after: 'Lv2 문제를 보고 어떤 유형인지 바로 분류하고, 뼈대를 먼저 깔고 시작할 수 있습니다.' },
  { id: 'c5', lang: 'python', lv: 5, name: '고급 코스', sub: 'Lv3 이상', pace: 1, need: 'Lv2 돌파 코스',
    goal: '다익스트라·위상정렬·MST·LIS·LCS·KMP·비트마스크 DP.',
    after: '대회형 문제와 상위권 기업 코테의 중상 난이도까지 손이 닿습니다.' },
  { id: 'c6', lang: 'python', lv: 6, name: '코테 실전 코스', sub: '시험장 패턴', pace: 1, need: 'Lv2 돌파 코스',
    goal: '빠른 입출력, 상태 추가 BFS, 경로 복원, 좌표 압축, 방향 시뮬레이션.',
    after: '유형 하나가 아니라 여러 개가 겹친 실전 문제에서 조합해 쓸 수 있습니다.' },

  { id: 's1', lang: 'sql', lv: 1, name: '조회 기초 코스', sub: '표에서 원하는 것 꺼내기', pace: 3, need: '',
    goal: 'SELECT·WHERE·ORDER BY·LIMIT·별칭·NULL·LIKE·DISTINCT 를 보지 않고 씁니다.',
    after: '프로그래머스 SQL Lv1 의 단일 테이블 조회 문제를 막힘없이 풉니다. 쿼리의 골격이 손에 들어옵니다.' },
  { id: 's2', lang: 'sql', lv: 2, name: '집계 코스', sub: 'SQL 문제의 절반', pace: 2, need: '조회 기초 코스',
    goal: 'COUNT·SUM·AVG, GROUP BY 와 HAVING, CASE 분기, 조건부 집계.',
    after: '"~별 집계" 라는 말이 나오는 문제를 바로 GROUP BY 로 옮깁니다. WHERE 와 HAVING 을 헷갈리지 않습니다.' },
  { id: 's3', lang: 'sql', lv: 3, name: 'JOIN 코스', sub: '표가 둘 이상일 때', pace: 2, need: '집계 코스',
    goal: 'INNER JOIN, LEFT JOIN, 조인 후 집계, 날짜와 문자열 함수.',
    after: '표가 세 개 나와도 당황하지 않습니다. "주문이 없는 회원" 같은 문제가 풀립니다.' },
  { id: 's4', lang: 'sql', lv: 4, name: '서브쿼리 코스', sub: '계산을 나눠 쓰기', pace: 2, need: 'JOIN 코스',
    goal: 'WHERE·IN·EXISTS·FROM 서브쿼리, 셀프 조인, UNION.',
    after: '한 번에 안 되는 2단계 계산을 나눠 쓸 수 있습니다. Lv2~3 구간이 열립니다.' },
  { id: 's5', lang: 'sql', lv: 5, name: '윈도우 함수 코스', sub: '행을 잃지 않는 집계', pace: 1, need: '서브쿼리 코스',
    goal: 'RANK·ROW_NUMBER·PARTITION BY, 누적합, LAG/LEAD, CTE(WITH).',
    after: '순위 문제를 공식처럼 풉니다. 실무 리포트 쿼리를 읽을 수 있게 됩니다.' },
  { id: 's6', lang: 'sql', lv: 6, name: 'SQL 실전 코스', sub: '복합 유형', pace: 1, need: '윈도우 함수 코스',
    goal: '그룹별 상위 N개, 조건부 집계 피벗, 없는 것 찾기, 각자의 최신 기록.',
    after: '코딩테스트 SQL 고득점 구간의 출제 형태를 그대로 손에 넣습니다.' }
];


var ORD = {};
CATALOG.forEach(function (c, i) { ORD[c.id] = i; });
function ordOf(p) { return (p && p.srcId != null && ORD[p.srcId] != null) ? ORD[p.srcId] : 99999; }

var DEFAULTS = {
  intervals: [1, 3, 7, 14, 30], pass: 80, retry: true, newGoal: 1,
  streakNeed: 3, secPerLine: 10, baseSec: 30, decayDays: 30, gate: false, gateDone: '', gateSkip: 0,
  trialMax: 10, bankSort: 'lv', drillNote: true, grace: 1, restAfter: 3, demo: false, seenLanding: false,
  guideStep: true
};
var S = {
  problems: [], books: [], insights: [], settings: Object.assign({}, DEFAULTS),
  view: 'dash', form: null, sel: null,
  filter: { q: '', cat: '', lv: '', lang: '' }, test: null, pending: false, mode: 'local', canImport: false,
  packSel: {}, packPerDay: 2, packLv: 1, courseLang: 'python',
  drill: null, daily: {}, courseSel: null, hist: [], restCard: null, landingForced: false,
  detailTab: 'note', explainOpen: null, explainShown: null,
  accountMode: 'local', accountEmail: ''
};

/* ============ storage ============ */
var LS = 'algo-memory:v1';
var DB = null;

function resolveDb() {
  return new Promise(function (resolve) {
    /* 아티팩트 런타임은 iframe 안에서 돌아간다. 최상위 문서(깃허브 페이지 등)라면
       계정 저장소가 있을 수 없으므로 기다리지 않고 브라우저 저장소를 쓴다. */
    var embedded = true;
    try { embedded = (window.top !== window.self); } catch (e) { embedded = true; }
    if (!embedded && !(window.claude && typeof window.claude.use === 'function')) { resolve(null); return; }
    var t0 = Date.now();
    (function tick() {
      if (window.claude && typeof window.claude.use === 'function') {
        try {
          window.claude.use('db').then(function (d) { resolve(d || null); }, function () { resolve(null); });
        } catch (e) { resolve(null); }
        return;
      }
      if (Date.now() - t0 > 4000) { resolve(null); return; }
      setTimeout(tick, 100);
    })();
  });
}

function loadLocal() {
  try {
    var raw = localStorage.getItem(LS);
    if (!raw) return;
    var o = JSON.parse(raw);
    S.problems = o.problems || []; S.books = o.books || []; S.insights = o.insights || [];
    S.settings = Object.assign({}, DEFAULTS, o.settings || {});
    S.daily = o.daily || {};
  } catch (e) { /* storage may be unavailable */ }
}
function exportState() {
  return {
    version: 1,
    problems: S.problems,
    books: S.books,
    insights: S.insights,
    settings: S.settings,
    daily: S.daily
  };
}
function saveLocal() {
  var state = exportState();
  try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* quota or disabled */ }
  try {
    if (window.AlgoCloud && typeof window.AlgoCloud.scheduleSave === 'function') {
      window.AlgoCloud.scheduleSave(state);
    }
  } catch (e2) { /* cloud sync must never block study flow */ }
}
function importState(state, opt) {
  if (!state || typeof state !== 'object') return;
  S.problems = Array.isArray(state.problems) ? state.problems : [];
  S.books = Array.isArray(state.books) ? state.books : [];
  S.insights = Array.isArray(state.insights) ? state.insights : [];
  S.settings = Object.assign({}, DEFAULTS, state.settings || {});
  S.daily = state.daily || {};
  syncCatalogCode();
  try { localStorage.setItem(LS, JSON.stringify(exportState())); } catch (e) { }
  if (opt && opt.source === 'account') toast('계정의 학습 기록을 불러왔습니다');
  render();
}
function setAccountStatus(mode, email) {
  S.accountMode = mode === 'account' ? 'account' : 'local';
  S.accountEmail = email || '';
  var btn = document.getElementById('accountBtn');
  if (btn) {
    btn.textContent = S.accountMode === 'account' ? '내 계정' : '로그인';
    btn.classList.toggle('signed', S.accountMode === 'account');
  }
  softRender();
}

/* 저장은 부가 기능이다. 동기 예외든 거부든 화면 흐름을 절대 막지 않는다. */
function dbWrite(fn) {
  if (!DB) return Promise.resolve();
  try {
    var r = fn();
    return (r && r.then) ? r.then(null, function () { }) : Promise.resolve();
  } catch (e) { return Promise.resolve(); }
}
function strip(o) {
  var c = {};
  Object.keys(o).forEach(function (k) { if (k !== 'id' && o[k] !== undefined) c[k] = o[k]; });
  return c;
}

function put(coll, arr, obj) {
  var i = -1;
  for (var k = 0; k < arr.length; k++) if (arr[k].id === obj.id) { i = k; break; }
  if (i < 0) arr.push(obj); else arr[i] = obj;
  if (DB) return dbWrite(function () { return DB.collection(coll).doc(obj.id).set(strip(obj)); });
  saveLocal(); return Promise.resolve();
}
function putMany(coll, arr, objs) {
  objs.forEach(function (o) { arr.push(o); });
  if (!DB) { saveLocal(); return Promise.resolve(); }
  var i = 0;
  function chunk() {
    if (i >= objs.length) return Promise.resolve();
    var part = objs.slice(i, i + 6); i += 6;
    return Promise.all(part.map(function (o) {
      return dbWrite(function () { return DB.collection(coll).doc(o.id).set(strip(o)); });
    })).then(chunk);
  }
  return chunk().catch(function () { toast('일부 저장에 실패했습니다'); });
}
function drop(coll, arr, id) {
  for (var k = 0; k < arr.length; k++) if (arr[k].id === id) { arr.splice(k, 1); break; }
  if (DB) return dbWrite(function () { return DB.collection(coll).doc(id).delete(); });
  saveLocal(); return Promise.resolve();
}
function saveDaily() {
  if (DB) return dbWrite(function () {
    var rows = Object.keys(S.daily).sort().map(function (k) {
      var v = S.daily[k] || {};
      return { d: k, w: v.w || 0, c: v.c || 0, r: v.r || 0 };
    });
    return DB.doc('config/daily').set({ rows: rows });
  });
  saveLocal(); return Promise.resolve();
}
function saveSettings() {
  if (DB) return dbWrite(function () { return DB.doc('config/settings').set(S.settings); });
  saveLocal(); return Promise.resolve();
}

function subscribe() {
  var sub = function (coll, key) {
    DB.collection(coll).onSnapshot(function (snap) {
      S[key] = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      if (key === 'problems') syncCatalogCode();
      checkImport(); softRender();
    }, function () { });
  };
  sub('problems', 'problems');
  /* 독서·인사이트는 화면에서 걷어냈다. 이미 저장된 문서는 지우지 않고 그대로 둔다. */
  DB.doc('config/settings').onSnapshot(function (s) {
    if (s.exists) S.settings = Object.assign({}, DEFAULTS, s.data());
    softRender();
  }, function () { });
  DB.doc('config/daily').onSnapshot(function (s) {
    if (!s.exists) return;
    var data = s.data() || {}, out = {};
    if (Array.isArray(data.rows)) {
      data.rows.forEach(function (r) {
        if (r && r.d) out[r.d] = { w: r.w || 0, c: r.c || 0, r: r.r || 0 };
      });
    } else if (data.days) {
      Object.keys(data.days).forEach(function (k) { out[k] = data.days[k]; });
    }
    S.daily = out;
    softRender();
  }, function () { });
}

var _localBackup = null;
function checkImport() {
  if (S.mode !== 'cloud' || !_localBackup) return;
  var cloudEmpty = !S.problems.length && !S.books.length && !S.insights.length;
  var localHas = (_localBackup.problems || []).length || (_localBackup.books || []).length || (_localBackup.insights || []).length;
  S.canImport = !!(cloudEmpty && localHas);
}
function importLocal() {
  if (!_localBackup || !DB) return;
  var jobs = [];
  (_localBackup.problems || []).forEach(function (p) { jobs.push(DB.collection('problems').doc(p.id).set(strip(p))); });
  (_localBackup.books || []).forEach(function (b) { jobs.push(DB.collection('books').doc(b.id).set(strip(b))); });
  (_localBackup.insights || []).forEach(function (i) { jobs.push(DB.collection('insights').doc(i.id).set(strip(i))); });
  if (_localBackup.settings) jobs.push(DB.doc('config/settings').set(Object.assign({}, DEFAULTS, _localBackup.settings)));
  Promise.all(jobs).then(function () { S.canImport = false; toast('로컬 데이터를 가져왔습니다'); render(); },
    function () { toast('가져오기 중 일부가 실패했습니다'); });
}

/* ============ code analysis ============ */
function stripBlocks(code, lang) {
  if (lang === 'python') return code.replace(/"""[\s\S]*?"""/g, '').replace(/'''[\s\S]*?'''/g, '');
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}
function stripLine(line, mode) {
  var q = null;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (mode === 'py' && c === '#') return line.slice(0, i);
    if (mode === 'sql' && c === '-' && line[i + 1] === '-') return line.slice(0, i);
    if (mode === 'c' && c === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}
function normalize(code, lang) {
  var mode = lang === 'python' ? 'py' : (lang === 'sql' ? 'sql' : 'c');
  var src = stripBlocks(String(code || ''), lang).replace(/\r\n?/g, '\n');
  var out = [];
  src.split('\n').forEach(function (raw) {
    var s = stripLine(raw, mode);
    var lead = (s.match(/^[\t ]*/) || [''])[0].replace(/\t/g, '    ');
    var body = s.trim().replace(/[ \t]+/g, ' ');
    if (!body) return;
    var depth = Math.round(lead.length / 4);
    out.push({ depth: depth, text: body, key: depth + '\u0001' + body });
  });
  return out;
}
function lcsDiff(a, b) {
  var n = a.length, m = b.length, i, j;
  var dp = []; for (i = 0; i <= n; i++) dp.push(new Int32Array(m + 1));
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
    dp[i][j] = a[i].key === b[j].key ? dp[i + 1][j + 1] + 1 : (dp[i + 1][j] >= dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1]);
  var ops = []; i = 0; j = 0;
  while (i < n && j < m) {
    if (a[i].key === b[j].key) { ops.push({ t: 'same', a: a[i], b: b[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: 'miss', a: a[i] }); i++; }
    else { ops.push({ t: 'extra', b: b[j] }); j++; }
  }
  while (i < n) ops.push({ t: 'miss', a: a[i++] });
  while (j < m) ops.push({ t: 'extra', b: b[j++] });
  return { ops: ops, lcs: n && m ? dp[0][0] : 0, n: n, m: m };
}
function pairSim(x, y) {
  var L = Math.min(x.length, y.length), p = 0, s = 0;
  while (p < L && x[p] === y[p]) p++;
  while (s < L - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  return (p + s) / Math.max(x.length, y.length, 1);
}
function markPair(x, y) {
  var L = Math.min(x.length, y.length), p = 0, s = 0;
  while (p < L && x[p] === y[p]) p++;
  while (s < L - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
  function wrap(t) {
    var mid = t.slice(p, t.length - s);
    return esc(t.slice(0, p)) + (mid ? '<mark>' + esc(mid) + '</mark>' : '') + esc(t.slice(t.length - s));
  }
  return [wrap(x), wrap(y)];
}
function features(lines) {
  var f = {}, names = [];
  function bump(k) { f[k] = (f[k] || 0) + 1; }
  lines.forEach(function (l) {
    var t = l.text, m;
    if ((m = /^def\s+(\w+)/.exec(t))) { bump('함수 정의(def)'); names.push(m[1]); }
    if (/^class\s+\w+/.test(t)) bump('클래스 정의');
    if (/^(import|from)\s+/.test(t)) bump('import 구문');
    if (/^for\b/.test(t)) bump('for 반복문');
    if (/^while\b/.test(t)) bump('while 반복문');
    if (/^if\b/.test(t)) bump('if 분기');
    if (/^elif\b|^else\s+if\b/.test(t)) bump('elif 분기');
    if (/^else\b/.test(t)) bump('else 분기');
    if (/\breturn\b/.test(t)) bump('return 반환');
    if (/\bdeque\b/.test(t)) bump('deque');
    if (/\bheap(q|push|pop)/.test(t)) bump('heapq');
    if (/\bdefaultdict\b|\bCounter\b/.test(t)) bump('collections');
    if (/\bvisited\b|\bchecked\b/.test(t)) bump('방문 배열');
    if (/\bdp\b/.test(t)) bump('dp 배열');
    if (/sys\.stdin|readline|input\(\)|Scanner|cin\s*>>/.test(t)) bump('입력 처리');
    if (/\bprint\(|System\.out|cout\s*<</.test(t)) bump('출력 처리');
    if (/\bsort(ed)?\s*\(|\.sort\(/.test(t)) bump('정렬');
    if (/\[[^\]]*\bfor\s+\w+\s+in\b/.test(t)) bump('리스트 컴프리헨션');
    if (/setrecursionlimit/.test(t)) bump('재귀 한도 설정');
  });
  if (names.length) {
    lines.forEach(function (l) {
      if (/^def\s/.test(l.text)) return;
      for (var i = 0; i < names.length; i++) {
        if (new RegExp('\\b' + names[i] + '\\s*\\(').test(l.text)) { bump('함수 호출/재귀'); break; }
      }
    });
  }
  return f;
}
function featuresSql(lines) {
  var f = {};
  function bump(k) { f[k] = (f[k] || 0) + 1; }
  var all = lines.map(function (l) { return l.text; }).join('\n');
  var U = all.toUpperCase();
  function cnt(re) { return (U.match(re) || []).length; }
  if (cnt(/\bSELECT\b/g)) bump('SELECT');
  if (cnt(/\bFROM\b/g)) bump('FROM');
  if (cnt(/\bWHERE\b/g)) bump('WHERE 조건');
  if (cnt(/\bGROUP\s+BY\b/g)) bump('GROUP BY');
  if (cnt(/\bHAVING\b/g)) bump('HAVING');
  if (cnt(/\bORDER\s+BY\b/g)) bump('ORDER BY');
  if (cnt(/\bLIMIT\b/g)) bump('LIMIT');
  if (cnt(/\bDISTINCT\b/g)) bump('DISTINCT');
  var j = cnt(/\bJOIN\b/g); if (j) { f['JOIN'] = j; }
  if (cnt(/\bLEFT\s+JOIN\b/g)) bump('LEFT JOIN');
  var on = cnt(/\bON\b/g); if (on) { f['ON 연결 조건'] = on; }
  if (cnt(/\bCASE\b/g)) bump('CASE 분기');
  var wh = cnt(/\bWHEN\b/g); if (wh) { f['WHEN 조건'] = wh; }
  if (cnt(/\bEND\b/g)) bump('END');
  if (cnt(/\bOVER\s*\(/g)) bump('윈도우 함수(OVER)');
  if (cnt(/\bPARTITION\s+BY\b/g)) bump('PARTITION BY');
  if (cnt(/\bWITH\b/g)) bump('CTE(WITH)');
  if (cnt(/\bUNION\b/g)) bump('UNION');
  if (cnt(/\bEXISTS\b/g)) bump('EXISTS');
  if (cnt(/\bIS\s+NULL\b/g)) bump('IS NULL');
  if (cnt(/\bLIKE\b/g)) bump('LIKE');
  if (cnt(/\bBETWEEN\b/g)) bump('BETWEEN');
  var agg = cnt(/\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/g); if (agg) { f['집계 함수'] = agg; }
  var sub = (all.match(/\(\s*SELECT\b/gi) || []).length; if (sub) { f['서브쿼리'] = sub; }
  var alias = cnt(/\bAS\b/g); if (alias) { f['AS 별칭'] = alias; }
  return f;
}
function tagOfSql(t) {
  var u = t.toUpperCase();
  if (/^SELECT\b/.test(u)) return 'SELECT 열 목록';
  if (/^FROM\b|^JOIN\b|^LEFT\b|^INNER\b/.test(u)) return 'FROM·JOIN';
  if (/^ON\b/.test(u)) return 'ON 연결 조건';
  if (/^WHERE\b|^AND\b|^OR\b/.test(u)) return 'WHERE 조건';
  if (/^GROUP\b|^HAVING\b/.test(u)) return 'GROUP BY·HAVING';
  if (/^ORDER\b|^LIMIT\b/.test(u)) return 'ORDER BY·LIMIT';
  if (/^WHEN\b|^ELSE\b|^CASE\b|^END\b/.test(u)) return 'CASE 분기';
  if (/OVER\s*\(/.test(u)) return '윈도우 함수';
  if (/^WITH\b|^\)/.test(u)) return 'CTE 구조';
  return '표현식';
}
function tagOf(t) {
  if (/^(for|while)\b/.test(t)) return '반복문';
  if (/^(if|elif|else)\b/.test(t)) return '조건 분기';
  if (/^(def|class)\b/.test(t)) return '함수·클래스 정의';
  if (/^(import|from)\b/.test(t)) return 'import';
  if (/\breturn\b/.test(t)) return 'return 반환';
  if (/deque|heapq|defaultdict|Counter|set\(|dict\(|\[0\]\s*\*|\[\[/.test(t)) return '자료구조 초기화';
  if (/input\(|print\(|sys\.|readline|cin|cout/.test(t)) return '입출력';
  if (/\w+\s*\[[^\]]*\]/.test(t)) return '인덱싱/슬라이싱';
  return '로직·수식';
}

function grade(original, answer, lang) {
  var tagFn = (lang === 'sql') ? tagOfSql : tagOf;
  var A = normalize(original, lang), B = normalize(answer, lang);
  var d = lcsDiff(A, B);
  var rate = (A.length + B.length) ? Math.round((2 * d.lcs / (A.length + B.length)) * 1000) / 10 : 0;

  /* pair up miss/extra runs so near-misses read as one edited line */
  var rows = [], tags = {}, i = 0;
  var surface = 0, hard = 0, weak = [];
  function tag(t) { tags[t] = (tags[t] || 0) + 1; }
  function markHard(line) { hard++; if (weak.indexOf(line) < 0 && weak.length < 8) weak.push(line); }
  while (i < d.ops.length) {
    var op = d.ops[i];
    if (op.t === 'same') { rows.push({ k: 'same', d: op.a.depth, t: op.a.text }); i++; continue; }
    var miss = [], extra = [];
    while (i < d.ops.length && d.ops[i].t === 'miss') { miss.push(d.ops[i].a); i++; }
    while (i < d.ops.length && d.ops[i].t === 'extra') { extra.push(d.ops[i].b); i++; }
    var pairs = Math.min(miss.length, extra.length), k;
    for (k = 0; k < pairs; k++) {
      var h = markPair(miss[k].text, extra[k].text);
      var soft = (miss[k].text === extra[k].text) || pairSim(miss[k].text, extra[k].text) >= 0.75;
      rows.push({ k: 'miss', d: miss[k].depth, html: h[0], soft: soft });
      rows.push({ k: 'extra', d: extra[k].depth, html: h[1], soft: soft });
      if (miss[k].text === extra[k].text) tag('들여쓰기'); else tag(tagFn(miss[k].text));
      if (soft) surface++; else markHard(miss[k].text);
    }
    for (k = pairs; k < miss.length; k++) {
      rows.push({ k: 'miss', d: miss[k].depth, t: miss[k].text });
      tag(tagFn(miss[k].text)); markHard(miss[k].text);
    }
    for (k = pairs; k < extra.length; k++) {
      rows.push({ k: 'extra', d: extra[k].depth, t: extra[k].text });
      tag('불필요한 라인'); hard++;
    }
  }

  /* structural check */
  var isSql = (lang === 'sql');
  var fa = isSql ? featuresSql(A) : features(A);
  var fb = isSql ? featuresSql(B) : features(B);
  var checks = [];
  Object.keys(fa).forEach(function (k) {
    var need = fa[k], got = fb[k] || 0;
    checks.push({ k: k, need: need, got: got, ok: got >= need });
  });
  checks.sort(function (x, y) { return (x.ok === y.ok) ? y.need - x.need : (x.ok ? 1 : -1); });

  return {
    rate: rate, rows: rows, checks: checks, surface: surface, hard: hard, weak: weak,
    tags: Object.keys(tags).map(function (k) { return { k: k, n: tags[k] }; }).sort(function (a, b) { return b.n - a.n; }),
    origLines: A.length, userLines: B.length, matched: d.lcs
  };
}

/* ============ syntax highlight ============ */
var KW = /^(def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|lambda|yield|break|continue|pass|global|nonlocal|is|None|True|False|self|void|int|public|private|static|const|let|var|function|new|null|true|false|fun|val|struct|include|using|namespace)$/;
var BI = /^(print|range|len|str|input|append|appendleft|popleft|sorted|sort|set|dict|list|tuple|map|sum|min|max|abs|enumerate|zip|deque|heapq|heappush|heappop|defaultdict|Counter|sys|math|bisect|reversed|any|all|divmod|pow|ord|chr|join|split|strip|add|remove|pop|copy|format)$/;
var SQL_KW = /^(SELECT|FROM|WHERE|GROUP|BY|HAVING|ORDER|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|ON|AS|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|DISTINCT|CASE|WHEN|THEN|ELSE|END|UNION|ALL|WITH|RECURSIVE|OVER|PARTITION|ASC|DESC|EXISTS|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|PRIMARY|KEY|INTEGER|TEXT)$/i;
var SQL_FN = /^(COUNT|SUM|AVG|MAX|MIN|IFNULL|COALESCE|ROUND|ABS|SUBSTRING|SUBSTR|CHAR_LENGTH|LENGTH|CONCAT|UPPER|LOWER|TRIM|REPLACE|DATE_FORMAT|STRFTIME|YEAR|MONTH|DAY|DATEDIFF|NOW|RANK|DENSE_RANK|ROW_NUMBER|LAG|LEAD|GROUP_CONCAT|CAST)$/i;
function hlSql(code) {
  var src = String(code || ''), out = '', last = 0;
  var re = /(--[^\n]*)|('(?:[^'\\]|\\.|'')*')|([A-Za-z_][\w]*)|(\b\d+\.?\d*\b)/g;
  var m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) out += '<span class="t-c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="t-s">' + esc(m[2]) + '</span>';
    else if (m[3]) {
      if (SQL_KW.test(m[3])) out += '<span class="t-k">' + esc(m[3]) + '</span>';
      else if (SQL_FN.test(m[3])) out += '<span class="t-b">' + esc(m[3]) + '</span>';
      else out += esc(m[3]);
    } else out += '<span class="t-n">' + esc(m[4]) + '</span>';
  }
  out += esc(src.slice(last));
  return out;
}
function hl(code, lang) {
  if (lang === 'sql') return hlSql(code);
  return hlPy(code);
}
function hlPy(code) {
  var src = String(code || ''), out = '', last = 0;
  var re = /(#[^\n]*|\/\/[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|([A-Za-z_]\w*)|(\b\d+\.?\d*\b)/g;
  var m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) out += '<span class="t-c">' + esc(m[1]) + '</span>';
    else if (m[2]) out += '<span class="t-s">' + esc(m[2]) + '</span>';
    else if (m[3]) {
      if (KW.test(m[3])) out += '<span class="t-k">' + esc(m[3]) + '</span>';
      else if (BI.test(m[3])) out += '<span class="t-b">' + esc(m[3]) + '</span>';
      else out += esc(m[3]);
    } else out += '<span class="t-n">' + esc(m[4]) + '</span>';
  }
  out += esc(src.slice(last));
  return out;
}

/* ============ derived data ============ */
function dueList() {
  var T = today(), out = [];
  S.problems.forEach(function (p) {
    (p.schedule || []).forEach(function (s, i) {
      if (resting(p)) return;
      if (!s.done && dayDiff(s.due, T) >= 0) out.push({ p: p, s: s, i: i, late: dayDiff(s.due, T) });
    });
  });
  out.forEach(function (d) { d.risk = riskOf(d.p, d.late); });
  out.sort(function (a, b) { return b.risk - a.risk || ordOf(a.p) - ordOf(b.p); });
  return out;
}
function doneOn(date) {
  var n = 0;
  S.problems.forEach(function (p) { (p.schedule || []).forEach(function (s) { if (s.done && s.doneAt === date) n++; }); });
  return n;
}
function dueOn(date) {
  var n = 0;
  S.problems.forEach(function (p) { (p.schedule || []).forEach(function (s) { if (s.due === date) n++; }); });
  return n;
}
function overdueCount() {
  var T = today(), n = 0;
  S.problems.forEach(function (p) { (p.schedule || []).forEach(function (s) { if (!s.done && dayDiff(s.due, T) > 0) n++; }); });
  return n;
}
function avgRate(p) {
  var a = (p.attempts || []); if (!a.length) return null;
  var s = 0; a.forEach(function (x) { s += x.rate; });
  return Math.round(s / a.length * 10) / 10;
}
function bumpDaily(written, correct) {
  var T = today(), d = S.daily[T] || { w: 0, c: 0, r: 0 };
  d.w += written; d.c += correct; d.r += 1;
  S.daily[T] = d;
  var keys = Object.keys(S.daily).sort();
  while (keys.length > 150) { delete S.daily[keys.shift()]; }
  saveDaily();
}
function dayLines(date) { return (S.daily[date] || {}).w || 0; }
function writeStreak() {
  var n = 0, T = today();
  if (!dayLines(T)) {
    if (!dayLines(addDays(T, -1))) return 0;
    T = addDays(T, -1);
  }
  while (dayLines(T) > 0) { n++; T = addDays(T, -1); }
  return n;
}
var KO_RE = /[\uac00-\ud7a3\u3131-\u318e]/;
/* 내장 코드에서 한글을 뺐다. 예전에 등록된 사본은 데이터가 실제로 도착한 뒤에
   매번 확인해서 고친다. 고칠 게 없으면 아무 일도 하지 않으므로 반복 호출해도 안전하다. */
function syncCatalogCode() {
  if (!S.problems.length) return 0;
  var byId = {};
  CATALOG.forEach(function (c) { byId[c.id] = c; });
  var fixes = [];
  S.problems.forEach(function (p) {
    var c = p.srcId && byId[p.srcId];
    if (!c) return;
    if (KO_RE.test(p.code || '') && !KO_RE.test(c.code)) {
      fixes.push(Object.assign({}, p, { code: c.code, logic: c.logic, brief: c.brief }));
    }
  });
  fixes.forEach(function (np) { put('problems', S.problems, np); });
  return fixes.length;
}
/* 실전 전 단계에서 보여줄 안내 목록.
   줄별 해설이 있으면 그걸 순서대로, 없으면 설명과 핵심 포인트로 대신한다. */
function guideItems(p) {
  var rows = walkRows(p);
  if (rows) {
    return {
      kind: 'walk',
      items: rows.map(function (r) { return r.note || '(이 줄은 설명이 없습니다)'; })
    };
  }
  var c = noteOf(p);
  var out = [];
  if (p.brief) out.push(p.brief);
  if (c && c.story) out.push(c.story);
  if (p.logic) out.push(p.logic);
  if (c && c.keys) c.keys.forEach(function (k) { out.push(k); });
  return { kind: 'rough', items: out.length ? out : ['이 문제에는 등록된 해설이 없습니다.'] };
}
function everPassed(p) {
  return (p.attempts || []).some(function (a) { return a.perfect && !a.guide; });
}
function noteOf(p) {
  if (!p || !p.srcId) return null;
  var c = CATALOG.filter(function (x) { return x.id === p.srcId; })[0];
  return c && c.story ? c : null;
}
function walkRows(p) {
  var c = noteOf(p);
  if (!c || !c.walk || !c.walk.length) return null;
  var lines = catalogCode(p).split('\n').filter(function (l) { return l.trim(); });
  if (lines.length !== c.walk.length) return null;
  return lines.map(function (l, i) { return { code: l, note: c.walk[i] }; });
}
function catalogCode(p) {
  var c = p.srcId && CATALOG.filter(function (x) { return x.id === p.srcId; })[0];
  if (c && KO_RE.test(p.code || '') && !KO_RE.test(c.code)) return c.code;
  return p.code;
}
function normLines(p) { return normalize(catalogCode(p), p.lang || 'python').length; }
function timeLimit(p) { return normLines(p) * S.settings.secPerLine + S.settings.baseSec; }
function mmss(sec) { return pad(Math.floor(sec / 60)) + ':' + pad(Math.floor(sec % 60)); }
function traceTarget(p) {
  var lines = String(p.code || '').replace(/\r\n?/g, '\n').split('\n')
    .map(function (l) { return l.replace(/[ \t]+$/, ''); });
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  return lines.join('\n');
}
/* 마지막 실패에서 틀린 줄들을 앞뒤 한 줄씩 붙여 잘라낸다.
   한 줄만 떼면 맥락이 사라져서 무슨 코드인지 알 수 없다. */
function blockTarget(p) {
  var w = p.weak && p.weak.lines;
  if (!w || !w.length) return null;
  var raw = catalogCode(p).replace(/\r\n?/g, '\n').split('\n');
  var norm = raw.map(function (l) { return l.trim().replace(/\s+/g, ' '); });
  var hits = [];
  w.forEach(function (t) {
    var k = String(t).trim().replace(/\s+/g, ' ');
    norm.forEach(function (n, i) { if (n && n === k) hits.push(i); });
  });
  if (!hits.length) return null;
  var lo = Math.max(0, Math.min.apply(null, hits) - 1);
  var hi = Math.min(raw.length - 1, Math.max.apply(null, hits) + 1);
  var out = raw.slice(lo, hi + 1).map(function (l) { return l.replace(/[ \t]+$/, ''); });
  while (out.length && !out[0].trim()) out.shift();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  if (!out.length) return null;
  var txt = out.join('\n');
  /* 전체와 사실상 같으면 블록 훈련의 의미가 없다 */
  if (traceLines(txt) >= traceLines(traceTarget({ code: catalogCode(p) })) - 1) return null;
  return { text: txt, from: lo + 1, to: hi + 1 };
}
function traceLines(t) { return t.split('\n').filter(function (l) { return l.trim(); }).length; }
function todayFails(p) {
  var T = today();
  return (p.attempts || []).filter(function (a) { return a.at === T && !a.perfect; }).length;
}
function resting(p) { return p.restUntil && dayDiff(today(), p.restUntil) > 0; }
function riskOf(p, late) {
  var a = (p.attempts || []).slice(-5);
  var rate = a.length ? a.reduce(function (x, y) { return x + y.rate; }, 0) / a.length : 100;
  var missAvg = a.length ? a.reduce(function (x, y) { return x + ((y.miss || []).length); }, 0) / a.length : 0;
  return (late || 0) * 3 + (100 - rate) / 10 + missAvg * 2 + ((p.trial || 1) - 1) * 2 + (p.giveups || 0);
}
function mastery(p) {
  var need = S.settings.streakNeed, st = p.streak || 0;
  if (p.masteredAt) {
    if (dayDiff(p.masteredAt, today()) > S.settings.decayDays)
      return { k: 'recheck', label: '재확인 필요', st: st, need: need };
    return { k: 'done', label: '암기 완료', st: st, need: need };
  }
  if (st > 0) return { k: 'near', label: '굳히는 중 ' + st + '/' + need, st: st, need: need };
  if ((p.attempts || []).length) return { k: '암기중', label: '암기 중', st: 0, need: need };
  return { k: 'none', label: '미착수', st: 0, need: need };
}
function masteryChip(m) {
  var cls = m.k === 'done' ? 'accent' : (m.k === 'recheck' ? 'bad' : (m.k === 'near' ? 'warn' : ''));
  return '<span class="chip ' + cls + '">' + (m.k === 'done' ? '✓ ' : '') + esc(m.label) + '</span>';
}
function masteredCount() {
  return S.problems.filter(function (p) { return mastery(p).k === 'done'; }).length;
}
function gateProblem() {
  if (!S.settings.gate) return null;
  if (S.settings.gateDone === today()) return null;
  var due = dueList();
  if (due.length) return { p: due[0].p, i: due[0].i };
  var re = S.problems.filter(function (p) { return mastery(p).k === 'recheck'; });
  if (re.length) return { p: re[0], i: null };
  return null;
}
function rateClass(r) { return r == null ? '' : (r >= S.settings.pass ? 'g' : (r >= 60 ? 'w' : 'b')); }
function nextDue(p) {
  var arr = (p.schedule || []).filter(function (s) { return !s.done; });
  if (!arr.length) return null;
  arr.sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  return arr[0].due;
}

/* ============ views ============ */
function tile(lab, big, unit, note, pct, cls) {
  return '<div class="tile"><div class="lab">' + esc(lab) + '</div>' +
    '<div class="big">' + big + (unit ? '<em>' + esc(unit) + '</em>' : '') + '</div>' +
    (note ? '<div class="note">' + esc(note) + '</div>' : '') +
    '<div class="bar ' + (cls || '') + '"><i style="width:' + clamp(pct, 0, 100) + '%"></i></div></div>';
}

/* 표지. 기록이 하나라도 있으면 다시 나오지 않는다 — 매일 여는 사람에게는 마찰일 뿐이다. */
function showLanding() {
  if (S.landingForced) return true;
  return !S.problems.length && !S.settings.seenLanding;
}
var LANDING_CODE = [
  'from collections import deque',
  '',
  'def bfs(grid):',
  '    n, m = len(grid), len(grid[0])',
  '    dist = [[0] * m for _ in range(n)]',
  '    q = deque([(0, 0)])',
  '    dist[0][0] = 1',
  '    while q:',
  '        r, c = q.popleft()',
  '        for dr, dc in ((-1,0),(1,0),(0,-1),(0,1)):',
  '            nr, nc = r + dr, c + dc',
  '            if 0 <= nr < n and 0 <= nc < m:',
  '                dist[nr][nc] = dist[r][c] + 1'
];
function renderLanding() {
  var el = document.getElementById('landing');
  if (!el) return;
  if (!showLanding()) { el.hidden = true; el.innerHTML = ''; document.body.classList.remove('cover'); return; }
  el.hidden = false;
  document.body.classList.add('cover');
  el.innerHTML =
    '<div class="lwrap">' +
    '<div class="lbrand"><span class="dot"></span>Algo-Memory<small>EBBINGHAUS DRILL</small></div>' +
    '<h1 class="lhead">당신의 코딩 기억은<br><em>안녕하십니까?</em></h1>' +
    '<p class="lsub">한 달 전에 통과했던 그 코드, 지금 빈 화면에 다시 쓸 수 있습니까.<br>' +
    '푸는 것과 기억하는 것은 다른 일입니다.</p>' +
    '<div class="lfade"><pre class="lcode">' +
    LANDING_CODE.map(function (l) { return l ? hl(l) : ' '; }).join('\n') +
    '</pre><span class="lday">30일 뒤</span></div>' +
    '<div class="lbtns">' +
    '<button class="btn accent" data-act="enter">들어가기</button>' +
    '<button class="btn" data-act="enter-demo">예시 데이터로 둘러보기</button>' +
    '</div>' +
    '<div class="lproof">' +
    ['실행 검증을 통과한 템플릿 ' + CATALOG.length + '개',
     '파이썬 ' + CATALOG.filter(function (c) { return c.lang === 'python'; }).length + ' · SQL ' + CATALOG.filter(function (c) { return c.lang === 'sql'; }).length,
     '각 언어 난이도 6단계 · 첫걸음부터 코테 실전까지',
     '줄별 해설 · 종단 테스트 자동 실행'].map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') +
    '</div>' +
    '<p class="lnote">기록은 이 브라우저에만 남습니다. 로그인도, 서버도 없습니다.</p>' +
    '</div>';
}

function viewDash() {
  var due = dueList(), T = today();
  var gp = gateProblem();
  if (gp) {
    var gm = mastery(gp.p);
    return '<div class="card pad gate">' +
      '<div class="chip bad" style="margin-bottom:10px">오늘의 관문</div>' +
      '<h2 style="font-size:20px;margin-bottom:6px">' + esc(gp.p.title) + '</h2>' +
      '<div class="row small muted" style="margin-bottom:14px">' +
      '<span class="chip">' + esc(gp.p.category || '미분류') + '</span>' +
      '<span class="chip mono">' + normLines(gp.p) + '줄</span>' +
      '<span class="chip mono">제한 ' + mmss(timeLimit(gp.p)) + '</span>' +
      masteryChip(gm) + '</div>' +
      '<p class="small" style="color:var(--ink-2);margin-bottom:16px">' +
      '이 문제를 힌트 없이, 제한 시간 안에, 100% 재현해야 나머지 화면이 열립니다. ' +
      '조건을 하나라도 못 맞추면 연속 기록은 0으로 돌아갑니다.</p>' +
      '<div class="row"><button class="btn accent" data-act="gate-start">관문 시작</button>' +
      '<button class="btn ghost small" data-act="gate-skip">오늘은 건너뛰기</button>' +
      (S.settings.gateSkip ? '<span class="small muted">누적 회피 ' + S.settings.gateSkip + '회</span>' : '') +
      '</div></div>';
  }
  var doneT = doneOn(T), totalT = doneT + due.length;
  var newT = S.problems.filter(function (p) { return p.createdAt === T; }).length;
  var over = due.filter(function (d) { return d.late > 0; }).length;

  var h = '';
  if (S.canImport) {
    h += '<div class="card pad" style="margin-bottom:16px;border-color:var(--accent)">' +
      '<div class="row"><div class="grow"><strong>이 브라우저에 저장된 기록이 있습니다.</strong>' +
      '<div class="small muted">계정 저장소가 비어 있습니다. 기존 로컬 기록을 옮길 수 있습니다.</div></div>' +
      '<button class="btn accent" data-act="import">가져오기</button>' +
      '<button class="btn ghost" data-act="dismiss-import">나중에</button></div></div>';
  }

  h += '<div class="today-strip">' +
    tile('오늘의 복습', doneT + '<em>/' + totalT + '</em>', '건',
      over ? over + '건 지연 중' : '지연 없음',
      totalT ? doneT / totalT * 100 : 100, over ? 'bad' : '') +
    tile('신규 등록', newT + '<em>/' + S.settings.newGoal + '</em>', '문제', '오늘 새로 암기할 문제',
      S.settings.newGoal ? newT / S.settings.newGoal * 100 : 100) +
    (S.problems.length ? tile('암기 완료', masteredCount() + '<em>/' + S.problems.length + '</em>', '개',
      '연속 ' + S.settings.streakNeed + '회 완벽 재현',
      masteredCount() / S.problems.length * 100) : '') +
    tile('오늘 쓴 줄', dayLines(T), '줄',
      (writeStreak() ? '연속 ' + writeStreak() + '일 기록 중' : '오늘부터 다시 시작'),
      Math.min(100, dayLines(T) / 40 * 100), 'warn') +
    '</div>';

  var recheck = S.problems.filter(function (p) { return mastery(p).k === 'recheck'; });
  if (recheck.length) {
    h += '<div class="sect-h"><h2>재확인이 필요한 문제</h2><span class="sub">' + recheck.length + '개 · 암기 후 ' + S.settings.decayDays + '일 경과</span></div>' +
      '<div class="qlist" style="margin-bottom:22px">' + recheck.slice(0, 6).map(function (p) {
        return '<div class="qrow over"><div class="meta"><div class="ttl">' + esc(p.title) + '</div>' +
          '<div class="sub"><span class="chip">' + esc(p.category || '미분류') + '</span>' +
          '<span class="chip bad">' + dayDiff(p.masteredAt, T) + '일 전 암기</span></div></div>' +
          '<button class="btn accent sm" data-act="live" data-p="' + p.id + '">실전</button></div>';
      }).join('') + '</div>';
  }

  if (S.restCard) {
    h += '<div class="card pad" style="margin-bottom:20px;border-color:var(--warn)">' +
      '<div class="chip warn" style="margin-bottom:10px">오늘은 여기까지</div>' +
      '<h2 style="font-size:17px;margin-bottom:6px">' + esc(S.restCard.title) + '</h2>' +
      '<p class="small" style="color:var(--ink-2);margin-bottom:12px">' +
      '오늘 이 문제에서 ' + S.restCard.fails + '번 막혔습니다. 여기서 더 반복해도 잘 안 들어갑니다. ' +
      '깜지 횟수는 올리지 않았고 내일 다시 꺼내드립니다. 다른 문제를 하시거나 오늘은 접으셔도 됩니다.</p>' +
      '<div class="row"><button class="btn" data-act="rest-ok">알겠습니다</button>' +
      '<button class="btn ghost" data-act="rest-force" data-p="' + esc(S.restCard.id) + '">그래도 한 번 더</button></div></div>';
  }

  var rested = S.problems.filter(resting);
  if (rested.length && !S.restCard) {
    h += '<div class="card pad" style="margin-bottom:16px"><div class="row">' +
      '<span class="chip warn">쉬는 중 ' + rested.length + '건</span>' +
      '<span class="small muted grow">' + esc(rested.map(function (x) { return x.title; }).slice(0, 3).join(', ')) +
      ' — 오늘 여러 번 막혀서 내일로 미뤘습니다</span></div></div>';
  }

  if (!S.problems.length) {
    h += '<div class="card pad intro" style="margin-bottom:20px">' +
      '<h2 style="font-size:19px;margin-bottom:8px">코딩테스트 코드를 통째로 외우고, 정말 외웠는지 검증합니다</h2>' +
      '<p style="color:var(--ink-2);margin-bottom:14px;line-height:1.7">' +
      '연습지 위의 코드를 그대로 따라 쳐서 손에 넣고(<b>깜지</b>), 며칠 뒤 백지에서 다시 씁니다(<b>실전</b>). ' +
      '막히면 다음번 깜지 횟수가 늘어납니다. 에빙하우스 망각곡선으로 1·3·7·14·30일 복습이 자동으로 잡힙니다.</p>' +
      '<div class="introgrid">' +
      [['검증된 템플릿 ' + CATALOG.length + '개', '파이썬 ' + CATALOG.filter(function (c) { return c.lang === 'python'; }).length + '개, SQL ' + CATALOG.filter(function (c) { return c.lang === 'sql'; }).length + '개. 전부 실행해서 통과한 코드'],
       ['언어별 난이도 6단계', '첫걸음부터 코테 실전까지, 배우는 순서대로'],
       ['줄별 해설', '베끼기만 하지 않도록 한 줄씩 무슨 뜻인지'],
       ['암기 판정', '연속 3회 완벽 재현해야 암기 완료']
      ].map(function (x) {
        return '<div class="introcell"><strong>' + esc(x[0]) + '</strong><span>' + esc(x[1]) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="row" style="margin-top:16px">' +
      '<button class="btn accent" data-act="seed-demo">예시 데이터로 둘러보기</button>' +
      '<button class="btn" data-act="go-pack">코스 고르기</button>' +
      '<button class="btn ghost" data-act="go-bank-new">내 문제 직접 등록</button></div>' +
      '<div class="small muted" style="margin-top:12px">' +
      (S.mode === 'cloud'
        ? '기록은 계정 저장소에 저장되어 기기 간 동기화됩니다.'
        : '기록은 <b>이 브라우저에만</b> 저장됩니다. 서버로 아무것도 보내지 않고 로그인도 없습니다. ' +
          '브라우저 데이터를 지우면 함께 사라지니, 오래 쓰실 거면 설정에서 JSON 백업을 받아두세요.') +
      '</div></div>';
  }

  var fresh = S.problems.filter(function (p) {
    return p.createdAt === T && !(p.attempts || []).length;
  }).sort(function (a, b) { return ordOf(a) - ordOf(b); });
  if (fresh.length) {
    h += '<div class="sect-h"><h2>오늘 새로 외울 문제</h2><span class="sub">' + fresh.length + '개</span></div>' +
      '<div class="qlist" style="margin-bottom:22px">' + fresh.map(function (p) {
        return '<div class="qrow"><div class="meta"><div class="ttl">' + esc(p.title) + '</div>' +
          '<div class="sub"><span class="chip">' + esc(p.category || '미분류') + '</span>' +
          '<span class="muted">' + esc(p.brief || p.logic || '') + '</span></div></div>' +
          '<button class="btn accent sm" data-act="train" data-p="' + p.id + '">훈련 시작</button></div>';
      }).join('') + '</div>';
  }

  if (S.settings.gate) {
    h += '<div class="card pad" style="margin-bottom:18px"><div class="row">' +
      '<span class="chip accent">관문 모드 켜짐</span>' +
      '<span class="small muted grow">오늘 통과할 관문이 없습니다. 복습 예정이 잡히거나 재확인 대상이 생기면 이 화면이 먼저 막힙니다.</span>' +
      (S.settings.gateSkip ? '<span class="small muted">누적 회피 ' + S.settings.gateSkip + '회</span>' : '') +
      '</div></div>';
  }

  h += '<div class="sect-h"><h2>오늘 복습할 문제</h2><span class="sub">' + due.length + '건</span><span class="grow"></span>' +
    '<button class="btn sm" data-act="go-bank-new">+ 문제 등록</button></div>';

  if (!due.length) {
    h += '<div class="card empty"><span class="em">✓</span>오늘 예정된 복습이 없습니다.' +
      (S.problems.length ? '' : '<br>유형 팩에서 시작하면 내일부터 복습이 뜹니다.') + '</div>';
  } else {
    h += '<div class="qlist">' + due.map(function (d) {
      var total = (d.p.schedule || []).length;
      var dots = (d.p.schedule || []).map(function (s, i) {
        return '<i class="' + (s.done ? 'done' : (i === d.i ? 'now' : '')) + '"></i>';
      }).join('');
      return '<div class="qrow' + (d.late > 0 ? ' over' : '') + '">' +
        '<div class="meta"><div class="ttl">' + esc(d.p.title) + '</div>' +
        '<div class="sub"><span class="chip">' + esc(d.p.category || '미분류') + '</span>' +
        '<span class="mono">' + (d.s.round) + '/' + total + '회차</span>' +
        '<span class="rounds">' + dots + '</span>' +
        (d.late > 0 ? '<span class="chip bad">' + d.late + '일 지연</span>' : '<span class="chip accent">오늘</span>') +
        (d.risk >= 6 ? '<span class="chip warn">취약</span>' : '') +
        (d.s.retry ? '<span class="chip warn">재복습</span>' : '') +
        '</div></div>' +
        masteryChip(mastery(d.p)) +
        '<button class="btn accent sm" data-act="live" data-p="' + d.p.id + '" data-i="' + d.i + '">실전</button>' +
        (d.late > 0 ? '<button class="btn sm ghost" data-act="push" data-p="' + d.p.id + '" data-i="' + d.i + '" title="오늘로 이동">오늘로</button>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  /* upcoming 7 days */
  var up = [];
  for (var k = 1; k <= 7; k++) { var ds = addDays(T, k); up.push({ d: ds, n: dueOn(ds) }); }
  h += '<div class="card pad" style="margin-top:20px"><div class="sect-h"><h2>앞으로 7일</h2><span class="sub">예정된 복습량</span></div>' +
    '<div class="hbars">' + up.map(function (u) {
      var mx = Math.max.apply(null, up.map(function (x) { return x.n; }).concat([1]));
      return '<div class="hb"><span class="muted">' + relDate(u.d) + '</span>' +
        '<span class="track"><i style="width:' + (u.n / mx * 100) + '%"></i></span>' +
        '<span class="v">' + u.n + '</span></div>';
    }).join('') + '</div></div>';

  return h;
}

function courseItems(c) {
  return CATALOG.filter(function (x) { return x.lv === c.lv && x.lang === c.lang; });
}
function bySrcMap() {
  var m = {};
  S.problems.forEach(function (p) { if (p.srcId) m[p.srcId] = p; });
  return m;
}
function courseStat(c) {
  var items = courseItems(c), m = bySrcMap(), reg = 0, done = 0, drilled = 0;
  items.forEach(function (it) {
    var p = m[it.id];
    if (!p) return;
    reg++;
    if ((p.attempts || []).length) drilled++;
    if (mastery(p).k === 'done') done++;
  });
  return { items: items, map: m, n: items.length, reg: reg, done: done, drilled: drilled };
}
function itemState(p) {
  if (!p) return { k: 'none', label: '미등록' };
  var m = mastery(p);
  if (m.k === 'done') return { k: 'done', label: '암기 완료' };
  if (m.k === 'recheck') return { k: 'recheck', label: '재확인' };
  if (m.k === 'near') return { k: 'near', label: m.label };
  if ((p.attempts || []).length) return { k: 'wip', label: '연습 중' };
  return { k: 'reg', label: '등록됨' };
}
function stateChip(st) {
  var cls = st.k === 'done' ? 'accent' : (st.k === 'recheck' ? 'bad' : (st.k === 'near' ? 'warn' : ''));
  return '<span class="chip ' + cls + '">' + (st.k === 'done' ? '✓ ' : '') + esc(st.label) + '</span>';
}
function packRegistered() {
  var have = {};
  S.problems.forEach(function (p) { if (p.srcId) have[p.srcId] = 1; });
  return have;
}
function viewPack() {
  if (S.courseSel) return viewCourseDetail();

  var have = packRegistered();
  var lang = S.courseLang;
  var h = '<div class="sect-h"><h2>코스</h2><span class="sub">낮은 단계부터 순서대로</span></div>';

  h += '<div class="lvtabs" style="margin-bottom:16px">' + LANGS_USED.map(function (L) {
    var all = CATALOG.filter(function (c) { return c.lang === L.id; });
    var got = all.filter(function (c) { return have[c.id]; }).length;
    return '<button class="lvtab big' + (lang === L.id ? ' on' : '') + '" data-act="course-lang" data-l="' + L.id + '">' +
      esc(L.name) + ' <span class="mono">' + got + '/' + all.length + '</span></button>';
  }).join('') + '</div>';

  h += '<div class="stack-g" style="margin-bottom:22px">' + COURSES.filter(function (c) {
    return c.lang === lang;
  }).map(function (c) {
    var st = courseStat(c);
    var days = Math.ceil(st.n / c.pace);
    var pct = st.n ? st.done / st.n * 100 : 0;
    var started = st.reg > 0;
    var complete = st.done === st.n && st.n > 0;
    return '<div class="course' + (complete ? ' done' : '') + '" data-act="course-open" data-c="' + c.id + '">' +
      '<div class="row" style="align-items:flex-start">' +
      '<div class="cnum mono">L' + c.lv + '</div>' +
      '<div class="grow" style="min-width:0">' +
      '<div class="row" style="gap:8px"><strong style="font-size:15.5px">' + esc(c.name) + '</strong>' +
      '<span class="chip">' + esc(c.sub) + '</span>' +
      (complete ? '<span class="chip accent">수료</span>' : (started ? '<span class="chip warn">진행 중</span>' : '')) +
      '</div>' +
      '<div class="small muted" style="margin-top:4px">' + esc(c.goal) + '</div>' +
      '<div class="small mono muted" style="margin-top:6px">' +
      st.n + '개 · 하루 ' + c.pace + '개면 ' + days + '일' +
      (c.need ? ' · 선수 ' + esc(c.need) : '') + '</div>' +
      '<div class="bar" style="margin-top:9px"><i style="width:' + pct + '%"></i></div>' +
      '<div class="small mono muted" style="margin-top:5px">등록 ' + st.reg + '/' + st.n +
      ' · 암기 완료 ' + st.done + '/' + st.n + '</div>' +
      '</div><span class="chev">›</span></div></div>';
  }).join('') + '</div>';

  /* 낱개로 고르기 */
  h += '<details class="fold card pad"' + (S.packLv && S.packOpen ? ' open' : '') + '>' +
    '<summary>코스 말고 낱개로 고르기 — 전체 ' + CATALOG.length + '개 유형</summary>' +
    '<div style="margin-top:14px">' + packBrowser(have) + '</div></details>';
  return h;
}

function packBrowser(have) {
  var sel = Object.keys(S.packSel).filter(function (k) { return S.packSel[k]; });
  var lv = S.packLv, lang = S.courseLang;
  var inLang = CATALOG.filter(function (c) { return c.lang === lang; });
  var pool = inLang.filter(function (c) { return !lv || c.lv === lv; });

  var h = '<div class="lvtabs">' +
    '<button class="lvtab' + (!lv ? ' on' : '') + '" data-act="pack-lv" data-l="0">전체 ' + inLang.length + '</button>' +
    levelsOf(lang).map(function (L) {
      var all = inLang.filter(function (c) { return c.lv === L.n; });
      var got = all.filter(function (c) { return have[c.id]; }).length;
      return '<button class="lvtab' + (lv === L.n ? ' on' : '') + '" data-act="pack-lv" data-l="' + L.n + '">' +
        esc(L.name) + ' <span class="mono">' + got + '/' + all.length + '</span></button>';
    }).join('') + '</div>';

  var per = clamp(S.packPerDay, 1, 10);
  h += '<div class="row" style="margin-bottom:14px"><button class="btn sm" data-act="pack-all">보이는 것 전체 선택</button>' +
    '<button class="btn sm ghost" data-act="pack-none">해제</button><span class="grow"></span>' +
    '<label class="small muted" style="display:flex;align-items:center;gap:6px">하루' +
    '<input type="number" id="pack-per" min="1" max="10" value="' + per + '" style="width:56px;padding:5px 8px">개</label>' +
    '<button class="btn accent" data-act="pack-add"' + (sel.length ? '' : ' disabled') + '>' +
    (sel.length ? sel.length + '개 등록' : '선택하세요') + '</button></div>';

  var byCat = {}, order = [];
  pool.forEach(function (c) {
    var key = (lv ? '' : 'L' + c.lv + ' · ') + c.cat;
    if (!byCat[key]) { byCat[key] = []; order.push(key); }
    byCat[key].push(c);
  });
  h += order.map(function (key) {
    var items = byCat[key];
    return '<div style="margin-bottom:16px"><div class="sect-h"><h2 style="font-size:13.5px">' + esc(key) + '</h2>' +
      '<span class="sub">' + items.length + '개</span></div>' +
      items.map(function (c) {
        var reg = !!have[c.id], on = !!S.packSel[c.id];
        return '<div class="pk' + (reg ? ' reg' : '') + '">' +
          '<div class="row" style="align-items:flex-start;flex-wrap:nowrap">' +
          (reg ? '<span class="pkck done">✓</span>'
            : '<span class="pkck' + (on ? ' on' : '') + '" data-act="pack-tog" data-c="' + c.id + '">' + (on ? '✓' : '') + '</span>') +
          '<div class="grow" style="min-width:0">' +
          '<div style="font-weight:500;font-size:14px">' + esc(c.title) +
          (reg ? ' <span class="chip accent">등록됨</span>' : '') + '</div>' +
          '<div class="small muted" style="margin-top:2px">' + esc(c.brief) + '</div>' +
          '<details class="fold" style="margin-top:4px"><summary>코드 ' + c.code.split('\n').length + '줄</summary>' +
          '<div class="hintbox" style="margin:8px 0">' + esc(c.logic) + '</div>' +
          '<pre class="code">' + hl(c.code, c.lang) + '</pre></details>' +
          '</div></div></div>';
      }).join('') + '</div>';
  }).join('');
  return h;
}

function viewCourseDetail() {
  var c = COURSES.filter(function (x) { return x.id === S.courseSel; })[0];
  if (!c) { S.courseSel = null; return viewPack(); }
  var L = levelsOf(c.lang)[c.lv - 1];
  var st = courseStat(c);
  var pace = clamp(S.coursePace || c.pace, 1, 5);
  var days = Math.ceil(st.n / pace);
  var complete = st.done === st.n && st.n > 0;

  var h = '<div class="row" style="margin-bottom:14px">' +
    '<button class="btn ghost sm" data-act="back">← 코스 목록</button></div>';

  h += '<div class="card pad" style="margin-bottom:16px">' +
    '<div class="row" style="gap:8px;margin-bottom:8px">' +
    '<span class="chip mono">L' + c.lv + '</span><span class="chip">' + esc(L.sub) + '</span>' +
    (complete ? '<span class="chip accent">수료</span>' : (st.reg ? '<span class="chip warn">진행 중</span>' : '')) +
    '</div>' +
    '<h2 style="font-size:20px">' + esc(c.name) + '</h2>' +
    '<div class="small muted" style="margin-top:2px">' + esc(c.sub) + '</div>' +
    '<dl class="kv" style="margin-top:16px">' +
    '<dt>배우는 것</dt><dd>' + esc(c.goal) + '</dd>' +
    '<dt>끝나면</dt><dd>' + esc(c.after) + '</dd>' +
    '<dt>선수 과정</dt><dd>' + esc(c.need || '없음 — 여기서 시작합니다') + '</dd>' +
    '<dt>분량</dt><dd>' + st.n + '개 · 하루 ' + pace + '개 기준 ' + days + '일</dd>' +
    '<dt>수료 기준</dt><dd>' + st.n + '개 전부 암기 완료 (각각 연속 ' + S.settings.streakNeed + '회 완벽 재현)</dd>' +
    '</dl>' +
    '<div class="bar2" style="margin-top:16px">' +
    '<i class="reg" style="width:' + (st.n ? st.reg / st.n * 100 : 0) + '%"></i>' +
    '<i class="done" style="width:' + (st.n ? st.done / st.n * 100 : 0) + '%"></i></div>' +
    '<div class="small mono muted" style="margin-top:6px">등록 ' + st.reg + '/' + st.n +
    ' · 암기 완료 ' + st.done + '/' + st.n + '</div>' +
    (st.reg < st.n
      ? '<div class="row" style="margin-top:16px">' +
        '<label class="small muted" style="display:flex;align-items:center;gap:6px">하루' +
        '<input type="number" id="c-pace" min="1" max="5" value="' + pace + '" style="width:56px;padding:5px 8px" data-live="pace">개</label>' +
        '<button class="btn accent" data-act="course-start" data-c="' + c.id + '">' +
        (st.reg ? '남은 ' + (st.n - st.reg) + '개 이어서 등록' : '코스 시작') + '</button>' +
        '<span class="small muted">오늘부터 ' + Math.ceil((st.n - st.reg) / pace) + '일에 걸쳐 배치됩니다</span></div>'
      : '<div class="row" style="margin-top:16px">' +
        '<button class="btn accent" data-act="go-dash">오늘 차례 보기</button>' +
        '<span class="chip accent">전부 등록됨</span>' +
        '<span class="small muted">일정은 문제별로 잡혀 있습니다</span></div>') +
    '</div>';

  /* 일차별 계획 */
  h += '<div class="sect-h"><h2>일차별 진행</h2><span class="sub">배우는 순서 그대로</span></div>';
  var dayIdx = 0;
  h += '<div class="stack-g">';
  for (var k = 0; k < st.items.length; k += pace) {
    dayIdx++;
    var group = st.items.slice(k, k + pace);
    h += '<div class="card pad"><div class="sect-h"><h2 style="font-size:14px">' + dayIdx + '일차</h2>' +
      '<span class="sub">' + group.length + '개 · ' +
      group.reduce(function (a, x) { return a + x.code.split('\n').filter(function (l) { return l.trim(); }).length; }, 0) + '줄</span></div>' +
      group.map(function (it) {
        var pr = st.map[it.id];
        var stt = itemState(pr);
        var todayish = pr && (pr.createdAt === today() || (pr.schedule || []).some(function (x) {
          return !x.done && dayDiff(x.due, today()) >= 0;
        }));
        return '<div class="pk' + (todayish ? ' now' : '') + '"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">' +
          '<div class="grow" style="min-width:0">' +
          '<div class="row" style="gap:7px">' +
          '<strong style="font-size:14.5px">' + esc(it.title) + '</strong>' +
          (todayish ? '<span class="chip warn">오늘</span>' : '') + '</div>' +
          '<div class="small muted" style="margin-top:2px">' + esc(it.brief) + '</div>' +
          '<div class="row small" style="margin-top:7px">' +
          '<span class="chip mono">' + it.code.split('\n').filter(function (l) { return l.trim(); }).length + '줄</span>' +
          stateChip(stt) +
          (pr && (pr.trial || 1) > 1 ? '<span class="chip bad">깜지 ' + pr.trial + '회</span>' : '') +
          (pr ? '<span class="grow"></span>' +
            '<button class="btn sm accent" data-act="train" data-p="' + pr.id + '">훈련</button>' +
            '<button class="btn sm" data-act="live" data-p="' + pr.id + '">실전</button>' : '') +
          '</div>' +
          (pr ? '' : '<details class="fold" style="margin-top:6px"><summary>미리보기 — 코드와 주의점</summary>' +
            '<div class="hintbox" style="margin:8px 0">' + esc(it.logic) + '</div>' +
            '<pre class="code">' + hl(it.code, it.lang) + '</pre></details>') +
          '</div></div></div>';
      }).join('') + '</div>';
  }
  h += '</div>';
  return h;
}

/* 둘러보는 사람을 위한 예시 데이터.
   며칠 써야 보이는 화면(통계·취약 문제·재확인·필사량)을 한 번에 채운다. */
function seedDemo() {
  var T = today();
  var pool = CATALOG.filter(function (c) { return c.lv <= 2; }).slice(0, 14);
  var objs = pool.map(function (c, i) {
    var startedAgo = 13 - i;                 /* 오래된 것부터 */
    var created = addDays(T, -startedAgo);
    var sc = S.settings.intervals.map(function (d, r) {
      return { round: r + 1, due: addDays(created, d), done: false };
    });
    var p = {
      id: 'demo' + i, srcId: c.id, category: c.cat, title: c.title, url: '',
      limits: c.limits, brief: c.brief, logic: c.logic, code: c.code, lang: c.lang || 'python',
      createdAt: created, schedule: sc, attempts: [], streak: 0, masteredAt: null, trial: 1
    };
    var profile = i % 5;                     /* 여러 상태를 섞는다 */
    var att = [];
    function attempt(daysAgo, rate, perfect, miss, tags) {
      att.push({
        at: addDays(T, -daysAgo), rate: rate, sec: 40 + (i * 7) % 90, perfect: perfect,
        tags: tags || [], miss: miss || []
      });
    }
    if (profile === 0) {                     /* 암기 완료 */
      attempt(startedAgo - 1, 100, true); attempt(startedAgo - 3, 100, true); attempt(1, 100, true);
      p.streak = 3; p.masteredAt = addDays(T, -1);
      sc[0].done = true; sc[0].doneAt = addDays(T, -(startedAgo - 1)); sc[0].rate = 100;
      sc[1].done = true; sc[1].doneAt = addDays(T, -(startedAgo - 3)); sc[1].rate = 100;
    } else if (profile === 1) {              /* 굳히는 중 */
      attempt(startedAgo - 1, 100, true); attempt(2, 100, true);
      p.streak = 2;
      sc[0].done = true; sc[0].doneAt = addDays(T, -(startedAgo - 1)); sc[0].rate = 100;
    } else if (profile === 2) {              /* 취약 */
      attempt(startedAgo - 1, 62, false, ['for 반복문'], [{ k: '반복문', n: 2 }]);
      attempt(3, 74, false, ['return 반환'], [{ k: '들여쓰기', n: 1 }, { k: '로직·수식', n: 1 }]);
      p.trial = 3; p.giveups = 1;
      p.weak = { lines: [], at: addDays(T, -3) };
      sc[0].done = true; sc[0].doneAt = addDays(T, -(startedAgo - 1)); sc[0].rate = 62;
      sc[1].due = T;
    } else if (profile === 3) {              /* 재확인 필요 */
      attempt(startedAgo, 100, true);
      p.streak = 3; p.masteredAt = addDays(T, -(S.settings.decayDays + 5));
      sc[0].done = true; sc[0].doneAt = addDays(T, -startedAgo); sc[0].rate = 100;
    } else {                                 /* 오늘 복습 예정 */
      attempt(startedAgo - 1, 88, false, [], [{ k: '인덱싱/슬라이싱', n: 1 }]);
      sc[0].done = true; sc[0].doneAt = addDays(T, -(startedAgo - 1)); sc[0].rate = 88;
      sc[1].due = T;
    }
    p.attempts = att;
    return p;
  });

  var daily = {};
  for (var d = 13; d >= 0; d--) {
    if (d % 6 === 4) continue;               /* 빠진 날도 있어야 그래프가 정직하다 */
    var w = 18 + ((d * 13) % 34);
    daily[addDays(T, -d)] = { w: w, c: Math.round(w * 0.86), r: 2 + (d % 3) };
  }
  S.daily = daily; saveDaily();
  S.settings.demo = true; saveSettings();
  putMany('problems', S.problems, objs);
  goto('dash');
  toast('예시 데이터를 넣었습니다 — 설정에서 지울 수 있습니다');
}

function clearDemo() {
  var demo = S.problems.filter(function (p) { return String(p.id).indexOf('demo') === 0; });
  demo.forEach(function (p) { drop('problems', S.problems, p.id); });
  S.daily = {}; saveDaily();
  S.settings.demo = false; saveSettings();
  render();
  toast(demo.length + '개의 예시 데이터를 지웠습니다');
}

function startCourse(cid) {
  var c = COURSES.filter(function (x) { return x.id === cid; })[0]; if (!c) return;
  var st = courseStat(c);
  var pace = clamp(parseInt(val('c-pace'), 10) || S.coursePace || c.pace, 1, 5);
  S.coursePace = pace;
  var todo = st.items.filter(function (it) { return !st.map[it.id]; });
  if (!todo.length) { toast('이미 전부 등록되어 있습니다'); return; }
  var base = today();
  var objs = todo.map(function (it, i) {
    var day = addDays(base, Math.floor(i / pace));
    return {
      id: uid(), srcId: it.id, category: it.cat, title: it.title, url: '',
      limits: it.limits, brief: it.brief, logic: it.logic, code: it.code, lang: it.lang || 'python',
      createdAt: day, schedule: makeSchedule(day), attempts: [], streak: 0, masteredAt: null
    };
  });
  putMany('problems', S.problems, objs);
  S.courseSel = null;
  goto('dash');
  toast(c.name + ' 시작 — ' + objs.length + '개를 ' + Math.ceil(objs.length / pace) + '일에 배치했습니다');
}

function registerPack() {
  var picked = CATALOG.filter(function (c) { return S.packSel[c.id]; });
  if (!picked.length) { toast('선택된 유형이 없습니다'); return; }
  var perDay = clamp(parseInt(val('pack-per'), 10) || S.packPerDay, 1, 10);
  S.packPerDay = perDay;
  var base = today();
  var objs = picked.map(function (c, i) {
    var day = addDays(base, Math.floor(i / perDay));
    return {
      id: uid(), srcId: c.id, category: c.cat, title: c.title, url: '',
      limits: c.limits, brief: c.brief, logic: c.logic, code: c.code, lang: c.lang || 'python',
      createdAt: day, schedule: makeSchedule(day), attempts: []
    };
  });
  S.packSel = {};
  putMany('problems', S.problems, objs);
  goto('dash');
  toast(objs.length + '개 유형 등록 — 하루 ' + perDay + '개씩 ' + Math.ceil(objs.length / perDay) + '일 커리큘럼');
}

function problemForm() {
  var p = S.form && S.form.id ? S.problems.filter(function (x) { return x.id === S.form.id; })[0] : null;
  return '<div class="card pad" style="margin-bottom:16px">' +
    '<div class="sect-h"><h2>' + (p ? '문제 수정' : '새 대표 문제 등록') + '</h2><span class="grow"></span>' +
    '<button class="btn ghost sm" data-act="form-close">닫기</button></div>' +
    '<div class="f2">' +
    '<label class="f"><span>카테고리</span><input type="text" id="f-cat" list="catlist" value="' + esc(p ? p.category : '') + '" placeholder="DFS / DP / 그리디 …"></label>' +
    '<label class="f"><span>언어</span><select id="f-lang">' + LANGS.map(function (l) {
      return '<option value="' + l + '"' + (p && p.lang === l ? ' selected' : '') + '>' + LANG_LABEL[l] + '</option>';
    }).join('') + '</select></label>' +
    '</div>' +
    '<label class="f"><span>문제 제목 *</span><input type="text" id="f-title" value="' + esc(p ? p.title : '') + '" placeholder="예: 백준 1926 그림"></label>' +
    '<div class="f2">' +
    '<label class="f"><span>문제 링크</span><input type="url" id="f-url" value="' + esc(p ? p.url : '') + '" placeholder="https://"></label>' +
    '<label class="f"><span>학습 시작일</span><input type="date" id="f-base" value="' + esc(p ? p.createdAt : today()) + '"></label>' +
    '</div>' +
    '<label class="f"><span>제한 조건</span><input type="text" id="f-limit" value="' + esc(p ? p.limits : '') + '" placeholder="N ≤ 500, 시간 2초, 메모리 128MB"></label>' +
    '<label class="f"><span>핵심 풀이 로직</span><textarea id="f-logic" placeholder="한 문장으로 요약: 방문 배열 + 큐로 BFS, 덩어리마다 크기 누적">' + esc(p ? p.logic : '') + '</textarea></label>' +
    '<label class="f"><span>정답 전체 코드 *</span><textarea id="f-code" class="code" spellcheck="false" placeholder="통암기할 정답 코드를 그대로 붙여넣으세요">' + esc(p ? p.code : '') + '</textarea></label>' +
    (p ? '<label class="row small" style="margin-bottom:12px"><input type="checkbox" id="f-regen" style="width:auto"> 복습 일정을 시작일 기준으로 다시 생성 (진행 기록 초기화)</label>' : '') +
    '<div class="row"><button class="btn accent" data-act="form-save">' + (p ? '수정 저장' : '등록하고 주기 생성') + '</button>' +
    '<span class="small muted">등록 시 ' + S.settings.intervals.join('·') + '일 후 복습 일정이 자동 생성됩니다.</span></div>' +
    '<datalist id="catlist">' + CATS.map(function (c) { return '<option value="' + c + '">'; }).join('') + '</datalist>' +
    '</div>';
}

function viewBank() {
  var h = '<div class="sect-h"><h2>문제 은행</h2><span class="sub">' + S.problems.length + '문제</span>' +
    '<span class="grow"></span><button class="btn accent sm" data-act="form-open">+ 새 문제</button></div>';
  if (S.form) h += problemForm();

  var cats = {};
  S.problems.forEach(function (p) { cats[p.category || '미분류'] = 1; });
  h += '<div class="filters">' +
    '<input type="text" id="q" placeholder="제목 검색" value="' + esc(S.filter.q) + '" data-live="q">' +
    '<select id="qlang" data-live="lang"><option value="">전체 언어</option>' +
    LANGS_USED.map(function (L) {
      return '<option value="' + L.id + '"' + (S.filter.lang === L.id ? ' selected' : '') + '>' + esc(L.name) + '</option>';
    }).join('') + '</select>' +
    '<select id="qsort" data-live="sort">' +
    [['lv', '난이도순'], ['due', '복습 임박순'], ['weak', '취약한 순'], ['recent', '최근 등록순']].map(function (o) {
      return '<option value="' + o[0] + '"' + (S.settings.bankSort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>' +
    '<select id="qlv" data-live="lv"><option value="">전체 난이도</option>' +
    levelsOf(S.filter.lang || 'python').map(function (L) {
      return '<option value="' + L.n + '"' + (S.filter.lv == L.n ? ' selected' : '') + '>' + esc(L.name) + '</option>';
    }).join('') + '</select>' +
    '<select id="qcat" data-live="cat"><option value="">전체 카테고리</option>' +
    Object.keys(cats).sort().map(function (c) {
      return '<option value="' + esc(c) + '"' + (S.filter.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>';
    }).join('') + '</select></div>';

  var lvOf = {};
  CATALOG.forEach(function (c) { lvOf[c.id] = c.lv; });
  var list = S.problems.filter(function (p) {
    if (S.filter.lang && (p.lang || 'python') !== S.filter.lang) return false;
    if (S.filter.lv && String(lvOf[p.srcId] || '') !== String(S.filter.lv)) return false;
    if (S.filter.cat && (p.category || '미분류') !== S.filter.cat) return false;
    if (S.filter.q && String(p.title).toLowerCase().indexOf(S.filter.q.toLowerCase()) < 0) return false;
    return true;
  });
  var SORTS = {
    lv: function (a, b) { return ordOf(a) - ordOf(b) || (a.createdAt || '').localeCompare(b.createdAt || ''); },
    recent: function (a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); },
    due: function (a, b) {
      var x = nextDue(a) || '9999-99-99', y = nextDue(b) || '9999-99-99';
      return x < y ? -1 : (x > y ? 1 : ordOf(a) - ordOf(b));
    },
    weak: function (a, b) {
      var x = avgRate(a), y = avgRate(b);
      return (x == null ? 101 : x) - (y == null ? 101 : y) || ordOf(a) - ordOf(b);
    }
  };
  list.sort(SORTS[S.settings.bankSort] || SORTS.lv);

  if (!list.length) {
    h += '<div class="card empty"><span class="em">▤</span>' +
      (S.problems.length ? '조건에 맞는 문제가 없습니다.' : '아직 등록된 문제가 없습니다. 오늘 암기할 대표 문제 하나를 등록해 보세요.') + '</div>';
  } else {
    h += '<div class="plist">' + list.map(function (p) {
      var sc = p.schedule || [], done = sc.filter(function (s) { return s.done; }).length;
      var r = avgRate(p), nd = nextDue(p);
      return '<div class="prow" data-act="select" data-p="' + p.id + '">' +
        '<div class="meta"><div class="ttl">' + esc(p.title) + '</div>' +
        '<div class="sub">' +
        '<span class="chip mono">' + esc((LANGS_USED.filter(function (L) { return L.id === (p.lang || 'python'); })[0] || {}).name || 'Python') + '</span>' +
        (lvOf[p.srcId] ? '<span class="chip mono">L' + lvOf[p.srcId] + ' ' + esc(levelName(p.lang || 'python', lvOf[p.srcId])) + '</span>' : '') +
        '<span class="chip">' + esc(p.category || '미분류') + '</span>' +
        '<span class="rounds">' + sc.map(function (s) { return '<i class="' + (s.done ? 'done' : '') + '"></i>'; }).join('') + '</span>' +
        '<span class="mono">' + done + '/' + sc.length + '</span>' +
        (nd ? '<span>다음 ' + relDate(nd) + '</span>' : '<span class="chip accent">주기 완료</span>') +
        '</div></div>' +
        masteryChip(mastery(p)) +
        '<span class="rate ' + rateClass(r) + '">' + (r == null ? '—' : r + '%') + '</span>' +
        '<span class="chev">' + (S.sel === p.id ? '⌄' : '›') + '</span></div>' +
        (S.sel === p.id ? problemDetail(p) : '');
    }).join('') + '</div>';
  }
  return h;
}

function problemDetail(p) {
  var tab = S.detailTab || 'note';
  var c = noteOf(p);
  var h = '<div class="card pad detail">' +
    '<div class="row" style="margin-bottom:12px"><span class="chip accent">' + esc(p.category || '미분류') + '</span>' +
    '<span class="chip mono">' + esc(LANG_LABEL[p.lang] || p.lang || 'Python') + '</span>' +
    '<span class="grow"></span>' +
    masteryChip(mastery(p)) +
    '<span class="chip mono">깜지 ' + (p.trial || 1) + '회</span>' +
    '<button class="btn sm accent" data-act="train" data-p="' + p.id + '">훈련</button>' +
    '<button class="btn sm" data-act="guide" data-p="' + p.id + '">설명 보고</button>' +
    '<button class="btn sm" data-act="live" data-p="' + p.id + '">실전</button></div>';

  h += '<div class="lvtabs" style="margin-bottom:14px">' +
    [['note', '해설'], ['sched', '복습 일정'], ['log', '기록']].map(function (t) {
      return '<button class="lvtab' + (tab === t[0] ? ' on' : '') + '" data-act="dtab" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join('') + '</div>';

  if (tab === 'note') h += detailNote(p, c);
  else if (tab === 'sched') h += detailSched(p);
  else h += detailLog(p);

  h += '<hr class="sep"><div class="row">' +
    '<span class="small muted grow">코드를 자기 스타일로 바꾸고 싶을 때만 쓰세요</span>' +
    '<button class="btn sm ghost" data-act="form-edit" data-p="' + p.id + '">코드 수정</button>' +
    '<button class="btn sm ghost danger" data-act="del-p" data-p="' + p.id + '">삭제</button></div>' +
    '</div>';
  return h;
}

function detailNote(p, c) {
  var h = '';
  if (c) {
    h += '<p style="font-size:14.5px;line-height:1.7;margin-bottom:12px">' + esc(c.story) + '</p>' +
      '<dl class="kv" style="margin-bottom:14px">' +
      '<dt>어디에 쓰나</dt><dd>' + esc(c.where) + '</dd>' +
      '<dt>기억할 것</dt><dd><ul style="margin:0;padding-left:18px">' +
      c.keys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></dd>' +
      (p.limits ? '<dt>제한 조건</dt><dd class="mono small">' + esc(p.limits) + '</dd>' : '') +
      '</dl>';
  } else {
    h += '<dl class="kv" style="margin-bottom:14px">' +
      (p.brief ? '<dt>문제 설명</dt><dd>' + esc(p.brief) + '</dd>' : '') +
      (p.limits ? '<dt>제한 조건</dt><dd>' + esc(p.limits) + '</dd>' : '') +
      (p.logic ? '<dt>핵심 로직</dt><dd style="white-space:pre-wrap">' + esc(p.logic) + '</dd>' : '') +
      '</dl>';
  }

  var rows = walkRows(p);
  if (rows) {
    h += '<div class="sect-h"><h2 style="font-size:14px">줄별 해설</h2>' +
      '<span class="sub">한 줄씩 무슨 뜻인지</span></div>' +
      '<div class="walk">' + rows.map(function (r, i) {
        return '<div class="wrow"><div class="wn mono">' + (i + 1) + '</div>' +
          '<div class="wc"><pre class="code" style="border:none;background:transparent;padding:0;margin:0">' + hl(r.code, p.lang) + '</pre>' +
          (r.note ? '<div class="wt">' + esc(r.note) + '</div>' : '') + '</div></div>';
      }).join('') + '</div>';
  } else {
    h += '<details class="fold"><summary>코드 보기</summary><pre class="code" style="margin-top:8px">' +
      hl(catalogCode(p), p.lang) + '</pre></details>';
  }

  h += explainBlock(p, c);
  return h;
}

function explainBlock(p, c) {
  var done = mastery(p).k === 'done';
  var mine = p.explain;
  var h = '<hr class="sep"><div class="sect-h"><h2 style="font-size:14px">내 말로 설명하기</h2>' +
    '<span class="sub">' + (done ? '암기 완료 — 이제 이해로 넘어갈 차례입니다' : '외운 뒤에 하면 좋습니다') + '</span></div>';

  if (S.explainOpen !== p.id && !mine) {
    return h + '<div class="row"><button class="btn' + (done ? ' accent' : '') + '" data-act="explain-open" data-p="' + p.id + '">세 문장으로 설명해 보기</button>' +
      '<span class="small muted">쓰고 나면 모범 해설과 나란히 보여드립니다</span></div>';
  }

  if (mine && S.explainOpen !== p.id) {
    h += '<div class="card pad" style="background:var(--panel-2);box-shadow:none">' +
      ['어디에 쓰나', '핵심 원리', '자주 틀리는 곳'].map(function (lab, i) {
        return '<div style="margin-bottom:8px"><div class="small muted">' + lab + '</div>' +
          '<div style="white-space:pre-wrap">' + esc(mine.a[i] || '(안 씀)') + '</div></div>';
      }).join('') +
      '<div class="row small muted" style="margin-top:6px">' + esc(mine.date) + ' 작성' +
      (mine.ok === true ? ' · 스스로 통과' : (mine.ok === false ? ' · 더 볼 것' : '')) +
      '<span class="grow"></span>' +
      '<button class="btn sm ghost" data-act="explain-open" data-p="' + p.id + '">다시 쓰기</button></div></div>';
    return h;
  }

  /* 작성 모드 */
  var shown = S.explainShown === p.id;
  var pre = (mine && mine.a) || ['', '', ''];
  h += '<label class="f"><span>1. 이 알고리즘은 어디에 쓰나</span><textarea id="ex-0" style="min-height:60px">' + esc(pre[0]) + '</textarea></label>' +
    '<label class="f"><span>2. 핵심 원리가 무엇인가</span><textarea id="ex-1" style="min-height:60px">' + esc(pre[1]) + '</textarea></label>' +
    '<label class="f"><span>3. 가장 자주 틀리는 부분은</span><textarea id="ex-2" style="min-height:60px">' + esc(pre[2]) + '</textarea></label>';

  if (!shown) {
    h += '<div class="row"><button class="btn accent" data-act="explain-show" data-p="' + p.id + '">다 썼습니다 · 모범 해설 보기</button>' +
      '<button class="btn ghost" data-act="explain-cancel">취소</button>' +
      '<span class="small muted">서술형이라 자동 채점은 안 됩니다. 대조해 보고 스스로 판정하세요.</span></div>';
    return h;
  }

  h += '<div class="card pad" style="border-color:var(--accent);margin-bottom:12px">' +
    '<div class="small muted" style="margin-bottom:8px">모범 해설</div>' +
    (c ? '<div style="margin-bottom:8px"><div class="small muted">어디에 쓰나</div><div>' + esc(c.where) + '</div></div>' +
      '<div style="margin-bottom:8px"><div class="small muted">핵심 원리</div><div>' + esc(c.story) + '</div></div>' +
      '<div><div class="small muted">자주 틀리는 곳</div><ul style="margin:4px 0 0;padding-left:18px">' +
      c.keys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></div>'
      : '<div class="muted">이 문제에는 모범 해설이 없습니다. 직접 등록한 문제입니다.</div>') +
    '</div>' +
    '<div class="row"><span class="small grow">빠뜨린 게 있나요? 스스로 판정하세요.</span>' +
    '<button class="btn accent" data-act="explain-save" data-p="' + p.id + '" data-ok="1">거의 다 맞았다</button>' +
    '<button class="btn" data-act="explain-save" data-p="' + p.id + '" data-ok="0">더 봐야겠다</button></div>';
  return h;
}

function detailSched(p) {
  var sc = p.schedule || [], nextIdx = -1;
  sc.forEach(function (x, i) { if (nextIdx < 0 && !x.done) nextIdx = i; });
  return '<div class="hbars">' + sc.map(function (s, i) {
    var st = s.done ? '<span class="chip accent">완료 ' + (s.rate != null ? s.rate + '%' : '') + '</span>'
      : (dayDiff(s.due, today()) > 0 ? '<span class="chip bad">지연</span>'
        : (s.due === today() ? '<span class="chip warn">오늘</span>' : '<span class="chip">예정</span>'));
    return '<div class="row small" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0">' +
      '<span class="mono">' + s.round + '회차' + (s.retry ? ' (재)' : '') + '</span>' +
      '<span class="mono muted">' + esc(s.due) + '</span>' + st +
      (i === nextIdx ? '<button class="btn sm" data-act="live" data-p="' + p.id + '" data-i="' + i + '">실전</button>' : '') +
      '</div>';
  }).join('') + '</div>' +
  '<div class="small muted" style="margin-top:10px">등록일 ' + esc(p.createdAt) +
  (p.url ? ' · <a href="' + esc(p.url) + '" target="_blank" rel="noopener">문제 링크</a>' : '') + '</div>';
}

function detailLog(p) {
  var att = (p.attempts || []).slice().reverse();
  if (!att.length) return '<div class="empty">아직 실전 기록이 없습니다.</div>';
  return '<div class="hbars">' + att.slice(0, 16).map(function (a) {
    return '<div class="hb"><span class="mono muted">' + esc(a.at) + '</span>' +
      '<span class="track"><i class="' + (a.perfect ? '' : (a.rate >= 60 ? 'w' : 'b')) + '" style="width:' + a.rate + '%"></i></span>' +
      '<span class="v">' + a.rate + '%</span></div>' +
      ((a.miss && a.miss.length) ? '<div class="small muted" style="margin:-4px 0 4px 96px">누락 ' + esc(a.miss.join(', ')) + '</div>' : '');
  }).join('') + '</div>';
}

function viewTest() {
  var t = S.test; if (!t) return '';
  var p = S.problems.filter(function (x) { return x.id === t.pid; })[0];
  if (!p) return '<div class="card empty">문제를 찾을 수 없습니다.</div>';
  var lim = timeLimit(p);

  if (!t.result) {
    var modeLabel = t.guide ? '설명 보고 쓰기'
      : (t.gate ? '오늘의 관문' : (t.idx != null ? t.round + '회차 복습' : '실전'));
    var g = t.guide ? guideItems(p) : null;
    return '<div class="testhead">' +
      '<button class="btn ghost sm" data-act="test-exit">← 나가기</button>' +
      '<div class="grow"><h2>' + esc(p.title) + '</h2>' +
      '<div class="small muted"><span class="chip">' + esc(p.category || '미분류') + '</span> ' +
      esc(modeLabel) + ' · 원본 ' + normLines(p) + '줄 · 제한 ' + mmss(lim) + '</div></div>' +
      '<div class="timer mono" id="timer">00:00</div></div>' +
      (t.guide
        ? '<div class="hintbox">설명을 순서대로 읽으면서 그에 맞는 코드를 적으세요. ' +
          '코드를 보여주지는 않습니다. 이 단계는 암기 판정에 들어가지 않습니다.</div>'
        : '<div class="hintbox" style="border-style:solid;border-color:var(--bad);color:var(--bad)">' +
          '실전입니다. 구조 누락 0 + 빠진 줄 0 + 제한 시간 내여야 통과입니다. 막히면 아래 모르겠다를 누르세요.</div>') +
      '<div class="' + (t.guide ? 'guidewrap' : '') + '">' +
      (g
        ? '<div class="guidecol"><div class="small muted" style="margin-bottom:8px">' +
          (g.kind === 'walk' ? '줄 순서대로 ' + g.items.length + '개' : '이 문제의 설명') + '</div>' +
          '<ol class="guide" id="guideList">' +
          g.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          '</ol></div>'
        : '') +
      '<div class="editcol">' +
      '<div class="editor-wrap"><div class="gutter" id="gutter">1</div>' +
      '<textarea id="codeInput" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="' +
      (t.guide ? '왼쪽 설명을 보면서 코드를 적으세요.' : '빈 화면에서 정답 코드를 처음부터 끝까지 작성하세요.') + '"></textarea></div>' +
      '<div class="editbar"><span id="counter" class="mono">0줄 · 0자</span><span class="grow"></span>' +
      '<span>Tab 들여쓰기 · Ctrl/⌘+Enter 제출</span>' +
      (t.guide ? '' : '<button class="btn danger" data-act="giveup">모르겠다</button>') +
      '<button class="btn accent" data-act="submit">제출하고 채점</button></div>' +
      '</div></div>';
  }

  var r = t.result, v = t.verdict, m = mastery(p);
  var nextStreak = v.perfect ? (p.streak || 0) + 1 : 0;
  var h = '<div class="testhead"><button class="btn ghost sm" data-act="test-exit">← 나가기</button>' +
    '<div class="grow"><h2>' + esc(p.title) + '</h2><div class="small muted">' +
    mmss(t.elapsed) + ' 소요 · 제한 ' + mmss(v.lim) + '</div></div></div>';

  /* ---- 암기 판정 ---- */
  h += '<div class="card pad verdict-card ' + (v.perfect ? 'ok' : 'no') + '" style="margin-bottom:14px">' +
    '<div class="row" style="align-items:center;gap:14px">' +
    '<div class="stamp ' + (v.perfect ? 'ok' : 'no') + '">' +
    (t.guide ? (v.perfect ? '옮기기<br>성공' : '아직') : (v.perfect ? '암기<br>확인' : '아직')) + '</div>' +
    '<div class="grow"><h2 style="font-size:17px">' +
    (v.perfect
      ? (t.guide ? '설명대로 옮겼습니다' : (v.clean ? '완벽 재현했습니다' : '통과 — 오타 ' + v.surface + '개는 봐줬습니다'))
      : '아직 재현이 안 됩니다') + '</h2>' +
    '<div class="small muted" style="margin-top:2px">' +
    (t.guide
      ? (v.perfect
        ? '설명을 보고 쓴 단계라 암기 판정에는 넣지 않습니다. 이제 아무것도 없이 써 볼 차례입니다.'
        : '설명을 보고도 막혔다면 아직 손에 안 붙은 겁니다. 깜지를 한 번 더 하는 편이 낫습니다.')
      : (v.perfect
        ? (nextStreak >= S.settings.streakNeed
          ? '연속 ' + nextStreak + '회 — 이 문제는 암기 완료로 올라갑니다.'
          : '연속 ' + nextStreak + '/' + S.settings.streakNeed + ' — ' + (S.settings.streakNeed - nextStreak) + '회 더 완벽하면 암기 완료입니다.')
        : '조건 중 하나라도 어긋나면 연속 기록은 0으로 돌아갑니다. 현재 연속 ' + (p.streak || 0) + '회.')) +
    '</div></div></div>' +
    '<div class="checklist" style="margin-top:14px">' +
    [['핵심 구조 누락 없음', v.missing === 0, v.missing + '개 누락'],
     ['빠지거나 더한 줄 없음', v.hard === 0, v.hard + '줄'],
     ['오타·들여쓰기', v.surface <= v.grace, v.surface + ' / 허용 ' + v.grace],
     ['제한 시간 내', t.elapsed <= v.lim, mmss(t.elapsed) + ' / ' + mmss(v.lim)]
    ].map(function (row) {
      return '<div class="ck ' + (row[1] ? 'ok' : 'no') + '"><span class="s">' + (row[1] ? '✓' : '✕') + '</span>' +
        '<span class="grow">' + esc(row[0]) + '</span><span class="mono small">' + esc(row[2]) + '</span></div>';
    }).join('') + '</div>' +
    '<div class="row" style="margin-top:14px">' +
    (t.guide
      ? (v.perfect
        ? '<button class="btn accent" data-act="to-live">이제 백지에서 써 보기</button>' +
          '<button class="btn" data-act="retry">한 번 더 옮겨 쓰기</button>'
        : '<button class="btn accent" data-act="retry">다시 쓰기</button>' +
          '<button class="btn" data-act="back-to-drill">깜지 한 번 더</button>')
      : (v.perfect
        ? '<button class="btn accent" data-act="record">' + (t.idx != null ? '복습 완료 처리' : '판정 반영') + '</button>' +
          '<button class="btn" data-act="retry">다시 풀기</button>'
        : '<button class="btn accent" data-act="retrain">깜지 ' +
          Math.min(S.settings.trialMax, (p.trial || 1) + 1) + '회부터 다시</button>' +
          '<button class="btn" data-act="record">기록만 남기고 나가기</button>')) +
    '<span class="grow"></span><span class="small muted">현재 상태 ' + esc(m.label) + '</span></div>' +
    '</div>';

  /* ---- 일치율 상세 ---- */
  var pass = r.rate >= S.settings.pass;
  h += '<div class="card pad" style="margin-bottom:14px"><div class="score">' +
    '<div><div class="num" style="color:' + (r.rate >= 100 ? 'var(--good)' : (pass ? 'var(--warn)' : 'var(--bad)')) + '">' +
    r.rate + '<em>%</em></div><div class="small muted mono">구조 일치율</div></div>' +
    '<div class="grow"><div class="small muted mono">원본 ' + r.origLines + '줄 · 입력 ' + r.userLines + '줄 · 일치 ' + r.matched + '줄</div>' +
    '<div class="bar ' + (r.rate >= 100 ? '' : (pass ? 'warn' : 'bad')) + '"><i style="width:' + r.rate + '%"></i></div></div>' +
    '</div></div>';

  var bad = r.checks.filter(function (c) { return !c.ok; });
  h += '<div class="card pad" style="margin-bottom:14px"><div class="sect-h"><h2>핵심 구조 검증</h2>' +
    '<span class="sub">' + (bad.length ? bad.length + '개 누락' : '누락 없음') + '</span></div>' +
    '<div class="checklist">' + r.checks.map(function (c) {
      return '<div class="ck ' + (c.ok ? 'ok' : 'no') + '"><span class="s">' + (c.ok ? '✓' : '✕') + '</span>' +
        '<span class="grow">' + esc(c.k) + '</span><span class="mono small">' + c.got + '/' + c.need + '</span></div>';
    }).join('') + '</div></div>';

  if (r.tags.length) {
    h += '<div class="card pad" style="margin-bottom:14px"><div class="sect-h"><h2>이번 결함 패턴</h2></div><div class="row">' +
      r.tags.map(function (x) { return '<span class="chip bad">' + esc(x.k) + ' ' + x.n + '</span>'; }).join('') + '</div></div>';
  }

  h += '<div class="sect-h"><h2>라인 비교</h2><span class="sub">공백·주석은 무시하고 구조만 대조합니다</span></div>' +
    '<div class="difflist scroller">' + r.rows.map(function (row) {
      var mk = row.k === 'same' ? ' ' : (row.k === 'miss' ? '−' : '+');
      var ind = row.d ? '<span class="ind">' + '·   '.repeat(row.d) + '</span>' : '';
      var body = row.html != null ? row.html : esc(row.t);
      return '<div class="dl ' + row.k + (row.soft ? ' soft' : '') + '"><span class="mk">' + mk + '</span><span class="tx">' + ind + body + '</span></div>';
    }).join('') + '</div>' +
    '<div class="small muted" style="margin-top:8px">− 원본에 있는데 쓰지 못한 줄 · + 원본에 없는 줄 · 흐린 것은 오타로 보고 봐준 줄</div>';
  return h;
}

function viewDrill() {
  var dr = S.drill; if (!dr) return '';
  var p = S.problems.filter(function (x) { return x.id === dr.pid; })[0];
  if (!p) return '<div class="card empty">문제를 찾을 수 없습니다.</div>';

  return '<div class="testhead">' +
    '<button class="btn ghost sm" data-act="back">← 나가기</button>' +
    '<div class="grow"><h2>' + esc(p.title) + '</h2>' +
    '<div class="small muted">' +
    (dr.phase === 'block'
      ? '<span class="chip bad">틀린 부분만</span> <span class="chip mono">' + dr.blk.from + '~' + dr.blk.to + '번째 줄</span> '
      : '<span class="chip">깜지</span> <span class="chip mono">' + traceLines(dr.target) + '줄</span> ') +
    (dr.phase === 'block' ? '전체는 한 번 썼으니 이제 막혔던 곳만 굳힙니다' : '베껴 쓰기 · 통과하면 실전으로 넘어갑니다') +
    '</div></div>' +
    '<div class="timer mono">' +
    ((dr.phase === 'full' ? dr.doneFull : dr.doneBlock) + 1) +
    '<span style="font-size:14px;color:var(--ink-3)">/' + (dr.phase === 'full' ? dr.needFull : dr.needBlock) + '</span></div>' +
    '</div>' +
    '<div class="bar" style="margin-bottom:6px"><i id="traceBar" style="width:0%"></i></div>' +
    '<div class="editbar" style="margin:0 0 12px">' +
    '<span id="traceStat" class="mono">0%</span><span class="grow"></span>' +
    (dr.walk ? '<button class="btn sm ghost" data-act="drill-note">해설 ' + (dr.showNote ? '숨기기' : '보기') + '</button>' : '') +
    '<span class="muted">들여쓰기는 자동으로 넘어갑니다 · 영문 입력 상태로</span></div>' +
    (dr.walk && dr.showNote ? '<div class="hintbox" id="traceNote" style="margin-bottom:10px;min-height:66px"></div>' : '') +
    '<div class="hintbox" id="traceWarn" style="display:none;margin-bottom:10px"></div>' +
    '<div class="tracebox" id="tracebox" data-act="trace-focus">' +
    '<pre class="traceview" id="traceview"></pre>' +
    '<textarea class="tracein" id="tracein" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off"></textarea>' +
    '</div>' +
    (dr.pos >= dr.target.length
      ? '<div class="row" style="margin-top:14px"><button class="btn accent" data-act="drill-next">다음으로</button>' +
        '<span class="small muted">다 채웠습니다</span></div>'
      : '') +
    (window.innerWidth < 640
      ? '<div class="hintbox warn-ko" style="margin-top:12px;border-color:var(--warn);color:var(--warn);background:var(--warn-soft)">' +
        '깜지는 물리 키보드를 전제로 만들었습니다. 휴대폰에서는 특수문자 입력이 번거로우니 PC에서 쓰시길 권합니다.</div>'
      : '') +
    '<p class="small muted" style="margin-top:12px">회색 글자 위로 그대로 따라 치세요. 틀린 글자는 들어가지 않습니다. ' +
    (dr.needBlock > 0
      ? '전체 1회를 쓴 뒤, 지난번에 틀린 부분만 ' + dr.needBlock + '회 더 씁니다. 같은 줄을 통째로 다시 치는 것보다 낫습니다.'
      : (dr.needFull > 1 ? '이번 문제는 실전에서 ' + (dr.needFull - 1) + '번 막혀서 ' + dr.needFull + '회입니다.' : '')) + '</p>';
}

function viewStats() {
  var T = today(), days = [], i;
  for (i = 13; i >= 0; i--) { var d = addDays(T, -i); days.push({ d: d, due: dueOn(d), done: doneOn(d) }); }
  var mx = Math.max.apply(null, days.map(function (x) { return Math.max(x.due, x.done); }).concat([1]));
  var rated = days.filter(function (x) { return x.due > 0; });
  var avgAch = rated.length ? Math.round(rated.reduce(function (a, x) { return a + Math.min(1, x.done / x.due); }, 0) / rated.length * 100) : 0;

  var allAtt = [];
  S.problems.forEach(function (p) { (p.attempts || []).forEach(function (a) { allAtt.push(a); }); });
  var passN = allAtt.filter(function (a) { return a.rate >= S.settings.pass; }).length;
  var passRate = allAtt.length ? Math.round(passN / allAtt.length * 100) : 0;

  var done = masteredCount();
  var h = '<div class="statgrid" style="margin-bottom:18px">' +
    tile('암기 완료', done, '개', '전체 ' + S.problems.length + '개 중',
      S.problems.length ? done / S.problems.length * 100 : 0) +
    tile('최근 14일 평균 달성률', avgAch, '%', '예정 대비 완료', avgAch) +
    tile('테스트 통과율', passRate, '%', allAtt.length + '회 중 ' + passN + '회', passRate) +
    tile('복습 누락', overdueCount(), '건', '기한이 지난 미완료', overdueCount() ? 100 : 0, overdueCount() ? 'bad' : '') +
    tile('등록 문제', S.problems.length, '개', '누적 대표 문제', 100) +
    '</div>';

  h += '<div class="card pad" style="margin-bottom:16px"><div class="sect-h"><h2>일일 학습 달성</h2>' +
    '<span class="sub">최근 14일 · 완료 건수</span></div><div class="chart">' +
    days.map(function (x) {
      var full = x.due > 0 && x.done >= x.due;
      var cls = x.done === 0 ? 'zero' : (full ? '' : 'part');
      var hgt = Math.max(2, x.done / mx * 100);
      return '<div class="col"><div class="stack"><div class="b ' + cls + '" style="height:' + hgt + '%" title="' + x.d + ' 완료 ' + x.done + ' / 예정 ' + x.due + '"></div></div>' +
        '<div class="cl">' + x.d.slice(8) + '</div></div>';
    }).join('') + '</div><div class="small muted" style="margin-top:6px">초록: 예정분 전량 완료 · 주황: 일부 완료 · 회색: 완료 없음</div></div>';

  /* 필사량 */
  var wmax = Math.max.apply(null, days.map(function (x) { return dayLines(x.d); }).concat([1]));
  var wsum = days.reduce(function (a, x) { return a + dayLines(x.d); }, 0);
  h += '<div class="card pad" style="margin-bottom:16px"><div class="sect-h"><h2>하루에 쓴 줄</h2>' +
    '<span class="sub">최근 14일 합계 ' + wsum + '줄 · 연속 ' + writeStreak() + '일</span></div><div class="chart">' +
    days.map(function (x) {
      var v = dayLines(x.d);
      return '<div class="col"><div class="stack"><div class="b ' + (v ? 'part' : 'zero') +
        '" style="height:' + Math.max(2, v / wmax * 100) + '%" title="' + x.d + ' ' + v + '줄"></div></div>' +
        '<div class="cl">' + x.d.slice(8) + '</div></div>';
    }).join('') + '</div>' +
    '<div class="small muted" style="margin-top:6px">깜지와 테스트에서 실제로 입력한 줄을 매일 00시에 새로 셉니다.</div></div>';

  /* category */
  var cat = {};
  S.problems.forEach(function (p) {
    var c = p.category || '미분류';
    cat[c] = cat[c] || { n: 0, sum: 0, cnt: 0 };
    cat[c].n++;
    (p.attempts || []).forEach(function (a) { cat[c].sum += a.rate; cat[c].cnt++; });
  });
  var catKeys = Object.keys(cat).sort(function (a, b) { return cat[b].n - cat[a].n; });
  h += '<div class="card pad" style="margin-bottom:16px"><div class="sect-h"><h2>카테고리별 평균 일치율</h2>' +
    '<span class="sub">막대 길이 = 평균 일치율</span></div>';
  h += catKeys.length ? '<div class="hbars">' + catKeys.map(function (c) {
    var v = cat[c].cnt ? Math.round(cat[c].sum / cat[c].cnt) : 0;
    var cls = v >= S.settings.pass ? '' : (v >= 60 ? 'w' : 'b');
    return '<div class="hb"><span>' + esc(c) + ' <span class="muted mono">' + cat[c].n + '</span></span>' +
      '<span class="track"><i class="' + cls + '" style="width:' + v + '%"></i></span>' +
      '<span class="v">' + (cat[c].cnt ? v + '%' : '—') + '</span></div>';
  }).join('') + '</div>' : '<div class="empty">데이터가 없습니다.</div>';
  h += '</div>';

  /* defect patterns */
  var tg = {};
  allAtt.forEach(function (a) { (a.tags || []).forEach(function (t) { tg[t.k] = (tg[t.k] || 0) + t.n; }); });
  var tk = Object.keys(tg).sort(function (a, b) { return tg[b] - tg[a]; }).slice(0, 8);
  var tmx = tk.length ? tg[tk[0]] : 1;
  h += '<div class="card pad" style="margin-bottom:16px"><div class="sect-h"><h2>자주 틀리는 코드 블록</h2>' +
    '<span class="sub">누적 결함 패턴</span></div>';
  h += tk.length ? '<div class="hbars">' + tk.map(function (k) {
    return '<div class="hb"><span>' + esc(k) + '</span><span class="track"><i class="b" style="width:' + (tg[k] / tmx * 100) + '%"></i></span>' +
      '<span class="v">' + tg[k] + '</span></div>';
  }).join('') + '</div>' : '<div class="empty">테스트를 제출하면 결함 패턴이 쌓입니다.</div>';
  h += '</div>';

  /* mastery by level */
  var lvMap = {};
  CATALOG.forEach(function (c) { lvMap[c.id] = c.lv; });
  var byLv = {};
  S.problems.forEach(function (p) {
    var lv = lvMap[p.srcId] || 0;
    byLv[lv] = byLv[lv] || { n: 0, done: 0 };
    byLv[lv].n++;
    if (mastery(p).k === 'done') byLv[lv].done++;
  });
  var lvKeys = Object.keys(byLv).sort();
  if (lvKeys.length) {
    h += '<div class="card pad" style="margin-bottom:16px"><div class="sect-h"><h2>난이도별 암기 진척</h2></div><div class="hbars">' +
      lvKeys.map(function (k) {
        var nm = levelName('python', parseInt(k, 10));
        var v = byLv[k].n ? byLv[k].done / byLv[k].n * 100 : 0;
        return '<div class="hb"><span>' + esc(nm) + '</span><span class="track"><i style="width:' + v + '%"></i></span>' +
          '<span class="v">' + byLv[k].done + '/' + byLv[k].n + '</span></div>';
      }).join('') + '</div>' +
      (S.settings.gateSkip ? '<div class="small muted" style="margin-top:10px">관문 회피 누적 ' + S.settings.gateSkip + '회</div>' : '') +
      '</div>';
  }

  /* weakest problems */
  var weak = S.problems.filter(function (p) { return avgRate(p) != null; })
    .sort(function (a, b) { return avgRate(a) - avgRate(b); }).slice(0, 6);
  if (weak.length) {
    h += '<div class="card pad"><div class="sect-h"><h2>보강이 필요한 문제</h2><span class="sub">평균 일치율 하위</span></div><div class="hbars">' +
      weak.map(function (p) {
        var r = avgRate(p);
        return '<div class="hb"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(p.title) + '">' + esc(p.title) + '</span>' +
          '<span class="track"><i class="' + rateClass(r) + '" style="width:' + r + '%"></i></span><span class="v">' + r + '%</span></div>';
      }).join('') + '</div></div>';
  }
  return h;
}

function viewSettings() {
  var st = S.settings;
  var h = '<div class="stack-g">';
  h += '<div class="card pad"><div class="sect-h"><h2>망각곡선 주기</h2><span class="sub">등록일로부터 며칠 뒤에 복습할지</span></div>' +
    '<label class="f"><span>복습 간격 (일, 쉼표로 구분)</span><input type="text" id="s-int" value="' + esc(st.intervals.join(', ')) + '"></label>' +
    '<div class="row small muted">기본값 1, 3, 7, 14, 30 — 회차가 늘수록 간격이 벌어지는 에빙하우스 곡선을 따릅니다. 변경해도 이미 등록된 문제의 일정은 유지됩니다.</div></div>';

  h += '<div class="card pad"><div class="sect-h"><h2>채점 기준</h2></div>' +
    '<div class="f2"><label class="f"><span>통과 일치율 (%)</span><input type="number" id="s-pass" min="10" max="100" value="' + st.pass + '"></label>' +
    '<label class="f"><span>실패 시 재복습</span><select id="s-retry">' +
    '<option value="1"' + (st.retry ? ' selected' : '') + '>기준 미달이면 다음 날 재복습 추가</option>' +
    '<option value="0"' + (st.retry ? '' : ' selected') + '>추가하지 않음</option></select></label></div></div>';

  h += '<div class="card pad"><div class="sect-h"><h2>암기 판정</h2>' +
    '<span class="sub">"정말 다 외웠는가"의 기준</span></div>' +
    '<p class="small" style="color:var(--ink-2);margin-bottom:14px">구조 누락 0 + 빠지거나 더한 줄 0 + 제한 시간 내를 만족하면 통과입니다. ' +
    '오타나 들여쓰기처럼 논리와 무관한 실수는 아래 허용치까지 봐줍니다. 0으로 두면 한 글자도 안 봐줍니다.</p>' +
    '<div class="f2" style="margin-bottom:0"><label class="f"><span>오타·들여쓰기 허용 개수</span><input type="number" id="s-grace" min="0" max="5" value="' + st.grace + '"></label>' +
    '<label class="f"><span>연속 몇 회면 암기 완료</span><input type="number" id="s-streak" min="1" max="10" value="' + st.streakNeed + '"></label></div>' +
    '<div class="f2"><label class="f"><span>제한 시간 — 줄당 초</span><input type="number" id="s-spl" min="2" max="60" value="' + st.secPerLine + '"></label>' +
    '<label class="f"><span>제한 시간 — 기본 여유 초</span><input type="number" id="s-base" min="0" max="300" value="' + st.baseSec + '"></label></div>' +
    '<div class="f2"><label class="f"><span>암기 완료 후 재확인 (일)</span><input type="number" id="s-decay" min="7" max="180" value="' + st.decayDays + '"></label>' +
    '<label class="f"><span>관문 모드</span><select id="s-gate">' +
    '<option value="1"' + (st.gate ? ' selected' : '') + '>켜기 — 오늘 것을 통과하기 전엔 다른 화면이 안 열림</option>' +
    '<option value="0"' + (st.gate ? '' : ' selected') + '>끄기</option></select></label></div></div>';

  h += '<div class="card pad"><div class="sect-h"><h2>깜지</h2>' +
    '<span class="sub">실패할수록 늘어납니다</span></div>' +
    '<p class="small" style="color:var(--ink-2);margin-bottom:14px">깜지는 전체 코드를 보면서 그대로 베껴 쓰는 단계입니다. ' +
    '처음에는 전체 1회. 실전에서 막히면 전체 1회 + 틀렸던 부분만 추가로 반복합니다. 실전을 통과하면 다시 1회로 돌아갑니다.</p>' +
    '<div class="f2"><label class="f"><span>깜지 최대 횟수</span><input type="number" id="s-tmax" min="2" max="20" value="' + st.trialMax + '"></label>' +
    '<label class="f"><span>오늘은 여기까지 — 한 문제 실패 횟수</span><input type="number" id="s-rest" min="2" max="10" value="' + st.restAfter + '"></label></div>' +
    '<p class="small muted" style="margin-bottom:12px">2회차부터는 전체를 다시 쓰지 않고, 지난번에 틀린 줄과 그 앞뒤만 떼어 훈련합니다.</p>' +
    '<label class="f"><span>깜지와 실전 사이에 설명 보고 쓰기 단계</span><select id="s-guide">' +
    '<option value="1"' + (st.guideStep ? ' selected' : '') + '>넣기 — 한 번도 통과 못 한 문제에만</option>' +
    '<option value="0"' + (st.guideStep ? '' : ' selected') + '>넣지 않기</option></select></label>' +
    '<p class="small muted">코드를 보여주는 대신 줄 설명만 순서대로 보여주고 직접 적게 합니다. ' +
    '단서를 하나씩 걷어내는 중간 단계라 암기 판정에는 넣지 않습니다.</p></div>';

  h += '<div class="card pad"><div class="sect-h"><h2>일일 목표</h2></div>' +
    '<label class="f"><span>신규 문제 (개)</span><input type="number" id="s-new" min="0" max="20" value="' + st.newGoal + '"></label></div>';

  h += '<div class="card pad account-panel"><div class="sect-h"><h2>학습 기록 저장</h2><span class="sub">' +
    (S.accountMode === 'account' ? '계정에 동기화 중' : '현재 브라우저에만 저장 중') + '</span></div>' +
    (S.accountMode === 'account'
      ? '<p class="small" style="color:var(--ink-2);margin-bottom:12px"><b>' + esc(S.accountEmail) + '</b> 계정으로 학습 기록을 보관합니다. 다른 기기에서도 같은 계정으로 로그인하면 이어서 학습할 수 있습니다.</p><button class="btn accent" id="accountSettingsBtn" data-act="account-open">내 계정</button>'
      : '<p class="small" style="color:var(--ink-2);margin-bottom:12px">로그인하지 않아도 계속 사용할 수 있습니다. 다만 브라우저 데이터가 삭제되면 학습 기록이 사라질 수 있습니다.</p><button class="btn accent" id="accountSettingsBtn" data-act="account-open">내 학습 기록 저장하기</button>') +
    '</div>';

  h += '<div class="card pad"><div class="row"><button class="btn accent" data-act="s-save">설정 저장</button>' +
    '<span class="small muted">저장 위치: ' + (S.mode === 'cloud' ? '계정 저장소 (기기 간 동기화)' : '이 브라우저') + '</span></div></div>';

  h += '<div class="card pad"><div class="sect-h"><h2>데이터</h2></div><div class="row">' +
    '<button class="btn" data-act="show-landing">표지 다시 보기</button>' +
    (S.settings.demo ? '<button class="btn" data-act="clear-demo">예시 데이터 지우기</button>' : '') +
    '<button class="btn" data-act="sync-code">내장 코드 최신화</button>' +
    '<button class="btn" data-act="copy-json">JSON 백업 복사</button>' +
    (S.canImport ? '<button class="btn accent" data-act="import">로컬 기록 가져오기</button>' : '') +
    '</div><div class="small muted" style="margin-top:8px">문제 ' + S.problems.length + '개</div></div>';

  h += '</div>';
  return h;
}

/* ============ render ============ */
var VIEWS = { dash: viewDash, pack: viewPack, bank: viewBank, test: viewTest, drill: viewDrill, stats: viewStats, settings: viewSettings };
function render() {
  renderLanding();
  if (S.view !== 'test' && S.view !== 'drill' && gateProblem()) S.view = 'dash';
  document.body.classList.toggle('gated', !!gateProblem() && S.view !== 'test' && S.view !== 'drill');
  Object.keys(VIEWS).forEach(function (k) {
    var el = document.getElementById('v-' + k);
    if (k === S.view) { el.innerHTML = VIEWS[k](); el.classList.add('on'); }
    else { el.classList.remove('on'); el.innerHTML = ''; }
  });
  Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) {
    b.setAttribute('aria-current', b.dataset.v === S.view ? 'true' : 'false');
  });
  $('#backBtn').hidden = !S.hist.length;
  var n = dueList().length, badge = $('#navDue');
  badge.hidden = !n; badge.textContent = n;
  $('#todayLabel').textContent = today() + ' · ' + ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()] + '요일';
  if (S.view === 'test' && S.test && !S.test.result) wireEditor();
  if (S.view === 'drill' && S.drill) wireDrill();
}
var _lastView = null;
function toTop() { try { window.scrollTo(0, 0); } catch (e) { } }
var HIST = { ok: false, depth: 0 };
try { window.history.replaceState({ am: 0 }, ''); HIST.ok = true; } catch (e) { HIST.ok = false; }
function navSnap() { return { view: S.view, sel: S.sel, packLv: S.packLv, courseSel: S.courseSel }; }
function navPush() {
  if (!HIST.ok) return;
  try { HIST.depth++; window.history.pushState({ am: HIST.depth }, ''); } catch (e) { }
}
function enter(v, keep) {
  S.hist.push(navSnap());
  if (S.hist.length > 40) S.hist.shift();
  S.view = v;
  if (!keep) { S.sel = null; S.courseSel = null; }
  render(); toTop(); navPush();
}
function goto(v) { enter(v); }
function back() {
  if (HIST.ok && HIST.depth > 0) { window.history.back(); return; }
  doBack();
}
function doBack() {
  if (S.test) { clearInterval(S.test._timer); S.test = null; }
  S.drill = null;
  var st = S.hist.pop();
  if (!st) { S.view = 'dash'; S.sel = null; S.courseSel = null; render(); toTop(); return; }
  S.view = (st.view === 'test' || st.view === 'drill') ? 'dash' : st.view;
  S.sel = st.sel; S.packLv = st.packLv; S.courseSel = st.courseSel;
  render(); toTop();
}
window.addEventListener('popstate', function () {
  if (HIST.depth > 0) HIST.depth--;
  doBack();
});
var KEEP = /^(f-|b-|i-|s-|ex-|pg-|pack-per$|c-pace$|q$|qcat$|qlv$|qsort$|qlang$)/;
/* codeInput is excluded below */
function snapInputs() {
  var o = {};
  Array.prototype.forEach.call(document.querySelectorAll('main input[id], main textarea[id], main select[id]'), function (el) {
    if (el.id === 'codeInput' || !KEEP.test(el.id)) return;
    o[el.id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return o;
}
function restoreInputs(o) {
  Object.keys(o).forEach(function (k) {
    var el = document.getElementById(k); if (!el) return;
    if (el.type === 'checkbox') el.checked = o[k]; else el.value = o[k];
  });
}
function softRender() {
  if (S.view === 'test' || S.view === 'drill') return;
  var ae = document.activeElement;
  if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && ae.closest('main')) { S.pending = true; return; }
  var snap = snapInputs(); render(); restoreInputs(snap);
}
document.addEventListener('focusout', function () {
  if (!S.pending) return;
  setTimeout(function () {
    var ae = document.activeElement;
    if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
    S.pending = false; softRender();
  }, 60);
});

/* ============ editor ============ */
function bindEditor(onSubmit, onInput) {
  var ta = $('#codeInput'), g = $('#gutter'), c = $('#counter');
  if (!ta) return null;
  var lines = -1;
  function sync() {
    var v = ta.value, n = v.split('\n').length;
    if (n !== lines) {
      lines = n;
      var out = ''; for (var i = 1; i <= n; i++) out += i + (i < n ? '\n' : '');
      g.textContent = out;
    }
    if (c) c.textContent = n + '줄 · ' + v.length + '자';
    if (onInput) onInput();
  }
  ta.addEventListener('input', sync);
  ta.addEventListener('scroll', function () { g.scrollTop = ta.scrollTop; }, { passive: true });
  ta.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); onSubmit(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      var a = ta.selectionStart, b = ta.selectionEnd, v = ta.value;
      if (e.shiftKey) {
        var ls = v.lastIndexOf('\n', a - 1) + 1;
        if (v.slice(ls, ls + 4) === '    ') {
          ta.value = v.slice(0, ls) + v.slice(ls + 4);
          ta.selectionStart = ta.selectionEnd = Math.max(ls, a - 4);
        }
      } else {
        ta.value = v.slice(0, a) + '    ' + v.slice(b);
        ta.selectionStart = ta.selectionEnd = a + 4;
      }
      sync();
    } else if (e.key === 'Enter') {
      var a2 = ta.selectionStart, v2 = ta.value;
      var ls2 = v2.lastIndexOf('\n', a2 - 1) + 1;
      var cur = v2.slice(ls2, a2);
      var ind = (cur.match(/^[ \t]*/) || [''])[0];
      if (/[:{]\s*$/.test(cur)) ind += '    ';
      if (ind) {
        e.preventDefault();
        ta.value = v2.slice(0, a2) + '\n' + ind + v2.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = a2 + 1 + ind.length;
        sync();
      }
    }
  });
  sync(); ta.focus();
  return ta;
}

function markGuide() {
  var list = document.getElementById('guideList'), ta = $('#codeInput');
  if (!list || !ta) return;
  var n = ta.value.split('\n').filter(function (l) { return l.trim(); }).length;
  var idx = clamp(n, 1, list.children.length) - 1;
  for (var i = 0; i < list.children.length; i++) {
    list.children[i].className = i === idx ? 'on' : (i < idx ? 'done' : '');
  }
}
function wireEditor() {
  if (!bindEditor(submitTest, S.test.guide ? markGuide : null)) return;
  if (S.test.guide) markGuide();
  var prob = S.problems.filter(function (x) { return x.id === S.test.pid; })[0];
  var lim = prob ? timeLimit(prob) : 0;
  clearInterval(S.test._timer);
  S.test.start = S.test.start || Date.now();
  S.test._timer = setInterval(function () {
    var el = $('#timer'); if (!el) { clearInterval(S.test._timer); return; }
    var sec = Math.floor((Date.now() - S.test.start) / 1000);
    el.textContent = mmss(sec);
    if (sec > lim) el.style.color = 'var(--bad)';
  }, 1000);
}


function startTest(pid, idx, opt) {
  opt = opt || {};
  var p = S.problems.filter(function (x) { return x.id === pid; })[0];
  if (!p) return;
  S.test = {
    pid: pid, idx: (idx == null ? null : idx), gate: !!opt.gate, guide: !!opt.guide,
    round: (idx != null && p.schedule && p.schedule[idx]) ? p.schedule[idx].round : '연습',
    start: Date.now(), result: null, elapsed: 0, _timer: null
  };
  S.hist.push(navSnap()); S.view = 'test'; render(); toTop(); navPush();
}
function startDrill(pid, idx) {
  var p = S.problems.filter(function (x) { return x.id === pid; })[0]; if (!p) return;
  var full = traceTarget({ code: catalogCode(p) });
  var blk = blockTarget(p);
  var trial = clamp(p.trial || 1, 1, S.settings.trialMax || 10);
  var needFull, needBlock;
  if (trial <= 1 || !blk) { needFull = trial; needBlock = 0; }
  else { needFull = 1; needBlock = trial - 1; }

  var wr = walkRows(p);
  S.drill = {
    pid: pid, idx: (idx == null ? null : idx),
    full: full, blk: blk, needFull: needFull, needBlock: needBlock,
    doneFull: 0, doneBlock: 0, phase: 'full', target: full,
    walkAll: wr, walk: wr, wmap: null,
    showNote: S.settings.drillNote !== false,
    done: 0, pos: 0, errors: 0, written: 0, startedAt: Date.now()
  };
  buildWalkMap();
  S.hist.push(navSnap()); S.view = 'drill'; render(); toTop(); navPush();
}

/* 현재 target 의 각 줄이 전체 코드의 몇 번째 줄인지 대응시킨다 */
function buildWalkMap() {
  var dr = S.drill;
  if (!dr || !dr.walkAll) { if (dr) { dr.wmap = null; dr.walk = null; } return; }
  var fullLines = dr.full.split('\n').filter(function (l) { return l.trim(); })
    .map(function (l) { return l.trim().replace(/\s+/g, ' '); });
  var wi = -1;
  dr.walk = dr.walkAll;
  dr.wmap = dr.target.split('\n').map(function (l) {
    if (!l.trim()) return -1;
    var k = l.trim().replace(/\s+/g, ' ');
    var at = fullLines.indexOf(k);
    wi++;
    return at >= 0 ? at : wi;
  });
}

function paintTrace() {
  var dr = S.drill; if (!dr) return;
  var v = document.getElementById('traceview'); if (!v) return;
  var t = dr.target, pos = dr.pos;
  var cur = t[pos];
  var curHtml = cur === undefined ? '<span class="cur end"> </span>'
    : (cur === '\n' ? '<span class="cur">↵</span>\n' : '<span class="cur">' + esc(cur) + '</span>');
  v.innerHTML = '<span class="done">' + esc(t.slice(0, pos)) + '</span>' + curHtml +
    '<span class="ghost">' + esc(t.slice(pos + 1)) + '</span>';
  var el = v.querySelector('.cur');
  if (el) { try { el.scrollIntoView({ block: 'nearest' }); } catch (e) { } }
  var bar = document.getElementById('traceBar');
  if (bar) bar.style.width = (t.length ? pos / t.length * 100 : 0) + '%';
  var np = document.getElementById('traceNote');
  if (np && dr.walk && dr.wmap && dr.showNote) {
    var li = t.slice(0, Math.min(pos, t.length - 1) + (pos >= t.length ? 0 : 0)).split('\n').length - 1;
    if (pos >= t.length) li = t.split('\n').length - 1;
    var wi2 = dr.wmap[li];
    while (wi2 < 0 && li > 0) { li--; wi2 = dr.wmap[li]; }
    var row = wi2 >= 0 ? dr.walk[wi2] : null;
    np.innerHTML = row
      ? '<div class="small muted" style="margin-bottom:4px">' + (wi2 + 1) + '번째 줄</div>' +
        '<div class="mono small" style="margin-bottom:6px;color:var(--accent)">' + esc(row.code.trim()) + '</div>' +
        '<div>' + esc(row.note) + '</div>'
      : '';
  }
  var st = document.getElementById('traceStat');
  if (st) st.textContent = Math.round(t.length ? pos / t.length * 100 : 0) + '% · 남은 글자 ' +
    (t.length - pos) + ' · 오타 ' + dr.errors;
  var warn = document.getElementById('traceWarn');
  if (warn) {
    if (dr.badKo) {
      warn.className = 'hintbox warn-ko';
      warn.innerHTML = '한글 입력 상태입니다. <b>한/영 키를 눌러 영문으로 바꿔 주세요.</b> 코드에는 한글이 없습니다.';
    } else if (dr.errors > 4) {
      var c = t[pos];
      warn.className = 'hintbox';
      warn.innerHTML = '지금 칠 글자: <span class="mono" style="font-weight:600">' +
        (c === undefined ? '(끝)' : c === '\n' ? '엔터' : esc(c)) + '</span>';
    } else {
      warn.className = 'hintbox';
      warn.style.display = 'none';
      return;
    }
    warn.style.display = '';
  }
}

function skipIndent() {
  var dr = S.drill, t = dr.target;
  while (dr.pos < t.length && (t[dr.pos] === ' ' || t[dr.pos] === '\t') &&
    (dr.pos === 0 || t[dr.pos - 1] === '\n')) dr.pos++;
}

var HANGUL = /[\uac00-\ud7a3\u3131-\u318e]/;
function traceInput() {
  var dr = S.drill; if (!dr) return;
  var ta = document.getElementById('tracein'); if (!ta) return;
  if (dr._ime) return;
  var t = dr.target, v = ta.value, pos = dr.pos;
  var base = t.slice(0, pos);

  if (v === base) {
    /* 변화 없음 */
  } else if (v.length > pos && v.slice(0, pos) === base) {
    var i = pos;
    while (i < v.length && i < t.length && v[i] === t[i]) i++;
    dr.pos = i;
    if (v.length > i) reject(v.slice(i));
  } else if (v.length < pos && v === base.slice(0, v.length)) {
    dr.pos = v.length;            /* 백스페이스만 뒤로 허용 */
  } else {
    reject(v.slice(pos));         /* IME 잔여물 등 — 제자리 유지 */
  }
  skipIndent();
  ta.value = t.slice(0, dr.pos);
  paintTrace();
  if (dr.pos >= t.length) finishPass();
}

function reject(bad) {
  var dr = S.drill;
  dr.errors++;
  dr.badKo = HANGUL.test(String(bad || ''));
  flashErr();
}

var _errT = null;
function flashErr() {
  var box = document.getElementById('tracebox'); if (!box) return;
  box.classList.add('err');
  clearTimeout(_errT);
  _errT = setTimeout(function () { box.classList.remove('err'); }, 170);
}

function finishPass() {
  var dr = S.drill; if (!dr || dr._closing) return;
  dr._closing = true;
  var n = traceLines(dr.target);
  dr.written += n;
  if (dr.phase === 'full') dr.doneFull++; else dr.doneBlock++;

  var goTest = false, nextPhase = dr.phase;
  if (dr.phase === 'full' && dr.doneFull >= dr.needFull) {
    if (dr.needBlock > 0 && dr.blk) nextPhase = 'block'; else goTest = true;
  } else if (dr.phase === 'block' && dr.doneBlock >= dr.needBlock) {
    goTest = true;
  }

  if (goTest) {
    var pid = dr.pid, idx = dr.idx;
    var prob = S.problems.filter(function (x) { return x.id === pid; })[0];
    var useGuide = S.settings.guideStep && prob && !everPassed(prob);
    S.drill = null;
    startTest(pid, idx, { guide: useGuide });
    toast(useGuide ? '깜지 완료 — 이제 설명만 보고 써 봅니다' : '깜지 완료 — 이제 실전입니다');
  } else {
    if (nextPhase !== dr.phase) {
      dr.phase = 'block';
      dr.target = dr.blk.text;
      buildWalkMap();
      toast('전체 1회 완료 — 이제 틀렸던 부분만 ' + dr.needBlock + '회');
    } else {
      toast((dr.phase === 'full' ? dr.doneFull : dr.doneBlock) + '회 완료');
    }
    dr.pos = 0; dr._closing = false;
    render();
  }
  try { bumpDaily(n, n); } catch (e) { }
}

function wireDrill() {
  var ta = document.getElementById('tracein'); if (!ta) return;
  var dr = S.drill;
  ta.value = dr.target.slice(0, dr.pos);
  ta.addEventListener('compositionstart', function () { dr._ime = true; });
  ta.addEventListener('compositionend', function () {
    dr._ime = false;
    setTimeout(traceInput, 0);
  });
  ta.addEventListener('input', traceInput);
  ta.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { e.preventDefault(); }
  });
  paintTrace();
  ta.focus();
  if (dr.pos >= dr.target.length) setTimeout(finishPass, 0);
}

function submitTest() {
  var t = S.test; if (!t || t.result) return;
  var ta = $('#codeInput'); if (!ta) return;
  var p = S.problems.filter(function (x) { return x.id === t.pid; })[0]; if (!p) return;
  if (!ta.value.trim()) { toast('작성한 코드가 없습니다'); return; }
  t.answer = ta.value;
  t.elapsed = Math.floor((Date.now() - t.start) / 1000);
  clearInterval(t._timer);
  t.result = grade(catalogCode(p), t.answer, p.lang || 'python');
  try { bumpDaily(t.result.userLines, t.result.matched); } catch (e) { }
  var lim = timeLimit(p);
  var missing = t.result.checks.filter(function (c) { return !c.ok; }).length;
  var grace = S.settings.grace;
  t.verdict = {
    lim: lim, missing: missing, grace: grace,
    surface: t.result.surface, hard: t.result.hard,
    clean: t.result.surface === 0 && t.result.hard === 0 && missing === 0,
    perfect: t.result.hard === 0 && missing === 0 && t.result.surface <= grace && t.elapsed <= lim
  };
  render(); toTop();
}
function finishTest(retrain) {
  var t = S.test; if (!t || !t.result) return;
  var p = S.problems.filter(function (x) { return x.id === t.pid; })[0]; if (!p) return;
  if (t.guide) {
    /* 설명을 보고 쓴 단계다. 기록만 남기고 연속·깜지 횟수는 건드리지 않는다. */
    var ga = (p.attempts || []).concat([{
      at: today(), rate: t.result.rate, sec: t.elapsed, perfect: t.verdict.perfect,
      guide: true, tags: t.result.tags.slice(0, 6), miss: []
    }]).slice(-40);
    var gidx2 = t.idx;
    put('problems', S.problems, Object.assign({}, p, { attempts: ga })).then(function () {
      S.test = null;
      if (retrain) { startTest(p.id, gidx2, {}); toast('이번엔 아무것도 없이 써 봅니다'); return; }
      back();
    });
    return;
  }
  var T = today(), perfect = t.verdict.perfect, need = S.settings.streakNeed;

  var streak = perfect ? (p.streak || 0) + 1 : 0;
  var masteredAt = (perfect && streak >= need) ? T : null;
  var fails = todayFails(p) + (perfect ? 0 : 1);
  var rest = !perfect && fails >= (S.settings.restAfter || 3);
  var trial = perfect ? 1
    : (rest ? (p.trial || 1) : Math.min(S.settings.trialMax || 10, (p.trial || 1) + 1));

  var sc = (p.schedule || []).slice();
  if (t.idx != null && sc[t.idx]) {
    var item = sc[t.idx];
    sc[t.idx] = Object.assign({}, item, { done: true, doneAt: T, rate: t.result.rate });
    if (S.settings.retry && t.result.rate < S.settings.pass) {
      sc.push({ round: item.round, due: addDays(T, 1), done: false, retry: true });
      sc.sort(function (a, b) { return a.due < b.due ? -1 : (a.due > b.due ? 1 : a.round - b.round); });
    }
  }
  /* 취약한 문제는 다음 회차를 앞당긴다 */
  if (!perfect) {
    for (var q = 0; q < sc.length; q++) {
      if (sc[q].done) continue;
      var gap = dayDiff(T, sc[q].due);
      if (gap > 1) sc[q] = Object.assign({}, sc[q], { due: addDays(T, Math.max(1, Math.floor(gap / 2))) });
      break;
    }
  }
  var att = (p.attempts || []).concat([{
    at: T, rate: t.result.rate, sec: t.elapsed, perfect: perfect,
    tags: t.result.tags.slice(0, 6),
    miss: t.result.checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.k; }).slice(0, 6)
  }]).slice(-40);

  var wasGate = t.gate && perfect;
  var np = Object.assign({}, p, {
    schedule: sc, attempts: att, streak: streak, masteredAt: masteredAt, trial: trial,
    weak: perfect ? null : { lines: t.result.weak, at: T },
    restUntil: rest ? addDays(T, 1) : (perfect ? null : p.restUntil)
  });
  var idx = t.idx;
  put('problems', S.problems, np).then(function () {
    if (wasGate) { S.settings.gateDone = T; saveSettings(); }
    S.test = null;
    if (rest) {
      S.restCard = { id: np.id, title: np.title, fails: fails };
      goto('dash');
      toast('오늘은 이 문제를 여기서 멈춥니다');
      return;
    }
    if (retrain) {
      startDrill(np.id, idx);
      toast(t.result.weak.length ? '틀린 부분만 집중해서 다시 갑니다' : '깜지 ' + trial + '회부터 다시 갑니다');
      return;
    }
    back();
    toast(perfect
      ? (streak >= need ? '암기 완료 — 이제 해설 탭에서 세 문장으로 설명해 보세요'
        : '완벽 재현 ' + streak + '/' + need)
      : '깜지 ' + trial + '회로 올랐습니다');
  });
}

/* ============ actions ============ */
function makeSchedule(base) {
  return S.settings.intervals.map(function (d, i) {
    return { round: i + 1, due: addDays(base, d), done: false };
  });
}

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]'); if (!el) return;
  var a = el.dataset.act;

  if (a === 'account-open') {
    var ab = document.getElementById('accountBtn'); if (ab) ab.click();
    return;
  }
  if (a === 'select') {
    if (e.target.closest('[data-act]') !== el) return;
    S.sel = (S.sel === el.dataset.p) ? null : el.dataset.p;
    S.detailTab = 'note'; S.explainOpen = null; S.explainShown = null;
    render(); return;
  }
  if (a === 'back') { back(); return; }
  if (a === 'dtab') { S.detailTab = el.dataset.t; render(); return; }
  if (a === 'explain-open') {
    S.explainOpen = el.dataset.p; S.explainShown = null; S.detailTab = 'note'; render(); return;
  }
  if (a === 'explain-cancel') { S.explainOpen = null; S.explainShown = null; render(); return; }
  if (a === 'explain-show') {
    S.exDraft = [val('ex-0'), val('ex-1'), val('ex-2')];
    if (!S.exDraft.join('').trim()) { toast('한 줄이라도 써 보세요'); return; }
    S.explainShown = el.dataset.p; render(); return;
  }
  if (a === 'explain-save') {
    var ep = S.problems.filter(function (x) { return x.id === el.dataset.p; })[0]; if (!ep) return;
    var a3 = S.exDraft || ['', '', ''];
    put('problems', S.problems, Object.assign({}, ep, {
      explain: { a: a3, date: today(), ok: el.dataset.ok === '1' }
    })).then(function () {
      S.explainOpen = null; S.explainShown = null; S.exDraft = null;
      render();
      toast(el.dataset.ok === '1' ? '설명까지 마쳤습니다' : '해설을 다시 읽어보세요');
    });
    return;
  }
  if (a === 'course-open') {
    S.hist.push(navSnap());
    S.courseSel = el.dataset.c; S.view = 'pack';
    render(); toTop(); navPush(); return;
  }
  if (a === 'course-start') { startCourse(el.dataset.c); return; }
  if (a === 'course-lang') { S.courseLang = el.dataset.l; S.packLv = 1; S.packSel = {}; render(); toTop(); return; }
  if (a === 'pack-lv') { S.packOpen = true; S.packLv = parseInt(el.dataset.l, 10) || 0; render(); return; }
  if (a === 'pack-course') {
    var want = el.dataset.lv.split(',').map(Number), have0 = packRegistered();
    CATALOG.forEach(function (c) {
      if (c.lang === S.courseLang && want.indexOf(c.lv) >= 0 && !have0[c.id]) S.packSel[c.id] = true;
    });
    render(); return;
  }
  if (a === 'pack-tog') {
    var cid = el.dataset.c; S.packSel[cid] = !S.packSel[cid];
    S.packPerDay = clamp(parseInt(val('pack-per'), 10) || S.packPerDay, 1, 10);
    render(); return;
  }
  if (a === 'pack-all') {
    var have1 = packRegistered();
    CATALOG.forEach(function (c) {
      if (!have1[c.id] && c.lang === S.courseLang && (!S.packLv || c.lv === S.packLv)) S.packSel[c.id] = true;
    });
    render(); return;
  }
  if (a === 'pack-none') { S.packSel = {}; render(); return; }
  if (a === 'pack-add') { registerPack(); return; }
  if (a === 'go-pack') { goto('pack'); return; }
  if (a === 'go-dash') { goto('dash'); return; }
  if (a === 'seed-demo') { seedDemo(); return; }
  if (a === 'enter') {
    S.landingForced = false; S.settings.seenLanding = true; saveSettings();
    render(); toTop(); return;
  }
  if (a === 'enter-demo') {
    S.landingForced = false; S.settings.seenLanding = true; saveSettings();
    seedDemo(); return;
  }
  if (a === 'show-landing') { S.landingForced = true; render(); toTop(); return; }
  if (a === 'clear-demo') {
    if (!confirm('예시 데이터를 모두 지웁니다. 직접 등록한 문제는 남습니다. 계속할까요?')) return;
    clearDemo(); return;
  }
  if (a === 'go-problem') { var pid = el.dataset.p; goto('bank'); S.sel = pid; render(); return; }
  if (a === 'go-bank-new') { S.form = { id: null }; goto('bank'); return; }
  if (a === 'form-open') { S.form = S.form ? null : { id: null }; render(); return; }
  if (a === 'form-close') { S.form = null; render(); return; }
  if (a === 'form-edit') { S.form = { id: el.dataset.p }; goto('bank'); return; }
  if (a === 'form-save') { saveProblemForm(); return; }
  if (a === 'del-p') {
    if (!confirm('이 문제와 복습 기록을 모두 삭제할까요?')) return;
    drop('problems', S.problems, el.dataset.p).then(function () { S.sel = null; render(); toast('삭제했습니다'); });
    return;
  }
  if (a === 'rest-ok') { S.restCard = null; render(); return; }
  if (a === 'rest-force') {
    var rp = S.problems.filter(function (x) { return x.id === el.dataset.p; })[0];
    S.restCard = null;
    if (rp) put('problems', S.problems, Object.assign({}, rp, { restUntil: null })).then(function () { startDrill(rp.id, null); });
    return;
  }
  if (a === 'drill-next') { finishPass(); return; }
  if (a === 'drill-note') {
    S.drill.showNote = !S.drill.showNote;
    S.settings.drillNote = S.drill.showNote; saveSettings();
    render(); return;
  }
  if (a === 'trace-focus') { var ti = document.getElementById('tracein'); if (ti) ti.focus(); return; }
  if (a === 'train') { startDrill(el.dataset.p, el.dataset.i == null ? null : parseInt(el.dataset.i, 10)); return; }
  if (a === 'live') { startTest(el.dataset.p, el.dataset.i == null ? null : parseInt(el.dataset.i, 10), {}); return; }
  if (a === 'giveup') {
    var gp2 = S.problems.filter(function (x) { return x.id === S.test.pid; })[0]; if (!gp2) return;
    var gf = todayFails(gp2) + 1;
    var grest = gf >= (S.settings.restAfter || 3);
    var nt = grest ? (gp2.trial || 1) : Math.min(S.settings.trialMax || 10, (gp2.trial || 1) + 1);
    var gidx = S.test.idx;
    clearInterval(S.test._timer); S.test = null;
    put('problems', S.problems, Object.assign({}, gp2, {
      trial: nt, streak: 0, masteredAt: null, giveups: (gp2.giveups || 0) + 1,
      restUntil: grest ? addDays(today(), 1) : gp2.restUntil,
      attempts: (gp2.attempts || []).concat([{ at: today(), rate: 0, sec: 0, perfect: false, gaveUp: true, tags: [], miss: [] }]).slice(-40)
    })).then(function () {
      if (grest) {
        S.restCard = { id: gp2.id, title: gp2.title, fails: gf };
        goto('dash');
        toast('오늘은 이 문제를 여기서 멈춥니다');
        return;
      }
      startDrill(gp2.id, gidx);
      toast('깜지 ' + nt + '회부터 다시 갑니다');
    });
    return;
  }
  if (a === 'gate-start') {
    var gp = gateProblem(); if (!gp) return;
    startTest(gp.p.id, gp.i, { gate: true }); return;
  }
  if (a === 'gate-skip') {
    S.settings.gateDone = today();
    S.settings.gateSkip = (S.settings.gateSkip || 0) + 1;
    saveSettings().then(function () { render(); toast('관문을 건너뛰었습니다 (누적 ' + S.settings.gateSkip + '회)'); });
    return;
  }
  if (a === 'test-exit') {
    if (S.test && !S.test.result && $('#codeInput') && $('#codeInput').value.trim() && !confirm('작성 중인 코드가 사라집니다. 나갈까요?')) return;
    back(); return;
  }
  if (a === 'submit') { submitTest(); return; }
  if (a === 'retry') { startTest(S.test.pid, S.test.idx, { gate: S.test.gate }); return; }
  if (a === 'record') { finishTest(false); return; }
  if (a === 'retrain') { finishTest(true); return; }
  if (a === 'to-live') { finishTest(true); return; }
  if (a === 'back-to-drill') {
    var bp = S.problems.filter(function (x) { return x.id === S.test.pid; })[0];
    var bidx = S.test.idx;
    finishTest(false);
    if (bp) setTimeout(function () { startDrill(bp.id, bidx); }, 120);
    return;
  }
  if (a === 'guide') {
    startTest(el.dataset.p, el.dataset.i == null ? null : parseInt(el.dataset.i, 10), { guide: true });
    return;
  }
  if (a === 'push') {
    var p = S.problems.filter(function (x) { return x.id === el.dataset.p; })[0]; if (!p) return;
    var i = parseInt(el.dataset.i, 10), sc = (p.schedule || []).slice();
    sc[i] = Object.assign({}, sc[i], { due: today() });
    put('problems', S.problems, Object.assign({}, p, { schedule: sc })).then(function () { render(); toast('오늘로 옮겼습니다'); });
    return;
  }
  if (a === 's-save') {
    var iv = val('s-int').split(',').map(function (x) { return parseInt(x.trim(), 10); })
      .filter(function (x) { return !isNaN(x) && x > 0 && x < 400; });
    if (!iv.length) { toast('복습 간격을 하나 이상 입력하세요'); return; }
    iv.sort(function (a2, b2) { return a2 - b2; });
    S.settings = Object.assign({}, S.settings, {
      intervals: iv, pass: clamp(num('s-pass', 80), 10, 100),
      retry: val('s-retry') === '1', newGoal: clamp(num('s-new', 1), 0, 20),
      streakNeed: clamp(num('s-streak', 3), 1, 10),
      secPerLine: clamp(num('s-spl', 10), 2, 60),
      baseSec: clamp(num('s-base', 30), 0, 300),
      decayDays: clamp(num('s-decay', 30), 7, 180),
      gate: val('s-gate') === '1',
      trialMax: clamp(num('s-tmax', 10), 2, 20),
      grace: clamp(num('s-grace', 1), 0, 5),
      restAfter: clamp(num('s-rest', 3), 2, 10),
      guideStep: val('s-guide') === '1'
    });
    saveSettings().then(function () { render(); toast('설정을 저장했습니다'); });
    return;
  }
  if (a === 'sync-code') {
    if (!confirm('내장 문제의 코드를 최신 버전으로 되돌립니다. 직접 수정한 코드는 사라집니다. 계속할까요?')) return;
    var byId2 = {};
    CATALOG.forEach(function (c) { byId2[c.id] = c; });
    var n2 = 0;
    S.problems.slice().forEach(function (p) {
      var c = p.srcId && byId2[p.srcId];
      if (!c || p.code === c.code) return;
      put('problems', S.problems, Object.assign({}, p, {
        code: c.code, logic: c.logic, brief: c.brief, limits: c.limits, category: c.cat
      }));
      n2++;
    });
    render();
    toast(n2 ? n2 + '개를 최신 코드로 바꿨습니다' : '이미 전부 최신입니다');
    return;
  }
  if (a === 'copy-json') {
    var data = JSON.stringify({ problems: S.problems, books: S.books, insights: S.insights, settings: S.settings }, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data).then(function () { toast('JSON을 클립보드에 복사했습니다'); },
        function () { toast('복사에 실패했습니다'); });
    } else toast('이 브라우저에서는 복사를 지원하지 않습니다');
    return;
  }
  if (a === 'import') { importLocal(); return; }
  if (a === 'dismiss-import') { S.canImport = false; render(); return; }
});

function saveProblemForm() {
  var title = val('f-title'), code = document.getElementById('f-code').value;
  if (!title) { toast('문제 제목을 입력하세요'); return; }
  if (!code.trim()) { toast('정답 코드를 입력하세요'); return; }
  var base = val('f-base') || today();
  var old = S.form.id ? S.problems.filter(function (x) { return x.id === S.form.id; })[0] : null;
  var regen = document.getElementById('f-regen');
  var p = {
    id: old ? old.id : uid(),
    srcId: old ? old.srcId : undefined,
    brief: old ? old.brief : undefined,
    category: val('f-cat') || '미분류',
    title: title, url: val('f-url'), limits: val('f-limit'),
    logic: document.getElementById('f-logic').value.trim(),
    code: code, lang: val('f-lang') || 'python',
    createdAt: base,
    schedule: (old && !(regen && regen.checked)) ? (old.schedule || makeSchedule(base)) : makeSchedule(base),
    attempts: (old && !(regen && regen.checked)) ? (old.attempts || []) : []
  };
  put('problems', S.problems, p).then(function () {
    S.form = null; S.sel = p.id; render();
    toast(old ? '수정했습니다' : '등록 완료 — ' + S.settings.intervals.join('·') + '일 뒤 복습이 예약되었습니다');
  });
}

document.addEventListener('input', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.live === 'q') { S.filter.q = t.value; refreshBankList(); }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.dataset && t.dataset.live === 'cat') { S.filter.cat = t.value; render(); }
  if (t.dataset && t.dataset.live === 'lv') { S.filter.lv = t.value; render(); }
  if (t.dataset && t.dataset.live === 'lang') { S.filter.lang = t.value; S.filter.lv = ''; render(); }
  if (t.dataset && t.dataset.live === 'pace') { S.coursePace = clamp(parseInt(t.value, 10) || 2, 1, 5); }
  if (t.dataset && t.dataset.live === 'sort') { S.settings.bankSort = t.value; saveSettings(); render(); }
});
var _bt = null;
function refreshBankList() { clearTimeout(_bt); _bt = setTimeout(function () { if (S.view === 'bank') { var q = val('q'); render(); var i = document.getElementById('q'); if (i) { i.focus(); i.setSelectionRange(q.length, q.length); } } }, 220); }

$('#nav').addEventListener('click', function (e) {
  var b = e.target.closest('button[data-v]'); if (!b) return;
  if (gateProblem()) { toast('오늘의 관문을 먼저 통과하세요'); return; }
  if (S.view === 'test' && S.test && !S.test.result && $('#codeInput') && $('#codeInput').value.trim()) {
    if (!confirm('작성 중인 코드가 사라집니다. 이동할까요?')) return;
  }
  if (S.drill && S.drill.pos > 0 && !confirm('쓰던 깜지가 사라집니다. 이동할까요?')) return;
  if (S.test) { clearInterval(S.test._timer); S.test = null; }
  S.drill = null;
  goto(b.dataset.v);
});

$('#themeBtn').addEventListener('click', function () {
  var cur = document.documentElement.getAttribute('data-theme');
  var next = cur === 'dark' ? 'light' : (cur === 'light' ? '' : 'dark');
  if (next) document.documentElement.setAttribute('data-theme', next);
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem('algo-memory:theme', next); } catch (e) { }
});
try {
  var th = localStorage.getItem('algo-memory:theme');
  if (th) document.documentElement.setAttribute('data-theme', th);
} catch (e) { }

window.AlgoMemoryApp = {
  exportState: exportState,
  importState: importState,
  setAccountStatus: setAccountStatus,
  toast: toast
};

/* ============ boot ============ */
loadLocal();
try { _localBackup = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { _localBackup = null; }
syncCatalogCode();
render();

resolveDb().then(function (db) {
  if (!db) return;
  DB = db; S.mode = 'cloud';
  S.problems = []; S.books = []; S.insights = [];
  subscribe();
});

})();
