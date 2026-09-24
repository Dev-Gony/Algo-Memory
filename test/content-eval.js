const fs = require('fs');
const path = require('path');

const py = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'catalog.json'), 'utf8'));
const sql = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'sql-catalog.json'), 'utf8'));
const all = [...py, ...sql];
const errors = [];

function fail(id, msg) { errors.push(id + ': ' + msg); }
function nonempty(x) { return typeof x === 'string' && x.trim().length > 0; }

if (py.length !== 70) fail('catalog', 'Python count ' + py.length + ' != 70');
if (sql.length !== 35) fail('catalog', 'SQL count ' + sql.length + ' != 35');

const ids = new Set();
for (const x of all) {
  if (!x.id) fail('unknown', 'missing id');
  if (ids.has(x.id)) fail(x.id, 'duplicate id');
  ids.add(x.id);

  for (const k of ['title', 'brief', 'logic', 'code']) {
    if (!nonempty(x[k])) fail(x.id, 'missing ' + k);
  }
  if (!x.demo || !Array.isArray(x.demo.lines) || !x.demo.lines.length) {
    fail(x.id, 'missing representative execution/result demo');
  }
  if (x.brief && x.brief.length < 8) fail(x.id, 'brief too short');
  if (x.logic && x.logic.length < 20) fail(x.id, 'logic explanation too short');
}

const forbiddenPython = [
  ['bf-comb', /사전순/, 'combination implementation preserves input order, not guaranteed lexical order'],
  ['sort-count', /유일한 경우/, 'counting sort is not the only non-comparison sort'],
  ['py-input', /rstrip\(\)이 필수/, 'rstrip is not mandatory when parsing via split/int']
];
for (const [id, re, reason] of forbiddenPython) {
  const x = py.find(v => v.id === id);
  if (x && re.test((x.brief || '') + ' ' + (x.logic || ''))) fail(id, reason);
}

const knownTables = new Set(['members', 'products', 'orders']);
function baseTables(code) {
  const ctes = new Set([...code.matchAll(/\b(?:WITH|,)\s*([A-Za-z_]\w*)\s+AS\s*\(/gi)].map(m => m[1]));
  const out = [];
  for (const m of code.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)/gi)) {
    const n = m[1];
    if (!ctes.has(n) && knownTables.has(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

for (const x of sql) {
  if (!nonempty(x.prompt) || x.prompt.length < 25) fail(x.id, 'SQL prompt missing or too short');
  if (/어느 표|볼 열|정답|결과는|나온다/.test(x.prompt || '')) fail(x.id, 'SQL prompt contains vague/explanatory wording');
  const refs = baseTables(x.code);
  if (!Array.isArray(x.tables) || !x.tables.length) fail(x.id, 'SQL table schema missing');
  const got = new Set((x.tables || []).map(t => t.name));
  for (const name of refs) {
    if (!got.has(name)) fail(x.id, 'schema missing referenced table ' + name);
    if (!(x.prompt || '').includes(name)) fail(x.id, 'prompt does not name referenced table ' + name);
  }
  for (const t of x.tables || []) {
    if (!nonempty(t.name) || !Array.isArray(t.columns) || !t.columns.length) fail(x.id, 'invalid table metadata');
    const seenCols = new Set();
    for (const c of t.columns || []) {
      if (!nonempty(c.name) || !nonempty(c.type) || !nonempty(c.desc)) fail(x.id, 'incomplete column metadata in ' + t.name);
      if (seenCols.has(c.name)) fail(x.id, 'duplicate column ' + t.name + '.' + c.name);
      seenCols.add(c.name);
    }
  }
}

// Every SQL reference token that looks like table.column must exist in exposed schema.
for (const x of sql) {
  const cols = new Map((x.tables || []).map(t => [t.name, new Set((t.columns || []).map(c => c.name))]));
  const aliases = new Map();
  for (const m of x.code.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)(?:\s+AS)?\s+([A-Za-z_]\w*)/gi)) {
    if (knownTables.has(m[1])) aliases.set(m[2], m[1]);
  }
  for (const m of x.code.matchAll(/\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)\b/g)) {
    const table = aliases.get(m[1]) || (knownTables.has(m[1]) ? m[1] : null);
    if (table && cols.has(table) && !cols.get(table).has(m[2])) {
      fail(x.id, 'unknown column ' + table + '.' + m[2]);
    }
  }
}

if (errors.length) {
  console.error('\nCONTENT EVAL FAILED');
  errors.forEach(e => console.error(' - ' + e));
  console.error('\n' + errors.length + ' issue(s)');
  process.exit(1);
}

console.log('CONTENT EVAL PASS');
console.log(' - Python: ' + py.length + ' templates');
console.log(' - SQL: ' + sql.length + ' templates');
console.log(' - total: ' + all.length + ' templates');
console.log(' - required metadata, demos, SQL prompts and schemas verified');
