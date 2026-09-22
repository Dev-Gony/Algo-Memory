const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const BUILT = path.join(__dirname, '..', 'dist', 'algo-memory.html');

const pad = (n) => String(n).padStart(2, '0');
/** 앱과 같은 방식으로 오늘 날짜를 만든다. 테스트에 날짜를 하드코딩하지 않는다. */
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function open({ storage, db } = {}) {
  const html = fs.readFileSync(BUILT, 'utf8');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/scrollTo|scrollIntoView/.test(e.message)) errors.push(e.message); });
  vc.on('error', (...a) => errors.push(a.join(' ')));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      w.scrollTo = () => {};
      w.confirm = () => true;
      w.Element.prototype.scrollIntoView = function () {};
      if (storage) w.localStorage.setItem('algo-memory:v1', JSON.stringify(storage));
      if (db) w.claude = { use: (n) => Promise.resolve(n === 'db' ? db : null) };
    }
  });

  const w = dom.window, d = w.document;
  const api = {
    w, d, errors,
    tick: (ms = 40) => new Promise((r) => setTimeout(r, ms)),
    click(sel) {
      const e = d.querySelector(sel);
      if (!e) throw new Error('요소 없음: ' + sel);
      e.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    },
    set(id, v) {
      const e = d.getElementById(id);
      if (!e) throw new Error('입력 없음: #' + id);
      e.value = v;
      e.dispatchEvent(new w.Event('input', { bubbles: true }));
      e.dispatchEvent(new w.Event('change', { bubbles: true }));
    },
    texts: (sel) => [...d.querySelectorAll(sel)].map((e) => e.textContent.trim().replace(/\s+/g, ' ')),
    view: () => [...d.querySelectorAll('.view')].filter((e) => e.classList.contains('on')).map((e) => e.id)[0],
    local: () => JSON.parse(w.localStorage.getItem('algo-memory:v1') || 'null'),
    async trace(code, options) {
      const ta = () => d.getElementById('tracein');
      for (let k = 0; k < code.length; k++) {
        if (!ta()) break;
        ta().value = code.slice(0, k + 1);
        ta().dispatchEvent(new w.Event('input', { bubbles: true }));
      }
      await api.tick(30);
      if (!(options && options.autoNext === false)) {
        const next = d.querySelector('[data-act="drill-next"]');
        if (next) { next.click(); await api.tick(60); }
      }
    }
  };
  return api;
}
module.exports = { open, today };
