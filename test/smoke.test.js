/** 빌드 산출물(dist/algo-memory.html)에 대한 종단 테스트.
 *  node test/smoke.test.js 로 실행하며 실패 시 종료 코드 1. */
const assert = require('assert');
const { open } = require('./harness');
const { makeFakeDb } = require('./fake-db');

const CODE = 'name = "gony"\nage = 35\nscore = 92.5\n\nprint(name)\nprint(age, score)\nprint("name:", name)';
const KO = /[\uac00-\ud7a3\u3131-\u318e]/;

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

function problem(over) {
  return Object.assign({
    id: 'p1', srcId: 's0-var', category: '기초 문법', title: '변수와 출력',
    brief: '', logic: '대입과 출력', limits: '', code: CODE, lang: 'python',
    createdAt: '2026-09-18', trial: 1, streak: 0, masteredAt: null,
    schedule: [{ round: 1, due: '2026-09-18', done: false }], attempts: []
  }, over || {});
}

test('코스 6단계가 낮은 난이도부터 나온다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  const names = t.texts('.course').map((s) => s.split(' ')[1]);
  assert.strictEqual(t.d.querySelectorAll('.course').length, 6);
  assert.ok(t.texts('.course')[0].includes('기초 코스'), '첫 코스는 기초 코스');
  assert.deepStrictEqual(t.errors, []);
});

test('내장 코드 70개에 한글이 없다', async () => {
  const t = open(); await t.tick();
  const cat = t.w.eval ? null : null;
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('.lvtab[data-l="0"]'); await t.tick();
  const codes = t.texts('#v-pack pre.code');
  assert.ok(codes.length > 0, '코드 미리보기가 있어야 한다');
  const bad = codes.filter((c) => KO.test(c));
  assert.deepStrictEqual(bad, [], '코드에 한글이 있으면 깜지에서 한/영 전환을 강요한다');
});

test('기초 코스를 시작하면 학습일이 분산된다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('.course'); await t.tick();
  t.click('[data-act="course-start"]'); await t.tick(150);
  const ps = t.local().problems;
  assert.strictEqual(ps.length, 12);
  const days = new Set(ps.map((p) => p.createdAt));
  assert.ok(days.size >= 5, '하루 2개 기준이면 6일에 나뉘어야 한다: ' + days.size);
  ps.forEach((p) => assert.strictEqual(p.schedule.length, 5, '망각곡선 5회차'));
});

test('깜지는 틀린 글자를 막고 커서를 뒤로 보내지 않는다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  const ta = () => t.d.getElementById('tracein');
  const pos = () => t.d.querySelector('.traceview .done').textContent.length;

  ta().value = CODE.slice(0, 6); ta().dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.strictEqual(pos(), 6);

  ta().value = CODE.slice(0, 6) + 'Z'; ta().dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.strictEqual(pos(), 6, '오타는 제자리');
  assert.ok(t.d.getElementById('traceStat').textContent.includes('오타 1'));

  ta().value = CODE.slice(0, 3); ta().dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.strictEqual(pos(), 3, '백스페이스는 허용');
});

test('한글 조합 중에는 커서가 흔들리지 않고 안내가 뜬다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  const ta = t.d.getElementById('tracein');
  const pos = () => t.d.querySelector('.traceview .done').textContent.length;
  ta.value = CODE.slice(0, 6); ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));

  ta.dispatchEvent(new t.w.CompositionEvent('compositionstart', { bubbles: true }));
  ta.value = CODE.slice(0, 6) + 'ㅇ'; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.strictEqual(pos(), 6, '조합 중에는 손대지 않는다');
  ta.value = CODE.slice(0, 6) + '이'; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  ta.dispatchEvent(new t.w.CompositionEvent('compositionend', { bubbles: true }));
  await t.tick(30);
  assert.strictEqual(pos(), 6, '조합이 끝나도 제자리');
  assert.ok(t.d.getElementById('traceWarn').textContent.includes('한글 입력 상태'));
});

test('깜지를 다 채우면 실전으로 넘어간다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  await t.trace(CODE);
  assert.strictEqual(t.view(), 'v-test');
  assert.ok(!t.d.getElementById('hintFold'), '실전에는 힌트가 없다');
  assert.ok(t.d.querySelector('[data-act="giveup"]'), '모르겠다 버튼');
  assert.strictEqual(t.local().daily['2026-09-18'].w, 6, '쓴 줄이 기록된다');
});

test('실전에 실패하면 깜지 횟수가 올라간다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  ta.value = 'wrong = 1'; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('아닙니다'));
  t.click('[data-act="retrain"]'); await t.tick(80);
  assert.strictEqual(t.view(), 'v-drill');
  assert.strictEqual(t.local().problems[0].trial, 2);
});

test('연속 3회 완벽하면 암기 완료가 된다', async () => {
  const t = open({ storage: { problems: [problem({ streak: 2 })], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  ta.value = CODE; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('완벽 재현했습니다'));
  t.click('[data-act="record"]'); await t.tick(80);
  const p = t.local().problems[0];
  assert.strictEqual(p.streak, 3);
  assert.strictEqual(p.masteredAt, '2026-09-18');
  assert.strictEqual(p.trial, 1, '통과하면 깜지 횟수가 1로 돌아간다');
});

test('계정 저장소의 옛 한글 코드가 자동 교체된다', async () => {
  const OLD = CODE.replace('print("name:", name)', 'print("이름:", name)');
  const db = makeFakeDb({ collections: { problems: { p1: problem({ code: OLD }) } } });
  const t = open({ db }); await t.tick(300);
  assert.ok(!KO.test(db._store.collections.problems.p1.code), '서버 데이터가 실제로 바뀌어야 한다');
});

test('저장소가 완전히 고장나도 학습은 멈추지 않는다', async () => {
  const db = makeFakeDb({ collections: { problems: { p1: problem({ trial: 3 }) } } },
    { failAll: true, throwSync: true });
  const t = open({ db }); await t.tick(300);
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  for (let r = 1; r <= 3; r++) {
    assert.ok(t.d.getElementById('tracein'), r + '회차 진입');
    await t.trace(CODE);
  }
  assert.strictEqual(t.view(), 'v-test', '3회 깜지 후 실전');
  const ta = t.d.getElementById('codeInput');
  ta.value = CODE; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  t.click('[data-act="record"]'); await t.tick(80);
  assert.strictEqual(t.view(), 'v-dash');
  assert.deepStrictEqual(t.errors, [], '저장 예외가 화면까지 새어 나오면 안 된다');
});

test('뒤로가기가 브라우저 히스토리와 함께 동작한다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('.course'); await t.tick();
  assert.ok(!t.d.getElementById('backBtn').hidden, '헤더에 뒤로 버튼');
  t.w.history.back(); await t.tick(80);
  assert.ok(t.d.querySelectorAll('.course').length > 0, '코스 목록으로 복귀');
});

test('문제 은행 기본 정렬이 난이도 순이다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('.course'); await t.tick();
  t.click('[data-act="course-start"]'); await t.tick(150);
  t.click('#nav button[data-v="bank"]'); await t.tick();
  const titles = t.texts('.prow .ttl').slice(0, 3);
  assert.deepStrictEqual(titles, ['변수와 출력', '사칙연산과 나머지', '함수 만들기']);
});

(async () => {
  let failed = 0;
  for (const c of cases) {
    try { await c.fn(); console.log('  \u001b[32m✓\u001b[0m ' + c.name); }
    catch (e) { failed++; console.log('  \u001b[31m✗\u001b[0m ' + c.name + '\n      ' + (e && e.message)); }
  }
  console.log('\n' + (cases.length - failed) + '/' + cases.length + ' 통과');
  process.exit(failed ? 1 : 0);
})();
