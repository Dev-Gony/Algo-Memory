const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src', 'neon-provider.js'), 'utf8');
const providerBundle = fs.readFileSync(path.join(root, 'dist', 'neon-provider.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'src', 'neon-config.js'), 'utf8');

assert.match(config, /neonauth\./, 'Neon Auth public URL must be configured');
assert.match(config, /apirest\./, 'Neon Data API public URL must be configured');
assert.match(provider, /params\.get\('cloud'\) !== 'neon'/, 'Neon must be opt-in shadow mode');
assert.match(provider, /email-verification/, 'signup verification must use email OTP');
assert.match(provider, /requestPasswordReset/, 'password reset OTP request must be supported');
assert.match(provider, /resetPassword/, 'password reset completion must be supported');
assert.match(html, /ALGO_MEMORY_NEON/, 'built app must include Neon public config');
assert.match(html, /neon-provider\.js/, 'built app must load the Neon provider bundle');
new (require('vm').Script)(providerBundle, { filename: 'neon-provider.js' });
assert.doesNotMatch(html + '\n' + providerBundle, /postgres(?:ql)?:\/\/[^\s'"]+:[^\s@'"]+@/i, 'privileged Postgres URLs must never reach the browser');

console.log('  ✓ Neon shadow mode');
