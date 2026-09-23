/* widgets.js — piezas interactivas reutilizables (parte 1) */
(function (root) {
  'use strict';
  const ARM = root.ARM, esc = root.Asm.esc;
  const W = {};
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const hx = (v, w = 8) => ARM.hex(v, w);
  const parseNum = s => {
    s = String(s).trim().replace(/_/g, '');
    if (/^-?0x[0-9a-f]+$/i.test(s)) return (s[0] === '-' ? -1 : 1) * parseInt(s.replace('-', ''), 16);
    if (/^0b[01]+$/i.test(s)) return parseInt(s.slice(2), 2);
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    return NaN;
  };
  W.parseNum = parseNum;

  /* ------------------- Fila de bits con campos coloreados ------------------- */
  W.bitRow = function (fields) {
    return '<div class="bitrow">' + fields.map((f, i) => {
      const n = f.hi - f.lo + 1;
      return `<div class="fld f-${f.cls}" data-i="${i}" tabindex="0" role="button" aria-label="${esc(f.name + ': ' + f.bits + '. ' + f.note)}">
        <span class="pos">${f.hi === f.lo ? f.hi : f.hi + ':' + f.lo}</span>
        <span class="bits">${f.bits.split('').map(b => `<b>${b}</b>`).join('')}</span>
        <span class="fname">${esc(f.name)}</span></div>`;
    }).join('') + '</div>';
  };
  W.bindFieldInfo = function (rowHost, fields, infoEl) {
    const show = i => { const f = fields[i]; if (!f) return; infoEl.innerHTML = `<b class="f-${f.cls}-t">${esc(f.name)}</b> <span class="mono dim">[${f.hi === f.lo ? f.hi : f.hi + ':' + f.lo}] = ${f.bits}</span> — ${esc(f.note)}`; };
    $$('.fld', rowHost).forEach(el => {
      el.addEventListener('mouseenter', () => show(+el.dataset.i));
      el.addEventListener('focus', () => show(+el.dataset.i));
      el.addEventListener('click', () => show(+el.dataset.i));
    });
    const d = fields.findIndex(f => f.name === 'cmd' || f.name === 'L' || f.name === 'op'); show(d >= 0 ? 0 : 0);
  };

  /* --------------------------- Codificador de línea --------------------------- */
  W.encoder = function (host, opts) {
    opts = opts || {};
    const addr = opts.addr != null ? opts.addr : 0x1010;
    const examples = opts.examples || ['ADD R1, R2, R3', 'SUB R8, R9, #4', 'MOV R1, R2, LSL #2', 'LDR R5, [R0, #4]', 'STR R11, [R5, #-26]', 'BLT bucle', 'ADDEQ R0, R1, R2'];
    host.classList.add('enc');
    host.innerHTML = `<div class="enc-in"><input type="text" spellcheck="false" autocomplete="off" aria-label="Instrucción ARM a codificar" value="${esc(opts.value || examples[0])}"><div class="chips">${examples.map(e => `<button type="button" class="chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>
      <div class="enc-out"><div class="enc-head"><span class="enc-hex" aria-live="polite"></span><span class="enc-fmt"></span></div><div class="enc-row"></div><p class="enc-info"></p><p class="enc-note"></p></div>`;
    const input = $('input', host), hexEl = $('.enc-hex', host), fmt = $('.enc-fmt', host), row = $('.enc-row', host), info = $('.enc-info', host), note = $('.enc-note', host);
    let lastFields = null;
    function encode(text) {
      let syms = {}, r;
      for (let k = 0; k < 4; k++) {
        r = ARM.encodeLine(text, addr, syms);
        const m = r.error && r.error.match(/^Símbolo desconocido «(.+)»/);
        if (m) syms[m[1]] = 0x1000; else break;
      }
      return { r, syms };
    }
    function update() {
      const { r, syms } = encode(input.value);
      host.classList.toggle('bad', !!r.error);
      if (r.error) {
        hexEl.textContent = '········'; fmt.textContent = ''; row.innerHTML = ''; info.textContent = '';
        note.innerHTML = `<span class="c-alert">${esc(r.error)}</span>${r.hint ? ' ' + esc(r.hint) : ''}`; return;
      }
      lastFields = r.fields;
      hexEl.innerHTML = `<span class="pre">0x</span>${r.hex}`;
      fmt.textContent = 'Formato: ' + r.format;
      row.innerHTML = W.bitRow(r.fields);
      W.bindFieldInfo(row, r.fields, info);
      const extra = Object.keys(syms).length ? `La etiqueta «${Object.keys(syms)[0]}» se ha supuesto en 0x00001000 y esta instrucción en ${ARM.H(addr)}. ` : '';
      note.textContent = extra + (r.note || '');
    }
    input.addEventListener('input', update);
    host.addEventListener('click', e => { const c = e.target.closest('[data-ex]'); if (c) { input.value = c.dataset.ex; update(); if (opts.onUser) opts.onUser(); } });
    input.addEventListener('focus', () => { if (opts.onUser) opts.onUser(); });
    update();
    return { set(t) { input.value = t; update(); }, input, update };
  };

  /* --------------------- Laboratorio de bits (lógicas y shifts) ------------------- */
  W.bitsHTML = function (v, opts) {
    opts = opts || {};
    let h = '<span class="bl-bits">';
    for (let i = 31; i >= 0; i--) {
      const on = (v >>> i) & 1;
      const cls = 'b' + on + (opts.mark && opts.mark.has(i) ? ' chg' : '') + (opts.carry === i ? ' cy' : '');
      h += `<i class="${cls}" title="bit ${i}">${on}</i>` + (i % 8 === 0 && i ? '<em></em>' : '');
    }
    return h + '</span>';
  };
  W.bitLab = function (host, opts) {
    opts = opts || {};
    const OPS = ['AND', 'ORR', 'EOR', 'BIC', 'MVN', 'LSL', 'LSR', 'ASR', 'ROR', 'ADD', 'SUB'];
    host.classList.add('lab');
    host.innerHTML = `<div class="lab-ctl">
      <label>Registro A <input type="text" class="mono" data-k="a" value="0x0FAFF0C3" size="12" aria-label="Valor del registro A"></label>
      <label>Operación <select data-k="op">${OPS.map(o => `<option>${o}</option>`).join('')}</select></label>
      <label data-k-wrap="b"><span class="lb">Registro B</span> <input type="text" class="mono" data-k="b" value="0xB4D6B268" size="12" aria-label="Valor del segundo operando"></label>
      <span class="chips"><button type="button" class="chip" data-preset="7">Ejercicio 7: R7 y R3</button><button type="button" class="chip" data-preset="mask">Máscara de bits</button></span></div>
      <div class="lab-rows"></div><p class="lab-txt" aria-live="polite"></p>`;
    const A = $('[data-k=a]', host), B = $('[data-k=b]', host), OP = $('[data-k=op]', host), rows = $('.lab-rows', host), txt = $('.lab-txt', host), lb = $('.lb', host);
    OP.value = opts.op || 'AND';
    function calc() {
      const op = OP.value; const a = parseNum(A.value) >>> 0; let b = parseNum(B.value); const shift = ['LSL', 'LSR', 'ASR', 'ROR'].includes(op); const mono = op === 'MVN';
      $('[data-k-wrap=b]', host).style.visibility = mono ? 'hidden' : 'visible';
      lb.textContent = shift ? 'Posiciones' : 'Registro B';
      if (isNaN(a) || (!mono && isNaN(b))) { rows.innerHTML = ''; txt.textContent = 'Escribe números válidos (decimal o 0x…).'; return; }
      b = mono ? 0 : (b >>> 0);
      let res, carry = null, msg = '', lab = op;
      switch (op) {
        case 'AND': res = (a & b) >>> 0; msg = 'AND: cada bit del resultado vale 1 solo si ambos bits valen 1. Sirve para poner bits a 0 con una máscara.'; break;
        case 'ORR': res = (a | b) >>> 0; msg = 'ORR: el bit resultante vale 1 si alguno de los dos vale 1. Sirve para poner bits a 1.'; break;
        case 'EOR': res = (a ^ b) >>> 0; msg = 'EOR (XOR): 1 cuando los bits son distintos. Sirve para invertir bits concretos.'; break;
        case 'BIC': res = (a & ~b) >>> 0; msg = 'BIC: pone a 0 los bits de A que valen 1 en B (A AND NOT B).'; break;
        case 'MVN': res = (~a) >>> 0; msg = 'MVN: mueve el complemento a uno (NOT) de A.'; break;
        case 'ADD': res = (a + b) >>> 0; msg = 'ADD: suma entera de 32 bits.'; break;
        case 'SUB': res = (a - b) >>> 0; msg = 'SUB: resta entera de 32 bits.'; break;
        default: {
          const n = Math.max(0, Math.min(255, b));
          const r = ARM.shiftOp(op, a, n, 0); res = r.v; carry = n ? (n <= 32 || op === 'ROR' ? (op === 'LSL' ? (n <= 32 ? 32 - n : null) : op === 'ROR' ? 31 : n - 1) : null) : null;
          if (op === 'ROR') { msg = 'ROR: rotación a la derecha; los bits que salen por la derecha entran por la izquierda.'; carry = null; }
          if (op === 'LSL') msg = `LSL #${n}: desplaza a la izquierda y rellena con ceros. Equivale a multiplicar por 2^${n} = ${Math.pow(2, n)} (si no hay desbordamiento).`;
          if (op === 'LSR') msg = `LSR #${n}: desplaza a la derecha rellenando con ceros (sin signo). Equivale a dividir entre 2^${n} = ${Math.pow(2, n)} (división entera sin signo).`;
          if (op === 'ASR') msg = `ASR #${n}: desplaza a la derecha copiando el bit de signo (con signo). Equivale a dividir entre 2^${n} = ${Math.pow(2, n)} con signo (redondea hacia −∞).`;
          lab = op + ' #' + n; b = n;
        }
      }
      const mark = new Set(); for (let i = 0; i < 32; i++) if (((res >>> i) & 1) !== ((a >>> i) & 1)) mark.add(i);
      rows.innerHTML = `<div class="lab-row"><span class="rl">A</span>${W.bitsHTML(a)}<span class="rv mono">${ARM.H(a)}</span></div>` +
        (mono ? '' : `<div class="lab-row"><span class="rl">${['LSL', 'LSR', 'ASR', 'ROR'].includes(op) ? 'n' : 'B'}</span>${['LSL', 'LSR', 'ASR', 'ROR'].includes(op) ? `<span class="rn mono">${b} posiciones</span>` : W.bitsHTML(b)}<span class="rv mono">${['LSL', 'LSR', 'ASR', 'ROR'].includes(op) ? '' : ARM.H(b)}</span></div>`) +
        `<div class="lab-row res"><span class="rl">=</span>${W.bitsHTML(res, { mark })}<span class="rv mono">${ARM.H(res)}</span></div>`;
      txt.innerHTML = `<b>${lab}</b> → ${ARM.H(res)} · sin signo ${res} · con signo ${res | 0}<br>${msg}`;
    }
    [A, B, OP].forEach(e => e.addEventListener('input', calc));
    host.addEventListener('click', e => {
      const c = e.target.closest('[data-preset]'); if (!c) return;
      if (c.dataset.preset === '7') { A.value = '0x0FAFF0C3'; B.value = '0xB4D6B268'; }
      else { A.value = '0xDEADBEEF'; B.value = '0x0000FFFF'; }
      if (['LSL', 'LSR', 'ASR', 'ROR'].includes(OP.value)) B.value = '9';
      calc();
    });
    OP.addEventListener('change', () => { if (['LSL', 'LSR', 'ASR', 'ROR'].includes(OP.value) && !/^\d{1,2}$/.test(B.value.trim())) B.value = '9'; if (!['LSL', 'LSR', 'ASR', 'ROR'].includes(OP.value) && /^\d{1,2}$/.test(B.value.trim())) B.value = '0xB4D6B268'; calc(); });
    calc();
  };

  /* ------------------------- Flags y condiciones ------------------------- */
  const subFlags = (a, b) => { a >>>= 0; b >>>= 0; const nb = (~b) >>> 0; const s = a + nb + 1; const r = s >>> 0; return { N: r >>> 31, Z: r === 0 ? 1 : 0, C: s > 0xFFFFFFFF ? 1 : 0, V: (((a ^ r) & (nb ^ r)) >>> 31) & 1 }; };
  W.subFlags = subFlags;
  W.flagsLab = function (host) {
    host.classList.add('lab');
    const T = ARM.COND_TABLE;
    host.innerHTML = `<div class="lab-ctl"><label>A <input type="text" class="mono" data-k="a" value="5" size="12" aria-label="Valor A"></label><label>B <input type="text" class="mono" data-k="b" value="7" size="12" aria-label="Valor B"></label>
      <span class="mono dim">CMP A, B  calcula  A − B</span><span class="chips"><button type="button" class="chip" data-pre="5,7">5 y 7</button><button type="button" class="chip" data-pre="7,7">7 y 7</button><button type="button" class="chip" data-pre="-1,1">−1 y 1</button><button type="button" class="chip" data-pre="0x80000000,1">0x80000000 y 1</button></span></div>
      <div class="flag-out"><div class="flags"></div><div class="conds"></div></div><p class="lab-txt"></p>
      <p class="dim small">También puedes pulsar cada flag para cambiarlo a mano y ver qué condiciones se cumplirían.</p>`;
    const A = $('[data-k=a]', host), B = $('[data-k=b]', host), fl = $('.flags', host), cd = $('.conds', host), txt = $('.lab-txt', host);
    let F = { N: 0, Z: 0, C: 0, V: 0 };
    function paint(explain) {
      fl.innerHTML = ['N', 'Z', 'C', 'V'].map(k => `<button type="button" class="flag ${F[k] ? 'on' : ''}" data-f="${k}" aria-pressed="${!!F[k]}" title="${{ N: 'Negativo', Z: 'Cero', C: 'Carry (acarreo)', V: 'Overflow (desbordamiento)' }[k]}"><span>${k}</span><b>${F[k]}</b></button>`).join('');
      cd.innerHTML = T.map(c => { const ok = ARM.condPass(c.code, F); return `<div class="cnd ${ok ? 'ok' : ''}" title="${esc(c.name + ': ' + c.flags)}"><b>${c.mn}${c.alt ? '/' + c.alt : ''}</b><span>${c.flags}</span></div>`; }).join('');
      if (explain) txt.innerHTML = explain;
    }
    function calc() {
      const a = parseNum(A.value), b = parseNum(B.value); if (isNaN(a) || isNaN(b)) { txt.textContent = 'Escribe números válidos.'; return; }
      F = subFlags(a, b);
      const sa = a | 0, sb = b | 0, ua = a >>> 0, ub = b >>> 0;
      paint(`<b>${sa} − ${sb}</b> = ${(sa - sb) | 0} (${ARM.H((ua - ub) >>> 0)}). Con signo: A ${sa > sb ? '>' : sa < sb ? '<' : '='} B (${sa > sb ? 'GT' : sa < sb ? 'LT' : 'EQ'}). Sin signo: A ${ua > ub ? '>' : ua < ub ? '<' : '='} B (${ua > ub ? 'HI' : ua < ub ? 'LO' : 'EQ'}). Fíjate: <b>GE/LT/GT/LE</b> comparan con signo (usan N y V) y <b>HI/LS/HS/LO</b> sin signo (usan C).`);
    }
    fl.addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (!b) return; F[b.dataset.f] = F[b.dataset.f] ? 0 : 1; paint('Flags modificados a mano: NZCV = ' + F.N + F.Z + F.C + F.V + '.'); });
    host.addEventListener('click', e => { const c = e.target.closest('[data-pre]'); if (c) { const [x, y] = c.dataset.pre.split(','); A.value = x; B.value = y; calc(); } });
    A.addEventListener('input', calc); B.addEventListener('input', calc); calc();
  };

  /* ----------------------------- Endianness ----------------------------- */
  W.endianLab = function (host) {
    host.classList.add('lab');
    host.innerHTML = `<div class="lab-ctl"><label>Palabra de 32 bits <input type="text" class="mono" value="0x0A0B0C0D" size="12" aria-label="Palabra de 32 bits"></label><label>Dirección <input type="text" class="mono" value="0x00002000" size="12" aria-label="Dirección base"></label></div><div class="endian-out"></div><p class="lab-txt"></p>`;
    const [vi, ai] = $$('input', host), out = $('.endian-out', host), txt = $('.lab-txt', host);
    function calc() {
      const v = parseNum(vi.value) >>> 0, a = (parseNum(ai.value) >>> 0) & ~3; if (isNaN(v) || isNaN(a)) return;
      const by = [24, 16, 8, 0].map(s => (v >>> s) & 255); // MSB..LSB
      const le = [by[3], by[2], by[1], by[0]], be = by;
      const strip = (arr, name, cls) => `<div class="endian ${cls}"><span class="en-n">${name}</span>${arr.map((b, i) => `<div class="mc"><span class="ad">${ARM.H(a + i)}</span><b>${hx(b, 2)}</b></div>`).join('')}</div>`;
      out.innerHTML = strip(le, 'Little-endian (ARM)', 'le') + strip(be, 'Big-endian', 'be');
      txt.innerHTML = `En little-endian, <b>STR</b> de ${ARM.H(v)} deja en la dirección más baja (${ARM.H(a)}) el byte menos significativo <b>${hx(v & 255, 2)}</b>. Por eso <code>LDRB R1,[R0]</code> cargaría ${ARM.H(v & 255, 2)} y no ${ARM.H(by[0], 2)}.`;
    }
    vi.addEventListener('input', calc); ai.addEventListener('input', calc); calc();
  };

  /* ---------------------- Modos de indexación de LDR/STR ---------------------- */
  W.indexLab = function (host) {
    host.classList.add('lab');
    const MODES = [
      { id: 'off', label: 'Offset', txt: 'LDR R2, [R0, #8]', use: b => b + 8, after: b => b, note: 'Se usa R0 + 8 como dirección. R0 no cambia.' },
      { id: 'pre', label: 'Pre-indexado', txt: 'LDR R2, [R0, #8]!', use: b => b + 8, after: b => b + 8, note: 'Primero se calcula R0 + 8, se usa como dirección y R0 se actualiza (el «!» es la clave).' },
      { id: 'post', label: 'Post-indexado', txt: 'LDR R2, [R0], #8', use: b => b, after: b => b + 8, note: 'Se usa R0 como dirección y después R0 ← R0 + 8. Los corchetes se cierran antes del desplazamiento.' },
      { id: 'reg', label: 'Registro con shift', txt: 'LDR R2, [R0, R1, LSL #2]', use: (b, r1) => b + (r1 << 2), after: b => b, note: 'La dirección es R0 + (R1 << 2): indexa un array de palabras con R1 = índice. R0 no cambia.' }
    ];
    host.innerHTML = `<div class="lab-ctl"><span class="seg" role="group" aria-label="Modo de indexación">${MODES.map((m, i) => `<button type="button" data-m="${m.id}" aria-pressed="${i === 0}">${m.label}</button>`).join('')}</span><label>R0 <input class="mono" size="10" value="0x00002000" aria-label="Valor de R0"></label><label>R1 <input class="mono" size="4" value="3" aria-label="Valor de R1"></label></div>
      <div class="idx-code mono"></div><div class="idx-mem"></div><p class="lab-txt"></p>`;
    let mode = 'off'; const r0i = $$('input', host)[0], r1i = $$('input', host)[1], code = $('.idx-code', host), mem = $('.idx-mem', host), txt = $('.lab-txt', host);
    function paint() {
      const m = MODES.find(x => x.id === mode); const b = (parseNum(r0i.value) >>> 0) & ~3, r1 = parseNum(r1i.value) | 0; if (isNaN(b)) return;
      const use = (m.use(b, r1)) >>> 0, aft = m.after(b) >>> 0;
      code.innerHTML = root.Asm.hlLine(m.txt);
      const words = []; for (let i = 0; i < 8; i++) words.push(b + 4 * i);
      const lo = Math.min(b, use, aft) - 0, hi = Math.max(b, use, aft);
      const start = Math.min(b, use, aft) - (Math.min(b, use, aft) === b ? 0 : 0);
      const cells = []; const first = Math.min(b, use) & ~3; const n = Math.max(8, ((Math.max(use, aft) - first) >> 2) + 2); for (let i = 0; i < Math.min(n, 12); i++) cells.push(first + 4 * i);
      mem.innerHTML = cells.map(a => `<div class="mw"><span class="ad">${ARM.H(a, 8)}</span><span class="tags">${a === use ? '<em class="t-use">dirección usada</em>' : ''}${a === b ? '<em class="t-r0">R0 antes</em>' : ''}${a === aft && aft !== b ? '<em class="t-aft">R0 después</em>' : ''}${a === aft && aft === b ? '<em class="t-aft">R0 después (igual)</em>' : ''}</span></div>`).join('');
      txt.innerHTML = `<b>Dirección de acceso:</b> ${ARM.H(use)} · <b>R0 después:</b> ${ARM.H(aft)}<br>${m.note}`;
    }
    host.addEventListener('click', e => { const bt = e.target.closest('[data-m]'); if (!bt) return; mode = bt.dataset.m; $$('[data-m]', host).forEach(x => x.setAttribute('aria-pressed', x === bt)); paint(); });
    r0i.addEventListener('input', paint); r1i.addEventListener('input', paint); paint();
  };

  /* ------------------------------ Mini simulador ------------------------------ */
  W.miniSim = function (host, opts) {
    const src = opts.code.replace(/^\n+|\s+$/g, '');
    const prog = ARM.assemble(src);
    host.classList.add('mini');
    if (!prog.ok) { host.innerHTML = `<p class="c-alert">Error en el ejemplo: ${esc(prog.errors[0].msg)}</p>`; return; }
    const m = new ARM.Machine(prog);
    const lines = src.split('\n');
    const watch = opts.watch || [0, 1, 2, 3];
    host.innerHTML = `<div class="mini-code">${lines.map((l, i) => `<div class="ml" data-l="${i + 1}"><span class="mn">${i + 1}</span><code>${root.Asm.hlLine(l) || '&#8203;'}</code></div>`).join('')}</div>
      <div class="mini-side"><div class="btn-row"><button class="btn sm go" type="button" data-a="step">Paso</button><button class="btn sm ghost" type="button" data-a="back">Atrás</button><button class="btn sm ghost" type="button" data-a="reset">Reiniciar</button><button class="btn sm ghost" type="button" data-a="run">Hasta el final</button>${opts.sim === false ? '' : '<button class="btn sm ghost" type="button" data-a="open">Abrir en el simulador</button>'}</div>
      <div class="mini-regs"></div><div class="mini-flags"></div><p class="mini-exp" aria-live="polite"></p></div>`;
    const regsEl = $('.mini-regs', host), flEl = $('.mini-flags', host), exp = $('.mini-exp', host);
    let changed = new Set();
    const lineOf = a => { const i = prog.byAddr.get(a); return i ? i.line : 0; };
    function paint(rec) {
      regsEl.innerHTML = watch.map(n => `<div class="rg ${changed.has(n) ? 'chg' : ''}"><span>${ARM.REG_LABEL(n)}</span><b class="mono">${hx(m.r[n], opts.wide ? 8 : 8)}</b></div>`).join('') + (opts.showPC ? `<div class="rg pc"><span>PC</span><b class="mono">${hx(m.pc)}</b></div>` : '');
      flEl.innerHTML = opts.flags === false ? '' : ['N', 'Z', 'C', 'V'].map(k => `<span class="flag sm ${m.f[k] ? 'on' : ''}"><span>${k}</span><b>${m.f[k]}</b></span>`).join('');
      $$('.ml', host).forEach(e => { e.classList.toggle('cur', !m.halted && +e.dataset.l === lineOf(m.pc)); e.classList.toggle('done', false); });
      if (rec) exp.innerHTML = `<span class="mono c-ice">${esc(rec.ins.src)}</span><br>${rec.executed ? `<b>${esc(rec.sym)}</b><br><span class="mono dim">${esc(rec.num)}</span>` : esc(rec.text)}`;
      else if (m.halted) exp.textContent = m.haltReason;
      else exp.textContent = 'Pulsa «Paso» para ejecutar la instrucción marcada.';
    }
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'step') { const r = m.step(); changed = new Set(r ? r.regs.map(x => x.r) : []); paint(r); if (m.halted) exp.innerHTML += `<br><span class="c-mint">${esc(m.haltReason)}</span>`; }
      else if (a === 'back') { if (m.back()) { changed = new Set(); paint(m.lastRec); } }
      else if (a === 'reset') { m.reset(); changed = new Set(); paint(); }
      else if (a === 'run') { const before = m.r.slice(); m.run(100000); changed = new Set(); for (let i = 0; i < 16; i++) if (before[i] !== m.r[i]) changed.add(i); paint(m.lastRec); exp.innerHTML += `<br><span class="c-mint">${esc(m.haltReason)}</span>`; }
      else if (a === 'open') root.App.openSim(src);
    });
    paint();
  };

  /* ------------------------------ Traductor 1.3 ------------------------------ */
  W.translator = function (host) {
    const SN = [
      { c: 'a = b + c - d;', note: 'a→R1, b→R2, c→R3, d→R4', asm: 'ADD R1, R2, R3\nSUB R1, R1, R4' },
      { c: 'f = x * 8;', note: 'f→R0, x→R1: multiplicar por 2³ es desplazar 3 bits', asm: 'MOV R0, R1, LSL #3' },
      { c: 'if (i == j) f = g + h;', note: 'f→R0, g→R1, h→R2, i→R3, j→R4', asm: 'CMP R3, R4\nBNE FIN\nADD R0, R1, R2\nFIN' },
      { c: 'array[i] = array[i] + 1;', note: 'base del array→R0, i→R1', asm: 'LDR R2, [R0, R1, LSL #2]\nADD R2, R2, #1\nSTR R2, [R0, R1, LSL #2]' }
    ];
    host.classList.add('lab');
    host.innerHTML = `<div class="lab-ctl"><span class="seg" role="group" aria-label="Fragmento en alto nivel">${SN.map((s, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(s.c)}</button>`).join('')}</span></div><div class="tr-out"></div>`;
    const out = $('.tr-out', host);
    function paint(i) {
      const s = SN[i]; const p = ARM.assemble(s.asm);
      const rows = p.listing.map(l => `<tr data-a="${l.addr}"><td class="mono c-copper">${ARM.H(l.addr)}</td><td class="mono">${root.Asm.hlLine(l.src)}</td><td class="mono c-violet">${hx(l.word)}</td></tr>`).join('');
      out.innerHTML = `<div class="tr-grid"><div class="tr-col"><h4>Alto nivel</h4><pre class="tr-c">${esc(s.c)}</pre><p class="small dim">${esc(s.note)}</p></div>
        <div class="tr-arrow" aria-hidden="true"><span>compilador</span></div>
        <div class="tr-col"><h4>Ensamblador y lenguaje máquina</h4><table class="tbl"><thead><tr><th>Dirección</th><th>Ensamblador</th><th>Lenguaje máquina</th></tr></thead><tbody>${rows}</tbody></table></div></div>
        <p class="small dim">Cada instrucción ensamblador se convierte en una palabra de 32 bits. Pulsa una fila para ver sus campos.</p><div class="tr-fields"></div>`;
      $$('tbody tr', out).forEach(tr => tr.addEventListener('click', () => {
        const l = p.listing.find(x => x.addr === +tr.dataset.a); if (!l) return;
        $$('tbody tr', out).forEach(r => r.classList.toggle('sel', r === tr));
        const box = $('.tr-fields', out); box.innerHTML = W.bitRow(l.ins.fields) + '<p class="enc-info"></p>'; W.bindFieldInfo(box, l.ins.fields, $('.enc-info', box));
      }));
    }
    host.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; $$('[data-i]', host).forEach(x => x.setAttribute('aria-pressed', x === b)); paint(+b.dataset.i); });
    paint(0);
  };

  /* ------------------------------- Pila (push/pop) ------------------------------- */
  W.stackDemo = function (host) {
    host.classList.add('lab');
    host.innerHTML = `<div class="btn-row"><button class="btn sm go" data-a="push" type="button">PUSH {R4, R8, R9}</button><button class="btn sm warn" data-a="pop" type="button">POP {R4, R8, R9}</button><button class="btn sm ghost" data-a="rand" type="button">Cambiar los registros</button><button class="btn sm ghost" data-a="reset" type="button">Reiniciar</button></div>
      <div class="stack-wrap"><div class="stack-regs"></div><div class="stack-mem"></div></div><p class="lab-txt" aria-live="polite"></p>`;
    const TOP = 0x20200000; let sp, R, mem, msg;
    const init = () => { sp = TOP; R = { R4: 0x11111111, R8: 0x88888888, R9: 0x99999999 }; mem = new Map(); msg = 'La pila crece hacia direcciones menores: cada PUSH resta 4 bytes a SP por cada registro.'; };
    const regsEl = $('.stack-regs', host), memEl = $('.stack-mem', host), txt = $('.lab-txt', host);
    function paint() {
      regsEl.innerHTML = Object.keys(R).map(k => `<div class="rg"><span>${k}</span><b class="mono">${hx(R[k])}</b></div>`).join('') + `<div class="rg sp"><span>SP</span><b class="mono">${hx(sp)}</b></div>`;
      let cells = ''; const addrs = []; for (let a = TOP - 4; a >= Math.min(sp, TOP - 12) - 4 && addrs.length < 6; a -= 4) addrs.push(a);
      cells = addrs.map(a => `<div class="sw ${a === sp ? 'sp' : ''} ${mem.has(a) ? 'full' : ''}"><span class="ad">${ARM.H(a)}</span><b class="mono">${mem.has(a) ? hx(mem.get(a)) : '········'}</b>${a === sp ? '<em>← SP</em>' : ''}</div>`).join('');
      memEl.innerHTML = `<div class="sw top"><span class="ad">${ARM.H(TOP)}</span><i>base de la pila (direcciones altas)</i></div>` + cells + '<div class="sw more"><i>direcciones más bajas ↓</i></div>';
      txt.textContent = msg;
    }
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
      if (a === 'push') { if (sp - 12 < TOP - 40) { msg = 'La demo llega hasta 10 palabras; pulsa Reiniciar.'; } else { sp -= 12; mem.set(sp, R.R4); mem.set(sp + 4, R.R8); mem.set(sp + 8, R.R9); msg = 'PUSH: SP ← SP − 12 y los registros se guardan en orden creciente de direcciones (R4 en la más baja).'; } }
      else if (a === 'pop') { if (sp >= TOP) msg = 'La pila está vacía: hacer POP ahora sería un error (desapilar algo que no se apiló).'; else { R.R4 = mem.get(sp); R.R8 = mem.get(sp + 4); R.R9 = mem.get(sp + 8); mem.delete(sp); mem.delete(sp + 4); mem.delete(sp + 8); sp += 12; msg = 'POP: los registros recuperan sus valores y SP ← SP + 12. Así una función deja los registros como los encontró.'; } }
      else if (a === 'rand') { for (const k in R) R[k] = (Math.random() * 0xFFFFFFFF) >>> 0; msg = 'Registros modificados (como haría la función invocada). Prueba POP para recuperar los guardados.'; }
      else init();
      paint();
    });
    init(); paint();
  };

  root.Widgets = W;
})(window);
