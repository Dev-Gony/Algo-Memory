// Fetch hash-pinned public browser fixtures. Never execute runtime or answer code in Node.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const runtime = require('../src/python-runner');
const target = process.env.PYODIDE_TEST_DIR || path.join(os.tmpdir(), 'algo-memory-pyodide-' + runtime.version);
function matches(bytes, a) { return bytes.length === a.bytes && crypto.createHash('sha256').update(bytes).digest('hex') === a.sha256; }
(async () => {
  fs.mkdirSync(target, { recursive: true });
  for (const a of runtime.assets) {
    const file = path.join(target, a.name);
    if (fs.existsSync(file) && matches(fs.readFileSync(file), a)) continue;
    const response = await fetch(runtime.base + a.name, { signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error('Runtime HTTP ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!matches(bytes, a)) throw new Error('Runtime integrity mismatch: ' + a.name);
    fs.writeFileSync(file, bytes);
  }
  console.log('Verified Pyodide browser fixtures: ' + target + ' (' + runtime.assets.reduce((n, a) => n + a.bytes, 0) + ' decoded bytes)');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
