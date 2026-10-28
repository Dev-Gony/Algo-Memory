(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AlgoCommute = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var CATALOG = /*__COMMUTE_CATALOG__*/[];
  var KEY = 'algo-memory:commute:v1';
  function date() {
    var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function plus(day, n) { var p = day.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function empty() { return { version: 1, level: 1, consecutive: 0, autoIndent: true, records: {}, drafts: {} }; }
  function valid(o) {
    var base = !!o && o.version === 1 && Number.isInteger(o.level) && o.level >= 1 && o.level <= 3 &&
      Number.isInteger(o.consecutive) && o.consecutive >= 0 && typeof o.autoIndent === 'boolean' &&
      !!o.records && typeof o.records === 'object' && !Array.isArray(o.records) &&
      !!o.drafts && typeof o.drafts === 'object' && !Array.isArray(o.drafts);
    if (!base) return false;
    var day = /^\d{4}-\d{2}-\d{2}$/;
    return Object.keys(o.records).length <= 100 && Object.keys(o.drafts).length <= 100 &&
      Object.values(o.records).every(function (r) {
        return !!r && Number.isInteger(r.stage) && r.stage >= 0 && r.stage <= 5 &&
          (!r.due || (typeof r.due === 'string' && day.test(r.due))) &&
          (!r.exposureDate || (typeof r.exposureDate === 'string' && day.test(r.exposureDate))) &&
          Array.isArray(r.attempts) && r.attempts.length <= 80 && r.attempts.every(function (a) {
            return !!a && Number.isFinite(a.time) && typeof a.day === 'string' && day.test(a.day) &&
              Number.isInteger(a.hints) && a.hints >= 0 && a.hints <= 3 &&
              Number.isInteger(a.seconds) && a.seconds >= 0 && a.verified === false &&
              typeof a.solutionSeen === 'boolean' && typeof a.exposed === 'boolean' && typeof a.independent === 'boolean' &&
              (a.outcome === 'self-pass' || a.outcome === 'review');
          });
      }) && Object.values(o.drafts).every(function (d) {
        return !!d && typeof d.code === 'string' && d.code.length <= 50000 && Number.isFinite(d.startedAt) &&
          Number.isInteger(d.hints) && d.hints >= 0 && d.hints <= 3 &&
          typeof d.submitted === 'boolean' && typeof d.solutionSeen === 'boolean' && typeof d.exposed === 'boolean' &&
          (!d.submitted || (typeof d.submittedCode === 'string' && Number.isInteger(d.submittedSeconds) && d.submittedSeconds >= 0));
      });
  }
  function plan(record, attempt, day) {
    var stage = Math.max(0, Math.min(5, Number(record.stage) || 0));
    var independent = attempt.outcome === 'self-pass' && attempt.hints === 0 && !attempt.solutionSeen && !attempt.exposed;
    if (independent) stage = Math.min(5, stage + 1);
    else if (attempt.outcome === 'review') stage = 0;
    var gap = independent ? [1, 3, 7, 14, 30][Math.max(0, stage - 1)] : 1;
    return { stage: stage, due: plus(day, gap), independent: independent };
  }
  function inspect(code) {
    if (!code.trim()) return ['코드를 먼저 작성해 주세요.'];
    var messages = [];
    if (!/^\s*def\s+solution\s*\(/m.test(code)) messages.push('def solution(...) 형태인지 확인하세요.');
    if (!/\breturn\b/.test(code)) messages.push('반환값을 돌려주는 return이 있는지 확인하세요.');
    if (/\t/.test(code)) messages.push('탭과 공백을 섞지 않았는지 확인하세요.');
    return messages;
  }
  // No Python/JavaScript eval: this MVP records self-assessment, never execution success.
  function attach(host, options) {
    var win = host.ownerDocument.defaultView, doc = host.ownerDocument;
    var state = empty(), warning = '', readOnly = false, active = null, editor = null;
    var store;
    try { store = options.storage || win.localStorage; }
    catch (e) { store = { getItem: function () { throw e; }, setItem: function () { throw e; } }; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function load() {
      try {
        var raw = store.getItem(KEY);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (!valid(parsed)) throw new Error('version');
        state = parsed;
      } catch (e) {
        readOnly = true; warning = '저장 기록을 읽지 못했습니다. 원본을 덮어쓰지 않고 이번 화면에서만 연습합니다. 백업을 먼저 보관하세요.';
      }
    }
    load();
    function save() {
      if (readOnly) return false;
      try { store.setItem(KEY, JSON.stringify(state)); return true; }
      catch (e) { warning = '브라우저 저장에 실패했습니다. 이 화면에서는 계속할 수 있지만 새로고침하면 이번 변경이 사라질 수 있습니다.'; return false; }
    }
    function persist() {
      var ok = save(), status = host.querySelector('#cm-save-status');
      if (status) status.textContent = ok ? '이 브라우저에 저장됨' : '저장되지 않음 · 백업을 보관하세요';
      var notice = host.querySelector('#cm-warning');
      if (notice) { notice.textContent = warning; notice.hidden = !warning; }
    }
    function question(id) { return CATALOG.filter(function (q) { return q.id === id; })[0]; }
    function record(id) {
      var r = state.records[id];
      if (!r || !Array.isArray(r.attempts)) r = { stage: 0, attempts: [] };
      return r;
    }
    function draft(id) {
      var q = question(id), d = state.drafts[id];
      if (!d || typeof d.code !== 'string' || !Number.isInteger(d.hints) || d.hints < 0 || d.hints > q.hints.length) {
        d = { code: q.starter, hints: 0, submitted: false, solutionSeen: false,
          exposed: record(id).exposureDate === date(), startedAt: Date.now(), start: q.starter.length, end: q.starter.length };
        state.drafts[id] = d;
      }
      return d;
    }
    function banner() { return '<p id="cm-warning" class="cm-warning" role="status"' + (warning ? '' : ' hidden') + '>' + esc(warning) + '</p>'; }
    function label(a) {
      if (a.outcome === 'review') return '다시 볼 것';
      return a.independent ? '독립 자가 확인' : '도움 후 자가 확인';
    }
    function home() {
      active = null; editor = null;
      var T = date(), due = [], fresh = [], upcoming = [];
      CATALOG.forEach(function (q) {
        var r = record(q.id);
        if (r.due && r.due <= T) due.push(q);
        else if (r.due) upcoming.push(q);
        else if (q.level <= state.level) fresh.push(q);
      });
      due.sort(function (a, b) { return (record(a.id).due || '').localeCompare(record(b.id).due || ''); });
      var recent = [];
      CATALOG.forEach(function (q) { record(q.id).attempts.forEach(function (a) { recent.push({ q: q, a: a }); }); });
      recent.sort(function (a, b) { return b.a.time - a.a.time; });
      function list(items, emptyText) {
        return items.length ? items.map(function (q) {
          var r = record(q.id), d = state.drafts[q.id];
          return '<button class="cm-question" data-cm="open" data-id="' + esc(q.id) + '"><span><strong>' + esc(q.title) + '</strong>' +
            '<span class="cm-meta">L' + q.level + ' · ' + esc(q.concept) + (d ? ' · 작성 중' : '') +
            (r.due ? ' · ' + esc(r.due) : '') + '</span></span><span class="cm-time">' + q.minutes + '분 <span aria-hidden="true">›</span></span></button>';
        }).join('') : '<p class="cm-note">' + emptyText + '</p>';
      }
      host.innerHTML = '<div class="cm-shell">' + banner() +
        '<div class="cm-hero"><div class="chip accent">통근 연습 · Python</div><h1>이번 정거장엔 한 문제</h1>' +
        '<p>1~3분 목표로 짧은 함수를 직접 써 보세요.<br>필요할 때 힌트 하나, 제출 뒤 해설을 엽니다.</p></div>' +
        '<div class="cm-contract"><strong>자가 확인 모드</strong><p>Python을 실행하지 않습니다. 입출력 확인표와 해설로 직접 판단합니다. 모든 기록은 PC 암기 점수와 별개입니다.</p></div>' +
        '<div class="cm-level"><label for="cm-level">연습 난이도</label><select id="cm-level"><option value="1">L1 · 조건과 반복</option><option value="2">L2 · 리스트와 딕셔너리</option><option value="3">L3 · 경계와 구간</option></select></div>' +
        '<p class="cm-note">독립 자가 확인을 3분 안에 2번 연속 하면 한 단계 올립니다. 다시 볼 문제는 한 단계 낮추고 내일 먼저 꺼냅니다.</p>' +
        '<h2>오늘 복습 <span class="cm-count">' + due.length + '</span></h2><div class="cm-list">' + list(due, '오늘 예정된 복습이 없습니다.') + '</div>' +
        '<h2>짧게 새로 풀기</h2><div class="cm-list">' + list(fresh, '이 단계의 새 문제를 모두 확인했습니다. 난이도를 선택하거나 예정 문제를 다시 연습하세요.') + '</div>' +
        (upcoming.length ? '<details class="cm-fold"><summary>예정된 문제 · 미리 연습하기 (' + upcoming.length + ')</summary><div class="cm-list">' + list(upcoming, '') + '</div></details>' : '') +
        (recent.length ? '<h2>최근 기록</h2><ul class="cm-history">' + recent.slice(0, 8).map(function (row) {
          return '<li><strong>' + esc(row.q.title) + '</strong><span>' + esc(label(row.a)) + ' · 힌트 ' + row.a.hints + '개 · ' + row.a.seconds + '초 · ' + esc(row.a.day) + '</span><small>실행 미검증</small></li>';
        }).join('') + '</ul>' : '') +
        '<details class="cm-fold"><summary>저장과 백업</summary><p class="cm-note">통근 기록·초안은 이 브라우저에만 저장됩니다. 자동 기기 동기화는 없습니다. JSON으로 옮길 수 있습니다. 처음 받은 HTML 파일은 네트워크 없이 연습할 수 있으나 웹사이트의 오프라인 재방문은 보장하지 않습니다.</p>' +
        '<button class="btn" data-cm="export">통근 JSON 백업</button><label class="cm-file">통근 JSON 복원<input id="cm-import" type="file" accept="application/json,.json"></label><textarea id="cm-backup" aria-label="통근 백업 JSON" readonly hidden></textarea></details>' +
        '<p class="cm-note" id="cm-save-status" role="status">' + (readOnly ? '기존 기록 보호 중 · 저장하지 않음' : '저장 위치: 이 브라우저 · PC 기록과 분리') + '</p></div>';
      host.querySelector('#cm-level').value = state.level;
    }
    function snapshot() {
      if (!active || !editor) return;
      var d = draft(active), s = editor.snapshot(); d.code = s.value; d.start = s.start; d.end = s.end;
    }
    function revealExposure(d) {
      d.exposed = true;
      var r = record(active); r.exposureDate = date(); state.records[active] = r;
    }
    function checks(q) {
      return '<div class="cm-table"><table><caption>직접 따라가는 입출력 확인표</caption><thead><tr><th>solution의 인자</th><th>기대 반환값</th></tr></thead><tbody>' +
        q.tests.map(function (t) { return '<tr><td><code>' + esc(JSON.stringify(t.args).slice(1, -1)) + '</code></td><td><code>' + esc(JSON.stringify(t.want)) + '</code></td></tr>'; }).join('') + '</tbody></table></div>';
    }
    function open(id) {
      snapshot(); active = id;
      var q = question(id); if (!q) { home(); return; }
      var d = draft(id);
      host.innerHTML = '<div class="cm-shell cm-solve">' + banner() +
        '<div class="cm-top"><button class="btn ghost" data-cm="home">← 오늘 목록</button><span class="chip">L' + q.level + ' · ' + q.minutes + '분 목표</span></div>' +
        '<div class="cm-prompt"><p class="cm-eyebrow">' + esc(q.concept) + '</p><h1>' + esc(q.title) + '</h1><p>' + esc(q.prompt) + '</p>' +
        '<p class="cm-example"><strong>예시</strong> <code>solution(' + esc(JSON.stringify(q.tests[0].args).slice(1, -1)) + ') → ' + esc(JSON.stringify(q.tests[0].want)) + '</code></p></div>' +
        '<div class="cm-hints"><button class="btn" data-cm="hint"' + (d.hints >= q.hints.length ? ' disabled' : '') + '>힌트 하나 ' + d.hints + '/' + q.hints.length + '</button>' +
        '<ol id="cm-hints">' + q.hints.slice(0, d.hints).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ol></div>' +
        '<label class="cm-editor-label" for="cm-code">내 Python 함수 <span>실행 미검증</span></label>' +
        '<div class="cm-edit-options"><label><input id="cm-auto" type="checkbox"' + (state.autoIndent ? ' checked' : '') + '> 자동 들여쓰기</label><span id="cm-save-status" role="status"></span></div>' +
        '<div class="cm-editor"><textarea id="cm-code" maxlength="50000" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" wrap="off" aria-describedby="cm-editor-help"></textarea>' +
        '<div class="cm-toolbar" role="toolbar" aria-label="코드 입력 도구">' +
        [['indent','들여쓰기','→ 4칸'],['outdent','내어쓰기','← 4칸'],['undo','실행 취소','되돌리기'],['redo','다시 실행','다시']].map(function (x) { return '<button type="button" data-edit="' + x[0] + '" aria-label="' + x[1] + '">' + x[2] + '</button>'; }).join('') +
        [['()','괄호'],['[]','대괄호'],['{}','중괄호'],['""','큰따옴표'],["''",'작은따옴표']].map(function (x) { return '<button type="button" data-edit="pair" data-token="' + esc(x[0]) + '" aria-label="' + x[1] + ' 입력">' + esc(x[0]) + '</button>'; }).join('') +
        [':', '=', ',', '+', '-', '*', '%', '<', '>'].map(function (s) { return '<button type="button" data-edit="insert" data-token="' + esc(s) + '" aria-label="' + esc(s) + ' 입력">' + esc(s) + '</button>'; }).join('') +
        '</div></div><p class="cm-note" id="cm-editor-help">블록 뒤 Enter는 4칸 더, 보통 줄은 들여쓰기를 유지합니다. Tab / Shift+Tab도 가능합니다. 입력 바는 옆으로 밀어 사용할 수 있습니다.</p>' +
        '<div class="cm-actions"><button class="btn accent" data-cm="submit">제출 · 확인표 열기</button><span id="cm-inline" role="status"></span></div>' +
        '<section id="cm-feedback" class="cm-feedback" aria-live="polite"></section></div>';
      var ta = host.querySelector('#cm-code'); ta.value = d.code;
      ta.setSelectionRange(Math.min(d.start || 0, d.code.length), Math.min(d.end || 0, d.code.length));
      editor = win.CommuteEditor.attach(ta, { enabled: function () { return state.autoIndent; }, change: function (s) {
        d.code = s.value; d.start = s.start; d.end = s.end;
        if (d.submitted && d.submittedCode !== s.value) { d.submitted = false; host.querySelector('#cm-feedback').innerHTML = ''; }
        persist();
      } });
      if (d.submitted) feedback();
      persist();
    }
    function feedback() {
      var q = question(active), d = draft(active), box = host.querySelector('#cm-feedback');
      var warnings = inspect(d.code);
      box.innerHTML = '<h2>이 입력들을 손으로 따라가 보세요</h2><p>자동 채점이 아닙니다. 아래 표는 기대값이며, 내 코드의 실행 결과가 아닙니다. 다른 변수명과 풀이도 괜찮습니다.</p>' +
        (warnings.length ? '<p class="cm-warning">정적 확인: ' + warnings.map(esc).join(' ') + ' (정답 판정 아님)</p>' : '<p class="cm-note">기본 형태만 확인했습니다. 문법·실행·정답은 검증하지 않았습니다.</p>') +
        checks(q) + '<p>' + esc(q.prompt) + '</p>' +
        '<button class="btn" data-cm="solution"' + (d.solutionSeen ? ' hidden' : '') + '>모범 풀이와 해설 보기 · 도움으로 기록</button>' +
        '<div id="cm-solution">' + (d.solutionSeen ? '<pre class="code">' + esc(q.solution) + '</pre><p>' + esc(q.explanation) + '</p>' : '') + '</div>' +
        '<p class="cm-note">' + (d.hints || d.exposed || d.solutionSeen ? '도움을 사용한 시도입니다.' : '힌트·모범 풀이 없이 작성한 시도입니다.') + ' 아래 판단도 실행 통과가 아닌 자가 확인으로만 저장됩니다.</p>' +
        '<div class="cm-result-actions"><button class="btn accent" data-cm="assess" data-outcome="self-pass">직접 대조했어요 · 자가 통과</button><button class="btn" data-cm="assess" data-outcome="review">아직 헷갈려요 · 내일 복습</button></div>';
    }
    function assess(outcome) {
      snapshot(); var q = question(active), d = draft(active);
      if (!d.submitted || d.submittedCode !== d.code) return;
      var r = record(active), a = { time: Date.now(), day: date(), hints: d.hints, solutionSeen: !!d.solutionSeen,
        exposed: !!d.exposed, seconds: d.submittedSeconds, outcome: outcome, verified: false };
      var next = plan(r, a, date()); a.independent = next.independent;
      r.attempts = r.attempts.concat([a]).slice(-80); r.stage = next.stage; r.due = next.due;
      state.records[active] = r;
      if (a.independent && a.seconds <= 180) {
        state.consecutive++; if (state.consecutive >= 2) { state.level = Math.min(3, state.level + 1); state.consecutive = 0; }
      } else { state.consecutive = 0; if (outcome === 'review') state.level = Math.max(1, state.level - 1); }
      delete state.drafts[active]; editor = null;
      var saved = save();
      host.querySelector('#cm-feedback').innerHTML = '<h2>' + esc(label(a)) + '</h2><p>' + (saved ? '기록했습니다.' : '화면에만 반영했습니다. 저장에 실패했으니 백업을 보관하세요.') +
        ' 다음 복습: <strong>' + esc(r.due) + '</strong> · 실행 미검증</p><div class="cm-result-actions"><button class="btn accent" data-cm="open" data-id="' + esc(q.variation) + '">작은 변형 · ' + esc(question(q.variation).title) + '</button><button class="btn" data-cm="retry" data-id="' + q.id + '">이 문제 다시 연습</button><button class="btn" data-cm="home">오늘은 여기까지</button></div>';
      host.querySelector('[data-cm="submit"]').disabled = true;
      host.querySelectorAll('[data-edit],#cm-auto,[data-cm="hint"]').forEach(function (el) { el.disabled = true; });
      host.querySelector('#cm-code').readOnly = true;
    }
    host.addEventListener('pointerdown', function (e) {
      if (e.target.closest('[data-edit]') && doc.activeElement === host.querySelector('#cm-code')) e.preventDefault();
    });
    host.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit]');
      if (edit && editor) { editor.command(edit.dataset.edit, edit.dataset.token); return; }
      var el = e.target.closest('[data-cm]'); if (!el || el.disabled) return;
      var action = el.dataset.cm;
      if (action === 'home') { snapshot(); persist(); home(); }
      else if (action === 'open' || action === 'retry') { open(el.dataset.id); }
      else if (action === 'hint') {
        var q = question(active), d = draft(active); if (d.hints >= q.hints.length) return;
        var li = doc.createElement('li'); li.textContent = q.hints[d.hints++]; host.querySelector('#cm-hints').appendChild(li);
        el.textContent = '힌트 하나 ' + d.hints + '/' + q.hints.length; el.disabled = d.hints === q.hints.length;
        revealExposure(d); if (d.submitted) feedback(); persist();
      } else if (action === 'submit') {
        if (editor && editor.composing()) return;
        snapshot(); var dd = draft(active);
        if (!dd.code.trim() || dd.code.trim() === question(active).starter.trim()) { host.querySelector('#cm-inline').textContent = '함수의 내용을 먼저 작성해 주세요.'; return; }
        if (!dd.submitted) { dd.submittedSeconds = Math.max(0, Math.floor((Date.now() - dd.startedAt) / 1000)); }
        dd.submitted = true; dd.submittedCode = dd.code; feedback(); persist();
        host.querySelector('#cm-feedback').scrollIntoView({ block: 'start', behavior: 'auto' });
      } else if (action === 'solution') {
        var ds = draft(active); if (!ds.submitted) return;
        ds.solutionSeen = true; revealExposure(ds); feedback(); persist();
      } else if (action === 'assess') assess(el.dataset.outcome);
      else if (action === 'export') {
        var backup = host.querySelector('#cm-backup');
        backup.hidden = false;
        var rawBackup; try { rawBackup = readOnly ? store.getItem(KEY) : JSON.stringify(state, null, 2); } catch (err) { rawBackup = null; }
        backup.value = rawBackup || JSON.stringify(state, null, 2); backup.select();
      }
    });
    host.addEventListener('change', function (e) {
      if (e.target.id === 'cm-auto') { state.autoIndent = e.target.checked; persist(); }
      if (e.target.id === 'cm-level') { state.level = Number(e.target.value); state.consecutive = 0; persist(); home(); }
      if (e.target.id === 'cm-import') {
        var file = e.target.files && e.target.files[0]; if (!file) return;
        if (file.size > 2000000) { warning = '복원 파일이 너무 큽니다. 2MB 이하의 통근 백업을 선택하세요.'; home(); return; }
        var reader = new win.FileReader();
        reader.onload = function () {
          try {
            var restored = JSON.parse(reader.result);
            if (!valid(restored)) throw new Error('version');
            if (!win.confirm('통근 기록과 초안을 이 백업으로 바꿀까요? PC 기록은 유지됩니다. 현재 통근 백업을 먼저 보관하세요.')) return;
            state = restored; readOnly = false; warning = ''; persist(); home();
          } catch (err) { warning = '지원하는 v1 통근 백업이 아닙니다. 기존 기록은 유지했습니다.'; home(); }
        };
        reader.onerror = function () { warning = '파일을 읽지 못했습니다. 기존 기록은 유지했습니다.'; home(); };
        reader.readAsText(file);
      }
    });
    host.addEventListener('select', function (e) { if (e.target.id === 'cm-code') { snapshot(); persist(); } });
    function flush() { snapshot(); if (active) persist(); }
    win.addEventListener('pagehide', flush);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) flush(); });
    // No rerender on viewport resize: value, cursor, focus and undo survive rotation/keyboard resizing.
    return { show: function () { if (active && editor) return; home(); }, flush: flush,
      backup: function () { try { return readOnly ? { preservedRaw: store.getItem(KEY) } : state; } catch (e) { return null; } } };
  }
  return { key: KEY, catalog: CATALOG, empty: empty, valid: valid, plan: plan, inspect: inspect, attach: attach };
});
