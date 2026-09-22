/** 빌드 산출물(dist/algo-memory.html)에 대한 종단 테스트.
 *  node test/smoke.test.js 로 실행하며 실패 시 종료 코드 1. */
const assert = require('assert');
const { open, today } = require('./harness');
const { makeFakeDb } = require('./fake-db');

const CODE = 'name = "gony"\nage = 35\nscore = 92.5\n\nprint(name)\nprint(age, score)\nprint("name:", name)';
const KO = /[\uac00-\ud7a3\u3131-\u318e]/;

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

function problem(over) {
  return Object.assign({
    id: 'p1', srcId: 's0-var', category: '기초 문법', title: '변수와 출력',
    brief: '', logic: '대입과 출력', limits: '', code: CODE, lang: 'python',
    createdAt: today(), trial: 1, streak: 0, masteredAt: null,
    schedule: [{ round: 1, due: today(), done: false }], attempts: []
  }, over || {});
}

test('코스 6단계가 낮은 난이도부터 나온다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
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

test('받아쓰기에서도 Tab 키로 4칸 들여쓰기를 입력한다', async () => {
  const code = 'def solve():\n    return 1';
  const p = problem({ code, title: 'Tab 들여쓰기', demo: { label: '대표 실행 예시', lines: ['solve() → 1'] } });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();

  const ta = t.d.getElementById('tracein');
  ta.value = 'def solve():\n';
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  ta.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.strictEqual(ta.value, 'def solve():\n    ', 'Tab 한 번이 4칸 들여쓰기로 들어가야 한다');
});

test('받아쓰기 완료 후 실행 결과를 보고 다음으로 넘어간다', async () => {
  const p = problem({ demo: { label: '대표 실행 예시', lines: ['name → "gony"', 'age → 35'] } });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();

  await t.trace(CODE, { autoNext: false });
  assert.strictEqual(t.view(), 'v-drill', '작성 직후 바로 다음 단계로 넘어가면 안 된다');
  assert.ok(t.d.querySelector('.drill-complete'), '완료 결과 카드가 보여야 한다');
  assert.ok(t.d.querySelector('.drill-complete').textContent.includes('name → "gony"'), '대표 실행 결과가 보여야 한다');

  t.click('[data-act="drill-next"]'); await t.tick(60);
  assert.strictEqual(t.view(), 'v-test', '결과를 확인한 뒤 다음 단계로 넘어간다');
});

test('한 번도 통과 못 한 문제는 깜지 다음에 설명 단계가 온다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  await t.trace(CODE);
  assert.strictEqual(t.view(), 'v-test');
  assert.ok(t.d.querySelector('.testhead').textContent.includes('설명 보고 쓰기'), '설명 단계');
  assert.ok(t.d.getElementById('guideList'), '안내 목록이 있어야 한다');
  assert.ok(!t.d.querySelector('[data-act="giveup"]'), '설명 단계에는 포기 버튼이 없다');
  assert.strictEqual(t.local().daily[today()].w, 6, '쓴 줄이 기록된다');
});

test('이미 통과한 문제는 설명 단계를 건너뛴다', async () => {
  const passed = problem({ attempts: [{ at: today(), rate: 100, sec: 30, perfect: true, tags: [], miss: [] }] });
  const t = open({ storage: { problems: [passed], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  await t.trace(CODE);
  assert.ok(t.d.querySelector('.testhead').textContent.includes('실전') ||
    t.d.querySelector('.testhead').textContent.includes('회차'), '바로 실전');
  assert.ok(t.d.querySelector('[data-act="giveup"]'), '실전에는 포기 버튼이 있다');
});

test('예약 복습은 빈 화면 대신 핵심 단서를 먼저 보여준다', async () => {
  const p = problem({
    brief: 'N까지의 합을 구한다.',
    logic: '반복문으로 누적합을 만든다.',
    schedule: [{ round: 1, due: today(), done: false }]
  });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  const review = [...t.d.querySelectorAll('[data-act="live"]')].find((el) => el.dataset.i === '0');
  assert.ok(review, '오늘 복습 버튼이 있어야 한다');
  assert.strictEqual(review.textContent.trim(), '복습', '예약 학습은 실전이 아니라 복습으로 표시한다');
  review.click(); await t.tick();
  assert.ok(t.d.querySelector('.review-cue'), '복습 문제 카드가 보여야 한다');
  assert.ok(t.d.querySelector('.review-cue').textContent.includes('요구사항'), '문제 요구사항 안내가 있어야 한다');
  assert.ok(!t.d.querySelector('.hintbox').textContent.includes('실전입니다'), '복습에서 실전 경고문을 보여주면 안 된다');
});

test('복습 문제는 정답에서 요구하는 변수명을 명시한다', async () => {
  const code = 'a = 7\nb = 3\n\nprint(a + b)\nprint(a - b)\nprint(a * b)\nprint(a // b)\nprint(a % b)';
  const p = problem({
    srcId: 's0-math', title: '사칙연산과 나머지', code,
    schedule: [{ round: 1, due: today(), done: false }]
  });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  const review = [...t.d.querySelectorAll('[data-act="live"]')].find((el) => el.dataset.i === '0');
  review.click(); await t.tick();
  const cue = t.d.querySelector('.review-cue').textContent;
  assert.ok(cue.includes('a') && cue.includes('b'), '정답이 a, b를 요구하면 복습 문제에도 이름을 알려야 한다');
  assert.ok(cue.includes('7') && cue.includes('3'), '정답이 요구하는 구체 값도 문제 설명에 있어야 한다');
  assert.ok(cue.includes('a + b') && cue.includes('a - b') && cue.includes('a * b'), '연산은 실제 코드 표현식으로 안내해야 한다');
  assert.ok(cue.includes('a // b') && cue.includes('a % b'), '몫과 나머지도 실제 코드 표현식으로 안내해야 한다');
  assert.ok(!cue.includes('7 + 3') && !cue.includes('10이 나온다') && !cue.includes('4가 나온다'), '정답 결과를 복습 문제에 노출하면 안 된다');
});

test('수동 실전은 복습 단서를 보여주지 않는다', async () => {
  const p = problem({ brief: 'N까지의 합을 구한다.', logic: '반복문으로 누적합을 만든다.' });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  assert.ok(!t.d.querySelector('.review-cue'), '실전에는 복습 단서가 없어야 한다');
  assert.ok(t.d.querySelector('.hintbox').textContent.includes('실전입니다'), '실전 경고문은 유지한다');
});

test('설명 단계는 줄 순서대로 안내하고 암기 판정에 넣지 않는다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="guide"]'); await t.tick();

  const items = t.texts('#guideList li');
  assert.strictEqual(items.length, 6, '코드 줄 수만큼');
  assert.ok(items[0].includes('상자'), '첫 줄 설명: ' + items[0]);
  assert.ok(!t.d.getElementById('guideList').textContent.includes('name = '), '코드를 보여주면 안 된다');

  const ta = t.d.getElementById('codeInput');
  ta.value = CODE.split('\n').slice(0, 3).join('\n');
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  const lis = t.d.querySelectorAll('#guideList li');
  assert.strictEqual(lis[2].className, 'on', '쓰는 줄이 따라와야 한다');
  assert.strictEqual(lis[0].className, 'done');

  ta.value = CODE; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('설명대로 옮겼습니다'));
  assert.ok(t.d.querySelector('[data-act="to-live"]'), '다음은 백지');

  t.click('[data-act="to-live"]'); await t.tick(80);
  const p = t.local().problems[0];
  assert.strictEqual(p.streak, 0, '연속 기록을 건드리면 안 된다');
  assert.strictEqual(p.masteredAt, null);
  assert.ok(p.attempts.some((a) => a.guide), '기록에는 남는다');
  assert.ok(t.d.querySelector('.testhead').textContent.includes('실전'), '이어서 백지 실전');
  assert.ok(!t.d.getElementById('guideList'), '실전에는 안내가 없다');
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
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('아직'));
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
  assert.strictEqual(p.masteredAt, today());
  assert.strictEqual(p.trial, 1, '통과하면 깜지 횟수가 1로 돌아간다');
});

test('계정 저장소의 옛 한글 코드가 자동 교체된다', async () => {
  const OLD = CODE.replace('print("name:", name)', 'print("이름:", name)');
  const db = makeFakeDb({ collections: { problems: { p1: problem({ code: OLD }) } } });
  const t = open({ db }); await t.tick(300);
  assert.ok(!KO.test(db._store.collections.problems.p1.code), '서버 데이터가 실제로 바뀌어야 한다');
});

test('저장소가 완전히 고장나도 학습은 멈추지 않는다', async () => {
  const db = makeFakeDb({ collections: { problems: { p1: problem({
    trial: 3, attempts: [{ at: today(), rate: 100, sec: 20, perfect: true, tags: [], miss: [] }]
  }) } } }, { failAll: true, throwSync: true });
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

test('해설 탭에 스토리와 줄별 해설이 나온다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  assert.deepStrictEqual(t.texts('.detail .lvtab'), ['해설', '복습 일정', '기록']);
  const body = t.d.querySelector('#v-bank .detail').textContent;
  assert.ok(body.includes('어디에 쓰나'), '쓰임새 항목');
  assert.ok(body.includes('기억할 것'), '핵심 포인트');
  const rows = t.d.querySelectorAll('.walk .wrow');
  assert.strictEqual(rows.length, 6, '코드 줄 수만큼 해설 행이 있어야 한다');
  assert.ok(rows[0].textContent.includes('상자'), '첫 줄 해설이 붙어 있어야 한다');
  t.click('.detail .lvtab[data-t="sched"]'); await t.tick();
  assert.ok(t.d.querySelector('#v-bank .detail').textContent.includes('회차'));
});

test('깜지 중 현재 줄 해설이 따라온다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  const note = () => t.d.getElementById('traceNote').textContent;
  const ta = t.d.getElementById('tracein');
  ta.value = CODE.slice(0, 3); ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.ok(note().includes('1번째 줄'), '첫 줄 해설');
  const upto = CODE.indexOf('print(name)') + 3;
  ta.value = CODE.slice(0, upto); ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  assert.ok(note().includes('4번째 줄'), '커서가 옮겨가면 해설도 따라와야 한다: ' + note().slice(0, 30));
  t.click('[data-act="drill-note"]'); await t.tick();
  assert.ok(!t.d.getElementById('traceNote'), '해설 숨기기');
});

test('세 문장 설명을 쓰면 모범 해설과 대조하고 저장된다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('[data-act="explain-open"]'); await t.tick();
  t.set('ex-0', '모든 코드의 시작');
  t.set('ex-1', '이름표 붙은 상자에 값을 넣는다');
  t.set('ex-2', '따옴표 유무');
  t.click('[data-act="explain-show"]'); await t.tick();
  assert.ok(t.d.querySelector('#v-bank .detail').textContent.includes('모범 해설'));
  t.click('[data-act="explain-save"][data-ok="1"]'); await t.tick(80);
  const ex = t.local().problems[0].explain;
  assert.strictEqual(ex.ok, true);
  assert.strictEqual(ex.a[1], '이름표 붙은 상자에 값을 넣는다');
});

test('연산자와 쉼표 주변 공백은 정답 판정에서 무시한다', async () => {
  const p = problem({ code: 'a = 7\nb = 3\nprint(a + b)\nprint(a - b)\nprint(a * b)\nprint(a // b)\nprint(a % b)' });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  ta.value = 'a=7\nb=3\nprint(a+b)\nprint(a-b)\nprint(a*b)\nprint(a//b)\nprint(a%b)';
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card').classList.contains('ok'), '공백 차이는 통과해야 한다');
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('스타일 차이'),
    '공백 차이는 스타일 피드백으로 분리되어야 한다');
  assert.ok(t.d.querySelector('.style-note'), '스타일 안내 카드가 보여야 한다');
});

test('Python 들여쓰기는 스타일이 아니라 구현 오류로 판정한다', async () => {
  const code = 'def solve(x):\n    if x > 0:\n        return x\n    return 0';
  const p = problem({ code, title: '들여쓰기 판정' });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: { grace: 5 } } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  ta.value = 'def solve(x):\n    if x > 0:\n    return x\n    return 0';
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card').classList.contains('no'), '들여쓰기 오류는 실패해야 한다');
});

test('오타 하나는 봐주고 줄 누락은 봐주지 않는다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  // 변수명 오타 하나
  ta.value = CODE.replace('score = 92.5', 'scoer = 92.5');
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('통과'),
    '오타 1개는 통과여야 한다: ' + t.d.querySelector('.verdict-card h2').textContent);
  assert.ok(t.d.querySelector('.verdict-card').classList.contains('ok'));

  // 줄 하나를 통째로 빠뜨리면 실패
  const t2 = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t2.tick();
  t2.click('#nav button[data-v="bank"]'); await t2.tick();
  t2.click('.prow'); await t2.tick();
  t2.click('.detail [data-act="live"]'); await t2.tick();
  const ta2 = t2.d.getElementById('codeInput');
  ta2.value = CODE.split('\n').filter((l) => !l.startsWith('score')).join('\n');
  ta2.dispatchEvent(new t2.w.Event('input', { bubbles: true }));
  t2.click('[data-act="submit"]'); await t2.tick();
  assert.ok(t2.d.querySelector('.verdict-card h2').textContent.includes('아직'), '줄 누락은 실패');
});

test('두 번째 실패부터는 틀린 부분만 훈련한다', async () => {
  const LONG = 'def solve(n):\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    for i in range(2, n + 1):\n        dp[i] = dp[i - 1] + dp[i - 2]\n    return dp[n]';
  const p = problem({ code: LONG, srcId: null, title: '피보나치 DP', trial: 2,
    weak: { lines: ['dp[i] = dp[i - 1] + dp[i - 2]'], at: today() } });
  const t = open({ storage: { problems: [p], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="train"]'); await t.tick();
  assert.ok(t.d.querySelector('.testhead').textContent.includes('깜지'), '1회차는 전체');
  const full = t.d.getElementById('traceview').textContent;
  assert.ok(full.includes('def solve'), '전체 코드가 나와야 한다');
  await t.trace(LONG);
  assert.strictEqual(t.view(), 'v-drill', '전체 뒤에 블록 단계가 와야 한다');
  const head = t.d.querySelector('.testhead').textContent;
  assert.ok(head.includes('틀린 부분만'), '블록 단계 표시: ' + head);
  const blockText = t.d.getElementById('traceview').textContent;
  assert.ok(blockText.includes('dp[i] = dp[i - 1]'), '틀린 줄이 들어 있어야 한다');
  assert.ok(!blockText.includes('def solve'), '전체가 아니라 일부여야 한다');
  assert.ok(blockText.split('\n').length <= 4, '앞뒤 한 줄씩만: ' + blockText.split('\n').length);
});

test('같은 문제에서 세 번 막히면 오늘은 여기까지', async () => {
  const past = [1, 2].map(() => ({ at: today(), rate: 20, sec: 10, perfect: false, tags: [], miss: [] }));
  const t = open({ storage: { problems: [problem({ trial: 3, attempts: past })], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const ta = t.d.getElementById('codeInput');
  ta.value = 'x = 1'; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  t.click('[data-act="retrain"]'); await t.tick(80);
  assert.strictEqual(t.view(), 'v-dash', '깜지로 안 보내고 대시보드로');
  assert.ok(t.d.querySelector('#v-dash').textContent.includes('오늘은 여기까지'));
  const p = t.local().problems[0];
  assert.strictEqual(p.trial, 3, '깜지 횟수를 올리지 않는다');
  assert.ok(p.restUntil, '내일로 미룬다');
});

test('취약한 문제가 오늘 목록 앞에 온다', async () => {
  const weakP = problem({ id: 'w', title: '취약한 문제', trial: 4, giveups: 2,
    attempts: [{ at: today(), rate: 30, sec: 10, perfect: false, tags: [], miss: ['dp 배열', 'for 반복문'] }] });
  const easyP = problem({ id: 'e', title: '쉬운 문제', trial: 1,
    attempts: [{ at: today(), rate: 100, sec: 10, perfect: true, tags: [], miss: [] }] });
  const t = open({ storage: { problems: [easyP, weakP], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  const titles = t.texts('#v-dash .qrow .ttl');
  assert.strictEqual(titles[0], '취약한 문제', '순서: ' + titles.join(' / '));
  assert.ok(t.texts('#v-dash .qrow')[0].includes('취약'), '취약 표시');
});

test('코스 상세에서 동작 버튼이 칩과 구분되고 오늘 차례가 표시된다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  assert.strictEqual(t.d.querySelectorAll('.course .chev').length, 6, '코스 카드가 눌린다는 표시');
  t.click('.course'); await t.tick();
  t.click('[data-act="course-start"]'); await t.tick(200);
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('.course'); await t.tick();

  const first = t.d.querySelector('.pk');
  const btns = [...first.querySelectorAll('.btn')];
  assert.strictEqual(btns.length, 2, '훈련 / 실전');
  assert.ok(btns[0].className.includes('accent'), '훈련은 강조 버튼이어야 한다: ' + btns[0].className);
  assert.ok(!btns.some((b) => b.className.includes('ghost')), '동작 버튼에 ghost 를 쓰지 않는다');

  const chips = [...first.querySelectorAll('.chip')].map((e) => e.textContent.trim());
  assert.ok(!chips.some((c) => c.includes('기초 문법')), '코스 안에서 카테고리 칩은 중복 정보');
  assert.ok(!chips.some((c) => c.includes('깜지 1회')), '한 번도 안 틀렸으면 깜지 칩을 숨긴다');

  assert.ok(first.classList.contains('now'), '오늘 차례 강조');
  assert.strictEqual(t.d.querySelectorAll('.pk.now').length, 2, '하루 2개 기준이면 2개만 오늘');
  assert.ok(t.d.querySelector('[data-act="go-dash"]'), '전부 등록 뒤에는 오늘 차례로 가는 버튼');
  const bar = t.d.querySelector('.bar2');
  assert.strictEqual(bar.querySelector('.reg').style.width, '100%', '등록 진행이 막대에 보여야 한다');
});

test('문제 은행 행이 눌린다는 표시가 있다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="bank"]'); await t.tick();
  assert.strictEqual(t.d.querySelector('.prow .chev').textContent, '›');
  t.click('.prow'); await t.tick();
  assert.strictEqual(t.d.querySelector('.prow .chev').textContent, '⌄', '펼치면 방향이 바뀐다');
});

test('독서·인사이트는 화면에서 사라졌지만 데이터는 남는다', async () => {
  const t = open({ storage: {
    problems: [problem()], books: [{ id: 'b1', title: '옛 책', total: 100, current: 10 }],
    insights: [{ id: 'i1', text: '옛 기록', date: today() }], daily: {}, settings: {}
  } });
  await t.tick();
  assert.ok(!t.d.querySelector('[data-v="books"]'), '탭이 없어야 한다');
  assert.ok(!t.d.getElementById('v-books'), '뷰가 없어야 한다');
  const ui = t.d.querySelector('nav').textContent + t.d.querySelector('main').textContent;
  assert.ok(!ui.includes('독서'), '화면에 독서 흔적이 남으면 안 된다');
  assert.strictEqual(t.d.querySelectorAll('.today-strip .tile').length, 4, '타일이 4개로 줄어야 한다');
  const ls = t.local();
  assert.strictEqual(ls.books.length, 1, '저장된 책 데이터는 지우지 않는다');
  assert.strictEqual(ls.insights.length, 1, '인사이트도 그대로');
});

test('첫 방문 화면이 무엇인지 설명하고 저장 위치를 밝힌다', async () => {
  const t = open(); await t.tick();
  const intro = t.d.querySelector('.intro');
  assert.ok(intro, '빈 상태에서 소개 카드');
  assert.ok(intro.textContent.includes('깜지'), '핵심 개념 설명');
  assert.ok(intro.textContent.includes('이 브라우저에만'), '저장 위치를 밝혀야 한다');
  assert.ok(intro.textContent.includes('로그인도 없습니다'));
  assert.strictEqual(t.d.querySelectorAll('.introcell').length, 4);
  assert.ok(t.d.querySelector('[data-act="seed-demo"]'), '둘러보기 버튼');
});

test('예시 데이터를 넣으면 모든 화면이 채워진다', async () => {
  const t = open(); await t.tick();
  t.click('[data-act="seed-demo"]'); await t.tick(250);
  const ps = t.local().problems;
  assert.strictEqual(ps.length, 14);
  assert.ok(ps.some((p) => p.masteredAt && p.streak === 3), '암기 완료한 것');
  assert.ok(ps.some((p) => p.trial > 1), '취약한 것');
  assert.ok(ps.some((p) => p.streak > 0 && !p.masteredAt), '굳히는 중');
  assert.ok(Object.keys(t.local().daily).length >= 10, '필사량 기록');

  const tiles = t.texts('.today-strip .tile .big');
  assert.strictEqual(tiles.length, 4);
  assert.ok(t.d.querySelectorAll('#v-dash .qrow').length > 0, '오늘 할 일이 보여야 한다');
  assert.ok(t.d.querySelector('#v-dash').textContent.includes('재확인'), '재확인 대상');

  t.click('#nav button[data-v="stats"]'); await t.tick();
  const stats = t.d.querySelector('#v-stats').textContent;
  assert.ok(stats.includes('자주 틀리는'), '결함 패턴 차트');
  assert.ok(t.d.querySelectorAll('#v-stats .chart').length >= 2, '달성 + 필사량 그래프');

  t.click('#nav button[data-v="settings"]'); await t.tick();
  assert.ok(t.d.querySelector('[data-act="clear-demo"]'), '지우는 길이 있어야 한다');
  t.click('[data-act="clear-demo"]'); await t.tick(200);
  assert.strictEqual(t.local().problems.length, 0);
});

test('표지는 첫 방문에만 나오고 기록이 있으면 건너뛴다', async () => {
  const t = open(); await t.tick();
  const land = t.d.getElementById('landing');
  assert.ok(!land.hidden, '기록이 없으면 표지가 뜬다');
  assert.ok(land.textContent.includes('안녕하십니까'), '훅 문구');
  assert.ok(/템플릿 \d+개/.test(land.textContent), '장식만이 아니라 근거가 있어야 한다');
  assert.ok(land.textContent.includes('SQL'), '언어 구성도 밝힌다');
  assert.ok(land.textContent.includes('로그인도, 서버도 없습니다'), '저장 방식 고지');
  assert.ok(t.d.body.classList.contains('cover'), '표지가 화면을 덮는다');

  t.click('[data-act="enter"]'); await t.tick(60);
  assert.ok(t.d.getElementById('landing').hidden, '들어가면 사라진다');
  assert.ok(!t.d.body.classList.contains('cover'));
  assert.strictEqual(t.local().settings.seenLanding, true, '다시 안 나오도록 기억한다');

  const t2 = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t2.tick();
  assert.ok(t2.d.getElementById('landing').hidden, '기록이 있으면 표지를 건너뛴다');
});

test('표지에서 바로 예시 데이터로 들어갈 수 있다', async () => {
  const t = open(); await t.tick();
  t.click('[data-act="enter-demo"]'); await t.tick(250);
  assert.ok(t.d.getElementById('landing').hidden);
  assert.strictEqual(t.local().problems.length, 14);
  assert.strictEqual(t.view(), 'v-dash');
});

test('설정에서 표지를 다시 불러올 수 있다', async () => {
  const t = open({ storage: { problems: [problem()], books: [], insights: [], daily: {}, settings: {} } });
  await t.tick();
  t.click('#nav button[data-v="settings"]'); await t.tick();
  t.click('[data-act="show-landing"]'); await t.tick();
  assert.ok(!t.d.getElementById('landing').hidden);
});

test('코스가 파이썬과 SQL 로 나뉜다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  const tabs = t.texts('.lvtabs .lvtab.big');
  assert.strictEqual(tabs.length, 2, '언어 탭 두 개');
  assert.ok(tabs[0].includes('파이썬') && tabs[0].includes('70'));
  assert.ok(tabs[1].includes('SQL') && tabs[1].includes('35'));
  assert.ok(t.texts('.course')[0].includes('기초 코스'), '기본은 파이썬');

  t.click('[data-act="course-lang"][data-l="sql"]'); await t.tick();
  const sqlCourses = t.texts('.course');
  assert.strictEqual(sqlCourses.length, 6, 'SQL 코스도 6단계');
  assert.ok(sqlCourses[0].includes('조회 기초 코스'), 'SQL 첫 코스: ' + sqlCourses[0].slice(0, 40));
  assert.ok(sqlCourses.some((c) => c.includes('윈도우 함수 코스')));
});

test('SQL 코스를 시작하고 채점까지 된다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('[data-act="course-lang"][data-l="sql"]'); await t.tick();
  t.click('.course'); await t.tick();
  assert.ok(t.d.querySelector('#v-pack').textContent.includes('SELECT'), '무엇을 배우는지');
  t.click('[data-act="course-start"]'); await t.tick(200);
  const ps = t.local().problems;
  assert.strictEqual(ps.length, 8, 'SQL 첫걸음 8개');
  assert.ok(ps.every((p) => p.lang === 'sql'), '전부 SQL 로 등록되어야 한다');

  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  assert.ok(t.d.querySelectorAll('.walk .wrow').length >= 3, 'SQL 도 줄별 해설');
  assert.ok(t.d.querySelector('#v-bank .detail').textContent.includes('SELECT 는 열'), 'SQL 해설 내용');

  t.click('.detail [data-act="live"]'); await t.tick();
  const target = t.local().problems.filter((p) => p.lang === 'sql')[0];
  const ta = t.d.getElementById('codeInput');
  ta.value = target.code; ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('완벽'), '정답이면 통과');
});

test('SQL 에서 구조가 빠지면 잡아낸다', async () => {
  const t = open(); await t.tick();
  t.click('#nav button[data-v="pack"]'); await t.tick();
  t.click('[data-act="course-lang"][data-l="sql"]'); await t.tick();
  t.click('.course'); await t.tick();
  t.click('[data-act="course-start"]'); await t.tick(200);
  t.click('#nav button[data-v="bank"]'); await t.tick();
  t.click('.prow'); await t.tick();
  t.click('.detail [data-act="live"]'); await t.tick();
  const target = t.local().problems.filter((p) => p.lang === 'sql')[0];
  const ta = t.d.getElementById('codeInput');
  ta.value = target.code.split('\n').filter((l) => !/ORDER BY/i.test(l)).join('\n');
  ta.dispatchEvent(new t.w.Event('input', { bubbles: true }));
  t.click('[data-act="submit"]'); await t.tick();
  assert.ok(t.d.querySelector('.verdict-card h2').textContent.includes('아직'), 'ORDER BY 누락은 실패');
  assert.ok(t.texts('.ck.no').join(' ').includes('ORDER BY'), '무엇이 빠졌는지 짚어야 한다');
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
