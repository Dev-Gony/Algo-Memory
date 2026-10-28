const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/commute-editor');
const C = require('../src/commute');
const { open, today } = require('./harness');
const catalog = require('../src/commute-catalog.json');
const legacy = { problems: [], books: [{ id: 'book1', title: '보존' }], insights: [{ id: 'note1', body: '보존' }], daily: { '2026-01-01': { w: 12, c: 8, r: 2 } }, settings: { seenLanding: true, grace: 2, intervals: [2, 5, 10] } };
function newline(text, expected, pos = text.length, end = pos) { const s = E.newline(E.state(text, pos, end)); assert.equal(s.value, expected); assert.equal(s.start, s.end); return s; }
for (const [text, expected] of [
  ['def solution():', 'def solution():\n    '],
  ['    if n > 0:', '    if n > 0:\n        '],
  ['    total += n', '    total += n\n    '],
  ['    ', '    \n    '],
  ['if n: # comment', 'if n: # comment\n    '],
  ['    print(":")', '    print(":")\n    '],
  ['    # if n:', '    # if n:\n    '],
  ['    data = {"x":', '    data = {"x":\n    '],
  ['    text = "abc:', '    text = "abc:\n    '],
  ['    text = """\nif n:', '    text = """\nif n:\n'],
  ['if "#" == ":":', 'if "#" == ":":\n    '],
  ['async def solution():', 'async def solution():\n    '],
  ['    else:', '    else:\n        ']
]) test('Enter: ' + JSON.stringify(text), () => newline(text, expected));
test('줄 중간 Enter는 뒷부분과 선택 치환을 보존한다', () => {
  const text = '    return value + 1';
  newline(text, '    return\n     value + 1', 10);
  newline('if n:\n    return n', 'if n:\n    return n', 5, 10);
  newline('abcdef', 'abc\ndef', 3);
});
test('커서와 선택 범위의 들여쓰기/내어쓰기', () => {
  assert.deepEqual(E.indent(E.state('a\nb\nc', 0, 4), false), E.state('    a\n    b\nc', 4, 12));
  assert.deepEqual(E.indent(E.state('    a\n    b\nc', 4, 12), true), E.state('a\nb\nc', 0, 4));
  assert.deepEqual(E.indent(E.state('  abc', 4), true), E.state('abc', 2));
  assert.deepEqual(E.indent(E.state('\nabc', 0), true), E.state('\nabc', 0));
  assert.deepEqual(E.indent(E.state('abc', 1), false), E.state('a    bc', 5));
});
test('괄호 도구는 선택을 감싸고 내부 선택을 유지한다', () => {
  assert.deepEqual(E.token(E.state('abc', 0, 3), '()', true), E.state('(abc)', 1, 4));
  assert.deepEqual(E.token(E.state('x', 1), '[]', true), E.state('x[]', 2));
  assert.deepEqual(E.token(E.state('abc', 1, 2), ':', false), E.state('a:c', 2));
});
test('복습 간격과 자가 확인 독립성은 명확한 규칙을 따른다', () => {
  const a = { outcome: 'self-pass', hints: 0, solutionSeen: false, exposed: false };
  assert.deepEqual(C.plan({ stage: 0 }, a, '2026-01-31'), { stage: 1, due: '2026-02-01', independent: true });
  assert.equal(C.plan({ stage: 1 }, a, '2026-01-31').due, '2026-02-03');
  assert.equal(C.plan({ stage: 4 }, a, '2026-01-01').due, '2026-01-31');
  for (const assist of [{ hints: 1 }, { solutionSeen: true }, { exposed: true }]) {
    assert.deepEqual(C.plan({ stage: 2 }, { ...a, ...assist }, '2026-01-01'), { stage: 2, due: '2026-01-02', independent: false });
  }
  assert.equal(C.plan({ stage: 4 }, { ...a, outcome: 'review' }, '2026-01-01').stage, 0);
});
test('새 저장 형식은 미래 버전과 손상 기록을 거부한다', () => {
  assert.ok(C.valid(C.empty()));
  assert.ok(!C.valid({ ...C.empty(), version: 2 }));
  assert.ok(!C.valid({ ...C.empty(), records: { x: { attempts: [null] } } }));
  assert.ok(!C.valid({ ...C.empty(), drafts: { x: { code: 3 } } }));
  assert.ok(!C.valid({ ...C.empty(), records: [] }));
});
function fixture(t, data) { const f = open({ storage: legacy, url: 'https://example.test/#commute', ...data }); t.after(() => f.w.close()); return f; }
function begin(f, id = 'even-count') { f.click('[data-cm="open"][data-id="' + id + '"]'); return f.d.getElementById('cm-code'); }
function put(f, code) { f.set('cm-code', code); const ta = f.d.getElementById('cm-code'); ta.setSelectionRange(code.length, code.length); return ta; }
function local(f) { return JSON.parse(f.w.localStorage.getItem(C.key)); }
function answer(f, code = 'def solution(values):\n    return sum(v % 2 == 0 for v in values)') { put(f, code); f.click('[data-cm="submit"]'); }
function input(f, ta, type, text, cancelable = true) {
  const e = new f.w.InputEvent('beforeinput', { inputType: type, data: text, bubbles: true, cancelable });
  ta.dispatchEvent(e);
  if (!e.defaultPrevented) { const s = ta.selectionStart, en = ta.selectionEnd; ta.value = ta.value.slice(0, s) + text + ta.value.slice(en); ta.setSelectionRange(s + text.length, s + text.length); ta.dispatchEvent(new f.w.InputEvent('input', { inputType: type, data: text, bubbles: true })); }
  return e;
}
test('통근 진입·문제 수·PC 기존 기록 보존', async t => {
  const f = fixture(t); await f.tick();
  assert.equal(f.view(), 'v-commute');
  assert.equal(f.d.getElementById('landing').hidden, true);
  assert.equal(catalog.length, 10);
  assert.equal(f.d.querySelectorAll('.cm-question').length, 4);
  assert.ok(f.d.querySelector('.cm-contract').textContent.includes('실행하지 않습니다'));
  begin(f); answer(f); f.click('[data-cm="assess"][data-outcome="self-pass"]');
  assert.deepEqual(f.local(), legacy);
  assert.deepEqual(f.errors, []);
});
test('모바일 beforeinput과 물리 Enter는 정확히 한 번 들여쓴다', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f);
  put(f, 'def solution():'); input(f, ta, 'insertLineBreak', '\n');
  assert.equal(ta.value, 'def solution():\n    ');
  put(f, '    if x:'); ta.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(ta.value, '    if x:\n        ');
});
test('취소 불가능한 Android 줄바꿈 이벤트 보정', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f);
  put(f, 'def solution():'); input(f, ta, 'insertLineBreak', '\n', false);
  assert.equal(ta.value, 'def solution():\n    ');
});
test('자동 들여쓰기 끄기·붙여넣기·IME는 입력을 변형하지 않는다', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f);
  f.set('cm-auto', false); // set() sets value, so explicitly change checked.
  const toggle = f.d.getElementById('cm-auto'); toggle.checked = false; toggle.dispatchEvent(new f.w.Event('change', { bubbles: true }));
  put(f, 'def solution():'); input(f, ta, 'insertLineBreak', '\n'); assert.equal(ta.value, 'def solution():\n');
  toggle.checked = true; toggle.dispatchEvent(new f.w.Event('change', { bubbles: true }));
  put(f, ''); const pasted = 'def solution():\n  return ":"\n'; input(f, ta, 'insertFromPaste', pasted); assert.equal(ta.value, pasted);
  ta.dispatchEvent(new f.w.CompositionEvent('compositionstart', { bubbles: true }));
  const before = ta.value;
  ta.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })); assert.equal(ta.value, before);
  f.click('[data-edit="indent"]'); assert.equal(ta.value, before);
  ta.value += '한글'; ta.dispatchEvent(new f.w.InputEvent('input', { inputType: 'insertCompositionText', isComposing: true, bubbles: true }));
  ta.dispatchEvent(new f.w.CompositionEvent('compositionend', { bubbles: true })); assert.ok(ta.value.endsWith('한글'));
  assert.ok(local(f).drafts['even-count'].code.endsWith('한글'));
});
test('터치 도구 선택·실행취소·다시 실행·회전에서 커서와 초안 보존', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f);
  put(f, 'abc'); ta.setSelectionRange(0, 3); f.click('[data-edit="pair"][data-token="()"]');
  assert.equal(ta.value, '(abc)'); assert.equal(ta.selectionStart, 1); assert.equal(ta.selectionEnd, 4);
  f.click('[data-edit="undo"]'); assert.equal(ta.value, 'abc');
  f.click('[data-edit="redo"]'); assert.equal(ta.value, '(abc)');
  const before = [ta.value, ta.selectionStart, ta.selectionEnd]; f.w.dispatchEvent(new f.w.Event('resize'));
  assert.deepEqual([ta.value, ta.selectionStart, ta.selectionEnd], before);
  assert.equal(ta.isConnected, true);
});
test('한 번에 힌트 하나·해설은 제출 뒤·다른 변수명은 정답 비교하지 않음', async t => {
  const f = fixture(t); await f.tick(); begin(f);
  assert.equal(f.d.querySelector('[data-cm="solution"]'), null);
  assert.equal(f.d.querySelector('#cm-solution'), null);
  f.click('[data-cm="hint"]'); assert.equal(f.d.querySelectorAll('#cm-hints li').length, 1);
  f.click('[data-cm="hint"]'); assert.equal(f.d.querySelectorAll('#cm-hints li').length, 2);
  answer(f);
  assert.ok(f.d.getElementById('cm-feedback').textContent.includes('실행 결과가 아닙니다'));
  assert.equal(f.d.getElementById('cm-solution').textContent, '');
  f.click('[data-cm="assess"][data-outcome="self-pass"]');
  const a = local(f).records['even-count'].attempts[0]; assert.equal(a.hints, 2); assert.equal(a.independent, false); assert.equal(a.verified, false);
});
test('독립 자가 확인 2회는 난이도를 올리고 오답은 낮춘다', async t => {
  const f = fixture(t); await f.tick(); begin(f); answer(f); f.click('[data-cm="assess"][data-outcome="self-pass"]');
  assert.equal(local(f).records['even-count'].attempts[0].independent, true);
  f.click('[data-cm="open"][data-id="odd-sum"]'); answer(f, 'def solution(nums):\n    return sum(n for n in nums if n % 2)');
  f.click('[data-cm="assess"][data-outcome="self-pass"]'); assert.equal(local(f).level, 2);
  f.click('[data-cm="open"][data-id="even-count"]'); answer(f); f.click('[data-cm="assess"][data-outcome="review"]');
  assert.equal(local(f).level, 1); assert.equal(local(f).records['even-count'].stage, 0);
});
test('모범 풀이와 같은 날 재시도는 독립 정답으로 둔갑하지 않는다', async t => {
  const f = fixture(t); await f.tick(); begin(f); answer(f); f.click('[data-cm="solution"]');
  assert.ok(f.d.getElementById('cm-solution').textContent.includes('count = 0'));
  f.click('[data-cm="assess"][data-outcome="self-pass"]'); assert.equal(local(f).records['even-count'].attempts[0].independent, false);
  f.click('[data-cm="retry"]'); answer(f); f.click('[data-cm="assess"][data-outcome="self-pass"]');
  assert.equal(local(f).records['even-count'].attempts[1].independent, false);
});
test('제출 뒤 코드 수정은 재제출을 요구하고 중복 기록을 막는다', async t => {
  const f = fixture(t); await f.tick(); begin(f); answer(f); put(f, 'def solution(nums):\n    return 0');
  assert.equal(f.d.querySelector('[data-cm="assess"]'), null);
  f.click('[data-cm="submit"]'); f.click('[data-cm="assess"][data-outcome="review"]');
  f.click('[data-cm="submit"]'); assert.equal(local(f).records['even-count'].attempts.length, 1);
});
test('새로고침 후 초안·힌트·제출 상태와 복습 기록을 복원', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f); answer(f); f.click('[data-cm="hint"]');
  ta.setSelectionRange(4, 8); f.w.dispatchEvent(new f.w.Event('pagehide'));
  const saved = local(f); assert.ok(C.valid(saved));
  const g = fixture(t, { commute: saved }); await g.tick(); const restored = begin(g);
  assert.equal(restored.value, ta.value); assert.equal(restored.selectionStart, 4); assert.equal(restored.selectionEnd, 8);
  assert.equal(g.d.querySelectorAll('#cm-hints li').length, 1); assert.ok(g.d.querySelector('[data-cm="assess"]'));
  g.click('[data-cm="assess"][data-outcome="review"]'); g.click('[data-cm="home"]');
  const record = local(g).records['even-count']; assert.ok(record.due > today());
  const hdata = local(g); hdata.records['even-count'].due = today();
  const h = fixture(t, { commute: hdata }); await h.tick(); assert.equal(h.d.querySelector('.cm-question').dataset.id, 'even-count');
});
test('PC 화면 왕복과 기존 통합 백업이 두 모드 기록을 보존', async t => {
  const f = fixture(t); await f.tick(); const ta = begin(f); put(f, 'def solution(nums):\n    return len(nums)');
  f.click('#nav [data-v="settings"]'); await f.tick();
  let copied; Object.defineProperty(f.w.navigator, 'clipboard', { value: { writeText: x => { copied = JSON.parse(x); return Promise.resolve(); } } });
  f.click('[data-act="copy-json"]');
  assert.deepEqual(JSON.parse(JSON.stringify(copied.daily)), legacy.daily);
  assert.ok(copied.commute.drafts['even-count'].code.includes('len(nums)'));
  f.click('#nav [data-v="commute"]'); assert.equal(f.d.getElementById('cm-code'), ta); assert.equal(ta.value, 'def solution(nums):\n    return len(nums)');
  assert.deepEqual(f.local(), legacy);
});
for (const bad of ['{broken', JSON.stringify({ ...C.empty(), version: 99 }), JSON.stringify({ ...C.empty(), records: { x: { attempts: [null] } } })]) {
  test('손상/미래 저장 데이터를 덮어쓰지 않는다: ' + bad.slice(0, 18), async t => {
    const f = fixture(t, { commute: bad }); await f.tick(); begin(f); answer(f); f.click('[data-cm="assess"][data-outcome="self-pass"]');
    assert.equal(f.w.localStorage.getItem(C.key), bad); assert.deepEqual(f.local(), legacy); assert.deepEqual(f.errors, []);
    assert.ok(f.d.getElementById('cm-feedback').textContent.includes('저장에 실패'));
  });
}
test('저장 실패도 편집·자가 확인을 막지 않고 경고한다', async t => {
  const f = fixture(t); await f.tick(); begin(f);
  f.w.Storage.prototype.setItem = () => { throw new Error('quota'); };
  answer(f); f.click('[data-cm="assess"][data-outcome="review"]');
  assert.ok(f.d.getElementById('cm-feedback').textContent.includes('저장에 실패')); assert.deepEqual(f.errors, []);
});
test('일반 PC 모드의 관문과 통근 모드는 독립적으로 동작한다', async t => {
  const p = { id: 'p', title: 'legacy', code: 'return 1', lang: 'python', createdAt: today(), attempts: [], schedule: [{ due: today(), round: 1, done: false }] };
  const f = fixture(t, { storage: { ...legacy, problems: [p], settings: { ...legacy.settings, gate: true } } }); await f.tick();
  assert.equal(f.view(), 'v-commute');
  f.click('#nav [data-v="dash"]'); assert.equal(f.view(), 'v-dash'); assert.ok(f.d.querySelector('.gate'));
  f.click('#nav [data-v="commute"]'); assert.equal(f.view(), 'v-commute');
});
test('파일 복원은 별도 통근 데이터만 바꾸고 취소/오류를 보존한다', async t => {
  const f = fixture(t); await f.tick();
  async function restore(content) {
    const picker = f.d.getElementById('cm-import');
    Object.defineProperty(picker, 'files', { configurable: true, value: [new f.w.File([content], 'backup.json', { type: 'application/json' })] });
    picker.dispatchEvent(new f.w.Event('change', { bubbles: true })); await f.tick(80);
  }
  const incoming = C.empty(); incoming.level = 3;
  f.w.confirm = () => false; await restore(JSON.stringify(incoming)); assert.equal(f.w.localStorage.getItem(C.key), null);
  f.w.confirm = () => true; await restore(JSON.stringify(incoming)); assert.equal(local(f).level, 3);
  await restore('{invalid'); assert.equal(local(f).level, 3); assert.deepEqual(f.local(), legacy);
});
