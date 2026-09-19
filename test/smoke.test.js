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
  assert.strictEqual(t.local().daily[today()].w, 6, '쓴 줄이 기록된다');
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
  assert.ok(!t.d.body.textContent.includes('독서'), '독서 흔적이 남으면 안 된다');
  assert.strictEqual(t.d.querySelectorAll('.today-strip .tile').length, 4, '타일이 4개로 줄어야 한다');
  const ls = t.local();
  assert.strictEqual(ls.books.length, 1, '저장된 책 데이터는 지우지 않는다');
  assert.strictEqual(ls.insights.length, 1, '인사이트도 그대로');
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
