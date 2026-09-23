/* ==========================================================================
   arm.js — Motor didáctico ARMv4
   · Ensamblador de dos pasadas (etiquetas, directivas, pseudo-instrucciones)
   · Codificador a código máquina con desglose de campos (formatos del Tema 1)
   · Emulador de CPU con explicación de cada paso y "paso atrás"
   Funciona en el navegador (window.ARM) y en Node (module.exports) para pruebas.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ARM = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ----------------------------- Constantes ------------------------------ */
  const TEXT_BASE = 0x1000;
  const DATA_BASE = 0x2000;
  const STACK_TOP = 0x20200000;
  const MAX_STEPS = 2000000;

  const COND_CODE = { EQ: 0, NE: 1, CS: 2, HS: 2, CC: 3, LO: 3, MI: 4, PL: 5, VS: 6, VC: 7, HI: 8, LS: 9, GE: 10, LT: 11, GT: 12, LE: 13, AL: 14 };
  const COND_NAME = ['EQ', 'NE', 'CS', 'CC', 'MI', 'PL', 'VS', 'VC', 'HI', 'LS', 'GE', 'LT', 'GT', 'LE', 'AL'];
  const COND_TABLE = [
    { code: 0, mn: 'EQ', alt: '', name: 'Igual', flags: 'Z = 1' },
    { code: 1, mn: 'NE', alt: '', name: 'Distinto', flags: 'Z = 0' },
    { code: 2, mn: 'CS', alt: 'HS', name: 'Carry activo / sin signo mayor o igual', flags: 'C = 1' },
    { code: 3, mn: 'CC', alt: 'LO', name: 'Carry inactivo / sin signo menor', flags: 'C = 0' },
    { code: 4, mn: 'MI', alt: '', name: 'Negativo', flags: 'N = 1' },
    { code: 5, mn: 'PL', alt: '', name: 'Positivo o cero', flags: 'N = 0' },
    { code: 6, mn: 'VS', alt: '', name: 'Desbordamiento', flags: 'V = 1' },
    { code: 7, mn: 'VC', alt: '', name: 'Sin desbordamiento', flags: 'V = 0' },
    { code: 8, mn: 'HI', alt: '', name: 'Sin signo mayor', flags: 'C = 1 y Z = 0' },
    { code: 9, mn: 'LS', alt: '', name: 'Sin signo menor o igual', flags: 'C = 0 o Z = 1' },
    { code: 10, mn: 'GE', alt: '', name: 'Con signo mayor o igual', flags: 'N = V' },
    { code: 11, mn: 'LT', alt: '', name: 'Con signo menor', flags: 'N ≠ V' },
    { code: 12, mn: 'GT', alt: '', name: 'Con signo mayor', flags: 'Z = 0 y N = V' },
    { code: 13, mn: 'LE', alt: '', name: 'Con signo menor o igual', flags: 'Z = 1 o N ≠ V' },
    { code: 14, mn: 'AL', alt: '', name: 'Siempre (incondicional)', flags: 'sin condición' }
  ];
  function condPass(c, f) {
    switch (c) {
      case 0: return !!f.Z; case 1: return !f.Z;
      case 2: return !!f.C; case 3: return !f.C;
      case 4: return !!f.N; case 5: return !f.N;
      case 6: return !!f.V; case 7: return !f.V;
      case 8: return !!f.C && !f.Z; case 9: return !f.C || !!f.Z;
      case 10: return f.N === f.V; case 11: return f.N !== f.V;
      case 12: return !f.Z && f.N === f.V; case 13: return !!f.Z || f.N !== f.V;
      default: return true;
    }
  }

  const DP_OPS = { AND: 0, EOR: 1, SUB: 2, RSB: 3, ADD: 4, ADC: 5, SBC: 6, RSC: 7, TST: 8, TEQ: 9, CMP: 10, CMN: 11, ORR: 12, MOV: 13, BIC: 14, MVN: 15 };
  const DP_TEST = { TST: 1, TEQ: 1, CMP: 1, CMN: 1 };
  const DP_MONO = { MOV: 1, MVN: 1 };
  const DP_LOGICAL = { AND: 1, EOR: 1, TST: 1, TEQ: 1, ORR: 1, MOV: 1, BIC: 1, MVN: 1 };
  const SHIFT_TYPES = { LSL: 0, LSR: 1, ASR: 2, ROR: 3 };
  const REG_ALIAS = { SP: 13, LR: 14, PC: 15, FP: 11, IP: 12, SL: 10, SB: 9 };
  const REG_LABEL = n => (n === 13 ? 'SP' : n === 14 ? 'LR' : n === 15 ? 'PC' : 'R' + n);

  /* ------------------------------ Utilidades ----------------------------- */
  const hex = (v, w = 8) => (v >>> 0).toString(16).toUpperCase().padStart(w, '0');
  const H = (v, w = 8) => '0x' + hex(v, w);
  const bin = (v, w) => (v >>> 0).toString(2).padStart(w, '0').slice(-w);
  const s32 = v => v | 0;
  const rotr = (v, n) => { n &= 31; return n ? (((v >>> n) | (v << (32 - n))) >>> 0) : (v >>> 0); };

  class AsmError extends Error {
    constructor(msg, hint) { super(msg); this.hint = hint || ''; }
  }

  function parseReg(s) {
    if (s == null) return -1;
    const t = String(s).trim().toUpperCase();
    const m = t.match(/^R(\d{1,2})$/);
    if (m) { const n = +m[1]; return n <= 15 ? n : -1; }
    if (t in REG_ALIAS) return REG_ALIAS[t];
    const a = t.match(/^A([1-4])$/); if (a) return +a[1] - 1;
    const v = t.match(/^V([1-8])$/); if (v) return +v[1] + 3;
    return -1;
  }
  function needReg(s, what) {
    const n = parseReg(s);
    if (n < 0) throw new AsmError(`Se esperaba un registro${what ? ' (' + what + ')' : ''} y aparece «${String(s).trim()}»`, 'Los registros son R0…R15 (SP=R13, LR=R14, PC=R15).');
    return n;
  }

  /* Divide por comas de primer nivel respetando [], {}, () y comillas */
  function splitTop(s) {
    const out = []; let depth = 0, cur = '', q = null;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (q) { cur += ch; if (ch === '\\') { cur += s[++i] || ''; } else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === '[' || ch === '{' || ch === '(') depth++;
      if (ch === ']' || ch === '}' || ch === ')') depth--;
      if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim() !== '' || out.length) out.push(cur.trim());
    return out;
  }

  /* ------------------------ Evaluador de expresiones --------------------- */
  function evalExpr(str, syms, dot) {
    const re = /\s*(0x[0-9a-f]+|0b[01]+|\d+|'(?:\\.|[^'\\])'|[A-Za-z_.$][\w.$]*|<<|>>|[-+*/%&|^~()])/iy;
    const toks = []; let pos = 0; str = String(str).trim();
    while (pos < str.length) {
      re.lastIndex = pos; const m = re.exec(str);
      if (!m) { if (/^\s*$/.test(str.slice(pos))) break; throw new AsmError(`Expresión no válida: «${str}»`); }
      toks.push(m[1]); pos = re.lastIndex;
    }
    if (!toks.length) throw new AsmError('Falta un valor (número, constante o etiqueta)');
    let i = 0;
    const peek = () => toks[i];
    const eat = () => toks[i++];
    function primary() {
      const t = eat();
      if (t === undefined) throw new AsmError(`Expresión incompleta: «${str}»`);
      if (t === '(') { const v = or(); if (eat() !== ')') throw new AsmError('Falta un paréntesis de cierre'); return v; }
      if (/^0x/i.test(t)) return parseInt(t, 16);
      if (/^0b/i.test(t)) return parseInt(t.slice(2), 2);
      if (/^\d/.test(t)) return parseInt(t, 10);
      if (t[0] === "'") { const c = t.slice(1, -1); return c[0] === '\\' ? ({ n: 10, t: 9, r: 13, '0': 0, '\\': 92, "'": 39 }[c[1]] ?? c.charCodeAt(1)) : c.charCodeAt(0); }
      if (t === '.') return dot;
      if (/^[A-Za-z_.$]/.test(t)) {
        if (syms && Object.prototype.hasOwnProperty.call(syms, t)) return syms[t];
        const low = t.toLowerCase();
        if (syms) for (const k in syms) if (k.toLowerCase() === low) return syms[k];
        throw new AsmError(`Símbolo desconocido «${t}»`, 'Comprueba que la etiqueta existe y está bien escrita (distingue del resto por su nombre).');
      }
      throw new AsmError(`No entiendo «${t}» en la expresión «${str}»`);
    }
    function unary() {
      const t = peek();
      if (t === '-') { eat(); return -unary(); }
      if (t === '+') { eat(); return unary(); }
      if (t === '~') { eat(); return -unary() - 1; }
      return primary();
    }
    function mul() { let v = unary(); while (['*', '/', '%'].includes(peek())) { const o = eat(), r = unary(); v = o === '*' ? v * r : o === '/' ? Math.trunc(v / r) : v % r; } return v; }
    function add() { let v = mul(); while (['+', '-'].includes(peek())) { const o = eat(), r = mul(); v = o === '+' ? v + r : v - r; } return v; }
    function shf() { let v = add(); while (['<<', '>>'].includes(peek())) { const o = eat(), r = add(); v = o === '<<' ? v * Math.pow(2, r) : Math.floor(v / Math.pow(2, r)); } return v; }
    function and() { let v = shf(); while (peek() === '&') { eat(); v = (v & shf()) >>> 0; } return v; }
    function xor() { let v = and(); while (peek() === '^') { eat(); v = (v ^ and()) >>> 0; } return v; }
    function or() { let v = xor(); while (peek() === '|') { eat(); v = (v | xor()) >>> 0; } return v; }
    const val = or();
    if (i < toks.length) throw new AsmError(`Sobra «${toks.slice(i).join(' ')}» en la expresión «${str}»`);
    return val;
  }

  /* --------------------- Inmediatos rotados (imm8 + rot) ------------------ */
  function encodeImm(v) {
    v = v >>> 0;
    for (let rot = 0; rot < 16; rot++) {
      const r = rotr(v, 32 - 2 * rot) >>> 0; // rotación a la izquierda 2*rot
      const back = rotr(r, 2 * rot);
      if (r <= 0xFF && back === v) return { rot, imm8: r };
    }
    return null;
  }

  /* --------------------------- Análisis de mnemónicos --------------------- */
  const CONDS = 'EQ|NE|CS|HS|CC|LO|MI|PL|VS|VC|HI|LS|GE|LT|GT|LE|AL';
  function suffix(rest, flags) {
    const F = flags && flags.length ? '(' + flags.join('|') + ')' : null;
    const c = '(' + CONDS + ')';
    const tries = F ? [new RegExp('^' + c + '?' + F + '?$'), new RegExp('^' + F + '?' + c + '?$')] : [new RegExp('^' + c + '?$')];
    for (let k = 0; k < tries.length; k++) {
      const m = rest.match(tries[k]);
      if (m) {
        if (F) return k === 0 ? { cond: m[1], flag: m[2] || '' } : { cond: m[2], flag: m[1] || '' };
        return { cond: m[1], flag: '' };
      }
    }
    return null;
  }
  const LDM_MODES = ['IA', 'IB', 'DA', 'DB', 'FD', 'FA', 'ED', 'EA'];
  function parseMnemonic(tok) {
    const t = tok.toUpperCase();
    const mk = (kind, base, sfx, extra) => Object.assign({ kind, base, cond: sfx.cond ? COND_CODE[sfx.cond] : 14, condText: sfx.cond || '', flag: sfx.flag || '' }, extra || {});
    let r;
    for (const b of Object.keys(DP_OPS)) if (t.startsWith(b)) {
      const rest = t.slice(b.length);
      r = DP_TEST[b] ? suffix(rest, ['S']) : suffix(rest, ['S']);
      if (r) return mk('dp', b, r, { s: r.flag === 'S' || !!DP_TEST[b] });
    }
    for (const b of Object.keys(SHIFT_TYPES)) if (t.startsWith(b)) {
      r = suffix(t.slice(3), ['S']); if (r) return mk('shift', b, r, { s: r.flag === 'S' });
    }
    if (t === 'RRX' || /^RRX/.test(t)) { r = suffix(t.slice(3), ['S']); if (r) return mk('shift', 'RRX', r, { s: r.flag === 'S' }); }
    for (const b of ['MUL', 'MLA']) if (t.startsWith(b)) { r = suffix(t.slice(3), ['S']); if (r) return mk('mul', b, r, { s: r.flag === 'S' }); }
    for (const b of ['SMULL', 'UMULL', 'SMLAL', 'UMLAL']) if (t.startsWith(b)) { r = suffix(t.slice(5), ['S']); if (r) return mk('mull', b, r, { s: r.flag === 'S' }); }
    for (const b of ['LDR', 'STR']) if (t.startsWith(b)) {
      r = suffix(t.slice(3), b === 'LDR' ? ['B', 'SB', 'H', 'SH'] : ['B', 'H']);
      if (r) return mk('mem', b, r, { load: b === 'LDR', size: /B$/.test(r.flag) ? 1 : /H$/.test(r.flag) ? 2 : 4, signed: r.flag[0] === 'S' });
    }
    for (const b of ['LDM', 'STM']) if (t.startsWith(b)) {
      r = suffix(t.slice(3), LDM_MODES); if (r) return mk('blk', b, r, { load: b === 'LDM', mode: r.flag || 'IA' });
    }
    for (const b of ['PUSH', 'POP']) if (t.startsWith(b)) { r = suffix(t.slice(b.length)); if (r) return mk('blk', b, r, { load: b === 'POP', mode: b === 'POP' ? 'IA' : 'DB', stack: true }); }
    for (const b of ['BX', 'BL', 'B']) if (t.startsWith(b)) {
      r = suffix(t.slice(b.length)); if (r) return mk(b === 'BX' ? 'bx' : 'br', b, r, { link: b === 'BL' });
    }
    for (const b of ['SWI', 'SVC']) if (t.startsWith(b)) { r = suffix(t.slice(3)); if (r) return mk('swi', b, r); }
    if (t.startsWith('NOP')) { r = suffix(t.slice(3)); if (r) return mk('nop', 'NOP', r); }
    return null;
  }

  /* ----------------------- Campos de un formato (UI) ---------------------- */
  function buildFields(word, spec) {
    return spec.map(([hi, lo, name, cls, note]) => ({
      hi, lo, name, cls, note: note || '',
      bits: bin((word >>> lo) & (hi - lo === 31 ? 0xFFFFFFFF : ((1 << (hi - lo + 1)) - 1)), hi - lo + 1)
    }));
  }
  const condNote = c => `Condición ${COND_NAME[c] || '?'}: ${COND_TABLE[c] ? COND_TABLE[c].name.toLowerCase() : ''}`;
  const rn = n => REG_LABEL(n);

  /* ------------------------------ Ensamblador ----------------------------- */
  function stripComment(line) {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"') { q = c; continue; }
      if (c === "'" && /^'(\\.|[^'\\])'/.test(line.slice(i))) { i += line.slice(i).match(/^'(\\.|[^'\\])'/)[0].length - 1; continue; }
      if (c === '@' || c === ';') return line.slice(0, i);
      if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
    }
    return line;
  }

  function parseString(s) {
    const m = s.trim().match(/^"((?:\\.|[^"\\])*)"$/);
    if (!m) throw new AsmError('Se esperaba una cadena entre comillas dobles');
    return m[1].replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"' }[c] ?? c));
  }

  function assemble(source) {
    const errors = [];
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const items = [];          // instrucciones y datos
    const symTmp = {};         // nombre -> {sec, off} | {val}
    let sec = 'text', tOff = 0, dOff = 0, ended = false;
    let recentLabels = [];     // etiquetas definidas y aún sin contenido en la sección de datos
    const err = (line, e) => errors.push({ line, msg: e.message || String(e), hint: e.hint || '' });

    /* ---------- Pasada 1: análisis y direcciones ---------- */
    lines.forEach((raw, idx) => {
      const lineNo = idx + 1;
      if (ended) return;
      let text = stripComment(raw);
      if (!text.trim()) return;
      const indented = /^\s/.test(text);
      text = text.trim();
      try {
        // Etiquetas con dos puntos (varias posibles)
        let m;
        while ((m = text.match(/^([A-Za-z_.$][\w.$]*)\s*:\s*/))) {
          defineLabel(m[1], lineNo);
          text = text.slice(m[0].length);
        }
        if (!text) return;
        let [first, ...restArr] = text.split(/\s+/);
        let rest = text.slice(first.length).trim();
        // Etiqueta sin dos puntos (columna 0 y no es mnemónico ni directiva)
        if (!indented && first[0] !== '.' && !parseMnemonic(first) && /^[A-Za-z_$][\w$]*$/.test(first)) {
          const nxt = rest.split(/\s+/)[0] || '';
          if (/^\.(equ|set)$/i.test(nxt)) {
            const r2 = rest.slice(nxt.length).trim();
            symTmp[first] = { val: evalExpr(r2, resolved(), 0), line: lineNo };
            return;
          }
          const nx = rest.split(/\s+/)[0] || '';
          if (rest && nx[0] !== '.' && !parseMnemonic(nx)) throw new AsmError(`Instrucción desconocida «${first}»`, 'Si «' + first + '» es una etiqueta, termínala con dos puntos (etiqueta:). Si es una instrucción, revisa cómo se escribe.');
          defineLabel(first, lineNo);
          text = rest; if (!text) return;
          first = text.split(/\s+/)[0]; rest = text.slice(first.length).trim();
        }
        if (first[0] === '.') { directive(first.toLowerCase(), rest, lineNo); return; }
        const mn = parseMnemonic(first);
        if (!mn) throw new AsmError(`Instrucción desconocida «${first}»`, 'Revisa el mnemónico. Si es una etiqueta sin dos puntos, escríbela en la primera columna.');
        if (sec !== 'text') throw new AsmError('Las instrucciones deben ir en la sección .text', 'Añade la directiva .text antes de las instrucciones.');
        items.push({ kind: 'instr', mn, ops: rest ? splitTop(rest) : [], line: lineNo, src: text, off: tOff });
        tOff += 4;
        recentLabels = [];
      } catch (e) { err(lineNo, e); }
    });

    function resolved() {
      const o = {};
      for (const k in symTmp) if ('val' in symTmp[k]) o[k] = symTmp[k].val;
      return o;
    }
    function defineLabel(name, line) {
      if (symTmp[name]) throw new AsmError(`La etiqueta «${name}» ya está definida en la línea ${symTmp[name].line}`);
      const s = { sec, off: sec === 'text' ? tOff : dOff, line };
      symTmp[name] = s;
      if (sec === 'data') recentLabels.push(s);
    }
    function alignData(n) {
      const pad = (n - (dOff % n)) % n;
      if (pad) { items.push({ kind: 'data', bytes: new Array(pad).fill(0), off: dOff, line: 0, src: '', pad: true }); dOff += pad; }
      recentLabels.forEach(s => { s.off = dOff; });
    }
    function directive(d, rest, line) {
      switch (d) {
        case '.text': sec = 'text'; return;
        case '.data': case '.bss': sec = 'data'; return;
        case '.section': sec = /data|bss|rodata/.test(rest) ? 'data' : 'text'; return;
        case '.global': case '.globl': case '.extern': case '.type': case '.size': case '.arm': case '.code': case '.syntax': case '.thumb': case '.file': case '.ltorg': case '.pool': return;
        case '.end': ended = true; return;
        case '.equ': case '.set': {
          const p = splitTop(rest); if (p.length < 2) throw new AsmError(`${d} necesita NOMBRE, valor`);
          symTmp[p[0]] = { val: evalExpr(p.slice(1).join(','), resolved(), 0), line }; return;
        }
        case '.align': case '.balign': case '.p2align': {
          const n = rest ? evalExpr(rest, resolved(), 0) : 2;
          const size = d === '.balign' ? n : Math.pow(2, n);
          if (sec === 'data') alignData(size);
          return;
        }
        case '.word': case '.long': case '.int': case '.hword': case '.short': case '.byte': {
          if (sec !== 'data') throw new AsmError(`${d} solo se puede usar en la sección .data`, 'Escribe .data antes de declarar datos.');
          const size = (d === '.byte') ? 1 : (d === '.hword' || d === '.short') ? 2 : 4;
          if (size > 1) alignData(size);
          const vals = splitTop(rest); if (!vals.length || vals[0] === '') throw new AsmError(`${d} necesita al menos un valor`);
          items.push({ kind: 'data', size, exprs: vals, off: dOff, line, src: d + ' ' + rest });
          dOff += size * vals.length; recentLabels = []; return;
        }
        case '.space': case '.skip': case '.zero': {
          if (sec !== 'data') throw new AsmError(`${d} solo se puede usar en la sección .data`);
          const p = splitTop(rest); const n = evalExpr(p[0], resolved(), 0); const fill = p[1] ? evalExpr(p[1], resolved(), 0) : 0;
          if (n < 0 || n > 65536) throw new AsmError('Tamaño de .space fuera de rango (0–65536 bytes)');
          items.push({ kind: 'data', bytes: new Array(n).fill(fill & 255), off: dOff, line, src: d + ' ' + rest });
          dOff += n; recentLabels = []; return;
        }
        case '.ascii': case '.asciz': case '.string': {
          if (sec !== 'data') throw new AsmError(`${d} solo se puede usar en la sección .data`);
          let str = parseString(rest); if (d !== '.ascii') str += '\0';
          const bytes = Array.from(str).map(ch => ch.charCodeAt(0) & 255);
          items.push({ kind: 'data', bytes, off: dOff, line, src: d + ' ' + rest });
          dOff += bytes.length; recentLabels = []; return;
        }
        default: throw new AsmError(`Directiva no soportada: ${d}`);
      }
    }

    /* ---------- Disposición: direcciones finales ---------- */
    const nInstr = items.filter(i => i.kind === 'instr').length;
    const nLit = items.filter(i => i.kind === 'instr' && i.mn.kind === 'mem' && i.ops[1] && i.ops[1].trim()[0] === '=').length;
    const textEnd = TEXT_BASE + 4 * nInstr;
    const poolBase = textEnd;
    const textLimit = poolBase + 4 * nLit;
    const dataBase = Math.max(DATA_BASE, Math.ceil(textLimit / 0x1000) * 0x1000 + (textLimit > DATA_BASE ? 0 : 0));
    const symbols = {};
    for (const k in symTmp) {
      const s = symTmp[k];
      symbols[k] = 'val' in s ? s.val : (s.sec === 'text' ? TEXT_BASE + s.off : dataBase + s.off);
    }
    const labelNames = Object.keys(symTmp).filter(k => !('val' in symTmp[k]));

    /* ---------- Pasada 2: codificación ---------- */
    const image = new Map();
    const byAddr = new Map();
    const listing = [];
    const pool = [];
    const put32 = (a, v) => { for (let i = 0; i < 4; i++) image.set(a + i, (v >>> (8 * i)) & 255); };

    for (const it of items) {
      if (it.kind === 'instr') {
        const addr = TEXT_BASE + it.off;
        try {
          const r = encodeInstr(it.mn, it.ops, addr, symbols, pool, poolBase);
          put32(addr, r.word);
          const ins = Object.assign({ addr, line: it.line, src: it.src.replace(/\s+/g, ' '), word: r.word >>> 0, fields: r.fields, format: r.format, note: r.note || '' }, r.sem);
          byAddr.set(addr, ins);
          listing.push({ type: 'instr', addr, word: ins.word, src: ins.src, line: it.line, ins });
        } catch (e) { err(it.line, e); }
      } else {
        const addr = dataBase + it.off;
        try {
          let bytes = it.bytes;
          if (!bytes) {
            bytes = [];
            it.exprs.forEach(x => {
              const v = evalExpr(x, symbols, addr) >>> 0;
              for (let k = 0; k < it.size; k++) bytes.push((v >>> (8 * k)) & 255);
            });
          }
          bytes.forEach((b, k) => image.set(addr + k, b));
          if (!it.pad) listing.push({ type: 'data', addr, bytes, src: it.src, line: it.line, size: it.size || 1 });
        } catch (e) { err(it.line, e); }
      }
    }
    pool.forEach((v, i) => { put32(poolBase + 4 * i, v); listing.push({ type: 'pool', addr: poolBase + 4 * i, word: v >>> 0, src: '.word ' + H(v), line: 0 }); });

    const entryName = ['_start', 'main', 'MAIN', 'START', '__start'].find(n => n in symbols && labelNames.includes(n));
    const entry = entryName ? symbols[entryName] : TEXT_BASE;
    listing.sort((a, b) => (a.type === 'data') - (b.type === 'data') || a.addr - b.addr);
    return {
      ok: errors.length === 0, errors, image, byAddr, listing, symbols, labelNames,
      textStart: TEXT_BASE, textEnd, poolEnd: poolBase + 4 * pool.length, dataStart: dataBase, dataEnd: dataBase + dOff, entry, nInstr, lines
    };
  }

  /* ----------------------- Codificación por instrucción -------------------- */
  function parseShiftSpec(spec) {
    const t = spec.trim();
    if (/^RRX$/i.test(t)) return { type: 'ROR', rrx: true, amt: 0 };
    const m = t.match(/^(LSL|LSR|ASR|ROR)\s*(.+)$/i);
    if (!m) throw new AsmError(`Desplazamiento no válido: «${t}»`, 'Usa LSL, LSR, ASR o ROR seguido de #número o de un registro.');
    const type = m[1].toUpperCase(); const arg = m[2].trim();
    if (arg[0] === '#') return { type, amt: evalExpr(arg.slice(1), symCtx.syms, symCtx.addr) };
    return { type, rs: needReg(arg, 'registro con el nº de posiciones') };
  }
  let symCtx = { syms: {}, addr: 0 };
  const ev = s => evalExpr(s, symCtx.syms, symCtx.addr);

  function shiftBits(sh) {
    // devuelve {shamt5, sh}
    if (sh.rrx) return { shamt: 0, st: 3 };
    const st = SHIFT_TYPES[sh.type];
    let a = sh.amt;
    if (sh.type === 'LSL') { if (a < 0 || a > 31) throw new AsmError(`LSL admite 0–31 posiciones (has puesto ${a})`); return { shamt: a, st }; }
    if (sh.type === 'ROR') { if (a < 1 || a > 31) throw new AsmError(`ROR con constante admite 1–31 posiciones (has puesto ${a})`, 'Con ROR #0 se codificaría RRX.'); return { shamt: a, st }; }
    if (a < 1 || a > 32) throw new AsmError(`${sh.type} admite 1–32 posiciones (has puesto ${a})`);
    return { shamt: a === 32 ? 0 : a, st };
  }

  /* Segundo operando de procesamiento de datos. ops = lista de operandos ya sin Rd/Rn */
  function parseOp2(ops, mnBase) {
    if (!ops.length) throw new AsmError('Falta el segundo operando (registro o #inmediato)');
    const a = ops[0].trim();
    if (a[0] === '#') {
      if (ops.length > 1) throw new AsmError('Un inmediato no admite desplazamiento');
      return { kind: 'imm', value: ev(a.slice(1)) };
    }
    const rm = needReg(a, 'segundo operando');
    if (ops.length === 1) return { kind: 'reg', rm, shift: null };
    if (ops.length > 2) throw new AsmError('Demasiados operandos');
    const sh = parseShiftSpec(ops[1]);
    return { kind: 'reg', rm, shift: sh };
  }

  function encodeDP(mn, ops, addr) {
    let base = mn.base, rd = 0, rnn = 0, op2;
    let note = '';
    if (mn.kind === 'shift') {
      // LSL Rd, Rm, #n|Rs  ==  MOV Rd, Rm, LSL #n|Rs
      let a = ops.map(x => x.trim());
      if (base === 'RRX') { if (a.length === 1) a = [a[0], a[0]]; if (a.length !== 2) throw new AsmError('RRX necesita Rd, Rm'); op2 = { kind: 'reg', rm: needReg(a[1]), shift: { type: 'ROR', rrx: true, amt: 0 } }; rd = needReg(a[0]); }
      else {
        if (a.length === 2) a = [a[0], a[0], a[1]];
        if (a.length !== 3) throw new AsmError(`${base} necesita Rd, Rm, #n (o Rs)`);
        rd = needReg(a[0], 'destino'); const rm = needReg(a[1], 'origen');
        const arg = a[2];
        const sh = arg[0] === '#' ? { type: base, amt: ev(arg.slice(1)) } : { type: base, rs: needReg(arg, 'registro con el nº de posiciones') };
        op2 = { kind: 'reg', rm, shift: (sh.amt === 0 && base === 'LSL') ? null : sh };
      }
      base = 'MOV'; note = `${mn.base} ≡ MOV con desplazamiento`;
    } else if (DP_TEST[base]) {
      if (ops.length < 2) throw new AsmError(`${base} necesita Rn, operando2`);
      rnn = needReg(ops[0], 'Rn'); op2 = parseOp2(ops.slice(1), base);
    } else if (DP_MONO[base]) {
      if (ops.length < 2) throw new AsmError(`${base} necesita Rd, operando2`);
      rd = needReg(ops[0], 'Rd'); op2 = parseOp2(ops.slice(1), base);
    } else {
      if (ops.length < 2) throw new AsmError(`${base} necesita Rd, Rn, operando2`);
      // Forma abreviada ADD Rd, #imm|Rm  ->  ADD Rd, Rd, ...
      if (ops.length === 2 || (ops.length === 3 && parseReg(ops[1]) < 0)) { rd = needReg(ops[0], 'Rd'); rnn = rd; op2 = parseOp2(ops.slice(1), base); }
      else { rd = needReg(ops[0], 'Rd'); rnn = needReg(ops[1], 'Rn'); op2 = parseOp2(ops.slice(2), base); }
    }
    let cmd = DP_OPS[base]; let immEnc = null;
    if (op2.kind === 'imm') {
      let v = op2.value >>> 0;
      immEnc = encodeImm(v);
      if (!immEnc) {
        const alt = { MOV: ['MVN', x => ~x], MVN: ['MOV', x => ~x], AND: ['BIC', x => ~x], BIC: ['AND', x => ~x], ADD: ['SUB', x => -x], SUB: ['ADD', x => -x], CMP: ['CMN', x => -x], CMN: ['CMP', x => -x] }[base];
        let ok = false;
        if (alt) { const v2 = alt[1](v) >>> 0; const e2 = encodeImm(v2); if (e2) { note = `El ensamblador cambia ${base} por ${alt[0]} porque ${H(v, 0)} no cabe en imm8 rotado pero ${H(v2, 0)} sí`; base = alt[0]; cmd = DP_OPS[base]; immEnc = e2; v = v2; ok = true; } }
        if (!ok) throw new AsmError(`El inmediato ${H(v >>> 0, 0)} (${v >>> 0}) no se puede codificar`, 'Un inmediato ARM es un valor de 8 bits rotado a la derecha un nº PAR de posiciones (imm8 + rot). Para constantes grandes usa LDR Rd, =valor.');
      }
      op2 = { kind: 'imm', value: rotr(immEnc.imm8, 2 * immEnc.rot), rot: immEnc.rot, imm8: immEnc.imm8 };
    }
    const S = (mn.s || DP_TEST[base]) ? 1 : 0;
    let word = (mn.cond << 28) | (0 << 26) | (cmd << 21) | (S << 20) | (rnn << 16) | (rd << 12);
    let spec;
    const cn = condNote(mn.cond);
    const ropNote = (DP_TEST[base] ? 'Rd sin uso (0000)' : 'Registro destino: ' + rn(rd));
    if (op2.kind === 'imm') {
      word |= (1 << 25) | (op2.rot << 8) | op2.imm8;
      spec = [[31, 28, 'cond', 'cond', cn], [27, 26, 'op', 'op', 'op = 00: procesamiento de datos'], [25, 25, 'I', 'flag', 'I = 1: el operando 2 es un inmediato'], [24, 21, 'cmd', 'cmd', 'Operación: ' + base], [20, 20, 'S', 'flag', S ? 'S = 1: actualiza los flags' : 'S = 0: no toca los flags'],
        [19, 16, 'Rn', 'rn', DP_MONO[base] ? 'Sin uso en ' + base : 'Primer operando: ' + rn(rnn)], [15, 12, 'Rd', 'rd', ropNote], [11, 8, 'rot', 'src', `rot = ${op2.rot}: se rota a la derecha ${2 * op2.rot} posiciones`], [7, 0, 'imm8', 'src', `imm8 = ${op2.imm8}`]];
    } else {
      const sh = op2.shift; let sb;
      if (!sh) { sb = { shamt: 0, st: 0 }; word |= op2.rm; }
      else if (sh.rs != null) { word |= (sh.rs << 8) | (SHIFT_TYPES[sh.type] << 5) | (1 << 4) | op2.rm; }
      else { sb = shiftBits(sh); word |= (sb.shamt << 7) | (sb.st << 5) | op2.rm; }
      const stName = sh ? (sh.rrx ? 'RRX' : sh.type) : 'LSL';
      if (sh && sh.rs != null) {
        spec = [[31, 28, 'cond', 'cond', cn], [27, 26, 'op', 'op', 'op = 00: procesamiento de datos'], [25, 25, 'I', 'flag', 'I = 0: el operando 2 es un registro'], [24, 21, 'cmd', 'cmd', 'Operación: ' + base], [20, 20, 'S', 'flag', S ? 'S = 1: actualiza los flags' : 'S = 0: no toca los flags'],
          [19, 16, 'Rn', 'rn', DP_MONO[base] ? 'Sin uso en ' + base : 'Primer operando: ' + rn(rnn)], [15, 12, 'Rd', 'rd', ropNote], [11, 8, 'Rs', 'src', 'Registro con el nº de posiciones: ' + rn(sh.rs)], [7, 7, '0', 'fix', 'Bit fijo a 0'], [6, 5, 'sh', 'src', 'Tipo de desplazamiento: ' + stName], [4, 4, '1', 'fix', 'Bit fijo a 1 (desplazamiento por registro)'], [3, 0, 'Rm', 'src', 'Registro desplazado: ' + rn(op2.rm)]];
      } else {
        spec = [[31, 28, 'cond', 'cond', cn], [27, 26, 'op', 'op', 'op = 00: procesamiento de datos'], [25, 25, 'I', 'flag', 'I = 0: el operando 2 es un registro'], [24, 21, 'cmd', 'cmd', 'Operación: ' + base], [20, 20, 'S', 'flag', S ? 'S = 1: actualiza los flags' : 'S = 0: no toca los flags'],
          [19, 16, 'Rn', 'rn', DP_MONO[base] ? 'Sin uso en ' + base : 'Primer operando: ' + rn(rnn)], [15, 12, 'Rd', 'rd', ropNote], [11, 7, 'shamt5', 'src', sh ? `Desplazar ${sb.shamt === 0 && sh.type !== 'LSL' ? 32 : sb.shamt} posiciones` : 'Sin desplazamiento'], [6, 5, 'sh', 'src', 'Tipo de desplazamiento: ' + stName], [4, 4, '0', 'fix', 'Bit fijo a 0 (desplazamiento por constante)'], [3, 0, 'Rm', 'src', 'Segundo operando: ' + rn(op2.rm)]];
      }
    }
    word >>>= 0;
    return {
      word, fields: buildFields(word, spec), format: 'Procesamiento de datos', note,
      sem: { t: 'dp', op: base, cond: mn.cond, s: !!S, rd, rn: rnn, op2, cmd }
    };
  }

  function encodeMem(mn, ops, addr, syms, pool, poolBase) {
    if (ops.length < 2) throw new AsmError(`${mn.base} necesita Rd, [Rn…]`);
    const rd = needReg(ops[0], 'Rd');
    const a1 = ops[1].trim();
    let rnn, p = 1, u = 1, w = 0, off = null;
    let note = '';
    // Pseudo-instrucción LDR Rd, =valor
    if (a1[0] === '=') {
      if (!mn.load || mn.size !== 4 || mn.signed) throw new AsmError('La forma LDR Rd, =valor solo existe para LDR de palabra');
      const v = ev(a1.slice(1)) >>> 0;
      const e1 = encodeImm(v), e2 = encodeImm(~v >>> 0);
      if (e1 || e2) {
        const r = encodeDP(Object.assign({}, mn, { kind: 'dp', base: e1 ? 'MOV' : 'MVN', s: false }), [REG_LABEL(rd), '#' + (e1 ? v : (~v >>> 0))], addr);
        r.note = `LDR Rd,=${H(v, 0)} se convierte en ${e1 ? 'MOV' : 'MVN'} porque el valor cabe como inmediato rotado`;
        return r;
      }
      let idx = pool.indexOf(v); if (idx < 0) { idx = pool.length; pool.push(v); }
      const target = poolBase + 4 * idx;
      const diff = target - (addr + 8);
      if (Math.abs(diff) > 4095) throw new AsmError('El pool de literales queda demasiado lejos');
      const r = memWord(mn, rd, 15, diff >= 0 ? 1 : 0, 1, 0, { type: 'imm', v: Math.abs(diff) }, note);
      r.note = `LDR Rd,=${H(v, 0)}: el valor se guarda en el pool de literales (${H(target)}) y se carga con [PC, #${diff}]`;
      r.sem.lit = true;
      return r;
    }
    if (a1[0] !== '[') {
      // LDR Rd, etiqueta  (relativo a PC)
      const target = ev(a1); const diff = target - (addr + 8);
      if (Math.abs(diff) > 4095) throw new AsmError('La etiqueta queda demasiado lejos para direccionamiento relativo a PC');
      const r = memWord(mn, rd, 15, diff >= 0 ? 1 : 0, 1, 0, { type: 'imm', v: Math.abs(diff) }, '');
      r.note = 'Direccionamiento relativo a PC: ' + rn(15) + ' + ' + diff;
      return r;
    }
    const m = a1.match(/^\[\s*([^\],]+?)\s*(?:,\s*(.*?))?\s*\]\s*(!)?$/);
    if (!m) throw new AsmError(`Dirección mal formada: «${a1}»`, 'La forma es [Rn], [Rn, #imm], [Rn, Rm] o [Rn, Rm, LSL #n]; los corchetes son importantes.');
    rnn = needReg(m[1], 'registro base');
    const inner = m[2] ? splitTop(m[2]) : [];
    const bang = !!m[3];
    const parseOff = (arr) => {
      if (!arr.length) return null;
      let a = arr[0].trim(); let neg = false;
      if (a[0] === '#') {
        const v = ev(a.slice(1)); if (arr.length > 1) throw new AsmError('Un desplazamiento inmediato no admite shift');
        return { type: 'imm', v: Math.abs(v), neg: v < 0 };
      }
      if (a[0] === '-') { neg = true; a = a.slice(1); } else if (a[0] === '+') a = a.slice(1);
      const rm = needReg(a, 'registro de desplazamiento');
      let shift = null; if (arr.length > 1) shift = parseShiftSpec(arr[1]);
      if (shift && shift.rs != null) throw new AsmError('En LDR/STR el desplazamiento del índice debe ser una constante (LSL #n)');
      return { type: 'reg', rm, shift, neg };
    };
    if (ops.length > 2) {
      // post-indexado: [Rn], #imm | Rm
      if (inner.length) throw new AsmError('En post-indexado el registro base va solo entre corchetes: [Rn], #imm');
      if (bang) throw new AsmError('El post-indexado no lleva «!»');
      off = parseOff(ops.slice(2)); p = 0; w = 0; u = off.neg ? 0 : 1;
      note = 'Post-indexado: se usa Rn y después Rn ← Rn ' + (u ? '+' : '−') + ' desplazamiento';
    } else {
      off = parseOff(inner); p = 1; w = bang ? 1 : 0; u = off && off.neg ? 0 : 1;
      if (!off) off = { type: 'imm', v: 0, neg: false };
      if (bang) note = 'Pre-indexado: Rn se actualiza antes del acceso';
    }
    if (mn.size === 4 || mn.size === 1) {
      if (off.type === 'imm' && off.v > 4095) throw new AsmError(`El desplazamiento #${off.v} no cabe en 12 bits (máx. 4095)`);
      return memWord(mn, rd, rnn, u, p, w, off, note);
    }
    // media palabra / con signo (formato extendido de ARMv4)
    if (off.type === 'imm' && off.v > 255) throw new AsmError(`En ${mn.base}${mn.flag} el desplazamiento inmediato admite 0–255 (has puesto ${off.v})`);
    if (off.type === 'reg' && off.shift) throw new AsmError(`${mn.base}${mn.flag} no admite registro desplazado`);
    return memHalf(mn, rd, rnn, u, p, w, off, note);
  }

  function memWord(mn, rd, rnn, u, p, w, off, note) {
    const B = mn.size === 1 ? 1 : 0, L = mn.load ? 1 : 0;
    let word = (mn.cond << 28) | (1 << 26) | (p << 24) | (u << 23) | (B << 22) | (w << 21) | (L << 20) | (rnn << 16) | (rd << 12);
    const cn = condNote(mn.cond);
    let spec;
    const head = [[31, 28, 'cond', 'cond', cn], [27, 26, 'op', 'op', 'op = 01: acceso a memoria']];
    const ctl = (I) => [[25, 25, 'Ī', 'flag', I ? 'Ī = 1: el desplazamiento es un registro' : 'Ī = 0: el desplazamiento es un inmediato'], [24, 24, 'P', 'flag', p ? 'P = 1: se suma el desplazamiento antes del acceso' : 'P = 0: post-indexado'], [23, 23, 'U', 'flag', u ? 'U = 1: se suma el desplazamiento' : 'U = 0: se resta el desplazamiento'], [22, 22, 'B', 'flag', B ? 'B = 1: byte' : 'B = 0: palabra'], [21, 21, 'W', 'flag', w ? 'W = 1: Rn se actualiza (pre-indexado)' : 'W = 0: Rn no cambia'], [20, 20, 'L', 'flag', L ? 'L = 1: carga (LDR)' : 'L = 0: almacenamiento (STR)']];
    const regs = [[19, 16, 'Rn', 'rn', 'Registro base: ' + rn(rnn)], [15, 12, 'Rd', 'rd', (L ? 'Registro que recibe el dato: ' : 'Registro cuyo dato se guarda: ') + rn(rd)]];
    if (off.type === 'imm') {
      word |= off.v;
      spec = head.concat(ctl(0), regs, [[11, 0, 'imm12', 'src', `Desplazamiento inmediato = ${off.v}`]]);
    } else {
      word |= (1 << 25) | off.rm;
      let stn = 'LSL', sh5 = 0, stb = 0;
      if (off.shift) { const sb = shiftBits(off.shift); sh5 = sb.shamt; stb = sb.st; stn = off.shift.rrx ? 'RRX' : off.shift.type; word |= (sh5 << 7) | (stb << 5); }
      spec = head.concat(ctl(1), regs, [[11, 7, 'shamt5', 'src', off.shift ? `Desplazar ${sh5} posiciones` : 'Sin desplazamiento'], [6, 5, 'sh', 'src', 'Tipo: ' + stn], [4, 4, '0', 'fix', 'Bit fijo a 0'], [3, 0, 'Rm', 'src', 'Registro índice: ' + rn(off.rm)]]);
    }
    word >>>= 0;
    return { word, fields: buildFields(word, spec), format: 'Acceso a memoria', note, sem: { t: 'mem', load: !!L, size: mn.size, signed: mn.signed, cond: mn.cond, rd, rn: rnn, p, u, w, off } };
  }

  function memHalf(mn, rd, rnn, u, p, w, off, note) {
    const L = mn.load ? 1 : 0; const S = mn.signed ? 1 : 0; const Hh = mn.size === 2 ? 1 : 0;
    const I = off.type === 'imm' ? 1 : 0;
    let word = (mn.cond << 28) | (p << 24) | (u << 23) | (I << 22) | (w << 21) | (L << 20) | (rnn << 16) | (rd << 12) | (1 << 7) | (S << 6) | (Hh << 5) | (1 << 4);
    if (I) word |= ((off.v >> 4) << 8) | (off.v & 15); else word |= off.rm;
    word >>>= 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 25, 'op', 'op', 'Formato extendido de ARMv4 (000)'], [24, 24, 'P', 'flag', p ? 'P = 1: offset/pre-indexado' : 'P = 0: post-indexado'], [23, 23, 'U', 'flag', u ? 'U = 1: suma' : 'U = 0: resta'], [22, 22, 'I', 'flag', I ? 'I = 1: inmediato' : 'I = 0: registro'], [21, 21, 'W', 'flag', w ? 'W = 1: actualiza Rn' : 'W = 0: Rn no cambia'], [20, 20, 'L', 'flag', L ? 'L = 1: carga' : 'L = 0: almacenamiento'],
      [19, 16, 'Rn', 'rn', 'Registro base: ' + rn(rnn)], [15, 12, 'Rd', 'rd', 'Registro de datos: ' + rn(rd)], [11, 8, I ? 'immH' : '0000', 'src', I ? 'Parte alta del inmediato' : 'Sin uso'], [7, 7, '1', 'fix', 'Bit fijo a 1'], [6, 6, 'S', 'flag', S ? 'S = 1: con signo' : 'S = 0: sin signo'], [5, 5, 'H', 'flag', Hh ? 'H = 1: media palabra' : 'H = 0: byte'], [4, 4, '1', 'fix', 'Bit fijo a 1'], [3, 0, I ? 'immL' : 'Rm', 'src', I ? 'Parte baja del inmediato' : 'Registro índice: ' + rn(off.rm)]];
    return { word, fields: buildFields(word, spec), format: 'Acceso a memoria (byte con signo / media palabra)', note, sem: { t: 'mem', load: !!L, size: mn.size, signed: mn.signed, cond: mn.cond, rd, rn: rnn, p, u, w, off } };
  }

  function encodeBranch(mn, ops, addr) {
    if (ops.length !== 1) throw new AsmError(`${mn.base} necesita una etiqueta de destino`);
    const target = ev(ops[0].replace(/^#/, '')) >>> 0;
    if (target % 4) throw new AsmError(`El destino ${H(target)} no está alineado a 4 bytes`);
    const diff = (target - (addr + 8)) / 4;
    if (diff < -(1 << 23) || diff >= (1 << 23)) throw new AsmError('El salto queda fuera de rango (±32 MB)');
    const imm24 = diff & 0xFFFFFF;
    const word = ((mn.cond << 28) | (0b10 << 26) | (1 << 25) | ((mn.link ? 1 : 0) << 24) | imm24) >>> 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 26, 'op', 'op', 'op = 10: salto'], [25, 25, '1', 'fix', 'Bit fijo a 1'], [24, 24, 'L', 'flag', mn.link ? 'L = 1: BL (guarda la dirección de retorno en LR)' : 'L = 0: B (salto simple)'], [23, 0, 'imm24', 'src', `Desplazamiento = ${diff} palabras. Destino = PC+8 + 4·(${diff}) = ${H(target)}`]];
    return { word, fields: buildFields(word, spec), format: 'Salto', note: `Destino ${H(target)}: PC+8 = ${H(addr + 8)}, desplazamiento ${diff} instrucciones`, sem: { t: 'br', link: mn.link, cond: mn.cond, target, off: diff } };
  }

  function encodeBX(mn, ops) {
    if (ops.length !== 1) throw new AsmError('BX necesita un registro');
    const rm = needReg(ops[0]);
    const word = ((mn.cond << 28) | 0x012FFF10 | rm) >>> 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 4, 'BX', 'op', 'Código fijo de BX'], [3, 0, 'Rm', 'src', 'Registro con la dirección: ' + rn(rm)]];
    return { word, fields: buildFields(word, spec), format: 'Salto a registro', note: '', sem: { t: 'bx', cond: mn.cond, rm } };
  }

  function encodeMul(mn, ops) {
    const b = mn.base;
    let rd, rm, rs, racc = 0;
    if (b === 'MUL') {
      if (ops.length === 2) { rd = needReg(ops[0]); rm = needReg(ops[1]); rs = rd; }
      else if (ops.length === 3) { rd = needReg(ops[0]); rm = needReg(ops[1]); rs = needReg(ops[2]); }
      else throw new AsmError('MUL necesita Rd, Rm, Rs');
    } else {
      if (ops.length !== 4) throw new AsmError('MLA necesita Rd, Rm, Rs, Rn');
      rd = needReg(ops[0]); rm = needReg(ops[1]); rs = needReg(ops[2]); racc = needReg(ops[3]);
    }
    const A = b === 'MLA' ? 1 : 0, S = mn.s ? 1 : 0;
    const word = ((mn.cond << 28) | (A << 21) | (S << 20) | (rd << 16) | (racc << 12) | (rs << 8) | (0b1001 << 4) | rm) >>> 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 22, '000000', 'op', 'Multiplicación'], [21, 21, 'A', 'flag', A ? 'A = 1: acumula (MLA)' : 'A = 0: MUL'], [20, 20, 'S', 'flag', S ? 'S = 1: actualiza flags' : 'S = 0'], [19, 16, 'Rd', 'rd', 'Destino: ' + rn(rd)], [15, 12, 'Rn', 'rn', A ? 'Acumulador: ' + rn(racc) : 'Sin uso'], [11, 8, 'Rs', 'src', 'Operando: ' + rn(rs)], [7, 4, '1001', 'fix', 'Código fijo de multiplicación'], [3, 0, 'Rm', 'src', 'Operando: ' + rn(rm)]];
    return { word, fields: buildFields(word, spec), format: 'Multiplicación', note: '', sem: { t: 'mul', acc: !!A, cond: mn.cond, s: !!S, rd, rm, rs, racc } };
  }

  function encodeMull(mn, ops) {
    if (ops.length !== 4) throw new AsmError(`${mn.base} necesita RdLo, RdHi, Rm, Rs`);
    const rdlo = needReg(ops[0]), rdhi = needReg(ops[1]), rm = needReg(ops[2]), rs = needReg(ops[3]);
    const U = /^S/.test(mn.base) ? 1 : 0, A = /LAL$/.test(mn.base) ? 1 : 0, S = mn.s ? 1 : 0;
    const word = ((mn.cond << 28) | (1 << 23) | (U << 22) | (A << 21) | (S << 20) | (rdhi << 16) | (rdlo << 12) | (rs << 8) | (0b1001 << 4) | rm) >>> 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 24, '0000', 'op', 'Multiplicación larga'], [23, 23, '1', 'fix', 'Bit fijo'], [22, 22, 'U', 'flag', U ? 'U = 1: con signo (SMULL)' : 'U = 0: sin signo (UMULL)'], [21, 21, 'A', 'flag', A ? 'Acumula' : 'No acumula'], [20, 20, 'S', 'flag', S ? 'S = 1' : 'S = 0'], [19, 16, 'RdHi', 'rd', '32 bits altos → ' + rn(rdhi)], [15, 12, 'RdLo', 'rd', '32 bits bajos → ' + rn(rdlo)], [11, 8, 'Rs', 'src', rn(rs)], [7, 4, '1001', 'fix', 'Código fijo'], [3, 0, 'Rm', 'src', rn(rm)]];
    return { word, fields: buildFields(word, spec), format: 'Multiplicación larga', note: '', sem: { t: 'mull', signed: !!U, acc: !!A, cond: mn.cond, s: !!S, rdlo, rdhi, rm, rs } };
  }

  function parseRegList(s) {
    const m = s.trim().match(/^\{(.*)\}$/);
    if (!m) throw new AsmError('La lista de registros debe ir entre llaves: {R4, R5, LR}');
    let mask = 0;
    m[1].split(',').forEach(part => {
      part = part.trim(); if (!part) return;
      const r = part.split('-');
      const a = needReg(r[0]); const b = r[1] ? needReg(r[1]) : a;
      if (b < a) throw new AsmError(`Rango de registros inválido «${part}»`);
      for (let i = a; i <= b; i++) mask |= 1 << i;
    });
    if (!mask) throw new AsmError('La lista de registros está vacía');
    return mask;
  }

  function encodeBlock(mn, ops) {
    let rnn, mask, wb = 0, mode = mn.mode;
    if (mn.stack) {
      if (ops.length < 1) throw new AsmError(`${mn.base} necesita una lista de registros {…}`);
      rnn = 13; wb = 1; mask = parseRegList(ops.join(','));
    } else {
      if (ops.length < 2) throw new AsmError(`${mn.base} necesita Rn[!], {registros}`);
      let a = ops[0].trim(); if (a.endsWith('!')) { wb = 1; a = a.slice(0, -1); }
      rnn = needReg(a); mask = parseRegList(ops.slice(1).join(','));
      // alias de pila
      const map = mn.load ? { FD: 'IA', ED: 'DA', FA: 'IB', EA: 'DB' } : { FD: 'DB', ED: 'IB', FA: 'DA', EA: 'IA' };
      if (mode in map) mode = map[mode];
    }
    const P = (mode === 'IB' || mode === 'DB') ? 1 : 0, U = (mode === 'IA' || mode === 'IB') ? 1 : 0, L = mn.load ? 1 : 0;
    const word = ((mn.cond << 28) | (0b100 << 25) | (P << 24) | (U << 23) | (wb << 21) | (L << 20) | (rnn << 16) | mask) >>> 0;
    const spec = [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 25, 'op', 'op', 'op = 100: transferencia múltiple'], [24, 24, 'P', 'flag', 'P'], [23, 23, 'U', 'flag', U ? 'U = 1: direcciones ascendentes' : 'U = 0: direcciones descendentes'], [22, 22, 'S', 'flag', 'S = 0'], [21, 21, 'W', 'flag', wb ? 'W = 1: actualiza ' + rn(rnn) : 'W = 0'], [20, 20, 'L', 'flag', L ? 'L = 1: carga (LDM/POP)' : 'L = 0: almacena (STM/PUSH)'], [19, 16, 'Rn', 'rn', 'Registro base: ' + rn(rnn)], [15, 0, 'lista', 'src', 'Registros: ' + regsFromMask(mask).map(rn).join(', ')]];
    return { word, fields: buildFields(word, spec), format: 'Transferencia múltiple', note: mn.stack ? (mn.load ? 'POP {…} ≡ LDMIA SP!, {…}' : 'PUSH {…} ≡ STMDB SP!, {…}') : '', sem: { t: 'blk', load: !!L, cond: mn.cond, rn: rnn, mask, p: P, u: U, w: wb, stack: !!mn.stack } };
  }
  const regsFromMask = m => { const o = []; for (let i = 0; i < 16; i++) if (m & (1 << i)) o.push(i); return o; };

  function encodeInstr(mn, ops, addr, syms, pool, poolBase) {
    symCtx = { syms, addr };
    switch (mn.kind) {
      case 'dp': case 'shift': return encodeDP(mn, ops, addr);
      case 'mem': return encodeMem(mn, ops, addr, syms, pool, poolBase);
      case 'br': return encodeBranch(mn, ops, addr);
      case 'bx': return encodeBX(mn, ops);
      case 'mul': return encodeMul(mn, ops);
      case 'mull': return encodeMull(mn, ops);
      case 'blk': return encodeBlock(mn, ops);
      case 'swi': {
        if (ops.length !== 1) throw new AsmError('SWI necesita un número');
        const n = ev(ops[0].replace(/^#/, '')) & 0xFFFFFF;
        const word = ((mn.cond << 28) | (0xF << 24) | n) >>> 0;
        return { word, fields: buildFields(word, [[31, 28, 'cond', 'cond', condNote(mn.cond)], [27, 24, '1111', 'op', 'Interrupción software'], [23, 0, 'num', 'src', 'Número de servicio: ' + H(n, 2)]]), format: 'Interrupción software', note: '', sem: { t: 'swi', cond: mn.cond, num: n } };
      }
      case 'nop': {
        const r = encodeDP({ kind: 'dp', base: 'MOV', cond: mn.cond, s: false }, ['R0', 'R0'], addr); r.note = 'NOP ≡ MOV R0, R0'; return r;
      }
    }
    throw new AsmError('Instrucción no soportada');
  }

  /* Codifica una sola línea (herramienta "codificador"). Las etiquetas se resuelven con `syms`. */
  function encodeLine(text, addr = TEXT_BASE, syms = {}) {
    try {
      let t = stripComment(text).trim();
      t = t.replace(/^[A-Za-z_.$][\w.$]*\s*:\s*/, '');
      if (!t) return { error: 'Escribe una instrucción' };
      const first = t.split(/\s+/)[0];
      const mn = parseMnemonic(first);
      if (!mn) return { error: `Instrucción desconocida «${first}»` };
      const ops = t.slice(first.length).trim();
      const pool = [];
      const r = encodeInstr(mn, ops ? splitTop(ops) : [], addr, syms, pool, addr + 4);
      return Object.assign({ hex: hex(r.word), binary: bin(r.word, 32) }, r);
    } catch (e) { return { error: e.message, hint: e.hint || '' }; }
  }

  /* --------------------------------- CPU ---------------------------------- */
  function shiftOp(type, val, amt, oldC) {
    val >>>= 0;
    switch (type) {
      case 'LSL':
        if (amt === 0) return { v: val, c: oldC };
        if (amt < 32) return { v: (val << amt) >>> 0, c: (val >>> (32 - amt)) & 1 };
        if (amt === 32) return { v: 0, c: val & 1 };
        return { v: 0, c: 0 };
      case 'LSR':
        if (amt === 0) return { v: val, c: oldC };
        if (amt < 32) return { v: val >>> amt, c: (val >>> (amt - 1)) & 1 };
        if (amt === 32) return { v: 0, c: val >>> 31 };
        return { v: 0, c: 0 };
      case 'ASR':
        if (amt === 0) return { v: val, c: oldC };
        if (amt < 32) return { v: (val >> amt) >>> 0, c: (val >>> (amt - 1)) & 1 };
        return { v: (val >>> 31) ? 0xFFFFFFFF : 0, c: val >>> 31 };
      case 'ROR': {
        if (amt === 0) return { v: val, c: oldC };
        const n = amt & 31; if (n === 0) return { v: val, c: val >>> 31 };
        const v = rotr(val, n); return { v, c: v >>> 31 };
      }
    }
    return { v: val, c: oldC };
  }
  const fmtV = v => H(v);
  const fmtD = v => { v >>>= 0; return v < 0x8000 || v > 0xFFFF8000 ? String(v | 0) : String(v); };

  class Machine {
    constructor(prog) { this.prog = prog; this.reset(); }
    reset() {
      this.mem = new Map(this.prog.image);
      this.r = new Uint32Array(16);
      this.r[13] = STACK_TOP;
      this.pc = this.prog.entry;
      this.f = { N: 0, Z: 0, C: 0, V: 0 };
      this.halted = false; this.haltReason = ''; this.haltKind = '';
      this.steps = 0; this.history = []; this.output = '';
      this.touched = new Set();
      this.lastRec = null;
      this.checkEnd();
    }
    halt(msg, kind) { this.halted = true; this.haltReason = msg; this.haltKind = kind; }
    checkEnd() {
      if (!this.halted && !this.prog.byAddr.has(this.pc)) this.halt(`El PC (${H(this.pc)}) ya no apunta a una instrucción: el programa ha terminado.`, 'end');
    }
    /* ---- memoria ---- */
    rb(a) { a >>>= 0; return this.mem.get(a) || 0; }
    wb(a, v) { a >>>= 0; if (this._undo) this._undo.push([a, this.mem.has(a) ? this.mem.get(a) : undefined]); this.mem.set(a, v & 255); this.touched.add(a & ~3); }
    rw(a) { return (this.rb(a) | (this.rb(a + 1) << 8) | (this.rb(a + 2) << 16) | (this.rb(a + 3) << 24)) >>> 0; }
    peekWord(a) { return this.rw(a & ~3); }
    ww(a, v) { for (let i = 0; i < 4; i++) this.wb(a + i, (v >>> (8 * i)) & 255); }
    /* ---- registros ---- */
    R(n, addr) { return n === 15 ? (addr + 8) >>> 0 : this.r[n]; }
    setR(n, v, rec) {
      v >>>= 0;
      if (n === 15) { this.nextPc = v & ~3; rec.branch = { from: rec.addr, to: this.nextPc }; rec.regW.push(15); return; }
      rec.regs.push({ r: n, old: this.r[n], val: v }); this.r[n] = v; rec.regW.push(n);
    }
    fault(msg, rec) { this.halt(msg, 'error'); rec.fault = msg; rec.text = msg; }
    /* ---- paso atrás ---- */
    canBack() { return this.history.length > 0; }
    back() {
      const h = this.history.pop(); if (!h) return false;
      for (let i = h.undo.length - 1; i >= 0; i--) { const [a, old] = h.undo[i]; if (old === undefined) this.mem.delete(a); else this.mem.set(a, old); }
      this.r.set(h.r); this.f = h.f; this.pc = h.pc; this.output = this.output.slice(0, h.out); this.halted = false; this.haltReason = ''; this.haltKind = '';
      this.steps--; this.lastRec = h.prevRec; this.touched = new Set(h.touched);
      return true;
    }
    /* ---- ejecución de una instrucción ---- */
    step() {
      if (this.halted) return null;
      const addr = this.pc;
      const ins = this.prog.byAddr.get(addr);
      if (!ins) { this.checkEnd(); return null; }
      const rec = { addr, ins, regs: [], regW: [], regR: [], flagsOld: Object.assign({}, this.f), flagsChanged: false, memW: [], memR: [], executed: true, branch: null, kind: ins.t, alu: false, sym: '', num: '', extra: [], text: '', fault: null };
      this.history.push({ r: this.r.slice(), f: Object.assign({}, this.f), pc: addr, undo: (this._undo = []), out: this.output.length, prevRec: this.lastRec, touched: Array.from(this.touched) });
      if (this.history.length > 20000) this.history.shift();
      this.nextPc = (addr + 4) >>> 0;
      const pass = condPass(ins.cond, this.f);
      if (!pass) {
        rec.executed = false;
        const cn = COND_NAME[ins.cond];
        const info = COND_TABLE[ins.cond];
        rec.text = `${cn} no se cumple (${flagStr(this.f)}; ${cn} necesita ${info.flags}) → la instrucción no hace nada.`;
      } else {
        try { this.exec(ins, rec); } catch (e) { this.fault('Error de ejecución: ' + e.message, rec); }
      }
      this._undo = null;
      this.steps++;
      this.pc = this.nextPc;
      this.lastRec = rec;
      if (!this.halted) {
        if (this.steps >= MAX_STEPS) this.halt(`Se han ejecutado ${MAX_STEPS.toLocaleString('es')} instrucciones sin terminar: ¿bucle infinito?`, 'limit');
        else this.checkEnd();
      }
      return rec;
    }
    exec(ins, rec) {
      const addr = ins.addr;
      switch (ins.t) {
        case 'dp': return this.execDP(ins, rec, addr);
        case 'mem': return this.execMem(ins, rec, addr);
        case 'br': {
          rec.branch = { from: addr, to: ins.target };
          if (ins.link) { this.setR(14, addr + 4, rec); rec.extra.push(`LR ← ${fmtV(addr + 4)} (dirección de retorno)`); rec.regR = []; }
          this.nextPc = ins.target;
          const name = this.labelAt(ins.target);
          rec.sym = ins.link ? `LR ← PC+4;  PC ← ${name || fmtV(ins.target)}` : `PC ← ${name || fmtV(ins.target)}`;
          rec.num = `Salto a ${fmtV(ins.target)}` + (ins.cond !== 14 ? ` (${COND_NAME[ins.cond]} se cumple)` : '');
          rec.text = (ins.link ? 'Llamada: se guarda la dirección de retorno en LR y ' : 'Salto: ') + `PC pasa a valer ${fmtV(ins.target)}${name ? ' (' + name + ')' : ''}.`;
          if (!ins.link && ins.target === addr) this.halt('Salto a sí mismo: el programa queda en un bucle infinito (se detiene aquí).', 'loop');
          return;
        }
        case 'bx': { const t = this.R(ins.rm, addr) & ~1; rec.branch = { from: addr, to: t }; rec.regR.push(ins.rm); this.nextPc = t >>> 0; rec.sym = `PC ← ${REG_LABEL(ins.rm)}`; rec.num = `PC ← ${fmtV(t)}`; rec.text = `Salto a la dirección guardada en ${REG_LABEL(ins.rm)}.`; return; }
        case 'mul': {
          const a = this.R(ins.rm, addr), b = this.R(ins.rs, addr);
          let res = Math.imul(a, b) >>> 0; rec.alu = true; rec.regR.push(ins.rm, ins.rs);
          let sym = `${REG_LABEL(ins.rd)} ← ${REG_LABEL(ins.rm)} × ${REG_LABEL(ins.rs)}`, num = `${fmtV(a)} × ${fmtV(b)}`;
          if (ins.acc) { res = (res + this.R(ins.racc, addr)) >>> 0; sym += ` + ${REG_LABEL(ins.racc)}`; rec.regR.push(ins.racc); }
          this.setR(ins.rd, res, rec); rec.num = `${num} = ${fmtV(res)} (solo los 32 bits bajos)`; rec.sym = sym;
          if (ins.s) { this.setFlags({ N: res >>> 31, Z: res === 0 ? 1 : 0 }, rec); }
          rec.text = 'Multiplicación de 32 bits: el resultado se trunca a los 32 bits menos significativos.';
          return;
        }
        case 'mull': {
          const A = BigInt(ins.signed ? this.R(ins.rm, addr) | 0 : this.R(ins.rm, addr)), B = BigInt(ins.signed ? this.R(ins.rs, addr) | 0 : this.R(ins.rs, addr));
          let P = A * B; rec.alu = true; rec.regR.push(ins.rm, ins.rs);
          if (ins.acc) { P += (BigInt(this.r[ins.rdhi]) << 32n) | BigInt(this.r[ins.rdlo]); }
          const u = BigInt.asUintN(64, P); const lo = Number(u & 0xFFFFFFFFn), hi = Number(u >> 32n);
          this.setR(ins.rdlo, lo, rec); this.setR(ins.rdhi, hi, rec);
          rec.sym = `${REG_LABEL(ins.rdhi)}:${REG_LABEL(ins.rdlo)} ← ${REG_LABEL(ins.rm)} × ${REG_LABEL(ins.rs)}`;
          rec.num = `Producto de 64 bits = 0x${hex(hi)}${hex(lo)}`;
          rec.text = `Parte baja (32 bits) en ${REG_LABEL(ins.rdlo)} y parte alta en ${REG_LABEL(ins.rdhi)}.`;
          if (ins.s) this.setFlags({ N: hi >>> 31, Z: (hi === 0 && lo === 0) ? 1 : 0 }, rec);
          return;
        }
        case 'blk': return this.execBlk(ins, rec, addr);
        case 'swi': {
          switch (ins.num) {
            case 0x11: this.halt('El programa ha terminado con SWI 0x11.', 'exit'); rec.text = 'SWI 0x11: fin del programa.'; rec.sym = 'exit'; return;
            case 0x6B: { const v = this.r[1] | 0; this.output += v + '\n'; rec.text = `SWI 0x6B: imprime R1 como entero con signo (${v}).`; rec.sym = 'print R1'; return; }
            case 0x00: { this.output += String.fromCharCode(this.r[0] & 255); rec.text = 'SWI 0x00: imprime el carácter de R0.'; return; }
            case 0x02: { let a = this.r[0], s = ''; for (let i = 0; i < 4096; i++) { const c = this.rb(a + i); if (!c) break; s += String.fromCharCode(c); } this.output += s; rec.text = 'SWI 0x02: imprime la cadena apuntada por R0.'; return; }
            default: this.fault(`SWI ${H(ins.num, 2)} no está soportada en este simulador (usa 0x11 para terminar).`, rec);
          }
          return;
        }
      }
    }
    labelAt(a) {
      const s = this.prog.symbols; for (const k of this.prog.labelNames) if (s[k] === a) return k; return '';
    }
    setFlags(o, rec) {
      const before = Object.assign({}, this.f);
      Object.assign(this.f, o);
      for (const k of ['N', 'Z', 'C', 'V']) this.f[k] = this.f[k] ? 1 : 0;
      rec.flagsChanged = ['N', 'Z', 'C', 'V'].some(k => before[k] !== this.f[k]);
      rec.flagsWritten = true;
      rec.extra.push(`Flags NZCV = ${flagStr(this.f)}`);
    }
    execDP(ins, rec, addr) {
      const op = ins.op; rec.alu = true;
      const oldC = this.f.C; let b, carry = oldC, b2sym = '';
      const o2 = ins.op2;
      if (o2.kind === 'imm') { b = o2.value >>> 0; if (o2.rot) carry = b >>> 31; b2sym = '#' + b; rec.num2 = b; }
      else {
        const rmv = this.R(o2.rm, addr); rec.regR.push(o2.rm);
        if (!o2.shift) { b = rmv; b2sym = REG_LABEL(o2.rm); }
        else {
          const sh = o2.shift; let amt;
          if (sh.rrx) { b = ((oldC << 31) | (rmv >>> 1)) >>> 0; carry = rmv & 1; b2sym = `${REG_LABEL(o2.rm)} RRX`; }
          else {
            if (sh.rs != null) { amt = this.R(sh.rs, addr) & 255; rec.regR.push(sh.rs); b2sym = `${REG_LABEL(o2.rm)} ${sh.type} ${REG_LABEL(sh.rs)}`; }
            else { amt = sh.amt; b2sym = `${REG_LABEL(o2.rm)} ${sh.type} #${sh.amt}`; }
            const r = shiftOp(sh.type, rmv, amt, oldC); b = r.v; carry = r.c;
            if (sh.rs != null) rec.extra.push(`${REG_LABEL(sh.rs)} = ${amt} → se desplaza ${amt} posiciones`);
          }
        }
      }
      let a = 0; if (!DP_MONO[op]) { a = this.R(ins.rn, addr); rec.regR.push(ins.rn); }
      let res, C = null, V = null, sym = '';
      const arith = (x, y, cin) => { const s = x + y + cin; const r = s >>> 0; C = s > 0xFFFFFFFF ? 1 : 0; V = (((x ^ r) & (y ^ r)) >>> 31) & 1; return r; };
      const nb = (~b) >>> 0, na = (~a) >>> 0;
      switch (op) {
        case 'AND': case 'TST': res = (a & b) >>> 0; sym = '&'; break;
        case 'EOR': case 'TEQ': res = (a ^ b) >>> 0; sym = 'XOR'; break;
        case 'ORR': res = (a | b) >>> 0; sym = 'OR'; break;
        case 'BIC': res = (a & nb) >>> 0; sym = 'AND NOT'; break;
        case 'MOV': res = b; break;
        case 'MVN': res = nb; break;
        case 'ADD': case 'CMN': res = arith(a, b, 0); sym = '+'; break;
        case 'ADC': res = arith(a, b, this.f.C); sym = '+ C +'; break;
        case 'SUB': case 'CMP': res = arith(a, nb, 1); sym = '−'; break;
        case 'SBC': res = arith(a, nb, this.f.C); sym = '− NOT C −'; break;
        case 'RSB': res = arith(b, na, 1); sym = '−'; break;
        case 'RSC': res = arith(b, na, this.f.C); sym = '−'; break;
      }
      res >>>= 0;
      const rdn = REG_LABEL(ins.rd), rnn = REG_LABEL(ins.rn);
      const test = !!DP_TEST[op];
      const swap = op === 'RSB' || op === 'RSC';
      if (op === 'MOV') { rec.sym = `${rdn} ← ${b2sym}`; rec.num = `${rdn} ← ${fmtV(res)} (${fmtD(res)})`; }
      else if (op === 'MVN') { rec.sym = `${rdn} ← NOT ${b2sym}`; rec.num = `NOT ${fmtV(b)} = ${fmtV(res)}`; }
      else if (test) { rec.sym = `${op}: ${rnn} ${op === 'CMP' ? '−' : op === 'CMN' ? '+' : op === 'TST' ? '&' : 'XOR'} ${b2sym} → solo flags`; rec.num = `${fmtV(a)} ${op === 'CMP' ? '−' : op === 'CMN' ? '+' : op === 'TST' ? '&' : 'XOR'} ${fmtV(b)} = ${fmtV(res)}`; }
      else if (swap) { rec.sym = `${rdn} ← ${b2sym} − ${rnn}`; rec.num = `${fmtV(b)} − ${fmtV(a)} = ${fmtV(res)} (${fmtD(res)})`; }
      else { rec.sym = `${rdn} ← ${rnn} ${sym} ${b2sym}`; rec.num = `${fmtV(a)} ${sym} ${fmtV(b)} = ${fmtV(res)} (${fmtD(res)})`; }
      if (!test) this.setR(ins.rd, res, rec);
      if (ins.s) {
        const fl = { N: res >>> 31, Z: res === 0 ? 1 : 0 };
        if (DP_LOGICAL[op]) fl.C = carry; else { fl.C = C; fl.V = V; }
        this.setFlags(fl, rec);
      }
      if (test) rec.text = `${op} calcula la operación solo para actualizar los flags; el resultado no se guarda en ningún registro.`;
      else if (op === 'MOV' && ins.rd === 15) rec.text = 'Se escribe en PC: es un salto (así se vuelve de una función con MOV PC, LR).';
      else rec.text = ins.s ? 'Como lleva S, además de calcular el resultado actualiza los flags NZCV.' : 'Sin S: el resultado se guarda pero los flags no cambian.';
    }
    execMem(ins, rec, addr) {
      const base = this.R(ins.rn, addr); rec.regR.push(ins.rn);
      let offv, offs;
      if (ins.off.type === 'imm') { offv = ins.off.v; offs = '#' + ins.off.v; }
      else {
        let rmv = this.R(ins.off.rm, addr); rec.regR.push(ins.off.rm); offs = REG_LABEL(ins.off.rm);
        if (ins.off.shift) { const sh = ins.off.shift; const r = sh.rrx ? { v: ((this.f.C << 31) | (rmv >>> 1)) >>> 0 } : shiftOp(sh.type, rmv, sh.amt, this.f.C); rmv = r.v; offs += sh.rrx ? ' RRX' : ` ${sh.type} #${sh.amt}`; }
        offv = rmv;
      }
      const withOff = (ins.u ? base + offv : base - offv) >>> 0;
      const ea = ins.p ? withOff : base;
      const size = ins.size; rec.ea = ea;
      if (size === 4 && ea % 4) return this.fault(`Acceso desalineado: ${ins.load ? 'LDR' : 'STR'} necesita una dirección múltiplo de 4 y ${fmtV(ea)} no lo es.`, rec);
      if (size === 2 && ea % 2) return this.fault(`Acceso desalineado: las medias palabras necesitan dirección par y ${fmtV(ea)} no lo es.`, rec);
      const rdn = REG_LABEL(ins.rd), rnn = REG_LABEL(ins.rn);
      const offZero = ins.off.type === 'imm' && ins.off.v === 0;
      const eaSym = ins.p ? (offZero ? rnn : `${rnn} ${ins.u ? '+' : '−'} ${offs}`) : rnn;
      const unit = size === 4 ? 'palabra' : size === 2 ? 'media palabra' : 'byte';
      const detail = ins.p ? `Dirección = ${fmtV(base)}${offZero ? '' : ' ' + (ins.u ? '+' : '−') + ' ' + fmtV(offv)} = ${fmtV(ea)}` : `Dirección = ${fmtV(ea)} (post-indexado: primero se accede con el valor actual de ${rnn})`;
      if (ins.load) {
        let v;
        if (size === 4) v = this.rw(ea); else if (size === 2) v = this.rb(ea) | (this.rb(ea + 1) << 8); else v = this.rb(ea);
        if (ins.signed) v = size === 1 ? ((v << 24) >> 24) >>> 0 : ((v << 16) >> 16) >>> 0;
        rec.memR.push({ addr: ea, size });
        rec.sym = `${rdn} ← Mem[${eaSym}]`;
        rec.num = `${detail} → ${unit}${ins.signed ? ' con signo' : ''} = ${fmtV(v)}`;
        this.setR(ins.rd, v, rec);
      } else {
        const v = this.R(ins.rd, addr); rec.regR.push(ins.rd);
        if (size === 4) this.ww(ea, v); else if (size === 2) { this.wb(ea, v); this.wb(ea + 1, v >>> 8); } else this.wb(ea, v);
        rec.memW.push({ addr: ea, size, val: size === 4 ? v : size === 2 ? v & 0xFFFF : v & 255 });
        rec.sym = `Mem[${eaSym}] ← ${rdn}`;
        rec.num = `${detail} ← ${size === 4 ? fmtV(v) : size === 2 ? '0x' + hex(v & 0xFFFF, 4) : '0x' + hex(v & 255, 2)} (${unit})`;
      }
      if (!ins.p || ins.w) {
        this.setR(ins.rn, withOff, rec);
        rec.extra.push(`${rnn} ← ${fmtV(withOff)} (${ins.p ? 'pre' : 'post'}-indexado: la base se actualiza)`);
      } else rec.extra.push(`${rnn} no cambia (direccionamiento con desplazamiento)`);
      rec.text = ins.load ? 'Carga: el dato viaja de memoria al banco de registros.' : 'Almacenamiento: el dato viaja del banco de registros a memoria.';
    }
    execBlk(ins, rec, addr) {
      const regs = regsFromMask(ins.mask); const n = regs.length; const base = this.R(ins.rn, addr); rec.regR.push(ins.rn);
      let start = ins.u ? (ins.p ? base + 4 : base) : (ins.p ? base - 4 * n : base - 4 * n + 4);
      start >>>= 0;
      if (start % 4) return this.fault(`Acceso desalineado: la dirección ${fmtV(start)} no es múltiplo de 4.`, rec);
      const wbv = (ins.u ? base + 4 * n : base - 4 * n) >>> 0;
      let a = start;
      rec.alu = false;
      regs.forEach(r => {
        if (ins.load) { const v = this.rw(a); rec.memR.push({ addr: a, size: 4 }); this.setR(r, v, rec); }
        else { const v = this.R(r, addr); rec.regR.push(r); this.ww(a, v); rec.memW.push({ addr: a, size: 4, val: v }); }
        a += 4;
      });
      if (ins.w) { this.setR(ins.rn, wbv, rec); }
      const list = regs.map(REG_LABEL).join(', ');
      if (ins.stack) {
        rec.sym = ins.load ? `POP {${list}}` : `PUSH {${list}}`;
        rec.num = ins.load ? `Se leen ${n} palabra(s) desde ${fmtV(start)}; SP ← ${fmtV(wbv)}` : `SP ← ${fmtV(wbv)}; se guardan ${n} palabra(s) desde ${fmtV(start)}`;
        rec.text = ins.load ? 'POP saca de la pila los valores (LIFO) y SP sube.' : 'PUSH guarda registros en la pila: SP baja porque la pila crece hacia direcciones menores.';
      } else {
        rec.sym = `${ins.load ? 'LDM' : 'STM'} ${REG_LABEL(ins.rn)}${ins.w ? '!' : ''}, {${list}}`;
        rec.num = `${n} palabra(s) desde ${fmtV(start)}`;
        rec.text = 'Transferencia múltiple entre registros y memoria.';
      }
      if (ins.w) rec.extra.push(`${REG_LABEL(ins.rn)} ← ${fmtV(wbv)}`);
    }
    /* Ejecuta hasta fin o hasta `max` pasos o punto de parada */
    run(max, breakpoints) {
      let n = 0; let hit = false;
      while (!this.halted && n < max) {
        if (n > 0 && breakpoints && breakpoints.has(this.pc)) { hit = true; break; }
        this.step(); n++;
      }
      return { n, hit };
    }
  }

  function flagStr(f) { return '' + f.N + f.Z + f.C + f.V; }

  return {
    TEXT_BASE, DATA_BASE, STACK_TOP, COND_TABLE, COND_NAME, DP_OPS, REG_LABEL,
    assemble, encodeLine, parseMnemonic, encodeImm, evalExpr, Machine, condPass, flagStr, shiftOp,
    H, hex, bin, parseReg, AsmError, regsFromMask
  };
});
