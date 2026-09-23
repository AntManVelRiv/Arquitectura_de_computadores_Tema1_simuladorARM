/* sim.js — vista del simulador: editor, listado, registros, memoria, traza y camino de datos */
(function (root) {
  'use strict';
  const App = root.App, ARM = root.ARM, Ex = root.Examples, W = root.Widgets;
  const esc = root.Asm.esc, $ = App.$, $$ = App.$$;
  const hx = (v, w = 8) => ARM.hex(v, w);
  const ROLE = ['arg / resultado', 'arg', 'arg', 'arg', 'preservar', 'preservar', 'preservar', 'preservar', 'preservar', 'preservar', 'preservar', 'preservar', 'temporal', 'SP pila', 'LR retorno', 'PC'];
  const SPEEDS = { slow: [1100, 1, 420], normal: [260, 1, 200], fast: [40, 4, 0], max: [0, 400, 0] };

  function html() {
    const groups = {}; Ex.list.forEach(e => (groups[e.group] = groups[e.group] || []).push(e));
    const opts = Object.keys(groups).map(g => `<optgroup label="${esc(g)}">${groups[g].map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}</optgroup>`).join('');
    return `<header class="view-head sim-head"><h1>Simulador ARM</h1><p class="lede">Escribe ensamblador ARMv4, ejecútalo instrucción a instrucción y mira qué cambia en registros, flags y memoria. Puedes volver atrás.</p></header>
    <div class="sim">
      <div class="sim-bar panel tight">
        <label class="sim-ex">Ejemplo <select id="sim-ex" aria-label="Elegir un programa de ejemplo"><option value="">Mi programa</option>${opts}</select></label>
        <div class="btn-row sim-ctl">
          <button class="btn go" type="button" id="sim-run" title="Ejecutar / pausar (F5)">Ejecutar</button>
          <button class="btn" type="button" id="sim-step" title="Una instrucción (F10)">Paso</button>
          <button class="btn ghost" type="button" id="sim-back" title="Deshacer la última instrucción (Alt + ←)">Atrás</button>
          <button class="btn ghost" type="button" id="sim-reset" title="Volver al inicio (Mayús + F5)">Reiniciar</button>
        </div>
        <label class="sim-speed">Velocidad <select id="sim-speed" aria-label="Velocidad de ejecución"><option value="slow">Lenta (con animación)</option><option value="normal" selected>Normal</option><option value="fast">Rápida</option><option value="max">Máxima</option></select></label>
        <button class="btn ghost sm sim-wide" type="button" id="sim-wide" title="Oculta el menú lateral para tener más espacio">Ampliar</button>
        <span class="sim-status" id="sim-status" role="status" aria-live="polite">Listo</span>
      </div>
      <div class="sim-grid">
        <section class="panel sim-editor" aria-label="Editor de código">
          <div class="panel-title"><span>Programa</span><span class="grow"></span>
            <button class="btn ghost sm" type="button" id="sim-dl">Descargar .s</button><label class="btn ghost sm" for="sim-up">Cargar…</label><input id="sim-up" type="file" accept=".s,.asm,.txt" hidden></div>
          <div id="sim-ed" class="sim-ed"></div>
          <div class="sim-errs" id="sim-errs" hidden></div>
        </section>
        <section class="panel sim-listing" aria-label="Código máquina">
          <div class="panel-title"><span>Código máquina</span><span class="dim small">clic en el punto = parada</span></div>
          <div class="listing-wrap"><table class="listing" id="sim-list"><thead><tr><th></th><th>Dirección</th><th>Hex</th><th>Instrucción</th></tr></thead><tbody></tbody></table><p class="listing-empty dim">Ensambla el programa (pulsa Paso o Ejecutar) para ver aquí las direcciones y el código máquina de cada instrucción.</p></div>
        </section>
        <section class="panel sim-regs" aria-label="Registros">
          <div class="panel-title"><span>Registros</span><span class="grow"></span><span class="seg" role="group" aria-label="Formato"><button type="button" data-fmt="hex" aria-pressed="true">Hex</button><button type="button" data-fmt="dec" aria-pressed="false">Dec</button></span></div>
          <div class="regs" id="sim-regs"></div>
          <div class="reg-detail" id="sim-rdet"></div>
          <div class="flags-row"><div class="flags" id="sim-flags"></div><div class="conds-live" id="sim-conds" aria-label="Condiciones que se cumplen ahora"></div></div>
        </section>
        <section class="panel sim-step" aria-label="Instrucción actual">
          <div class="panel-title"><span id="sim-cur-title">Siguiente instrucción</span><span class="grow"></span><button class="btn ghost sm" type="button" id="sim-follow" hidden>Volver a la instrucción del PC</button></div>
          <div class="step-body">
            <div class="step-info">
              <div class="step-instr mono" id="sim-cur"></div>
              <div id="sim-fields" class="step-fields"></div><p class="enc-info" id="sim-finfo"></p>
              <div class="step-last panel tight flat" id="sim-last" aria-live="polite"></div>
            </div>
            <div class="step-dg"><div id="sim-dg"></div><p class="stage-txt" id="sim-stage" aria-live="polite"></p></div>
          </div>
        </section>
        <section class="panel sim-mem" aria-label="Memoria">
          <div class="tabs-wrap"><div class="tabs" role="tablist" aria-label="Zonas de memoria"><button role="tab" data-tab="data" type="button">Datos</button><button role="tab" data-tab="stack" type="button">Pila</button><button role="tab" data-tab="code" type="button">Código</button><button role="tab" data-tab="addr" type="button">Ir a…</button></div>
            <div data-panel="data" class="mem-panel"></div><div data-panel="stack" class="mem-panel" hidden></div><div data-panel="code" class="mem-panel" hidden></div>
            <div data-panel="addr" class="mem-panel" hidden><label class="mem-go">Dirección <input type="text" class="mono" id="sim-addr" value="0x00002000" size="12" aria-label="Dirección de memoria"></label><div id="sim-addr-out"></div></div></div>
        </section>
        <section class="panel sim-log" aria-label="Traza y salida">
          <div class="tabs-wrap"><div class="tabs" role="tablist" aria-label="Traza y salida"><button role="tab" data-tab="trace" type="button">Traza</button><button role="tab" data-tab="out" type="button">Salida</button></div>
            <div data-panel="trace" class="log-panel" id="sim-trace"></div><div data-panel="out" class="log-panel mono" id="sim-out" hidden></div></div>
        </section>
      </div>
      <p class="sim-help small dim">Atajos: <kbd>F10</kbd> paso · <kbd>F5</kbd> ejecutar/pausar · <kbd>Mayús</kbd>+<kbd>F5</kbd> reiniciar · <kbd>Alt</kbd>+<kbd>←</kbd> atrás. Termina con <code>SWI 0x11</code>, saltando a sí mismo (<code>B .</code>) o saliendo del código. <code>SWI 0x6B</code> imprime R1.</p>
    </div>`;
  }

  function init(rootEl) {
    const S = { prog: null, m: null, dirty: true, run: null, fmt: 'hex', sel: -1, selAddr: null, bpLines: new Set(), bpAddrs: new Set(), trace: [], changed: new Set(), flash: new Set(), lastRec: null, anim: true };
    const el = id => $('#' + id, rootEl);
    const ed = new root.AsmEditor(el('sim-ed'), {
      onChange: () => { S.dirty = true; if (!S.m || S.m.steps === 0) setStatus('Modificado'); else setStatus('Modificado (se reiniciará al ejecutar)'); saveCode(); el('sim-ex').value = ''; },
      onBreakpoint: n => { S.bpLines.has(n) ? S.bpLines.delete(n) : S.bpLines.add(n); ed.setBreakpoints(S.bpLines); syncBp(); renderListing(); }
    });
    const dg = root.CpuDiagram.create(el('sim-dg'), { onStage: s => { el('sim-stage').innerHTML = s && !s.all ? `<b>${root.CpuDiagram.STAGE_NAMES[s.name]}.</b> ${s.note || root.CpuDiagram.STAGE_TEXT[s.name]}` : (s && s.all ? 'Se iluminan los bloques y buses que ha usado la instrucción.' : 'Cada paso ilumina por dónde viajan las direcciones, los datos y el control.'); } });
    dg.reset();
    let saveT; const saveCode = () => { clearTimeout(saveT); saveT = setTimeout(() => { App.state.simCode = ed.getValue(); App.save(); }, 600); };
    const setStatus = (t, cls) => { const s = el('sim-status'); s.textContent = t; s.className = 'sim-status ' + (cls || ''); };

    /* ---------------- Ensamblado ---------------- */
    function syncBp() {
      S.bpAddrs = new Set();
      if (S.prog) S.prog.byAddr.forEach((ins, a) => { if (S.bpLines.has(ins.line)) S.bpAddrs.add(a); });
    }
    function assembleNow() {
      stopRun();
      const src = ed.getValue();
      const p = ARM.assemble(src);
      S.prog = p; S.dirty = false; S.trace = []; S.changed = new Set(); S.flash = new Set(); S.lastRec = null; S.sel = -1; S.selAddr = null;
      const errBox = el('sim-errs');
      if (!p.ok) {
        S.m = null; ed.setErrors(p.errors);
        errBox.hidden = false;
        errBox.innerHTML = p.errors.slice(0, 4).map(e => `<div class="er"><b>Línea ${e.line}:</b> ${esc(e.msg)}${e.hint ? `<span class="dim"> — ${esc(e.hint)}</span>` : ''}</div>`).join('') + (p.errors.length > 4 ? `<div class="er dim">…y ${p.errors.length - 4} error(es) más</div>` : '');
        setStatus(p.errors.length + ' error(es)', 'bad');
        ed.setCurrent(0); renderAll(); return false;
      }
      errBox.hidden = true; ed.setErrors([]);
      S.m = new ARM.Machine(p); syncBp();
      if (!p.nInstr) { setStatus('El programa no tiene instrucciones', 'bad'); }
      else setStatus('Listo: ' + p.nInstr + ' instrucciones ensambladas', 'ok');
      dg.reset(); renderAll(); return true;
    }
    function ready() { if (S.dirty || !S.m) return assembleNow() && S.m && !!S.prog.nInstr; return true; }

    /* ---------------- Ejecución ---------------- */
    function halted() {
      const m = S.m; const k = m.haltKind;
      setStatus(m.haltReason, k === 'error' || k === 'limit' ? 'bad' : 'done');
    }
    function stepOnce(animate) {
      if (!ready()) return null;
      const m = S.m;
      if (m.halted) { halted(); return null; }
      const rec = m.step(); if (!rec) { halted(); return null; }
      S.lastRec = rec; S.changed = new Set(rec.regs.map(r => r.r)); S.flash = new Set(rec.memW.map(w => w.addr & ~3));
      S.trace.push({ n: m.steps, addr: rec.addr, src: rec.ins.src, rec });
      if (S.trace.length > 3000) S.trace.shift();
      S.sel = -1; S.selAddr = null;
      if (m.halted) halted(); else setStatus(m.steps + ' instrucción(es) ejecutada(s)', '');
      return rec;
    }
    function doStep() {
      stopRun(); const rec = stepOnce(true); renderAll(rec, true);
    }
    function doBack() {
      stopRun(); if (!S.m || !S.m.canBack()) return;
      S.m.back(); S.trace.pop(); S.lastRec = S.m.lastRec; S.changed = new Set(); S.flash = new Set(); S.sel = -1; S.selAddr = null;
      setStatus(S.m.steps + ' instrucción(es) ejecutada(s)'); renderAll(S.lastRec, false); if (S.lastRec) { dg.play(S.lastRec, 0); }
    }
    function doReset() {
      stopRun(); if (S.dirty || !S.m) { assembleNow(); return; }
      S.m.reset(); S.trace = []; S.changed = new Set(); S.flash = new Set(); S.lastRec = null; S.sel = -1; S.selAddr = null;
      setStatus('Listo: programa reiniciado', 'ok'); dg.reset(); renderAll();
    }
    function stopRun() {
      if (S.run) { clearTimeout(S.run); S.run = null; }
      const b = el('sim-run'); if (b) { b.textContent = 'Ejecutar'; b.classList.add('go'); b.classList.remove('warn'); }
    }
    function doRun() {
      if (S.run) { stopRun(); setStatus('En pausa: ' + S.m.steps + ' instrucciones'); return; }
      if (!ready()) return;
      if (S.m.halted) { doReset(); if (!S.m) return; }
      const [delay, per, animMs] = SPEEDS[el('sim-speed').value];
      const b = el('sim-run'); b.textContent = 'Pausa'; b.classList.remove('go'); b.classList.add('warn');
      setStatus('Ejecutando…', 'run');
      const tick = () => {
        let rec = null, n = 0;
        while (n < per) {
          if (n > 0 || S.m.steps > 0) { /* punto de parada antes de ejecutar la instrucción del PC */ if (S.bpAddrs.has(S.m.pc) && !(n === 0 && S.justResumed)) { stopRun(); setStatus('Parada en el punto de interrupción, línea ' + S.prog.byAddr.get(S.m.pc).line, 'bp'); S.justResumed = true; renderAll(S.lastRec, false); return; } }
          S.justResumed = false;
          rec = stepOnce(); n++;
          if (!rec || S.m.halted) break;
        }
        renderAll(rec, animMs > 0 ? animMs : 0, per === 1);
        if (!rec || S.m.halted) { stopRun(); halted(); return; }
        S.run = setTimeout(tick, delay);
      };
      S.justResumed = true;
      tick();
    }

    /* ---------------- Renderizado ---------------- */
    const fmtReg = v => S.fmt === 'hex' ? hx(v) : String(v | 0);
    function renderRegs() {
      const m = S.m; const box = el('sim-regs');
      let h = '';
      for (let i = 0; i < 16; i++) {
        const v = m ? (i === 15 ? m.pc : m.r[i]) : 0;
        h += `<button type="button" class="rg${S.changed.has(i) ? ' chg' : ''}${i >= 13 ? ' sp' + (i - 12) : ''}${S.selReg === i ? ' sel' : ''}" data-r="${i}" title="${ROLE[i]}${i === 15 ? ' (dirección de la siguiente instrucción; al leer R15 dentro de una instrucción se obtiene PC + 8)' : ''}"><span>${ARM.REG_LABEL(i)}${i > 12 || i === 0 ? '' : ''}</span><b class="mono">${m ? fmtReg(v) : (S.fmt === 'hex' ? '········' : '·')}</b></button>`;
      }
      box.innerHTML = h;
      renderRegDetail();
      el('sim-flags').innerHTML = ['N', 'Z', 'C', 'V'].map(k => `<span class="flag ${m && m.f[k] ? 'on' : ''}${m && S.lastRec && S.lastRec.flagsOld[k] !== m.f[k] ? ' chg' : ''}" title="${{ N: 'Negativo', Z: 'Cero', C: 'Carry', V: 'Overflow' }[k]}"><span>${k}</span><b>${m ? m.f[k] : 0}</b></span>`).join('');
      el('sim-conds').innerHTML = ARM.COND_TABLE.filter(c => c.code !== 14).map(c => `<i class="${m && ARM.condPass(c.code, m.f) ? 'on' : ''}" title="${c.mn}: ${esc(c.name)} (${c.flags})">${c.mn}</i>`).join('');
    }
    function renderRegDetail() {
      const d = el('sim-rdet'); const i = S.selReg; const m = S.m;
      if (i == null || !m) { d.innerHTML = '<span class="dim small">Pulsa un registro para ver sus 32 bits.</span>'; return; }
      const v = i === 15 ? m.pc : m.r[i];
      d.innerHTML = `<b>${ARM.REG_LABEL(i)}</b> ${W.bitsHTML(v, {})} <span class="mono small">${ARM.H(v)} · sin signo ${v >>> 0} · con signo ${v | 0}</span>`;
    }
    function renderListing() {
      const body = $('tbody', el('sim-list')); const p = S.prog; const m = S.m;
      $('.listing-empty', rootEl).hidden = !!(p && p.ok && p.listing.length);
      if (!p || !p.ok) { body.innerHTML = ''; return; }
      const cur = m ? m.pc : -1; const last = S.lastRec ? S.lastRec.addr : -1;
      body.innerHTML = p.listing.filter(l => l.type !== 'data').map(l => {
        const isI = l.type === 'instr'; const bp = isI && S.bpLines.has(l.line);
        const cls = (isI ? 'ir' : 'pool') + (l.addr === cur && m && !m.halted ? ' cur' : '') + (l.addr === last ? ' last' : '') + (S.selAddr === l.addr ? ' sel' : '');
        return `<tr class="${cls}" data-a="${l.addr}"><td class="bpc">${isI ? `<button type="button" class="bpdot${bp ? ' on' : ''}" data-bp="${l.line}" aria-label="Punto de parada en la línea ${l.line}" aria-pressed="${bp}"></button>` : ''}</td><td class="ad">${ARM.H(l.addr, 4)}</td><td class="hx">${hx(l.word)}</td><td class="src">${isI ? root.Asm.hlLine(l.src) : '<span class="dim">' + esc(l.src) + ' (pool de literales)</span>'}${isI && l.ins.note ? ` <span class="nt" title="${esc(l.ins.note)}">ⓘ</span>` : ''}</td></tr>`;
      }).join('');
      const curRow = $('tr.cur', body); if (curRow) { const w = $('.listing-wrap', rootEl); const t = curRow.offsetTop; if (t < w.scrollTop + 30 || t > w.scrollTop + w.clientHeight - 40) w.scrollTop = Math.max(0, t - w.clientHeight / 2); }
    }
    function renderStep() {
      const p = S.prog, m = S.m;
      const fields = el('sim-fields'), cur = el('sim-cur'), last = el('sim-last'), title = el('sim-cur-title'), fol = el('sim-follow');
      let ins = null;
      if (p && p.ok) { const a = S.selAddr != null ? S.selAddr : (m && !m.halted ? m.pc : null); ins = a != null ? p.byAddr.get(a) : null; }
      fol.hidden = S.selAddr == null;
      if (ins) {
        title.textContent = S.selAddr != null ? 'Instrucción seleccionada' : 'Siguiente instrucción (la que apunta PC)';
        cur.innerHTML = `<span class="c-copper">${ARM.H(ins.addr)}</span> <span class="c-violet">${hx(ins.word)}</span> <span>${root.Asm.hlLine(ins.src)}</span>`;
        fields.innerHTML = W.bitRow(ins.fields); W.bindFieldInfo(fields, ins.fields, el('sim-finfo'));
        el('sim-finfo').title = ins.format;
      } else {
        title.textContent = 'Instrucción actual';
        cur.innerHTML = p && p.ok && m && m.halted ? '<span class="c-mint">Programa terminado</span>' : '<span class="dim">Aún no hay instrucción cargada</span>';
        fields.innerHTML = ''; el('sim-finfo').textContent = '';
      }
      const r = S.lastRec;
      if (r) {
        last.innerHTML = `<div class="ls-h"><span class="dim small">Último paso ejecutado, línea ${r.ins.line}</span> <b class="mono">${esc(r.ins.src)}</b></div>` +
          (r.executed ? `<div class="ls-sym">${esc(r.sym)}</div><div class="ls-num mono">${esc(r.num)}</div>` : '') +
          r.extra.map(x => `<div class="ls-x">${esc(x)}</div>`).join('') + `<div class="ls-t${r.fault ? ' bad' : ''}">${esc(r.text)}</div>`;
      } else last.innerHTML = '<span class="dim">Aquí verás qué ha hecho la última instrucción y con qué valores.</span>';
    }
    function memRows(addrs, opts) {
      opts = opts || {}; const m = S.m; const p = S.prog;
      const lab = {}; if (p) p.labelNames.forEach(n => { lab[p.symbols[n]] = lab[p.symbols[n]] ? lab[p.symbols[n]] + ', ' + n : n; });
      const sp = m ? m.r[13] : 0;
      return '<div class="mrows">' + addrs.map(a => {
        const w = m.rw(a); const b = [0, 1, 2, 3].map(i => m.rb(a + i));
        const asc = b.map(c => c >= 32 && c < 127 ? String.fromCharCode(c) : '·').join('');
        const cls = 'mr' + (S.flash.has(a) ? ' flash' : '') + (opts.sp && a === sp ? ' isp' : '') + (m.touched.has(a) ? ' used' : '');
        return `<div class="${cls}"><span class="ad">${ARM.H(a)}</span><b class="mono wd">${hx(w)}</b><span class="by mono">${b.map(x => hx(x, 2)).join(' ')}</span><span class="asc mono">${esc(asc)}</span><span class="lb">${lab[a] ? esc(lab[a]) : ''}${opts.sp && a === sp ? '<em>← SP</em>' : ''}</span></div>`;
      }).join('') + '</div>';
    }
    function renderMem() {
      const m = S.m, p = S.prog;
      const dataP = $('[data-panel=data]', rootEl), stackP = $('[data-panel=stack]', rootEl), codeP = $('[data-panel=code]', rootEl);
      if (!m) { [dataP, stackP, codeP].forEach(x => x.innerHTML = '<p class="dim small">Sin programa ensamblado.</p>'); return; }
      // Datos
      const a0 = p.dataStart & ~3, a1 = Math.max(p.dataEnd, a0);
      const da = []; for (let a = a0; a < Math.min(a1, a0 + 4 * 48); a += 4) da.push(a);
      // Palabras tocadas fuera de la zona de datos y de la pila
      const extra = Array.from(m.touched).filter(a => (a < p.dataStart || a >= p.dataEnd + 4) && a < 0x20000000 && a >= 0x40).sort((x, y) => x - y).slice(0, 24);
      dataP.innerHTML = (da.length ? memRows(da) : '<p class="dim small">Este programa no declara datos. Con <code>.data</code> y <code>.word</code> / <code>.space</code> reservas memoria; también puedes escribir con STR en cualquier dirección (mira la pestaña «Ir a…»).</p>') +
        (extra.length ? `<h4 class="mh">Otras palabras escritas</h4>${memRows(extra)}` : '') + (a1 - a0 > 192 ? '<p class="dim small">Solo se muestran las 48 primeras palabras; usa «Ir a…» para el resto.</p>' : '');
      // Pila
      const top = ARM.STACK_TOP; const sp = m.r[13]; const lo = Math.min(sp, top - 16) & ~3;
      const sa = []; for (let a = top - 4; a >= lo - 8 && sa.length < 20; a -= 4) sa.push(a);
      stackP.innerHTML = `<p class="small dim stk-h">La pila crece hacia abajo. SP = <b class="mono">${ARM.H(sp)}</b>${sp === top ? ' (vacía)' : ` (${(top - sp) / 4} palabra${(top - sp) / 4 === 1 ? '' : 's'} apiladas)`}</p>` + memRows(sa, { sp: true }).replace(/class="mr( |")/g, (mt, x) => `class="mr${x}`);
      // Código
      const ca = []; for (let a = p.textStart; a < p.poolEnd; a += 4) ca.push(a);
      codeP.innerHTML = '<p class="small dim">El programa también está en memoria (arquitectura Von Neumann): cada instrucción es una palabra de 32 bits.</p>' + memRows(ca.slice(0, 64));
      renderAddr();
    }
    function renderAddr() {
      const m = S.m; if (!m) return; const a = W.parseNum(el('sim-addr').value); const out = el('sim-addr-out');
      if (isNaN(a)) { out.innerHTML = '<p class="c-alert small">Dirección no válida</p>'; return; }
      const s = (a >>> 0) & ~3; const arr = []; for (let i = 0; i < 12; i++) arr.push((s + 4 * i) >>> 0);
      out.innerHTML = memRows(arr);
    }
    function renderTrace() {
      const box = el('sim-trace'); const tr = S.trace.slice(-150);
      if (!tr.length) { box.innerHTML = '<p class="dim small">Cada instrucción ejecutada aparecerá aquí con su efecto.</p>'; }
      else { box.innerHTML = tr.map(t => `<div class="tl${t.rec.executed ? '' : ' skip'}${t.rec.fault ? ' bad' : ''}"><span class="n mono">${t.n}</span><span class="a mono">${hx(t.addr, 4)}</span><span class="s mono">${esc(t.src)}</span><span class="e">${t.rec.executed ? esc(t.rec.sym) : 'no se ejecuta (' + ARM.COND_NAME[t.rec.ins.cond] + ')'}</span></div>`).join(''); box.scrollTop = box.scrollHeight; }
      const o = el('sim-out'); o.textContent = S.m && S.m.output ? S.m.output : ''; if (!o.textContent) o.innerHTML = '<span class="dim small">Sin salida. SWI 0x6B imprime R1; SWI 0x00 imprime un carácter (R0); SWI 0x02 una cadena.</span>';
    }
    function renderAll(rec, animate, single) {
      renderRegs(); renderListing(); renderStep(); renderMem(); renderTrace();
      const m = S.m;
      ed.setCurrent(m && !m.halted && S.prog.byAddr.get(m.pc) ? S.prog.byAddr.get(m.pc).line : 0);
      el('sim-back').disabled = !(m && m.canBack());
      if (rec && animate !== undefined && animate !== false) dg.play(rec, animate === true ? (SPEEDS[el('sim-speed').value][2] || 300) : animate);
    }

    /* ---------------- Eventos ---------------- */
    el('sim-wide').addEventListener('click', () => { const a = $('#app'); const c = a.classList.toggle('rail-collapsed'); el('sim-wide').textContent = c ? 'Mostrar menú' : 'Ampliar'; });
    el('sim-run').addEventListener('click', doRun);
    el('sim-step').addEventListener('click', doStep);
    el('sim-back').addEventListener('click', doBack);
    el('sim-reset').addEventListener('click', doReset);
    el('sim-speed').addEventListener('change', () => { if (S.run) { stopRun(); doRun(); } });
    el('sim-follow').addEventListener('click', () => { S.selAddr = null; renderStep(); renderListing(); });
    el('sim-addr').addEventListener('input', renderAddr);
    rootEl.addEventListener('click', e => {
      const bp = e.target.closest('[data-bp]');
      if (bp) { const n = +bp.dataset.bp; S.bpLines.has(n) ? S.bpLines.delete(n) : S.bpLines.add(n); ed.setBreakpoints(S.bpLines); syncBp(); renderListing(); return; }
      const tr = e.target.closest('#sim-list tbody tr.ir'); if (tr) { S.selAddr = +tr.dataset.a; renderStep(); renderListing(); return; }
      const rg = e.target.closest('[data-r]'); if (rg) { S.selReg = S.selReg === +rg.dataset.r ? null : +rg.dataset.r; renderRegs(); return; }
      const f = e.target.closest('[data-fmt]'); if (f) { S.fmt = f.dataset.fmt; $$('[data-fmt]', rootEl).forEach(x => x.setAttribute('aria-pressed', x === f)); renderRegs(); }
    });
    el('sim-ex').addEventListener('change', e => { const ex = Ex.get(e.target.value); if (ex) load(ex.code, ex.title); });
    el('sim-dl').addEventListener('click', () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ed.getValue()], { type: 'text/plain' })); a.download = 'programa.s'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    el('sim-up').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { load(t, f.name); }); e.target.value = ''; });
    document.addEventListener('keydown', e => {
      if (App.current !== 'sim') return;
      if (e.key === 'F10') { e.preventDefault(); doStep(); }
      else if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); doReset(); }
      else if (e.key === 'F5') { e.preventDefault(); doRun(); }
      else if (e.key === 'ArrowLeft' && e.altKey) { e.preventDefault(); doBack(); }
    });
    document.addEventListener('viewchange', e => { if (e.detail !== 'sim') { stopRun(); $('#app').classList.remove('rail-collapsed'); el('sim-wide').textContent = 'Ampliar'; } });

    function load(code, title, autoAssemble) {
      stopRun(); S.bpLines = new Set(); ed.setBreakpoints(S.bpLines); ed.setValue(code.replace(/\s+$/, '') + '\n');
      S.dirty = true; S.m = null; saveCode();
      assembleNow(); if (title) App.toast('Cargado: ' + title);
    }
    S.load = load;
    rootEl._sim = S; rootEl._load = load;

    const initial = App.state.simCode || Ex.get('suma').code;
    ed.setValue(initial); assembleNow();
    if (!App.state.simCode) el('sim-ex').value = 'suma';
  }

  App.register('sim', {
    title: 'Simulador ARM', wide: true, html, init,
    onShow(rootEl) {
      if (App.pendingSim != null) { const c = App.pendingSim; App.pendingSim = null; rootEl._load(c); rootEl.querySelector('#sim-ex').value = ''; }
    }
  });
})(window);
