// Uses an installed Chrome/Edge; no browser download, external services, or public server.
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createServer } = require('./serve');
const candidates = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const executablePath = candidates.find(p => fs.existsSync(p));
if (!executablePath) throw new Error('Installed Chrome/Edge not found. Set BROWSER_PATH; this test never downloads a browser.');
const evidenceDir = process.env.QA_DIR || path.join(__dirname, '..', 'qa-local');
fs.mkdirSync(evidenceDir, { recursive: true });
const server = createServer();
let browser;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  // Fonts are optional. Reject all non-local requests throughout the test.
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
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
  await page.locator('[data-cm="submit"]').tap();
  assert.equal(await page.locator('#cm-solution').textContent(), '');
  await page.screenshot({ path: path.join(evidenceDir, 'commute-412-feedback.png'), fullPage: true });
  await page.locator('[data-cm="assess"][data-outcome="self-pass"]').tap();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('algo-memory:commute:v1')));
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
  assert.equal((await context.request.get(base + '/src/app.js')).status(), 404);
  assert.equal((await context.request.post(base + '/')).status(), 404);
  assert.equal(server.address().address, '127.0.0.1');
  assert.deepEqual(errors, []);
  await context.close();
  // Actual downloaded standalone HTML: reject all HTTP requests, then edit/save/submit.
  const offline = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, offline: true });
  const filePage = await offline.newPage();
  await filePage.goto(pathToFileURL(path.join(__dirname, '..', 'dist', 'algo-memory.html')).href + '?cloud=supabase#commute');
  await filePage.locator('.cm-question').first().tap();
  await filePage.locator('#cm-code').fill('def solution(nums):\n    return 0');
  await filePage.locator('[data-cm="submit"]').tap();
  assert.ok((await filePage.locator('#cm-feedback').textContent()).includes('자동 채점이 아닙니다'));
  await offline.close();
  console.log('Chrome mobile QA passed: touch toolbar, Enter/selection/undo, resize 375/412/915, draft reload, hints/feedback, dark/large text, standalone offline, localhost-only server. Screenshots: ' + evidenceDir);
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
});
