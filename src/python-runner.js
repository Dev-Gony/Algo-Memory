(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AlgoPython = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var VERSION = '0.29.4';
  var BASE = 'https://cdn.jsdelivr.net/pyodide/v' + VERSION + '/full/';
  var ASSETS = [
    { name: 'pyodide.js', bytes: 18597, sha256: '7be9e63eddf6bd8786a5ab71c8689c35731d187e3415fe58d7cb95423b50421a' },
    { name: 'pyodide.asm.js', bytes: 1074322, sha256: 'fe75e97ef2c7a10c41f23b96344c553c7c1c62821bb206080dbb24941c06d5f3' },
    { name: 'pyodide.asm.wasm', bytes: 8647684, sha256: '10090fe41e019ae669d512e1f747021a8db2aaab0f6dd6f85fa9368c55d681e3' },
    { name: 'python_stdlib.zip', bytes: 2424002, sha256: '92cb24faa546818f3ef4050fd5bd2b6487bd2042efed2113af141d035f30efb4' },
    { name: 'pyodide-lock.json', bytes: 122027, sha256: '14d2c2dba101277999e17135e653d8f15389ad1437f53eae213bf0c3cdff723d' }
  ];
  var CACHE = 'algo-memory-pyodide-' + VERSION;
  var buffers = null;
  function fault(status, detail) { return { status: status, detail: String(detail || '').slice(0, 240) }; }
  function workerEntry() {
    'use strict';
    var py, send = self.postMessage.bind(self), started = false;
    self.onmessage = async function (event) {
      if (started) return;
      started = true;
      var data = event.data, files = Object.create(null), urls = [], decoder = new TextDecoder();
      try {
        data.assets.forEach(function (a) { files[a.name] = a.buffer; });
        var nativeImport = self.importScripts.bind(self), base = 'https://runtime.invalid/';
        var scripts = Object.create(null);
        ['pyodide.js', 'pyodide.asm.js'].forEach(function (name) {
          scripts[base + name] = URL.createObjectURL(new Blob([files[name]], { type: 'text/javascript' })); urls.push(scripts[base + name]);
        });
        Object.defineProperty(self, 'importScripts', { configurable: false, writable: false, value: function () {
          Array.prototype.forEach.call(arguments, function (url) {
            if (!scripts[url]) throw new Error('Additional scripts are disabled');
            nativeImport(scripts[url]);
          });
        } });
        // All runtime reads come from verified bytes. CSP also blocks native network APIs.
        Object.defineProperty(self, 'fetch', { configurable: false, writable: false, value: function (input) {
          var url = typeof input === 'string' ? input : (input.url || input.href || String(input));
          var name = url && url.startsWith(base) ? url.slice(base.length) : '';
          if (!Object.prototype.hasOwnProperty.call(files, name)) return Promise.reject(new TypeError('Execution network access is disabled'));
          return Promise.resolve(new Response(files[name].slice(0), { headers: { 'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream' } }));
        } });
        self.importScripts(base + 'pyodide.js');
        py = await self.loadPyodide({ indexURL: base, stdLibURL: base + 'python_stdlib.zip',
          lockFileContents: decoder.decode(files['pyodide-lock.json']), fullStdLib: false,
          jsglobals: Object.create(null), stdout: function () {}, stderr: function () {} });
        urls.forEach(function (u) { URL.revokeObjectURL(u); });
        send({ phase: 'ready' });
      } catch (e) { send({ phase: 'result', result: { status: 'load-error', detail: 'Python 초기화 실패: ' + String(e.message || e).slice(0, 180) } }); return; }
      self.onmessage = function (e) {
        if (e.data.phase !== 'execute') return;
        self.onmessage = null;
        try {
          py.globals.set('_cm_payload', JSON.stringify(e.data.payload));
          var json = py.runPython(data.harness);
          send({ phase: 'result', result: JSON.parse(json) });
        } catch (err) { send({ phase: 'result', result: { status: 'runtime-error', detail: String(err.message || err).slice(0, 240) } }); }
      };
    };
  }
  var HARNESS = [
    'import json as _json, copy as _copy, math as _math',
    '_cm_sum = sum',
    '_cm_data = _json.loads(_cm_payload)',
    'def _cm_same(a, b):',
    '    if isinstance(b, bool): return type(a) is bool and a == b',
    '    if isinstance(b, (int, float)): return type(a) in (int, float) and a == b',
    '    if isinstance(b, list): return isinstance(a, list) and len(a) == len(b) and all(_cm_same(x, y) for x, y in zip(a, b))',
    '    if isinstance(b, dict): return isinstance(a, dict) and a.keys() == b.keys() and all(_cm_same(a[k], b[k]) for k in b)',
    '    return type(a) is type(b) and a == b',
    'def _cm_run(data):',
    '    scope = {"__name__": "__answer__"}',
    '    try: compiled = compile(data["code"], "answer.py", "exec")',
    '    except SyntaxError as e: return {"status": "syntax-error", "detail": str(e.msg)[:160], "line": e.lineno, "column": e.offset}',
    '    try:',
    '        exec(compiled, scope)',
    '        fn = scope.get("solution")',
    '        if not callable(fn): return {"status": "runtime-error", "detail": "solution 함수를 정의해 주세요."}',
    '    except BaseException as e: return {"status": "runtime-error", "detail": (type(e).__name__ + ": " + str(e))[:200]}',
    '    rows = []',
    '    for index, case in enumerate(data["tests"]):',
    '        args = _copy.deepcopy(case["args"])',
    '        try:',
    '            got = fn(*args)',
    '            mutated = data.get("preserveInput", False) and not _cm_same(args, case["args"])',
    '            ok = _cm_same(got, case["want"]) and not mutated',
    '            rows.append({"index": index, "ok": ok, "actual": repr(got)[:160], "mutated": bool(mutated)})',
    '        except BaseException as e: rows.append({"index": index, "ok": False, "error": (type(e).__name__ + ": " + str(e))[:200]})',
    '    passed = _cm_sum(row["ok"] for row in rows)',
    '    status = "passed" if passed == len(rows) else ("runtime-error" if any("error" in row for row in rows) else "wrong-answer")',
    '    return {"status": status, "rows": rows, "passed": passed, "total": len(rows)}',
    '_json.dumps(_cm_run(_cm_data), ensure_ascii=False)'
  ].join('\n');
  function frameEntry(workerSource) {
    'use strict';
    window.addEventListener('message', function init(e) {
      if (e.source !== parent || !e.ports[0]) return;
      window.removeEventListener('message', init);
      var port = e.ports[0], worker;
      try {
        var url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
        worker = new Worker(url); URL.revokeObjectURL(url);
        worker.onmessage = function (message) { port.postMessage(message.data); };
        worker.onerror = function () { port.postMessage({ phase: 'result', result: { status: 'load-error', detail: '격리된 Worker 초기화 실패' } }); };
        port.onmessage = function (message) {
          if (message.data.phase === 'execute') worker.postMessage(message.data);
        };
        worker.postMessage(e.data, e.data.assets.map(function (a) { return a.buffer; }));
      } catch (error) { port.postMessage({ phase: 'result', result: { status: 'load-error', detail: '브라우저가 격리 실행을 지원하지 않습니다.' } }); }
    });
  }
  function create(win, options) {
    options = options || {};
    var active = null;
    async function assets(signal, progress) {
      if (buffers) return buffers;
      if (!win.crypto || !win.crypto.subtle) throw fault('load-error', '런타임 무결성 검증에는 HTTPS 또는 localhost가 필요합니다.');
      var cache = null, done = 0;
      try { if (win.caches) cache = await win.caches.open(CACHE); } catch (e) { /* memory-only fallback */ }
      var loaded = await Promise.all(ASSETS.map(async function (asset) {
        var url = BASE + asset.name, response, cached = false;
        try { if (cache) { response = await cache.match(url); cached = !!response; } } catch (e) { /* cache unavailable */ }
        if (!response) {
          try { response = await win.fetch(url, { signal: signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache' }); }
          catch (e) { throw fault(signal.aborted ? 'cancelled' : 'network-error', win.navigator.onLine === false ? '네트워크 연결이 끊겼습니다. 저장된 런타임이 있으면 오프라인으로 다시 시도할 수 있습니다.' : 'Python 런타임 다운로드 연결이 끊겼습니다. 네트워크와 CDN 연결을 확인하세요.'); }
        }
        if (!response.ok) throw fault('load-error', '런타임 파일 응답 오류: ' + response.status);
        var bytes;
        try { bytes = await response.arrayBuffer(); }
        catch (e) { throw fault(signal.aborted ? 'cancelled' : 'network-error', '런타임 파일을 받는 중 연결이 끊겼습니다. 다시 시도하세요.'); }
        var hash = Array.from(new Uint8Array(await win.crypto.subtle.digest('SHA-256', bytes))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        if (bytes.byteLength !== asset.bytes || hash !== asset.sha256) {
          if (cached && cache) await cache.delete(url);
          throw fault('load-error', '런타임 파일 무결성 불일치. 다시 다운로드해 주세요.');
        }
        if (!cached && cache) { try { await cache.put(url, new win.Response(bytes.slice(0))); } catch (e) { /* cache quota: current run still works */ } }
        done++; progress({ status: 'downloading', loaded: done, total: ASSETS.length });
        return { name: asset.name, buffer: bytes };
      }));
      buffers = loaded; return loaded;
    }
    function cancel() { if (active) active.finish(fault('cancelled', '실행을 중단했습니다.')); }
    function run(code, tests, preserveInput, onProgress) {
      cancel();
      var progress = typeof onProgress === 'function' ? onProgress : function () {};
      return new Promise(function (resolve) {
        var controller = new win.AbortController(), frame = null, channel = null, timer = null, settled = false;
        var ticket = { finish: finish }; active = ticket;
        function finish(result) {
          if (settled) return;
          settled = true; win.clearTimeout(timer); controller.abort();
          if (channel) { channel.port1.close(); channel.port2.close(); }
          if (frame) frame.remove();
          if (active === ticket) active = null;
          resolve(result);
        }
        if (typeof code !== 'string' || code.length > 50000 || !Array.isArray(tests) || tests.length < 1 || tests.length > 20) { finish(fault('runtime-error', '지원하는 코드·테스트 범위를 벗어났습니다.')); return; }
        progress({ status: 'downloading', loaded: 0, total: ASSETS.length });
        timer = win.setTimeout(function () { finish(fault('network-error', '런타임 다운로드 대기 시간을 초과했습니다. 연결을 확인하고 다시 시도하세요.')); }, options.downloadMs || 45000);
        assets(controller.signal, progress).then(function (files) {
          if (settled) return;
          win.clearTimeout(timer);
          progress({ status: 'initializing' });
          timer = win.setTimeout(function () { finish(fault('load-error', 'Python 초기화 시간을 초과했습니다. 다시 시도하세요.')); }, options.initMs || 30000);
          var worker = '(' + workerEntry.toString() + ')();';
          var bootstrap = '(' + frameEntry.toString() + ')(' + JSON.stringify(worker).replace(/</g, '\\u003c') + ');';
          frame = win.document.createElement('iframe'); frame.hidden = true; frame.title = '격리된 Python 실행';
          frame.setAttribute('sandbox', 'allow-scripts'); frame.setAttribute('referrerpolicy', 'no-referrer');
          frame.setAttribute('allow', "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; usb 'none'");
          var csp = "default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob:; worker-src blob:; connect-src 'none'; child-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'";
          frame.srcdoc = '<!doctype html><meta http-equiv="Content-Security-Policy" content="' + csp + '"><scr' + 'ipt>' + bootstrap + '</scr' + 'ipt>';
          channel = new win.MessageChannel();
          channel.port1.onmessage = function (e) {
            if (settled) return;
            if (e.data && e.data.phase === 'ready') {
              win.clearTimeout(timer); progress({ status: 'running' });
              timer = win.setTimeout(function () { finish(fault('timeout', '실행 제한 3초를 넘겨 Worker를 종료했습니다. 다음 실행은 새 Worker에서 시작합니다.')); }, options.runMs || 3000);
              channel.port1.postMessage({ phase: 'execute', payload: { code: code, tests: tests, preserveInput: !!preserveInput } });
            } else if (e.data && e.data.phase === 'result') {
              var result = e.data.result;
              if (!result || !['passed','wrong-answer','syntax-error','runtime-error','load-error'].includes(result.status) ||
                (result.rows && (!Array.isArray(result.rows) || result.rows.length !== tests.length)) ||
                (result.status === 'passed' && (result.passed !== tests.length || result.total !== tests.length || !result.rows.every(function (r) { return r.ok === true; })))) {
                finish(fault('load-error', '실행기 결과 형식이 올바르지 않습니다.')); return;
              }
              finish(result);
            }
          };
          frame.onload = function () {
            if (settled) return;
            var copied = files.map(function (a) { return { name: a.name, buffer: a.buffer.slice(0) }; });
            frame.contentWindow.postMessage({ assets: copied, harness: HARNESS }, '*', [channel.port2].concat(copied.map(function (a) { return a.buffer; })));
          };
          win.document.body.appendChild(frame);
        }).catch(function (e) { finish(e && e.status ? e : fault('load-error', '실행기 준비 실패: ' + String(e.message || e))); });
      });
    }
    return { run: run, cancel: cancel };
  }
  return { create: create, version: VERSION, assets: ASSETS, base: BASE, cacheName: CACHE };
});
