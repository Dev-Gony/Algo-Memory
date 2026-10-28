(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CommuteEditor = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function state(value, start, end) { return { value: value, start: start, end: end == null ? start : end }; }
  function replace(s, text, selectStart, selectEnd) {
    var p = s.start;
    return state(s.value.slice(0, p) + text + s.value.slice(s.end),
      p + (selectStart == null ? text.length : selectStart), p + (selectEnd == null ? text.length : selectEnd));
  }
  // Mask strings/comments across lines, including triple quotes; this is an editing aid, not a parser.
  function codeOnly(text) {
    var out = '', quote = '', triple = false, comment = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (comment) { if (c === '\n') { comment = false; out += '\n'; } else out += ' '; continue; }
      if (quote) {
        if (c === '\\') { out += '  '; i++; continue; }
        if (triple && text.slice(i, i + 3) === quote.repeat(3)) { out += '___'; i += 2; quote = ''; triple = false; }
        else if (!triple && c === quote) { out += '_'; quote = ''; }
        else out += c === '\n' ? '\n' : '_';
        continue;
      }
      if (c === '#') { comment = true; out += ' '; }
      else if (c === '"' || c === "'") {
        quote = c; triple = text.slice(i, i + 3) === c.repeat(3);
        out += triple ? '___' : '_'; if (triple) i += 2;
      } else out += c;
    }
    return { code: out, inString: !!quote };
  }
  function newline(s) {
    var before = s.value.slice(0, s.start), line = before.slice(before.lastIndexOf('\n') + 1);
    var indent = (line.match(/^[ \t]*/) || [''])[0];
    var scanned = codeOnly(before), code = scanned.code.trimEnd();
    var header = code.slice(code.lastIndexOf('\n') + 1).trim();
    // A closing parenthesis can finish a multiline block header.
    var block = /:$/.test(header) && !scanned.inString &&
      (/^(?:(?:async\s+)?(?:def|for|with)|if|elif|else|while|try|except|finally|class|match|case)\b/.test(header) || /^\)\s*:$/.test(header));
    return replace(s, '\n' + indent + (block ? '    ' : ''));
  }
  function indent(s, outdent) {
    var first = s.value.slice(0, s.start).lastIndexOf('\n') + 1;
    if (!outdent && s.start === s.end) return replace(s, '    ');
    var stop = s.end;
    if (stop > s.start && s.value[stop - 1] === '\n') stop--;
    var ends = s.value.indexOf('\n', stop); if (ends < 0) ends = s.value.length;
    var segment = s.value.slice(first, ends), delta = 0, firstDelta = 0;
    var result = segment.split('\n').map(function (line, i) {
      var n = outdent ? (line[0] === '\t' ? 1 : Math.min(4, (line.match(/^ */) || [''])[0].length)) : 0;
      var change = outdent ? -n : 4; delta += change; if (!i) firstDelta = change;
      return outdent ? line.slice(n) : '    ' + line;
    }).join('\n');
    var start = Math.max(first, s.start + firstDelta), end = Math.max(start, s.end + delta);
    if (s.start === s.end) end = start;
    return state(s.value.slice(0, first) + result + s.value.slice(ends), start, end);
  }
  function token(s, value, paired) {
    if (!paired) return replace(s, value);
    var selected = s.value.slice(s.start, s.end), text = value[0] + selected + value[1];
    return replace(s, text, 1, 1 + selected.length);
  }
  function attach(ta, options) {
    options = options || {};
    var composing = false, pending = null, history = [], future = [], last = read();
    function read() { return state(ta.value, ta.selectionStart, ta.selectionEnd); }
    function remember(s) { history.push(s); if (history.length > 100) history.shift(); future = []; }
    function changed() { last = read(); if (options.change) options.change(last); }
    function apply(s, record) {
      if (record !== false) remember(read());
      var scroll = ta.scrollTop;
      ta.value = s.value; ta.setSelectionRange(s.start, s.end); ta.scrollTop = scroll;
      changed();
    }
    function enabled() { return !options.enabled || options.enabled(); }
    function linebreak(e) {
      if (composing || e.isComposing || !enabled()) return false;
      pending = read();
      if (e.cancelable) { e.preventDefault(); apply(newline(pending)); pending = null; return true; }
      return false;
    }
    ta.addEventListener('beforeinput', function (e) {
      if (composing || e.isComposing) return;
      pending = read();
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        if (e.cancelable) { e.preventDefault(); undo(e.inputType === 'historyRedo'); }
      } else if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') linebreak(e);
    });
    ta.addEventListener('input', function (e) {
      if (composing || e.isComposing) return;
      var prev = pending || last; pending = null;
      if (enabled() && /^(insertLineBreak|insertParagraph)$/.test(e.inputType || '') &&
        ta.value === prev.value.slice(0, prev.start) + '\n' + prev.value.slice(prev.end)) {
        remember(prev); apply(newline(prev), false);
      } else { if (prev.value !== ta.value) remember(prev); changed(); }
    });
    ta.addEventListener('compositionstart', function () { composing = true; pending = read(); });
    ta.addEventListener('compositionend', function () {
      composing = false; remember(pending || last); pending = null; changed();
    });
    ['select', 'keyup', 'pointerup'].forEach(function (name) {
      ta.addEventListener(name, function () { if (ta.value === last.value && !composing) last = read(); });
    });
    ta.addEventListener('keydown', function (e) {
      if (composing || e.isComposing || e.keyCode === 229) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(e.shiftKey); }
      else if (e.key === 'Tab') { e.preventDefault(); apply(indent(read(), e.shiftKey)); }
      else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey) linebreak(e);
    });
    function undo(redo) {
      if (composing) return;
      var from = redo ? future : history, to = redo ? history : future;
      if (!from.length) return;
      to.push(read()); apply(from.pop(), false); pending = null;
    }
    return {
      command: function (name, text) {
        if (composing) return false;
        if (name === 'undo' || name === 'redo') undo(name === 'redo');
        else apply(name === 'indent' || name === 'outdent' ? indent(read(), name === 'outdent') : token(read(), text, name === 'pair'));
        ta.focus({ preventScroll: true }); return true;
      },
      snapshot: read,
      composing: function () { return composing; }
    };
  }
  return { state: state, newline: newline, indent: indent, token: token, codeOnly: codeOnly, attach: attach };
});
