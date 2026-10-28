// Uses an installed Chrome/Edge; no browser download, external services, or public server.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createServer } = require('./serve');
const pythonRuntime = require('../src/python-runner');
const candidates = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const executablePath = candidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('Installed Chrome/Edge not found. Set BROWSER_PATH; this test never downloads a browser.');
const evidenceDir = process.env.QA_DIR || path.join(__dirname, '..', 'qa-local');
fs.mkdirSync(evidenceDir, { recursive: true });
const server = createServer();
let browser;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const localBase = 'http://127.0.0.1:' + server.address().port;
  const base = process.env.PUBLIC_QA_URL || localBase;
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  // Existing accounts are never used. Only app files and pinned public Python runtime assets are allowed.
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/') || url.startsWith(localBase + '/')) return route.continue();
    const asset = pythonRuntime.assets.find(a => url === pythonRuntime.base + a.name);
    if (asset) return process.env.PYODIDE_TEST_DIR ? route.fulfill({ path: path.join(process.env.PYODIDE_TEST_DIR, asset.name), contentType: asset.name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' }) : route.continue();
    return route.abort();
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // Existing rollback flag skips Neon initialization; the external Supabase SDK is blocked above.
  // This keeps account services entirely out of this local-only commute test.
  await page.goto(base + '/?cloud=supabase#commute');
  await page.locator('.cm-question').first().tap();
  const code = page.locator('#cm-code');
  await code.fill('def solution(nums):'); await code.press('End'); await code.press('Enter');
  assert.equal(await code.inputValue(), 'def solution(nums):\n    ');
  await page.keyboard.type('count = 0'); await code.press('Enter');
  assert.equal(await code.inputValue(), 'def solution(nums):\n    count = 0\n    ');
  await page.locator('[data-edit="outdent"]').tap();
  assert.ok((await code.inputValue()).endsWith('\n'));
  await page.locator('[data-edit="undo"]').tap(); assert.ok((await code.inputValue()).endsWith('\n    '));
  await page.locator('[data-edit="redo"]').tap(); assert.ok((await code.inputValue()).endsWith('\n'));
  await code.fill('abc'); await code.focus();
  await code.evaluate(el => el.setSelectionRange(0, 3));
  await page.locator('[data-edit="pair"][data-token="()"]  ').tap();
  assert.deepEqual(await code.evaluate(el => [el.value, el.selectionStart, el.selectionEnd, document.activeElement === el]), ['(abc)', 1, 4, true]);
  await page.locator('[data-edit="undo"]').tap(); assert.equal(await code.inputValue(), 'abc');
  await code.fill('def solution(nums):\n    return sum(n % 2 == 0 for n in nums)');
  await code.evaluate(el => el.setSelectionRange(4, 12));
  await page.screenshot({ path: path.join(evidenceDir, 'commute-412-editor.png'), fullPage: true });
  // Viewport resizing approximates available space, not a real Android IME.
  for (const viewport of [{ width: 412, height: 450 }, { width: 915, height: 412 }, { width: 375, height: 812 }]) {
    const before = await code.evaluate(el => [el.value, el.selectionStart, el.selectionEnd]);
    await page.setViewportSize(viewport);
    assert.deepEqual(await code.evaluate(el => [el.value, el.selectionStart, el.selectionEnd]), before);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'page must not overflow horizontally');
  }
  await page.setViewportSize({ width: 412, height: 915 });
  const buttons = await page.locator('.cm-toolbar button').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
  assert.ok(buttons.every(r => r.w >= 48 && r.h >= 48));
  // IME lifecycle and paste are event simulations; physical Gboard/Samsung Keyboard remains manual QA.
  await code.evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    el.value += '\n    # 한글';
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true, bubbles: true }));
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }));
  });
  assert.ok((await code.inputValue()).endsWith('# 한글'));
  await page.locator('[data-edit="undo"]').tap(); assert.ok(!(await code.inputValue()).includes('한글'));
  const beforeReload = await code.inputValue();
  await page.locator('[data-cm="hint"]').tap(); assert.equal(await page.locator('#cm-hints li').count(), 1);
  await page.reload(); await page.locator('[data-cm="open"][data-id="even-count"]').tap();
  assert.equal(await code.inputValue(), beforeReload); assert.equal(await page.locator('#cm-hints li').count(), 1);
  await page.locator('[data-cm="self-check"]').tap();
  assert.equal(await page.locator('#cm-solution').textContent(), '');
  await page.screenshot({ path: path.join(evidenceDir, 'commute-412-feedback.png'), fullPage: true });
  await page.locator('[data-cm="assess"][data-outcome="self-pass"]').tap();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('algo-memory:commute:v2')));
  assert.equal(saved.records['even-count'].attempts[0].independent, false);
  assert.equal(saved.records['even-count'].attempts[0].verified, false);
  await page.locator('[data-cm="home"]').first().tap();
  await page.screenshot({ path: path.join(evidenceDir, 'commute-412-home.png'), fullPage: true });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: path.join(evidenceDir, 'commute-412-dark.png'), fullPage: true });
  // Enlarge text without fixed card heights; remain usable at the small-phone width.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addStyleTag({ content: '.cm-shell {font-size:22px} .cm-question strong {font-size:22px} .cm-meta {font-size:18px}' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(evidenceDir, 'commute-375-large-text.png'), fullPage: true });
  assert.equal((await context.request.get(localBase + '/src/app.js')).status(), 404);
  assert.equal((await context.request.post(localBase + '/')).status(), 404);
  assert.equal(server.address().address, '127.0.0.1');
  assert.deepEqual(errors, []);
  // Real grading through the actual mobile UI, using only this fresh test browser's storage.
  await page.evaluate(() => localStorage.removeItem('algo-memory:commute:v2'));
  await page.setViewportSize({ width: 412, height: 915 }); await page.reload();
  await page.locator('[data-cm="open"][data-id="even-count"]').tap();
  async function grade(source, expected) {
    await page.locator('#cm-code').fill(source);
    await page.locator('[data-cm="submit"]').tap();
    await page.locator('#cm-feedback h2').waitFor({ timeout: 60000 });
    assert.ok((await page.locator('#cm-feedback h2').textContent()).includes(expected));
  }
  const correct = 'def solution(values):\n    return sum(value % 2 == 0 for value in values)';
  await grade(correct, '실행 테스트 통과');
  await page.locator('[data-cm="retry"]').tap(); await grade('def solution(values):\n    return -999', '테스트 오답');
  await page.locator('[data-cm="retry"]').tap(); await grade('def solution(values):\n    while True:\n        pass', '시간 초과');
  await page.locator('[data-cm="retry"]').tap(); await grade(correct, '실행 테스트 통과');
  await page.locator('[data-cm="retry"]').tap(); await page.locator('[data-cm="hint"]').tap(); await grade(correct, '실행 테스트 통과');
  let actualRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('algo-memory:commute:v2')));
  const attempts = actualRecords.records['even-count'].attempts;
  assert.deepEqual(attempts.map(a => a.outcome), ['passed','wrong-answer','timeout','passed','passed']);
  assert.equal(attempts[0].verified, true); assert.equal(attempts[0].independent, true);
  assert.equal(attempts[4].verified, true); assert.equal(attempts[4].independent, false); assert.equal(attempts[4].hints, 1);
  await page.screenshot({ path: path.join(evidenceDir, 'commute-python-graded.png'), fullPage: true });
  await page.reload();
  await page.locator('.cm-fold summary').first().tap();
  await page.locator('[data-cm="open"][data-id="even-count"]').tap();
  assert.equal(await page.locator('#cm-code').inputValue(), correct);
  assert.ok((await page.locator('#cm-feedback h2').textContent()).includes('실행 테스트 통과'));
  actualRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('algo-memory:commute:v2')));
  assert.equal(actualRecords.records['even-count'].attempts.length, 5);
  await context.setOffline(true);
  await page.locator('[data-cm="retry"]').tap(); await grade(correct, '실행 테스트 통과');
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  console.log('Mobile actual grading passed: correct/wrong/timeout/recovery/hint/record reload/offline; URL: ' + base + '/?cloud=supabase#commute');
  await context.close();
  // Actual downloaded standalone HTML: reject all HTTP requests, then edit/save/submit.
  const offline = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, offline: true });
  const filePage = await offline.newPage();
  await filePage.goto(pathToFileURL(path.join(__dirname, '..', 'dist', 'algo-memory.html')).href + '?cloud=supabase#commute');
  await filePage.locator('.cm-question').first().tap();
  await filePage.locator('#cm-code').fill('def solution(nums):\n    return 0');
  await filePage.locator('[data-cm="self-check"]').tap();
  assert.ok((await filePage.locator('#cm-feedback').textContent()).includes('자동 채점이 아닙니다'));
  await offline.close();
  console.log('Chrome mobile QA passed: touch toolbar, Enter/selection/undo, resize 375/412/915, draft reload, hints/feedback, dark/large text, standalone offline, localhost-only server. Screenshots: ' + evidenceDir);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
});
