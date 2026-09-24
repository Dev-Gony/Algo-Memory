const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { planMigration, verifyRestored, importSql } = require('../scripts/neon-migration.cjs');
function fixture() {
  return {
    source: { version: 1, users: [{ id: 'old-a', email: 'a@example.test', email_verified: true }], states: [{ user_id: 'old-a', state: { score: 3, notes: 'private-note' }, updated_at: '2026-09-24T00:00:00.000Z' }] },
    target: { version: 1, users: [{ id: 'new-a', email: 'a@example.test', email_verified: true }] },
  };
}
test('maps verified identities and preserves state without mutation', () => {
  const f = fixture(), before = JSON.stringify(f);
  const p = planMigration(f.source, f.target);
  assert.equal(p.rows[0].user_id, 'new-a');
  assert.deepEqual(p.rows[0].state, f.source.states[0].state);
  assert.equal(JSON.stringify(f), before);
  assert.equal(p.summary.accounts, 1);
});
test('normalizes case but does not collapse plus aliases', () => {
  const f = fixture(); f.target.users[0].email = ' A@example.test ';
  assert.equal(planMigration(f.source, f.target).rows.length, 1);
  f.target.users[0].email = 'a+other@example.test';
  assert.throws(() => planMigration(f.source, f.target), /UNMAPPED_ACCOUNT/);
});
test('rejects duplicate identities and conflicting emails', () => {
  const f = fixture(); f.target.users.push({ ...f.target.users[0], id: 'new-b' });
  assert.throws(() => planMigration(f.source, f.target), /TARGET_DUPLICATE/);
});
test('rejects unverified identities from either provider', () => {
  for (const side of ['source', 'target']) {
    const f = fixture(); f[side].users[0].email_verified = false;
    assert.throws(() => planMigration(f.source, f.target), /UNVERIFIED/);
  }
});
test('does not silently omit users without migrated accounts', () => {
  const f = fixture(); f.source.users.push({ id: 'old-b', email: 'b@example.test', email_verified: true });
  assert.throws(() => planMigration(f.source, f.target), /UNMAPPED_ACCOUNT/);
});
test('rejects orphan and duplicate state rows', () => {
  const f = fixture(); f.source.states[0].user_id = 'unknown';
  assert.throws(() => planMigration(f.source, f.target), /ORPHAN_STATE/);
  f.source.states[0].user_id = 'old-a'; f.source.states.push(f.source.states[0]);
  assert.throws(() => planMigration(f.source, f.target), /DUPLICATE_STATE/);
});
test('rejects malformed dates, arrays, and oversized state', () => {
  const f = fixture(); f.source.states[0].updated_at = 'not-a-date';
  assert.throws(() => planMigration(f.source, f.target), /INVALID_TIMESTAMP/);
  f.source.states[0].updated_at = '2026-09-24T00:00:00Z'; f.source.states[0].state = [];
  assert.throws(() => planMigration(f.source, f.target), /INVALID_STATE/);
  f.source.states[0].state = { x: 'a'.repeat(1024 * 1024) };
  assert.throws(() => planMigration(f.source, f.target), /STATE_TOO_LARGE/);
});
test('restore verification detects changed content or wrong ownership', () => {
  const f = fixture(), p = planMigration(f.source, f.target);
  const restored = { version: 1, states: structuredClone(p.rows) };
  restored.states[0].updated_at = '2026-09-24T09:00:00+09:00';
  assert.equal(verifyRestored(p, restored).verified, true);
  restored.states[0].state.score = 9;
  assert.throws(() => verifyRestored(p, restored), /RESTORE_MISMATCH/);
  restored.states = [];
  assert.throws(() => verifyRestored(p, restored), /RESTORE_MISMATCH/);
});
test('SQL uses collision-safe JSON quoting and refuses populated targets', () => {
  const f = fixture(); f.source.states[0].state.notes = "$algo_migration_0$'; DROP TABLE x; --";
  const sql = importSql(planMigration(f.source, f.target));
  assert.match(sql, /\$algo_migration_1\$/);
  assert.match(sql, /TARGET_NOT_EMPTY/);
  assert.match(sql, /LOCK TABLE/);
  assert.doesNotMatch(sql, /ON CONFLICT|TRUNCATE|DELETE FROM/);
  assert.ok(sql.endsWith('COMMIT;\n'));
});
test('default CLI is dry-run and never prints records', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'algo-migration-'));
  try {
    const f = fixture();
    for (const key of ['source', 'target']) fs.writeFileSync(path.join(dir, key + '.json'), JSON.stringify(f[key]));
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/neon-migration.cjs'), path.join(dir, 'source.json'), path.join(dir, 'target.json')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).mode, 'dry-run');
    assert.doesNotMatch(result.stdout, /example\.test|private-note|old-a|new-a/);
    assert.equal(fs.readdirSync(dir).length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
