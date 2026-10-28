const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const runtime = require('../src/python-runner');
const catalog = require('../src/commute-catalog.json');
const executablePath = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
if (!executablePath) throw new Error('Installed Chrome/Edge required. Set BROWSER_PATH; this test never downloads a browser.');
const assetDir = process.env.PYODIDE_TEST_DIR;
let browser;
const source = fs.readFileSync(path.join(__dirname, '../src/python-runner.js'), 'utf8');
const server = http.createServer((req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><script src="/runner.js"></script>'); }
  else if (req.url === '/runner.js') { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(source); }
  else { res.writeHead(404); res.end(); }
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  let networkMode = 'normal', unexpected = [];
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:')) return route.continue();
    if (url.startsWith(runtime.base) && runtime.assets.some(a => url === runtime.base + a.name)) {
      if (networkMode === 'offline') return route.abort('internetdisconnected');
      if (networkMode === 'corrupt') return route.fulfill({ body: 'corrupt', status: 200 });
      if (assetDir) return route.fulfill({ path: path.join(assetDir, url.slice(runtime.base.length)), contentType: url.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' });
      return route.continue();
    }
    unexpected.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('console', message => { if (process.env.RUNNER_DEBUG) console.log('browser: ' + message.text().slice(0, 500)); });
  page.on('pageerror', error => console.log('browser error: ' + error.message.slice(0, 500)));
  await page.goto('http://127.0.0.1:' + server.address().port);
  const output = await page.evaluate(async q => {
    const phases = []; window.runner = AlgoPython.create(window);
    const result = await runner.run(q.solution, q.tests, !!q.preserveInput, p => phases.push(p.status));
    return { result, phases, remainingFrames: document.querySelectorAll('iframe').length };
  }, catalog[0]);
  if (process.env.RUNNER_DEBUG) console.log(JSON.stringify(output));
  assert.equal(output.result.status, 'passed');
  assert.equal(output.remainingFrames, 0);
  assert.ok(output.phases.includes('running'));
  if (process.env.RUNNER_SMOKE_ONLY) { console.log('Live CDN Pyodide smoke passed'); await context.close(); return; }
  let executions = 1;
  async function run(code, tests, preserveInput = false) {
    const result = await page.evaluate(async data => runner.run(data.code, data.tests, data.preserveInput), { code, tests, preserveInput });
    executions++; assert.equal(await page.locator('iframe').count(), 0, 'worker frame must be removed after every result');
    return result;
  }
  const alternatives = {
    'even-count': 'def solution(values):\n    return sum(value % 2 == 0 for value in values)',
    'odd-sum': 'def solution(values):\n    return sum(value for value in values if value % 2)',
    'clamp-score': 'def solution(value):\n    return min(100, max(0, value))',
    'first-positive': 'def solution(values):\n    return next((value for value in values if value > 0), 0)',
    'running-sum': 'from itertools import accumulate\ndef solution(values):\n    return list(accumulate(values))',
    'positive-filter': 'def solution(values):\n    return [value for value in values if value > 0]',
    'char-count': 'from collections import Counter\ndef solution(value):\n    return Counter(value)',
    'stable-unique': 'def solution(values):\n    return list(dict.fromkeys(values))',
    'pair-sum': 'def solution(values):\n    return max((a+b for a,b in zip(values, values[1:])), default=0)',
    'longest-positive': 'def solution(values):\n    best = current = 0\n    for value in values:\n        current = current + 1 if value > 0 else 0\n        best = max(best, current)\n    return best'
  };
  for (const q of catalog) {
    if (q.id !== catalog[0].id) assert.equal((await run(q.solution, q.tests, !!q.preserveInput)).status, 'passed', q.id);
    assert.equal((await run(alternatives[q.id], q.tests, !!q.preserveInput)).status, 'passed', 'alternative ' + q.id);
    assert.equal((await run('def solution(value):\n    return None', q.tests)).status, 'wrong-answer', 'wrong ' + q.id);
  }
  assert.equal((await run('def solution(:\n    return 0', catalog[0].tests)).status, 'syntax-error');
  assert.equal((await run('def solution(value):\n    return 1 / 0', catalog[0].tests)).status, 'runtime-error');
  assert.equal((await run('raise SystemExit(1)', catalog[0].tests)).status, 'runtime-error');
  const mutation = catalog.find(q => q.id === 'positive-filter');
  assert.equal((await run('def solution(values):\n    values[:] = [x for x in values if x > 0]\n    return values', mutation.tests, true)).status, 'wrong-answer');
  assert.equal((await run('def solution(value):\n    return True', [{ args: [1], want: 1 }])).status, 'wrong-answer');
  // Verify absence of application globals from the Python JS bridge.
  assert.equal((await run('def solution(value):\n    import js\n    return [hasattr(js, "document"), hasattr(js, "localStorage"), hasattr(js, "fetch")]', [{ args: [0], want: [false, false, false] }])).status, 'passed');
  // Keep a real infinite loop alive while independently probing its opaque iframe's inherited CSP.
  const looping = page.evaluate(async () => runner.run('def solution(value):\n    while True:\n        pass', [{ args: [0], want: 0 }], false, p => { window.runningProbe = p.status === 'running'; }));
  looping.catch(() => {});
  await page.waitForFunction(() => window.runningProbe === true);
  const sandboxFrame = page.frames().find(f => f !== page.mainFrame());
  const isolation = await sandboxFrame.evaluate(async () => {
    const denied = {};
    try { void parent.document.body; denied.parent = false; } catch (e) { denied.parent = true; }
    try { void localStorage.length; denied.storage = false; } catch (e) { denied.storage = true; }
    denied.origin = location.origin;
    denied.worker = await new Promise(resolve => {
      const source = 'Promise.all([fetch("https://example.com/csp-probe").then(()=>false,()=>true),Promise.resolve().then(()=>{try {let x=new XMLHttpRequest();x.open("GET","https://example.com/xhr-probe",false);x.send();return false}catch(e){return true}}),new Promise(resolve=>{try{const socket=new WebSocket("wss://example.com/ws-probe");socket.onopen=()=>{socket.close();resolve(false)};socket.onerror=()=>resolve(true)}catch(e){resolve(true)}}),Promise.resolve().then(()=>{try{indexedDB.open("probe");return false}catch(e){return true}})]).then(result=>postMessage(result))';
      const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
      const worker = new Worker(url); URL.revokeObjectURL(url);
      worker.onmessage = e => { worker.terminate(); resolve(e.data); };
      worker.onerror = () => { worker.terminate(); resolve(['worker-error']); };
    });
    return denied;
  });
  assert.equal(isolation.parent, true); assert.equal(isolation.storage, true); assert.equal(isolation.origin, 'null');
  assert.deepEqual(isolation.worker, [true, true, true, true], 'CSP must block native fetch/XHR/WebSocket and opaque origin must block IndexedDB');
  assert.equal((await looping).status, 'timeout'); executions++;
  assert.equal((await run(catalog[0].solution, catalog[0].tests)).status, 'passed', 'normal run after infinite loop');
  // Every run gets a new interpreter: mutation of builtins must not affect the next attempt.
  assert.equal((await run('import builtins\nbuiltins.sum = lambda value: 999\ndef solution(value):\n    return 0', [{ args: [1], want: 0 }])).status, 'passed');
  assert.equal((await run(alternatives['even-count'], catalog[0].tests)).status, 'passed');
  const cancelled = page.evaluate(async () => runner.run('while True: pass', [{ args: [0], want: 0 }], false, p => { window.cancelProbe = p.status === 'running'; }));
  await page.waitForFunction(() => window.cancelProbe === true); await page.evaluate(() => runner.cancel());
  assert.equal((await cancelled).status, 'cancelled'); executions++;
  assert.equal((await run(catalog[0].solution, catalog[0].tests)).status, 'passed');
  // A reload loses the in-memory buffers. Verified Cache API files must still support offline execution.
  networkMode = 'offline'; await page.reload();
  const offline = await page.evaluate(async q => AlgoPython.create(window).run(q.solution, q.tests), catalog[0]);
  assert.equal(offline.status, 'passed'); executions++;
  // A clean cache plus failed downloads is a connection failure, never a learner wrong answer.
  await page.evaluate(async cache => caches.delete(cache), runtime.cacheName); await page.reload();
  const disconnected = await page.evaluate(async q => AlgoPython.create(window).run(q.solution, q.tests), catalog[0]);
  assert.equal(disconnected.status, 'network-error');
  networkMode = 'corrupt'; await page.reload();
  const corrupt = await page.evaluate(async q => AlgoPython.create(window).run(q.solution, q.tests), catalog[0]);
  assert.equal(corrupt.status, 'load-error');
  assert.equal(await page.locator('iframe').count(), 0);
  assert.deepEqual(unexpected, []);
  console.log('Real Pyodide browser QA passed: ' + executions + ' executions, 10 reference/10 alternative/10 wrong solutions, syntax/runtime/errors, timeout/cancel recovery, opaque origin/network CSP, input mutation, old-worker isolation, cache-offline and load/network failures.');
  await context.close();
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); await new Promise(r => server.close(r)); });
