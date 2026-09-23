/* widgets2.js — piezas interactivas de arquitectura y evolución (parte 2) */
(function (root) {
  'use strict';
  const W = root.Widgets, ARM = root.ARM, esc = root.Asm.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ------------------------------ Modelo de Von Neumann ------------------------------ */
  W.vonNeumann = function (host) {
    const INFO = {
      cpu: ['CPU (procesador)', 'Ejecuta las instrucciones del programa una tras otra. Se compone de la <b>unidad de control</b> y el <b>camino de datos</b>. Su ciclo básico es: buscar la instrucción en memoria, decodificarla y ejecutarla.'],
      uc: ['Unidad de control', 'Interpreta cada instrucción (los campos de IR) y genera las señales de control que gobiernan el resto del sistema: qué registros se leen, qué hace la ALU, si se accede a memoria… Mantiene el orden del ciclo búsqueda-ejecución.'],
      dp: ['Camino de datos', 'Es donde se procesan los datos: la <b>ALU</b> (operaciones aritmético-lógicas) y los <b>registros</b>: PC (dirección de la siguiente instrucción), IR (instrucción en curso), SR (registro de estado con los flags) y el banco de registros de propósito general.'],
      mem: ['Memoria principal', 'Guarda <b>programas y datos</b> en el mismo espacio (idea central de Von Neumann). Está formada por celdas numeradas: cada una tiene una <b>dirección</b> y guarda una palabra. Solo se puede leer o escribir indicando la dirección.'],
      io: ['Entrada/Salida', 'Conecta el computador con el exterior (teclado, pantalla, disco, red…) mediante controladores. Desde la CPU se ven como dispositivos a los que se accede por el bus.'],
      bd: ['Bus de datos', 'Transporta los datos entre CPU, memoria y E/S, en los dos sentidos (bidireccional). Su anchura (32 bits en ARMv4) marca el tamaño de la palabra que se mueve de una vez.'],
      ba: ['Bus de direcciones', 'Lleva la dirección de la celda o dispositivo al que se accede. Es unidireccional (lo genera la CPU). Con n líneas se pueden direccionar 2ⁿ posiciones: 32 líneas → 4 GiB de bytes.'],
      bc: ['Bus de control', 'Transporta las señales que coordinan el acceso: lectura/escritura, reloj, peticiones de interrupción, habilitación de dispositivos… Además existen las líneas de alimentación que dan energía a todo el sistema.']
    };
    host.classList.add('vn');
    host.innerHTML = `<svg viewBox="0 0 780 350" class="vn-svg" role="group" aria-label="Diagrama del modelo de Von Neumann: CPU, memoria, entrada/salida y buses">
      <g class="vb" data-id="cpu" tabindex="0" role="button" aria-label="CPU"><rect class="big" x="14" y="14" width="330" height="322"/><text class="ttl" x="30" y="40">CPU</text></g>
      <g class="vb" data-id="uc" tabindex="0" role="button" aria-label="Unidad de control"><rect x="34" y="56" width="290" height="70"/><text x="179" y="96" text-anchor="middle">Unidad de control</text></g>
      <g class="vb" data-id="dp" tabindex="0" role="button" aria-label="Camino de datos"><rect x="34" y="144" width="290" height="176"/><text x="50" y="168">Camino de datos</text>
        <rect class="in" x="52" y="184" width="118" height="54"/><text class="sub" x="111" y="216" text-anchor="middle">ALU</text>
        <rect class="in" x="184" y="184" width="122" height="54"/><text class="sub" x="245" y="216" text-anchor="middle">Banco de registros</text>
        <rect class="in" x="52" y="252" width="74" height="42"/><text class="sub" x="89" y="278" text-anchor="middle">PC</text>
        <rect class="in" x="138" y="252" width="74" height="42"/><text class="sub" x="175" y="278" text-anchor="middle">IR</text>
        <rect class="in" x="224" y="252" width="82" height="42"/><text class="sub" x="265" y="278" text-anchor="middle">SR / flags</text></g>
      <g class="vb" data-id="mem" tabindex="0" role="button" aria-label="Memoria"><rect x="540" y="14" width="226" height="150"/><text x="653" y="44" text-anchor="middle">Memoria</text>
        <g class="cells">${[0, 1, 2, 3, 4].map(i => `<rect class="in" x="562" y="${58 + i * 20}" width="182" height="17"/><text class="sub mono" x="570" y="${71 + i * 20}">0x${(i * 4).toString(16).padStart(8, '0')}</text>`).join('')}</g></g>
      <g class="vb" data-id="io" tabindex="0" role="button" aria-label="Entrada/Salida"><rect x="540" y="196" width="226" height="140"/><text x="653" y="226" text-anchor="middle">Entrada / Salida</text>
        <text class="sub" x="653" y="262" text-anchor="middle">teclado · pantalla</text><text class="sub" x="653" y="286" text-anchor="middle">disco · red</text></g>
      <g class="bus" data-id="ba" tabindex="0" role="button" aria-label="Bus de direcciones"><path class="lane a" d="M344 92H520"/><path class="lane a" d="M520 92V60H540M520 92V250H540"/><text class="bl a" x="432" y="84" text-anchor="middle">direcciones</text></g>
      <g class="bus" data-id="bd" tabindex="0" role="button" aria-label="Bus de datos"><path class="lane d" d="M344 174H500"/><path class="lane d" d="M500 174V110H540M500 174V270H540"/><text class="bl d" x="422" y="166" text-anchor="middle">datos</text></g>
      <g class="bus" data-id="bc" tabindex="0" role="button" aria-label="Bus de control"><path class="lane c" d="M344 256H480"/><path class="lane c" d="M480 256V140H540M480 256V300H540"/><text class="bl c" x="412" y="248" text-anchor="middle">control</text></g>
    </svg>
    <div class="vn-side"><div class="btn-row"><button class="btn sm go" type="button" data-act="read">Simular lectura de memoria</button><button class="btn sm warn" type="button" data-act="write">Simular escritura</button></div><div class="vn-info panel tight" aria-live="polite"></div></div>`;
    const info = $('.vn-info', host);
    let timers = [];
    function show(id) {
      const [t, d] = INFO[id]; info.innerHTML = `<h4>${t}</h4><p>${d}</p>`;
      $$('.vb,.bus', host).forEach(e => e.classList.toggle('sel', e.dataset.id === id));
    }
    host.addEventListener('click', e => { const g = e.target.closest('[data-id]'); if (g) show(g.dataset.id); });
    host.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { const g = e.target.closest('[data-id]'); if (g) { e.preventDefault(); show(g.dataset.id); } } });
    function flow(kind) {
      timers.forEach(clearTimeout); timers = [];
      $$('.on', host).forEach(x => x.classList.remove('on'));
      const seq = kind === 'read'
        ? [['ba', 'cpu', 'La CPU pone la dirección en el bus de direcciones.'], ['bc', 'mem', 'Con el bus de control indica «lectura».'], ['bd', 'mem', 'La memoria coloca el dato en el bus de datos.'], ['bd', 'dp', 'El dato llega a la CPU (a un registro, o a IR si era una instrucción).']]
        : [['ba', 'cpu', 'La CPU pone la dirección en el bus de direcciones.'], ['bd', 'cpu', 'Coloca el dato a escribir en el bus de datos.'], ['bc', 'mem', 'Con el bus de control indica «escritura».'], ['bd', 'mem', 'La memoria guarda el dato en la celda direccionada.']];
      seq.forEach((s, i) => timers.push(setTimeout(() => {
        $$('.on', host).forEach(x => x.classList.remove('on'));
        $$(`[data-id="${s[0]}"],[data-id="${s[1]}"]`, host).forEach(x => x.classList.add('on'));
        info.innerHTML = `<h4>${kind === 'read' ? 'Lectura' : 'Escritura'}: paso ${i + 1} de ${seq.length}</h4><p>${s[2]}</p>`;
      }, i * 1100)));
      timers.push(setTimeout(() => $$('.on', host).forEach(x => x.classList.remove('on')), seq.length * 1100 + 700));
    }
    host.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (a) flow(a.dataset.act); });
    show('mem');
  };

  /* ----------------------------- Jerarquía de memoria ----------------------------- */
  W.memHier = function (host) {
    const L = [
      { n: 'Registros', w: 30, d: 'Dentro de la CPU: son el almacenamiento más rápido y pequeño (ARMv4 tiene 16 registros de 32 bits). Los operandos de las instrucciones aritméticas están aquí.', cap: 'decenas de palabras', vel: 'inmediata' },
      { n: 'Memoria caché', w: 52, d: 'Memoria pequeña y muy rápida (SRAM) que guarda copias de los datos e instrucciones usados recientemente para no ir a la memoria principal.', cap: 'KB a MB', vel: 'muy rápida' },
      { n: 'Memoria principal', w: 76, d: 'La memoria RAM (DRAM): programas y datos en ejecución. Mucho mayor pero más lenta que la caché; es la «memoria» del modelo de Von Neumann.', cap: 'GB', vel: 'rápida' },
      { n: 'Almacenamiento secundario', w: 100, d: 'Discos, SSD… Capacidad enorme y no volátil (conserva los datos sin energía), pero el acceso es mucho más lento.', cap: 'TB', vel: 'lenta' }
    ];
    host.classList.add('mh');
    host.innerHTML = `<div class="mh-pyr" role="group" aria-label="Niveles de la jerarquía de memoria">${L.map((l, i) => `<button type="button" class="mh-lv" data-i="${i}" style="--w:${l.w}%" aria-pressed="${i === 2}"><span>${l.n}</span></button>`).join('')}</div>
      <div class="mh-axis" aria-hidden="true"><span>▲ más rápida y más cara por bit</span><span>▼ más capacidad</span></div><div class="mh-info panel tight" aria-live="polite"></div>`;
    const info = $('.mh-info', host);
    function show(i) { const l = L[i]; info.innerHTML = `<h4>${l.n}</h4><p>${l.d}</p><p class="small dim"><b>Capacidad típica:</b> ${l.cap} · <b>Velocidad:</b> ${l.vel}</p>`; $$('.mh-lv', host).forEach((b, j) => b.setAttribute('aria-pressed', j === i)); }
    host.addEventListener('click', e => { const b = e.target.closest('.mh-lv'); if (b) show(+b.dataset.i); });
    show(2);
  };

  /* ----------------------------- Unidades y direcciones ----------------------------- */
  W.units = function (host) {
    const U = [['B', 0], ['KB', 10], ['MB', 20], ['GB', 30], ['TB', 40], ['PB', 50]];
    host.classList.add('lab');
    host.innerHTML = `<div class="lab-ctl"><label>Líneas del bus de direcciones <input type="number" min="1" max="64" value="32" aria-label="Número de líneas de dirección"></label></div><div class="lab-txt units-out"></div>
      <table class="tbl units"><thead><tr><th>Unidad</th><th>Potencia de 2</th><th>Bytes</th></tr></thead><tbody>${U.map(([u, p]) => `<tr><td><b>${u === 'B' ? 'Byte' : u}</b></td><td class="mono">2<sup>${p}</sup></td><td class="mono">${(2n ** BigInt(p)).toLocaleString('es')}</td></tr>`).join('')}</tbody></table>`;
    const inp = $('input', host), out = $('.units-out', host);
    function calc() {
      const n = Math.max(1, Math.min(64, parseInt(inp.value) || 1)); const t = 2n ** BigInt(n);
      let best = 'B', pw = 0; for (const [u, p] of U) if (t >= 2n ** BigInt(p)) { best = u; pw = p; }
      out.innerHTML = `Con <b>${n}</b> líneas se distinguen 2<sup>${n}</sup> = <b>${t.toLocaleString('es')}</b> direcciones. Si cada dirección designa un byte, eso son <b>${(t >> BigInt(pw)).toLocaleString('es')} ${best}</b>${n === 32 ? ' (el espacio de direcciones de ARMv4)' : ''}.`;
    }
    inp.addEventListener('input', calc); calc();
  };

  /* ------------------------------ Contención en el bus ------------------------------ */
  W.busDemo = function (host) {
    const DEV = [['cpu', 'CPU'], ['mem', 'Memoria'], ['io', 'E/S']];
    host.classList.add('bus-demo');
    host.innerHTML = `<div class="bd-line"><div class="bd-wire" aria-hidden="true"><span class="bd-sig"></span></div></div>
      <div class="bd-devs">${DEV.map(([id, n]) => `<div class="bd-dev"><b>${n}</b><button type="button" class="btn sm ghost" data-d="${id}" aria-pressed="false">Transmitir</button></div>`).join('')}</div><p class="bd-msg" aria-live="polite">El bus es un medio compartido: en cada momento solo un dispositivo debería transmitir. Activa uno o varios.</p>`;
    const on = new Set(), msg = $('.bd-msg', host), wire = $('.bd-wire', host);
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-d]'); if (!b) return; const id = b.dataset.d;
      if (on.has(id)) on.delete(id); else on.add(id);
      b.setAttribute('aria-pressed', on.has(id)); b.classList.toggle('go', on.has(id));
      wire.className = 'bd-wire ' + (on.size === 0 ? '' : on.size === 1 ? 'ok' : 'bad');
      if (on.size === 0) msg.textContent = 'Bus libre: nadie transmite.';
      else if (on.size === 1) msg.innerHTML = `<b class="c-mint">Transmisión correcta.</b> ${DEV.find(d => d[0] === [...on][0])[1]} controla el bus y el resto escucha.`;
      else msg.innerHTML = `<b class="c-alert">Contención de bus.</b> ${on.size} dispositivos escriben a la vez: las señales se superponen y el dato se corrompe. Por eso el acceso se coordina con el bus de control (arbitraje).`;
    });
  };

  /* --------------------------------- Ley de Moore --------------------------------- */
  W.moore = function (host) {
    const P = [
      { n: 'Intel 4004', y: 1971, t: 2300, f: 0.74, c: 1 }, { n: 'Intel 8086', y: 1978, t: 29000, f: 5, c: 1 }, { n: 'Intel 80386', y: 1985, t: 275000, f: 16, c: 1 },
      { n: 'Pentium', y: 1993, t: 3.1e6, f: 60, c: 1 }, { n: 'Pentium 4', y: 2000, t: 42e6, f: 1500, c: 1 }, { n: 'P4 Prescott', y: 2004, t: 125e6, f: 3800, c: 1 },
      { n: 'Core 2 Duo', y: 2006, t: 291e6, f: 2930, c: 2 }, { n: 'Core i7-5960X', y: 2014, t: 2.6e9, f: 3000, c: 8 }
    ];
    host.classList.add('lab', 'moore');
    host.innerHTML = `<div class="lab-ctl"><span class="seg" role="group" aria-label="Magnitud"><button type="button" data-m="t" aria-pressed="true">Transistores</button><button type="button" data-m="f" aria-pressed="false">Frecuencia (MHz)</button><button type="button" data-m="c" aria-pressed="false">Núcleos</button></span>
      <label class="mo-slider">Se duplican cada <b class="mo-mon">24</b> meses <input type="range" min="12" max="36" step="1" value="24" aria-label="Meses en duplicarse"></label></div>
      <svg class="mo-svg" viewBox="0 0 760 360" role="img" aria-label="Gráfica de la evolución de los procesadores"></svg><p class="lab-txt mo-txt" aria-live="polite"></p>`;
    let met = 't', T = 24;
    const svg = $('svg', host), txt = $('.mo-txt', host), sl = $('input', host), mon = $('.mo-mon', host);
    const X0 = 62, X1 = 738, Y0 = 20, Y1 = 316, YR = [1968, 2016];
    const xs = y => X0 + (y - YR[0]) / (YR[1] - YR[0]) * (X1 - X0);
    function paint() {
      const log = met !== 'c'; const key = met; let lo, hi;
      if (met === 't') { lo = 3; hi = 10; } else if (met === 'f') { lo = -1; hi = 4; } else { lo = 0; hi = 8; }
      const ys = v => { const val = log ? Math.log10(v) : v; return Y1 - (val - lo) / (hi - lo) * (Y1 - Y0); };
      let g = '';
      const ticks = log ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : [0, 2, 4, 6, 8];
      ticks.forEach(t => { const y = Y1 - (t - lo) / (hi - lo) * (Y1 - Y0); g += `<line class="gl" x1="${X0}" x2="${X1}" y1="${y}" y2="${y}"/><text class="ax" x="${X0 - 8}" y="${y + 4}" text-anchor="end">${log ? (t < 0 ? '0,' + '0'.repeat(-t - 1) + '1' : t <= 3 ? Math.pow(10, t) : '10' + String(t).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('')) : t}</text>`; });
      for (let y = 1970; y <= 2015; y += 5) g += `<line class="gl v" x1="${xs(y)}" x2="${xs(y)}" y1="${Y0}" y2="${Y1}"/><text class="ax" x="${xs(y)}" y="${Y1 + 20}" text-anchor="middle">${y}</text>`;
      if (met === 't') {
        const pts = []; for (let y = 1971; y <= 2016; y += 1) { const v = 2300 * Math.pow(2, (y - 1971) * 12 / T); if (Math.log10(v) <= hi) pts.push(`${xs(y)},${ys(v)}`); }
        g += `<polyline class="mo-ref" points="${pts.join(' ')}"/>`;
      }
      const line = P.map(p => `${xs(p.y)},${ys(p[key])}`).join(' ');
      g += `<polyline class="mo-line" points="${line}"/>`;
      P.forEach((p, i) => { const up = i % 2 === 0; g += `<g class="mo-pt"><circle cx="${xs(p.y)}" cy="${ys(p[key])}" r="5"><title>${p.n} (${p.y}): ${p[key].toLocaleString('es')}</title></circle><text class="pl" x="${xs(p.y)}" y="${ys(p[key]) + (up ? -12 : 20)}" text-anchor="${i > 5 ? 'end' : 'middle'}">${p.n}</text></g>`; });
      svg.innerHTML = g;
      mon.textContent = T; $('.mo-slider', host).style.visibility = met === 't' ? 'visible' : 'hidden';
      if (met === 't') {
        const pred = 2300 * Math.pow(2, (2014 - 1971) * 12 / T);
        txt.innerHTML = `La línea discontinua es la predicción si el nº de transistores se duplicara cada <b>${T} meses</b>: para 2014 daría ${pred.toExponential(1).replace('e+', ' × 10^')} transistores frente a los <b>2,6 × 10⁹</b> reales del Core i7-5960X. En clase se cita «año y medio» (18 meses); los datos reales se ajustan mejor a unos 24 meses. Mueve el control y compruébalo.`;
      } else if (met === 'f') txt.innerHTML = 'La frecuencia creció exponencialmente hasta 2004 y después <b>se estanca</b> alrededor de 3–4 GHz: la potencia disipada crece muy deprisa con la frecuencia y no se puede refrigerar (el «muro de potencia»).';
      else txt.innerHTML = 'Al chocar con el límite de frecuencia, los fabricantes usan los transistores extra para <b>replicar núcleos</b>: de 1 solo núcleo hasta 8 (Core i7-5960X) en un mismo chip.';
    }
    host.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; met = b.dataset.m; $$('[data-m]', host).forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); });
    sl.addEventListener('input', () => { T = +sl.value; paint(); });
    paint();
  };

  /* ---------------------------- Crecimiento del rendimiento ---------------------------- */
  W.growth = function (host) {
    const PH = [['Hasta ≈1986', 0.25, 'Antes de RISC'], ['≈1986 – 2003', 0.52, 'Época RISC + segmentación'], ['Desde ≈2003', 0.22, 'Fin de la frecuencia, llegan los multinúcleo']];
    host.classList.add('lab');
    host.innerHTML = `<div class="lab-ctl"><label class="mo-slider">Tras <b class="gr-y">10</b> años <input type="range" min="1" max="20" value="10" aria-label="Años"></label></div><div class="gr-grid">${PH.map(p => `<div class="gr-c"><b class="gr-r mono">${Math.round(p[1] * 100)} %/año</b><span class="gr-n">${p[0]}</span><span class="small dim">${p[2]}</span><span class="gr-f mono"></span><span class="small dim gr-d"></span></div>`).join('')}</div>`;
    const sl = $('input', host), yl = $('.gr-y', host), fs = $$('.gr-f', host), ds = $$('.gr-d', host);
    function calc() { const y = +sl.value; yl.textContent = y; PH.forEach((p, i) => { fs[i].textContent = '× ' + Math.pow(1 + p[1], y).toFixed(1).replace('.', ','); ds[i].textContent = 'se duplica cada ' + (Math.log(2) / Math.log(1 + p[1])).toFixed(1).replace('.', ',') + ' años'; }); }
    sl.addEventListener('input', calc); calc();
  };

  /* ---------------------- Ciclo de instrucción sobre el camino de datos ---------------------- */
  W.cycleDemo = function (host) {
    const CASES = [
      { t: 'ADD R1, R2, R3', flags: null }, { t: 'ADDS R1, R2, #4', flags: null }, { t: 'LDR R5, [R0, #4]', flags: null }, { t: 'STR R1, [R0]', flags: null },
      { t: 'BNE fin', flags: null, pre: 'CMP R0, R1' }, { t: 'ADDEQ R1, R2, R3', flags: null, note: 'con Z = 0' }
    ];
    host.classList.add('cycle');
    host.innerHTML = `<div class="lab-ctl"><span class="seg" role="group" aria-label="Instrucción">${CASES.map((c, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}"><span class="mono">${esc(c.t)}</span></button>`).join('')}</span></div>
      <div class="cyc-body"><div class="cyc-dg"></div><div class="cyc-side"><div class="cyc-stages" role="group" aria-label="Etapas"></div><div class="cyc-txt panel tight" aria-live="polite"></div>
      <div class="btn-row"><button class="btn sm go" data-a="play" type="button">Reproducir el ciclo</button><button class="btn sm ghost" data-a="next" type="button">Siguiente etapa</button></div></div></div>`;
    const dg = root.CpuDiagram.create($('.cyc-dg', host));
    const stagesEl = $('.cyc-stages', host), txt = $('.cyc-txt', host);
    let stages = [], idx = -1, cur = 0, timer;
    function build(i) {
      cur = i; clearTimeout(timer);
      const c = CASES[i];
      const src = (c.pre ? c.pre + '\n' : '') + c.t.replace(/fin/, 'FIN') + '\nFIN';
      const p = ARM.assemble('MOV R0,#1\nMOV R1,#2\n' + src.replace(/^/, ''));
      const m = new ARM.Machine(p); let rec; const target = c.t.replace(/fin/, 'FIN');
      for (let k = 0; k < 8 && !m.halted; k++) { const r = m.step(); if (r && r.ins.src.replace(/\s+/g, ' ').toUpperCase() === target.replace(/\s+/g, ' ').toUpperCase()) { rec = r; break; } }
      if (!rec) { stages = []; return; }
      stages = dg.plan(rec); idx = -1; dg.reset(); paintStages(); txt.innerHTML = `<b class="mono">${esc(c.t)}</b>${c.note ? ' <span class="dim">(' + c.note + ')</span>' : ''}<br>Pulsa «Reproducir el ciclo» o avanza etapa por etapa.`;
      stagesEl.dataset.exec = rec.executed ? '1' : '0';
    }
    function paintStages() {
      stagesEl.innerHTML = stages.map((s, i) => `<button type="button" class="stg ${i === idx ? 'on' : ''}" data-s="${i}">${root.CpuDiagram.STAGE_NAMES[s.name]}</button>`).join('');
    }
    function go(i) {
      idx = i; const s = stages[i]; dg.setStage(s); paintStages();
      txt.innerHTML = `<b>${root.CpuDiagram.STAGE_NAMES[s.name]}.</b> ${s.note || root.CpuDiagram.STAGE_TEXT[s.name]}`;
    }
    host.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (b) { $$('[data-i]', host).forEach(x => x.setAttribute('aria-pressed', x === b)); build(+b.dataset.i); return; }
      const s = e.target.closest('[data-s]'); if (s) { clearTimeout(timer); go(+s.dataset.s); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      clearTimeout(timer);
      if (a.dataset.a === 'next') go((idx + 1) % stages.length);
      else { let k = 0; const step = () => { if (k >= stages.length) return; go(k++); timer = setTimeout(step, 1700); }; step(); }
    });
    build(0);
  };

  /* ------------------------------------ RISC vs CISC ------------------------------------ */
  W.riscCisc = function (host) {
    host.classList.add('lab');
    const D = {
      cisc: { title: 'CISC (p. ej. VAX, x86)', code: 'ADD  z, x, y        @ una sola instrucción con operandos en memoria', n: 1, len: 'variable (de 1 a más de 10 bytes)', cyc: 'varios ciclos y de duración distinta', note: 'Instrucciones potentes y de longitud variable, con muchos modos de direccionamiento. El programa ocupa menos, pero decodificar y segmentar es más difícil.' },
      risc: { title: 'RISC (ARM)', code: 'LDR  R1, [R4]       @ x\nLDR  R2, [R5]       @ y\nADD  R3, R1, R2\nSTR  R3, [R6]       @ z', n: 4, len: 'fija: 32 bits', cyc: 'instrucciones simples, ciclo regular', note: 'Instrucciones simples y de longitud fija. Solo LDR/STR acceden a memoria (el resto opera con registros), hay pocos formatos y muchos registros: fácil de decodificar y de segmentar.' }
    };
    host.innerHTML = `<div class="lab-ctl"><span class="seg" role="group" aria-label="Estilo de arquitectura"><button type="button" data-k="cisc" aria-pressed="false">CISC</button><button type="button" data-k="risc" aria-pressed="true">RISC</button></span><span class="small dim">Ejemplo: z = x + y con x, y, z en memoria (ilustrativo)</span></div><div class="rc-body"></div>`;
    const body = $('.rc-body', host);
    function show(k) { const d = D[k]; body.innerHTML = `<div class="rc-grid"><div><h4>${d.title}</h4><pre class="rc-code">${root.Asm.highlight(d.code)}</pre></div><dl class="rc-dl"><dt>Instrucciones</dt><dd class="mono">${d.n}</dd><dt>Longitud</dt><dd>${d.len}</dd><dt>Ejecución</dt><dd>${d.cyc}</dd></dl></div><p>${d.note}</p>`; $$('[data-k]', host).forEach(x => x.setAttribute('aria-pressed', x.dataset.k === k)); }
    host.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) show(b.dataset.k); });
    show('risc');
  };
})(window);
