/* hl.js — resaltado de sintaxis para código ensamblador ARM */
(function (root) {
  'use strict';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const SHIFT = /^(LSL|LSR|ASR|ROR|RRX)$/i;
  const REG = /^(R(?:1[0-5]|\d)|SP|LR|PC|FP|IP)$/i;

  function splitComment(line) {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"') { q = c; continue; }
      if (c === "'" && /^'(\\.|[^'\\])'/.test(line.slice(i))) { i += line.slice(i).match(/^'(\\.|[^'\\])'/)[0].length - 1; continue; }
      if (c === '@' || c === ';' || (c === '/' && line[i + 1] === '/')) return [line.slice(0, i), line.slice(i)];
    }
    return [line, ''];
  }

  function hlLine(line) {
    const [code, comment] = splitComment(line);
    let out = '', rest = code, seenMn = false;
    const lead = rest.match(/^(\s*)([A-Za-z_.$][\w.$]*)(\s*:)/);
    if (lead) { out += esc(lead[1]) + '<span class="t-lbl">' + esc(lead[2]) + '</span>' + esc(lead[3]); rest = rest.slice(lead[0].length); }
    const indented = /^\s/.test(code);
    const re = /("(?:\\.|[^"\\])*")|(#\s*-?(?:0x[0-9a-fA-F]+|0b[01]+|\d+|'.'))|('.')|(-?0x[0-9a-fA-F]+|\b\d+\b)|([A-Za-z_.$][\w.$]*)|(\s+)|([\s\S])/g;
    let m, first = !lead;
    while ((m = re.exec(rest))) {
      if (m[1]) out += '<span class="t-str">' + esc(m[1]) + '</span>';
      else if (m[2] || m[3] || m[4]) out += '<span class="t-num">' + esc(m[0]) + '</span>';
      else if (m[5]) {
        const w = m[5];
        if (!seenMn && w[0] === '.') { out += '<span class="t-dir">' + esc(w) + '</span>'; seenMn = true; }
        else if (!seenMn && root.ARM && root.ARM.parseMnemonic(w)) { out += '<span class="t-mn">' + esc(w) + '</span>'; seenMn = true; }
        else if (!seenMn && !indented && first) { out += '<span class="t-lbl">' + esc(w) + '</span>'; }
        else if (REG.test(w)) out += '<span class="t-reg">' + esc(w) + '</span>';
        else if (SHIFT.test(w)) out += '<span class="t-sh">' + esc(w) + '</span>';
        else out += '<span class="t-sym">' + esc(w) + '</span>';
        first = false;
      } else { out += esc(m[0]); if (!/\s/.test(m[0])) first = false; }
    }
    if (comment) out += '<span class="t-cmt">' + esc(comment) + '</span>';
    return out;
  }

  function highlight(src) { return src.split('\n').map(hlLine).join('\n'); }
  root.Asm = { highlight, hlLine, esc };
})(typeof window !== 'undefined' ? window : globalThis);
