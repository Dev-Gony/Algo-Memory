#!/usr/bin/env node
const fs = require('fs');

function must(text, re, message) {
  if (!re.test(text)) {
    console.error('FAIL:', message);
    process.exitCode = 1;
  }
}

const schema = fs.readFileSync('neon/schema.sql', 'utf8');
const cloud = fs.readFileSync('src/cloud.js', 'utf8');
const migration = fs.readFileSync('docs/NEON_MIGRATION.md', 'utf8');

must(schema, /enable row level security/i, 'Neon user_state must enable RLS');
must(schema, /auth\.user_id\(\)\s*=\s*user_id/i, 'RLS must bind rows to auth.user_id()');
must(schema, /user_id\s+text\s+primary key/i, 'Neon Auth user IDs must be stored as text');\nmust(schema, /to authenticated/i, 'policies/grants must target authenticated users');
must(cloud, /ALGO_MEMORY_CLOUD_PROVIDER/, 'cloud provider seam must exist');
must(cloud, /provider\.changePassword/, 'password change must be provider-specific');
must(migration, /Supabase.*(?:먼저|전에는).*중지하지 않는다|Supabase를 끄기 전에/i, 'cutover must preserve rollback');
must(migration, /비밀번호.*(?:해시|그대로).*이전할 수 없다|비밀번호 해시를 직접 이전하지 않는다/i, 'password-user migration limitation must be documented');

if (/postgres(?:ql)?:\/\/[^\s'"]+:[^\s@'"]+@/i.test(schema + '\n' + migration)) {
  console.error('FAIL: privileged database connection string must not be committed');
  process.exitCode = 1;
}

if (!process.exitCode) console.log('Neon migration readiness checks passed');
