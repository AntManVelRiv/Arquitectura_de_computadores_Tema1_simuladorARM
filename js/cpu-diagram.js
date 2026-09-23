/* cpu-diagram.js — camino de datos animado: PC, memoria, IR, UC, banco de registros, ALU, flags */
(function (root) {
  'use strict';
  let uid = 0;
  const STAGE_NAMES = { fetch: 'Búsqueda', decode: 'Decodificación', execute: 'Ejecución', memory: 'Memoria', writeback: 'Escritura' };
  const STAGE_TEXT = {
    fetch: 'PC envía la dirección de la instrucción por el bus de direcciones; la memoria devuelve la instrucción y se guarda en IR. Mientras tanto PC ← PC + 4.',
    decode: 'La unidad de control lee los campos de IR (cond, op, cmd…) y genera las señales de control. Se seleccionan los registros Rn y Rm del banco.',
    execute: 'La ALU opera con los valores leídos del banco de registros o con el inmediato. Si la instrucción lleva S, se actualizan los flags NZCV.',
    memory: 'La dirección calculada por la ALU se envía a la memoria de datos: se lee (LDR) o se escribe (STR) el dato.',
    writeback: 'El resultado (de la ALU o de la memoria) vuelve al banco de registros. En un salto, la dirección de destino se carga en PC.'
  };

  /* Qué se ilumina en cada etapa según el tipo de instrucción */
  function plan(rec) {
    const st = [];
    st.push({ name: 'fetch', blocks: ['pc', 'im', 'ir', 'add4'], paths: ['pc-im', 'pc-add', 'add-pc', 'im-ir'] });
    if (!rec) return st;
    const ins = rec.ins;
    const regOp2 = ins.op2 && ins.op2.kind === 'reg';
    st.push({ name: 'decode', blocks: ['ir', 'uc'], paths: ['ir-uc', 'ir-rf', 'ctl-rf'] });
    if (!rec.executed) { st.push({ name: 'execute', blocks: ['uc'], paths: [], note: 'La condición no se cumple: la unidad de control anula la instrucción.' }); return st; }
    switch (ins.t) {
      case 'dp': case 'mul': case 'mull': {
        const p = ['rf-alu-a', regOp2 || ins.t !== 'dp' ? 'rf-alu-b' : 'imm', 'ctl-alu'];
        if (rec.flagsWritten) p.push('alu-flags');
        st.push({ name: 'execute', blocks: ['rf', 'alu'].concat(rec.flagsWritten ? ['flags'] : []), paths: p });
        if (rec.regW.length) st.push({ name: 'writeback', blocks: ['alu', 'rf'], paths: rec.regW.includes(15) ? ['alu-out', 'to-pc'] : ['alu-out', 'wb-rf'] });
        break;
      }
      case 'mem': case 'blk': {
        const load = ins.load;
        st.push({ name: 'execute', blocks: ['rf', 'alu'], paths: ['rf-alu-a', ins.off && ins.off.type === 'reg' ? 'rf-alu-b' : 'imm', 'ctl-alu', 'alu-dm'] });
        st.push({ name: 'memory', blocks: ['dm'], paths: load ? ['ctl-dm', 'dm-out'] : ['ctl-dm', 'rf-dm'], blocksExtra: load ? [] : ['rf'] });
        if (load) st.push({ name: 'writeback', blocks: ['rf'], paths: ['dm-out', 'wb-rf'] });
        break;
      }
      case 'br': case 'bx':
        st.push({ name: 'execute', blocks: ['alu'], paths: ['imm', 'ctl-alu'] });
        st.push({ name: 'writeback', blocks: ['alu', 'pc'], paths: ['alu-out', 'to-pc'].concat(ins.link ? ['wb-rf'] : []) });
        break;
      default: break;
    }
    return st;
  }

  function create(host, opts) {
    opts = opts || {};
    const id = 'cd' + (++uid);
    const mk = (c, col) => `<marker id="${id}-${c}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" style="fill:var(--${col})"/></marker>`;
    const P = (name, cls, d, mark) => `<path class="pth ${cls}" data-p="${name}" d="${d}" marker-end="url(#${id}-${mark})"/>`;
    const B = (name, x, y, w, h, l1, l2, extra) => `<g class="blk" data-b="${name}"><rect x="${x}" y="${y}" width="${w}" height="${h}" ${extra || ''}/><text x="${x + w / 2}" y="${y + h / 2 + (l2 ? -3 : 5)}" text-anchor="middle">${l1}</text>${l2 ? `<text class="sub" x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle">${l2}</text>` : ''}</g>`;
    host.innerHTML = `<svg class="cpu-svg" viewBox="0 0 800 388" role="img" aria-label="Camino de datos de la CPU: PC, memoria de instrucciones, IR, unidad de control, banco de registros, ALU, flags y memoria de datos">
      <defs>${mk('a', 'copper')}${mk('d', 'ice')}${mk('c', 'violet')}${mk('r', 'mint')}${mk('i', 'rose')}</defs>
      ${P('pc-im', 'a', 'M70 192H130', 'a')}
      ${P('pc-add', 'a', 'M100 192V76', 'a')}
      ${P('add-pc', 'a', 'M78 60H42V170', 'a')}
      ${P('im-ir', 'c', 'M230 192H250', 'c')}
      ${P('ir-uc', 'c', 'M275 170V40H300', 'c')}
      ${P('ir-rf', 'c', 'M300 192H340', 'c')}
      ${P('ctl-rf', 'c dash', 'M400 66V120', 'c')}
      ${P('ctl-alu', 'c dash', 'M500 30H560V120', 'c')}
      ${P('ctl-dm', 'c dash', 'M500 50H710V120', 'c')}
      ${P('rf-alu-a', 'd', 'M470 160H520', 'd')}
      ${P('rf-alu-b', 'd', 'M470 222H520', 'd')}
      ${P('imm', 'i', 'M275 214V278H500V222H520', 'i')}
      ${P('alu-dm', 'a', 'M600 160H650', 'a')}
      ${P('alu-flags', 'r', 'M560 250V272', 'r')}
      ${P('rf-dm', 'd', 'M405 250V318H710V250', 'd')}
      ${P('alu-out', 'r', 'M600 236H628V352', 'r')}
      ${P('dm-out', 'r', 'M650 236H628', 'r')}
      ${P('wb-rf', 'r', 'M628 352H320V238H340', 'r')}
      ${P('to-pc', 'a', 'M628 352V370H42V214', 'a')}
      ${B('pc', 14, 170, 56, 44, 'PC')}
      ${B('add4', 78, 46, 52, 30, '+4')}
      ${B('im', 130, 130, 100, 124, 'Memoria de', 'instrucciones')}
      ${B('ir', 250, 170, 50, 44, 'IR')}
      ${B('uc', 300, 14, 200, 52, 'Unidad de control')}
      ${B('rf', 340, 120, 130, 130, 'Banco de', 'registros')}
      ${B('alu', 520, 120, 80, 130, 'ALU')}
      ${B('flags', 520, 272, 80, 32, 'NZCV')}
      ${B('dm', 650, 120, 120, 130, 'Memoria', 'de datos')}
      <text class="lbl a" x="84" y="208">dir.</text>
      <text class="lbl c" x="255" y="207" >instr.</text>
      <text class="lbl c" x="510" y="24">control</text>
      <text class="lbl i" x="384" y="292">inmediato</text>
      <text class="lbl r" x="560" y="366">resultado</text>
    </svg>
    <div class="cpu-legend"><span class="a">direcciones</span><span class="d">datos</span><span class="c">instrucción y control</span><span class="i">inmediato</span><span class="r">resultado</span></div>`;
    const svg = host.querySelector('svg');
    const api = { el: svg, stage: null, timer: null, onStage: opts.onStage || null };
    function clear() { svg.querySelectorAll('.on').forEach(e => e.classList.remove('on')); svg.querySelectorAll('.dim').forEach(e => e.classList.remove('dim')); }
    api.setStage = function (s) {
      clear(); api.stage = s ? s.name : null;
      if (!s) return;
      const blocks = (s.blocks || []).concat(s.blocksExtra || []);
      blocks.forEach(b => { const n = svg.querySelector(`[data-b="${b}"]`); if (n) n.classList.add('on'); });
      (s.paths || []).forEach(p => { const n = svg.querySelector(`[data-p="${p}"]`); if (n) n.classList.add('on'); });
      if (api.onStage) api.onStage(s);
    };
    api.stop = function () { clearTimeout(api.timer); api.timer = null; };
    api.reset = function () { api.stop(); clear(); api.stage = null; if (api.onStage) api.onStage(null); };
    /* Reproduce las etapas de la instrucción; ms = 0 muestra solo el estado final */
    api.play = function (rec, ms, done) {
      api.stop();
      const stages = plan(rec);
      if (!ms) { const all = { blocks: [], paths: [], name: stages[stages.length - 1].name }; stages.forEach(s => { all.blocks.push(...s.blocks); all.paths.push(...s.paths); }); api.setStage(Object.assign({}, all, { all: true, stages: stages })); if (done) done(); return; }
      let i = 0;
      const next = () => {
        if (i >= stages.length) { api.timer = null; if (done) done(); return; }
        api.setStage(stages[i++]); api.timer = setTimeout(next, ms);
      };
      next();
    };
    api.plan = plan;
    return api;
  }
  root.CpuDiagram = { create, STAGE_NAMES, STAGE_TEXT, plan };
})(window);
