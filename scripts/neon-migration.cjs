'use strict';
// Offline operator tool. Never accepts browser-submitted identity assertions.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const MAX_FILE = 20 * 1024 * 1024;
const MAX_STATE = 1024 * 1024;
class MigrationError extends Error {}
function check(ok, code) { if (!ok) throw new MigrationError(code); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}
function digest(value) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function directory(input, label) {
  check(input && input.version === 1 && Array.isArray(input.users), label + '_FORMAT');
  const ids = new Map(), emails = new Map();
  for (const user of input.users) {
    check(user && typeof user.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(user.id), label + '_ID');
    check(typeof user.email === 'string', label + '_EMAIL');
    const email = user.email.trim().toLowerCase();
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), label + '_EMAIL');
    check(user.email_verified === true, label + '_UNVERIFIED');
    check(!ids.has(user.id) && !emails.has(email), label + '_DUPLICATE');
    ids.set(user.id, email); emails.set(email, user.id);
  }
  return { ids, emails };
}
function planMigration(source, target) {
  const from = directory(source, 'SOURCE'), to = directory(target, 'TARGET');
  check(Array.isArray(source.states), 'SOURCE_STATES_FORMAT');
  const mapping = new Map();
  for (const [id, email] of from.ids) {
    check(to.emails.has(email), 'UNMAPPED_ACCOUNT');
    mapping.set(id, to.emails.get(email));
  }
  const seen = new Set();
  const rows = source.states.map(row => {
    check(row && mapping.has(row.user_id), 'ORPHAN_STATE');
    check(!seen.has(row.user_id), 'DUPLICATE_STATE'); seen.add(row.user_id);
    check(row.state && typeof row.state === 'object' && !Array.isArray(row.state), 'INVALID_STATE');
    const serialized = JSON.stringify(row.state);
    check(Buffer.byteLength(serialized) <= MAX_STATE, 'STATE_TOO_LARGE');
    check(typeof row.updated_at === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.updated_at) && Number.isFinite(Date.parse(row.updated_at)), 'INVALID_TIMESTAMP');
    return { user_id: mapping.get(row.user_id), state: JSON.parse(serialized), updated_at: row.updated_at };
  }).sort((a, b) => a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0);
  return { rows, summary: { mode: 'dry-run', accounts: mapping.size, states: rows.length, checksum: digest(rows) } };
}
function verifyRestored(plan, restored) {
  check(restored && restored.version === 1 && Array.isArray(restored.states), 'RESTORE_FORMAT');
  const rows = restored.states.map(r => ({ user_id: r.user_id, state: r.state, updated_at: r.updated_at }))
    .sort((a, b) => a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0);
  // Compare timestamps by instant; Postgres may format the same instant differently.
  const comparable = list => list.map(r => ({ ...r, updated_at: new Date(r.updated_at).toISOString() }));
  check(digest(comparable(rows)) === digest(comparable(plan.rows)), 'RESTORE_MISMATCH');
  return { verified: true, states: rows.length };
}
function importSql(plan) {
  const data = JSON.stringify(plan.rows);
  let n = 0, tag = '$algo_migration_0$';
  while (data.includes(tag)) tag = '$algo_migration_' + (++n) + '$';
  return '-- Contains private user data. Do not commit or upload this file.\n' +
    '-- Run only on the verified NEW target with ON_ERROR_STOP enabled.\n' +
    'BEGIN;\nSET LOCAL statement_timeout = \'30s\';\nLOCK TABLE public.user_state IN ACCESS EXCLUSIVE MODE;\n' +
    'DO $target_check$ BEGIN IF EXISTS (SELECT 1 FROM public.user_state) THEN RAISE EXCEPTION \'TARGET_NOT_EMPTY\'; END IF; END $target_check$;\n' +
    'INSERT INTO public.user_state (user_id, state, updated_at)\n' +
    'SELECT user_id, state, updated_at FROM jsonb_to_recordset(' + tag + data + tag + '::jsonb)\n' +
    'AS item(user_id text, state jsonb, updated_at timestamptz);\nCOMMIT;\n';
}
function readJson(filename) {
  check(fs.statSync(filename).size <= MAX_FILE, 'FILE_TOO_LARGE');
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
function main(args) {
  check(args.length >= 2 && (args.length === 2 || (args.length === 4 && ['--write-sql', '--verify'].includes(args[2]))), 'USAGE: node scripts/neon-migration.cjs SOURCE TARGET [--write-sql NAME.sql | --verify RESTORED.json]');
  const plan = planMigration(readJson(args[0]), readJson(args[1]));
  if (args[2] === '--verify') return console.log(JSON.stringify(verifyRestored(plan, readJson(args[3]))));
  if (args[2] === '--write-sql') {
    check(/^[A-Za-z0-9_-]+\.sql$/.test(args[3]), 'OUTPUT_MUST_BE_SQL_BASENAME');
    const dir = path.resolve(__dirname, '../.migration-backups');
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    check(!fs.lstatSync(dir).isSymbolicLink(), 'OUTPUT_SYMLINK');
    fs.writeFileSync(path.join(dir, args[3]), importSql(plan), { flag: 'wx', mode: 0o600 });
    plan.summary.mode = 'sql-generated-not-executed';
  }
  console.log(JSON.stringify(plan.summary));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (err) {
    // Never echo raw JSON, filesystem paths, credentials or identity records.
    console.error(err instanceof MigrationError ? err.message : 'MIGRATION_FAILED: check local input files and permissions');
    process.exitCode = 1;
  }
}
module.exports = { planMigration, verifyRestored, importSql, digest };
