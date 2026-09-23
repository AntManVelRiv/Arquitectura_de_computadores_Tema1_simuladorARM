/* practice.js — 14 ejercicios del tema (con corrección automática) y test de repaso */
(function (root) {
  'use strict';
  const App = root.App, ARM = root.ARM, esc = root.Asm.esc, $ = App.$, $$ = App.$$;
  const hx = v => ARM.hex(v);

  /* ======================================================================= */
  /* ============================= EJERCICIOS ============================= */
  /* ======================================================================= */
  const EX = [
    { id: 'ej3', kind: 'reflect', n: '3', title: 'Esquema del procesador', mod: 'm12',
      stmt: `<p>Dado el esquema completo del camino de datos y la unidad de control de un procesador ARM simplificado (el que aparece en las diapositivas del tema, similar al diagrama interactivo de 1.2):</p>
      <ol><li>Identifica las entradas y salidas de la unidad de control.</li><li>Describe qué valores debe tomar la señal <code>PCSrc</code> para que se ejecuten instrucciones consecutivas.</li><li>¿Se ajusta al modelo de procesador Von Neumann?</li></ol>`,
      hint: `<p><b>1.</b> Entradas: los campos de la instrucción (cond, op, funct…) y los flags. Salidas: todas las señales de control (RegWrite, ALUSrc, ALUControl, MemWrite, MemtoReg, PCSrc…).</p><p><b>2.</b> Para instrucciones consecutivas, PC debe tomar siempre PC + 4, así que <code>PCSrc</code> debe seleccionar esa entrada del multiplexor (no la del salto).</p><p><b>3.</b> Sí: programa e instrucciones comparten el mismo espacio de memoria y se accede a través de un único camino de datos y unos buses compartidos — la idea central de Von Neumann.</p>` },
    { id: 'ej4', kind: 'reflect', n: '4', title: 'Evolución de los procesadores', mod: 'm14',
      stmt: `<ol><li>Describe cómo se reflejan en la gráfica de la Ley de Moore (widget de 1.4) los hitos de la evolución de los procesadores que hemos destacado.</li><li>¿Se puede afirmar que los núcleos de los procesadores actuales tienen más rendimiento que los de los procesadores anteriores?</li></ol>`,
      hint: `<p><b>1.</b> Los puntos de datos reales (Intel 4004 → Core i7-5960X) crecen aproximadamente en línea recta en la escala logarítmica de transistores, cerca de la predicción de Moore; en frecuencia, en cambio, se ven crecer hasta 2004 y luego estancarse; en núcleos, el salto ocurre justo cuando la frecuencia se estanca.</p><p><b>2.</b> Sí en términos absolutos (más transistores, más caché, mejor microarquitectura por núcleo), aunque la frecuencia por núcleo no ha crecido al mismo ritmo — la mejora ya no viene solo de «correr más rápido» sino de hacer más cosas en paralelo.</p>` },
    { id: 'ej5', kind: 'reflect', n: '5', title: 'El procesador de tu móvil', mod: 'm14',
      stmt: `<p>Describe las principales características del procesador de tu propio teléfono móvil:</p><ul><li>número de núcleos</li><li>frecuencia de funcionamiento</li><li>memoria RAM</li><li>tecnología o escala de integración (nm)</li></ul>`,
      hint: `<p>Busca el modelo exacto de tu teléfono (Ajustes → Información del teléfono) y su ficha técnica. Comprueba que, aunque sea un dispositivo pequeño, es ya multinúcleo (normalmente entre 4 y 8 núcleos) y con una escala de integración de pocos nanómetros — la misma Ley de Moore que se ve en el widget de 1.4.</p>` },
    { id: 'ej6', kind: 'reflect', n: '6', title: 'Identificar operandos', mod: 'm15a',
      stmt: `<p>Identifica los operandos de las siguientes instrucciones:</p>${App.code('ADD R1, R2, R3\nSUB R1, R3, #8\nLDR R5, [R4, #8]', { sim: false })}`,
      hint: `<ul><li><code>ADD R1, R2, R3</code> — tres operandos <b>registro</b>: R1 (destino), R2 y R3 (fuente).</li><li><code>SUB R1, R3, #8</code> — dos registros (R1 destino, R3 fuente) y un <b>inmediato</b> (#8).</li><li><code>LDR R5, [R4, #8]</code> — R5 es el registro destino; <code>[R4, #8]</code> es un operando de <b>memoria</b>: la dirección se calcula como R4 + 8.</li></ul>` },
    { id: 'ej7', kind: 'code', n: '7', title: 'Lógicas y desplazamientos', mod: 'm15b',
      stmt: `<p>Con los registros fuente:</p>${App.code('R7  00001111 10101111 11110000 11000011\nR3  10110100 11010110 10110010 01101000\nR4  00000000 00000000 00000000 00001001', { sim: false })}<p>Define la actuación de las siguientes instrucciones (calcula el resultado en R1 para cada una) y, además, indica a qué operación aritmética corresponden los desplazamientos a la derecha y a la izquierda:</p>${App.code('AND R1,R7,R3\nMVN R1,R7\nLSL R1,R7,#10\nASR R1,R3,#7\nLSL R1,R7,R4\nASR R1,R3,R4', { sim: false })}`,
      starter: `@ Registros fuente ya cargados: no los modifiques\nLDR  R7, =0x0FAFF0C3\nLDR  R3, =0xB4D6B268\nMOV  R4, #9\n\n@ Escribe aquí las 6 instrucciones. Usa R1 como destino en cada una\n@ (puedes usar más registros si lo necesitas, p. ej. R5, R6...)\n`,
      checks: [{ label: 'AND R1,R7,R3', reg: 1, expect: 0x0486B040 },
        { label: 'MVN R1,R7', reg: 1, expect: 0xF0500F3C },
        { label: 'LSL R1,R7,#10', reg: 1, expect: 0x5FE18600 },
        { label: 'ASR R1,R3,#7', reg: 1, expect: 0xFF69AD64 },
        { label: 'LSL R1,R7,R4', reg: 1, expect: 0xBFC30C00 },
        { label: 'ASR R1,R3,R4', reg: 1, expect: 0xFFDA6B59 }],
      sol: `LDR  R7, =0x0FAFF0C3\nLDR  R3, =0xB4D6B268\nMOV  R4, #9\nAND  R1, R7, R3\nMVN  R1, R7\nLSL  R1, R7, #10\nASR  R1, R3, #7\nLSL  R1, R7, R4\nASR  R1, R3, R4` },
    { id: 'ej8', kind: 'code', n: '8', title: 'CMP, ADDEQ y SUBS', mod: 'm15b',
      stmt: `<p>Con R7 = 0x0FAFF0C3, R3 = 0x00000009 y R4 = 0x00000009:</p><ol><li>Define la actuación de <code>CMP R3,R4</code> seguida de <code>ADDEQ R1,R4,R3</code>, y de <code>CMP R7,R3</code> seguida de <code>ADDEQ R2,R4,R3</code>.</li><li>¿En qué se diferencia la actuación de <code>SUBS R5,R3,R4</code> y de <code>CMP R3,R4</code>?</li></ol>`,
      starter: `MOV  R3, #9\nMOV  R4, #9\nLDR  R7, =0x0FAFF0C3\n\n@ 1) CMP R3,R4 seguido de ADDEQ con destino R1\n\n\n@ 2) CMP R7,R3 seguido de ADDEQ con destino R2 (para no pisar R1)\n\n\n@ 3) SUBS con destino R5\n`,
      checks: [{ label: 'R1 tras CMP R3,R4 + ADDEQ R1,R4,R3 (se cumple EQ)', reg: 1, expect: 18 },
        { label: 'R2 tras CMP R7,R3 + ADDEQ R2,R4,R3 (NO se cumple EQ: R2 sigue a 0)', reg: 2, expect: 0 },
        { label: 'R5 tras SUBS R5,R3,R4 (si guarda el resultado)', reg: 5, expect: 0 }],
      sol: `MOV    R3, #9\nMOV    R4, #9\nLDR    R7, =0x0FAFF0C3\nCMP    R3, R4\nADDEQ  R1, R4, R3\nCMP    R7, R3\nADDEQ  R2, R4, R3\nSUBS   R5, R3, R4` },
    { id: 'ej9', kind: 'code', n: '9', title: 'if / if-else sin predicación', mod: 'm15b',
      stmt: `<p>Expresa en ensamblador (con saltos, sin instrucciones predicadas):</p><div class="grid two"><div>${App.code('if (nuevo == 1) {\n    total = total + 1;\n    b = b - 1;\n}', { sim: false })}</div><div>${App.code('if (nuevo != 0) {\n    total = total + nuevo;\n} else {\n    n = n + 1;\n}', { sim: false })}</div></div><p class="dim small">Parte a: R0 = nuevo, R1 = total, R2 = b. Parte b (usa otros registros para no pisar la parte a): R3 = nuevo, R4 = total, R5 = n.</p>`,
      starter: `@ --- Parte a) ---\nMOV  R0, #1        @ nuevo\nMOV  R1, #10       @ total\nMOV  R2, #5        @ b\n\n@ tu código aquí\n\n\n@ --- Parte b) ---\nMOV  R3, #7        @ nuevo (prueba != 0)\nMOV  R4, #10       @ total\nMOV  R5, #0        @ n\n\n@ tu código aquí\n`,
      checks: [{ label: 'a) total (R1) tras el if', reg: 1, expect: 11 }, { label: 'a) b (R2) tras el if', reg: 2, expect: 4 },
        { label: 'b) total (R4), con nuevo = 7 (≠0)', reg: 4, expect: 17 }],
      hint: `<p>Para la parte (b), recuerda que si <code>nuevo == 0</code> debe ejecutarse el <code>else</code> (n = n+1) y no el <code>if</code>. Con nuevo = 7, se ejecuta el <code>if</code>: total = 10 + 7 = 17.</p>`,
      sol: `@ Parte a)\nMOV  R0, #1\nMOV  R1, #10\nMOV  R2, #5\nCMP  R0, #1\nBNE  FIN_A\nADD  R1, R1, #1\nSUB  R2, R2, #1\nFIN_A\n\n@ Parte b)\nMOV  R3, #7\nMOV  R4, #10\nMOV  R5, #0\nCMP  R3, #0\nBEQ  ELSE_B\nADD  R4, R4, R3\nB    FIN_B\nELSE_B  ADD  R5, R5, #1\nFIN_B` },
    { id: 'ej10', kind: 'code', n: '10', title: 'if / if-else predicado', mod: 'm15b',
      stmt: `<p>Repite el ejercicio anterior usando <b>instrucciones predicadas</b> (sin saltos):</p><div class="grid two"><div>${App.code('if (nuevo == 1) {\n    total = total + 1;\n    b = b - 1;\n}', { sim: false })}</div><div>${App.code('if (nuevo != 0) {\n    total = total + nuevo;\n} else {\n    n = n + 1;\n}', { sim: false })}</div></div>`,
      starter: `@ --- Parte a) ---\nMOV  R0, #1        @ nuevo\nMOV  R1, #10       @ total\nMOV  R2, #5        @ b\n\n@ tu código aquí (usa CMP y sufijos EQ)\n\n\n@ --- Parte b) ---\nMOV  R3, #7        @ nuevo\nMOV  R4, #10       @ total\nMOV  R5, #0        @ n\n\n@ tu código aquí (usa CMP y sufijos NE/EQ)\n`,
      checks: [{ label: 'a) total (R1)', reg: 1, expect: 11 }, { label: 'a) b (R2)', reg: 2, expect: 4 }, { label: 'b) total (R4), con nuevo = 7', reg: 4, expect: 17 }],
      sol: `MOV    R0, #1\nMOV    R1, #10\nMOV    R2, #5\nCMP    R0, #1\nADDEQ  R1, R1, #1\nSUBEQ  R2, R2, #1\n\nMOV    R3, #7\nMOV    R4, #10\nMOV    R5, #0\nCMP    R3, #0\nADDNE  R4, R4, R3\nADDEQ  R5, R5, #1` },
    { id: 'ej11', kind: 'code', n: '11', title: 'Bucle while', mod: 'm15b',
      stmt: `<p>Expresa en ensamblador:</p>${App.code('a = 37;\nl = 0;\nresultado = 1;\nwhile (resultado != 0) {\n    resultado = a / 2;\n    l = l + 1;\n    a = resultado;\n}', { sim: false })}<p class="dim small">Usa R0 = a, R1 = l, R2 = resultado. Como ARM no tiene división directa, usa un desplazamiento (<code>LSR #1</code>) para dividir entre 2.</p>`,
      starter: `MOV  R0, #37       @ a\nMOV  R1, #0        @ l\nMOV  R2, #1        @ resultado (≠0 para entrar al bucle)\n\n@ tu bucle aquí\n`,
      checks: [{ label: 'l (R1) al terminar (nº de veces que a se divide entre 2 hasta llegar a 0)', reg: 1, expect: 6 }, { label: 'resultado (R2) al terminar', reg: 2, expect: 0 }],
      sol: `MOV    R0, #37\nMOV    R1, #0\nMOV    R2, #1\nWHILE  CMP  R2, #0\nBEQ    FIN\nMOV    R2, R0, LSR #1\nMOV    R0, R2\nADD    R1, R1, #1\nB      WHILE\nFIN` },
    { id: 'ej12', kind: 'code', n: '12', title: 'Recorrer un array (×8)', mod: 'm15b',
      stmt: `<p>Expresa en ensamblador, con <b>post-indexación</b>:</p>${App.code('int i;\nint array[6];\nfor (i = 0; i < 6; i = i + 1) {\n    array[i] = array[i] * 8;\n}', { sim: false })}`,
      starter: `        .data\narray:  .word 1, 2, 3, 4, 5, 6\n        .text\n        LDR  R0, =array   @ puntero al elemento actual\n\n@ tu bucle aquí (usa post-indexación: [R0], #4)\n`,
      checks: [{ label: 'Memoria: array[] tras el bucle', mem: 'array', expect: [8, 16, 24, 32, 40, 48] }],
      sol: `        .data\narray:  .word 1, 2, 3, 4, 5, 6\n        .text\n        LDR  R0, =array\n        ADD  R1, R0, #24\nLOOP    CMP  R0, R1\n        BGE  FIN\n        LDR  R2, [R0]\n        MOV  R2, R2, LSL #3\n        STR  R2, [R0], #4\n        B    LOOP\nFIN` },
    { id: 'ej13', kind: 'code', n: '13', title: 'Bytes: array de caracteres', mod: 'm15b',
      stmt: `<p>Expresar en ensamblador:</p>${App.code('int i;\nchar array[5], T[5];\nfor (i = 0; i < 5; i = i + 1) {\n    array[i] = T[i] + 20;\n}', { sim: false })}`,
      starter: `        .data\nT:      .byte 1, 2, 3, 4, 5\narray:  .space 5\n        .text\n        LDR  R0, =T\n        LDR  R1, =array\n\n@ tu bucle aquí (usa LDRB/STRB)\n`,
      checks: [{ label: 'Memoria: array[] = T[] + 20', mem: 'array', bytes: true, expect: [21, 22, 23, 24, 25] }],
      sol: `        .data\nT:      .byte 1, 2, 3, 4, 5\narray:  .space 5\n        .text\n        LDR  R0, =T\n        LDR  R1, =array\n        MOV  R2, #0\nFOR     CMP  R2, #5\n        BGE  FIN\n        LDRB R3, [R0, R2]\n        ADD  R3, R3, #20\n        STRB R3, [R1, R2]\n        ADD  R2, R2, #1\n        B    FOR\nFIN` },
    { id: 'ej14', kind: 'code', n: '14', title: 'x = reduce(3, 4, 5)', mod: 'm15d',
      stmt: `<p>Expresar en ensamblador:</p>${App.code('void main() {\n    int x;\n    x = reduce(3, 4, 5);\n}\n\nint reduce(int a, int b, int c) {\n    int sum;\n    sum = a + b + c;\n    return sum;\n}', { sim: false })}`,
      starter: `main:   MOV  R0, #3\n        MOV  R1, #4\n        MOV  R2, #5\n        BL   REDUCE\n        MOV  R4, R0     @ x\n        SWI  0x11\n\n@ escribe aquí la función REDUCE\n`,
      checks: [{ label: 'x (R4) tras la llamada', reg: 4, expect: 12 }],
      sol: `main:   MOV  R0, #3\n        MOV  R1, #4\n        MOV  R2, #5\n        BL   REDUCE\n        MOV  R4, R0\n        SWI  0x11\nREDUCE: ADD  R3, R0, R1\n        ADD  R3, R3, R2\n        MOV  R0, R3\n        MOV  PC, LR` },
    { id: 'ejf', kind: 'code', n: 'clase', title: 'Factorial recursivo', mod: 'm15d',
      stmt: `<p>Ejercicio de clase: escribe una función recursiva <code>FACTORIAL</code> tal que <code>factorial(n) = n · factorial(n − 1)</code>, con caso base <code>factorial(1) = 1</code>. Recuerda apilar lo que necesites recuperar tras la llamada recursiva.</p>`,
      starter: `main:   MOV  R0, #4\n        BL   FACTORIAL\n        MOV  R4, R0     @ 4! = 24\n        SWI  0x11\n\n@ escribe aquí FACTORIAL (usa PUSH/POP)\n`,
      checks: [{ label: 'R4 = 4!', reg: 4, expect: 24 }],
      sol: `main:      MOV  R0, #4\n           BL   FACTORIAL\n           MOV  R4, R0\n           SWI  0x11\nFACTORIAL  PUSH {R0, LR}\n           CMP  R0, #1\n           BGT  ELSE\n           MOV  R0, #1\n           ADD  SP, SP, #8\n           MOV  PC, LR\nELSE       SUB  R0, R0, #1\n           BL   FACTORIAL\n           POP  {R1, LR}\n           MUL  R0, R1, R0\n           MOV  PC, LR` },
    { id: 'ejs', kind: 'code', n: 'clase', title: 'SumaCuadrados(n) recursivo', mod: 'm15d',
      stmt: `<p>Ejercicio de clase: <code>SumaCuadrados(n) = 1² + 2² + … + n²</code>, con caso base <code>SumaCuadrados(1) = 1</code>.</p>`,
      starter: `main:   MOV  R0, #4\n        BL   SUMACUAD\n        MOV  R4, R0     @ 1+4+9+16 = 30\n        SWI  0x11\n\n@ escribe aquí SUMACUAD (usa PUSH/POP)\n`,
      checks: [{ label: 'R4 = 1² + 2² + 3² + 4²', reg: 4, expect: 30 }],
      sol: `main:     MOV  R0, #4\n          BL   SUMACUAD\n          MOV  R4, R0\n          SWI  0x11\nSUMACUAD  PUSH {R0, LR}\n          CMP  R0, #1\n          BGT  ELSE\n          MOV  R0, #1\n          ADD  SP, SP, #8\n          MOV  PC, LR\nELSE      SUB  R0, R0, #1\n          BL   SUMACUAD\n          POP  {R1, LR}\n          MUL  R2, R1, R1\n          ADD  R0, R0, R2\n          MOV  PC, LR` }
  ];

  function grade(ex, src) {
    const p = ARM.assemble(src);
    if (!p.ok) return { ok: false, results: [{ label: 'Ensamblado', pass: false, msg: p.errors[0] ? `Línea ${p.errors[0].line}: ${p.errors[0].msg}` : 'Error' }] };
    const m = new ARM.Machine(p); m.run(300000);
    const results = ex.checks.map(c => {
      if (c.mem != null) {
        const base = p.symbols[c.mem];
        if (base == null) return { label: c.label, pass: false, msg: `No se encontró la etiqueta «${c.mem}»` };
        const got = c.expect.map((_, i) => c.bytes ? m.rb(base + i) : m.rw(base + 4 * i));
        const pass = JSON.stringify(got) === JSON.stringify(c.expect);
        return { label: c.label, pass, msg: pass ? 'Correcto' : `Se obtuvo [${got.join(', ')}], se esperaba [${c.expect.join(', ')}]` };
      }
      const got = m.r[c.reg]; const pass = (got >>> 0) === (c.expect >>> 0);
      return { label: c.label, pass, msg: pass ? `${ARM.REG_LABEL(c.reg)} = ${hx(got)} — correcto` : `${ARM.REG_LABEL(c.reg)} = ${hx(got)}, se esperaba ${hx(c.expect)}` };
    });
    if (!m.halted || m.haltKind === 'error') results.push({ label: 'Ejecución', pass: false, msg: m.haltReason || 'El programa no ha terminado (¿bucle infinito?)' });
    return { ok: results.every(r => r.pass), results };
  }

  function html() {
    return `<header class="view-head"><p class="eyebrow">Tema 1 · Práctica</p><h1>Ejercicios</h1><p class="lede">Los ejercicios del tema. Los de código se comprueban automáticamente ejecutando tu programa; los de reflexión no tienen una única respuesta correcta, pero puedes comparar con una propuesta de solución.</p></header>
    <div class="ex-layout">
      <nav class="ex-list" id="ex-nav" aria-label="Lista de ejercicios">${EX.map(e => `<button type="button" data-id="${e.id}"><span class="en">${e.n === 'clase' ? '★' : e.n}</span>${esc(e.title)}</button>`).join('')}</nav>
      <div class="ex-body panel" id="ex-body"></div>
    </div>`;
  }
  function init(sec) {
    const nav = $('#ex-nav', sec), body = $('#ex-body', sec);
    function paint(id) {
      const ex = EX.find(x => x.id === id) || EX[0];
      $$('button', nav).forEach(b => { b.setAttribute('aria-current', b.dataset.id === ex.id); b.classList.toggle('done', !!App.state.ex[ex.id]); });
      let inner = `<span class="eyebrow">Ejercicio ${ex.n === 'clase' ? 'de clase' : ex.n} · <a href="#/${ex.mod}">${ex.mod.startsWith('m15') ? '1.5' : ex.mod.replace('m1', '1.')}</a></span><h2>${esc(ex.title)}</h2><div class="ex-stmt">${ex.stmt}</div>`;
      if (ex.kind === 'code') {
        inner += `<div class="ex-ed panel tight"><div id="ex-editor"></div></div>
        <div class="btn-row"><button class="btn go" type="button" id="ex-check">Comprobar</button><button class="btn ghost" type="button" id="ex-reset">Reiniciar código</button></div>
        <div class="ex-res" id="ex-res"></div>
        <details class="reveal ex-sol"><summary>Ver una solución</summary><div>${App.code(ex.sol, { title: 'Solución propuesta' })}</div></details>`;
      } else {
        inner += `<details class="reveal"><summary>Ver una propuesta de respuesta</summary><div>${ex.hint}</div></details>
        <label class="chip check" style="margin-top:1rem"><input type="checkbox" data-ex-done="${ex.id}" ${App.state.ex[ex.id] ? 'checked' : ''}> <span>Marcar como completado</span></label>`;
      }
      body.innerHTML = inner;
      if (ex.kind === 'code') {
        const key = 'exsrc_' + ex.id;
        const ed = new root.AsmEditor($('#ex-editor', body), { value: App.state[key] || ex.starter, onChange: v => { App.state[key] = v; App.save(); } });
        $('#ex-check', body).addEventListener('click', () => {
          const r = grade(ex, ed.getValue());
          $('#ex-res', body).innerHTML = r.results.map(x => `<div class="tc ${x.pass ? 'pass' : 'fail'}"><span class="st">${x.pass ? '✓' : '✗'}</span><span>${esc(x.label)}<br><span class="dim small">${esc(x.msg)}</span></span></div>`).join('');
          if (r.ok) { App.state.ex[ex.id] = true; App.save(); App.refreshProgress(); App.toast('¡Correcto!'); $$('button', nav).forEach(b => { if (b.dataset.id === ex.id) b.classList.add('done'); }); }
        });
        $('#ex-reset', body).addEventListener('click', () => { if (confirm('¿Borrar tu código y volver a la plantilla?')) { ed.setValue(ex.starter); delete App.state[key]; App.save(); $('#ex-res', body).innerHTML = ''; } });
      } else {
        body.addEventListener('change', function h(e) { const c = e.target.closest('[data-ex-done]'); if (c) { App.state.ex[ex.id] = c.checked; App.save(); App.refreshProgress(); } }, { once: true });
      }
    }
    nav.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) { paint(b.dataset.id); body.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    App.totals.ex = EX.length;
    paint(EX[0].id);
  }
  App.register('ex', { title: 'Ejercicios', wide: true, html, init });

  /* ======================================================================= */
  /* ============================== TEST DE REPASO ========================== */
  /* ======================================================================= */
  const Q = [
    { q: '¿Qué modelo de computador comparten prácticamente todos los sistemas actuales, sean móviles, PCs o servidores?', a: ['Harvard', 'Von Neumann', 'RISC', 'CISC'], c: 1, exp: 'El modelo de Von Neumann: programa y datos comparten el mismo espacio de memoria.' },
    { q: 'En el camino de datos, ¿qué registro guarda la dirección de la siguiente instrucción a ejecutar?', a: ['IR', 'SR', 'PC', 'LR'], c: 2, exp: 'PC (Program Counter). IR guarda la instrucción ya leída, no su dirección.' },
    { q: '¿Cuál de estos NO es uno de los cuatro tipos de bus vistos en el tema?', a: ['Bus de datos', 'Bus de direcciones', 'Bus de reloj', 'Bus de control'], c: 2, exp: 'Los cuatro son: datos, direcciones, control y alimentación. El «bus de reloj» no se estudia como categoría propia.' },
    { q: 'Si varios dispositivos transmiten a la vez por el mismo bus, ¿cómo se llama el problema que se produce?', a: ['Contención de bus', 'Desbordamiento', 'Segmentación', 'Paginación'], c: 0, exp: 'Contención de bus: las señales se solapan y se corrompen.' },
    { q: 'Según la Ley de Moore (formulación original), ¿qué se duplica periódicamente?', a: ['La frecuencia de reloj', 'El número de transistores por chip', 'El número de núcleos', 'El tamaño de la memoria RAM'], c: 1, exp: 'Gordon Moore predijo la duplicación del número de transistores integrables en un chip.' },
    { q: '¿Por qué dejó de crecer la frecuencia de reloj hacia 2004-2005 a pesar de seguir cumpliéndose la Ley de Moore?', a: ['Se agotaron los materiales semiconductores', 'La potencia disipada crece con el cuadrado de la frecuencia (no se podía refrigerar)', 'Los compiladores no lo permitían', 'Por decisión comercial de los fabricantes'], c: 1, exp: 'El «muro de potencia»: a más frecuencia, la disipación de calor crece cuadráticamente y se vuelve inviable de refrigerar.' },
    { q: '¿Qué estrategia adoptó la industria al topar con el límite de frecuencia?', a: ['Reducir el número de registros', 'Volver a CISC', 'Replicar núcleos (multinúcleo)', 'Eliminar la caché'], c: 2, exp: 'Los transistores extra se dedicaron a añadir núcleos en paralelo en lugar de acelerar uno solo.' },
    { q: '¿Cuál de estas es una característica típica de una arquitectura RISC como ARM?', a: ['Instrucciones de longitud variable', 'Muchos modos de direccionamiento complejos', 'Instrucciones de longitud fija y solo LDR/STR acceden a memoria', 'El acceso a memoria se hace desde cualquier instrucción'], c: 2, exp: 'RISC: instrucciones simples y de longitud fija; solo LDR/STR tocan memoria (load/store architecture).' },
    { q: 'En ARMv4, ¿cuántos registros de propósito general hay en el banco de registros?', a: ['8', '16', '32', '64'], c: 1, exp: '16 registros: R0-R15.' },
    { q: '¿Qué registro hace de puntero de pila (Stack Pointer) por convención en ARM?', a: ['R11', 'R12', 'R13', 'R15'], c: 2, exp: 'R13 = SP.' },
    { q: '¿Qué registro guarda la dirección de retorno tras una llamada BL?', a: ['R12', 'R13', 'R14', 'R15'], c: 2, exp: 'R14 = LR (Link Register).' },
    { q: 'Por convención, ¿en qué registros se pasan los primeros argumentos de una función y en cuál se devuelve el resultado?', a: ['R0-R3 argumentos, R0 resultado', 'R4-R7 argumentos, R12 resultado', 'R0-R3 argumentos, R15 resultado', 'Todos en la pila'], c: 0, exp: 'R0-R3 para los primeros cuatro argumentos; R0 para el resultado.' },
    { q: '¿Qué instrucción usarías para poner a 1 los bits de R1 marcados en una máscara, dejando el resto igual?', a: ['AND R1, R1, #máscara', 'ORR R1, R1, #máscara', 'BIC R1, R1, #máscara', 'EOR R1, R1, #máscara'], c: 1, exp: 'ORR pone a 1 los bits marcados en la máscara sin tocar el resto.' },
    { q: '¿Qué instrucción pone a 0 los bits de R1 marcados en una máscara (R3), dejando el resto igual?', a: ['AND R1, R1, R3', 'ORR R1, R1, R3', 'BIC R1, R1, R3', 'MVN R1, R3'], c: 2, exp: 'BIC calcula R1 AND (NOT R3): borra los bits marcados en R3.' },
    { q: 'LSL R1, R2, #3 equivale a…', a: ['R1 = R2 / 8', 'R1 = R2 × 8', 'R1 = R2 × 3', 'R1 = R2 − 3'], c: 1, exp: 'Desplazar 3 bits a la izquierda multiplica por 2³ = 8 (sin desbordamiento).' },
    { q: '¿Qué diferencia hay entre LSR y ASR al desplazar a la derecha?', a: ['Ninguna, son sinónimos', 'LSR rellena con ceros (sin signo); ASR copia el bit de signo (con signo)', 'LSR es para memoria, ASR para registros', 'ASR solo funciona con inmediatos'], c: 1, exp: 'LSR = lógico (sin signo, rellena con 0). ASR = aritmético (con signo, copia el bit más alto).' },
    { q: 'CMP R3, R4 realiza internamente…', a: ['R3 + R4 y guarda el resultado en R3', 'R3 − R4 y actualiza los flags sin guardar el resultado', 'R4 − R3 y guarda el resultado en R4', 'Una copia de R4 en R3'], c: 1, exp: 'CMP es como SUBS pero descarta el resultado; solo actualiza NZCV.' },
    { q: '¿Qué condición comprueba si el flag Z vale 1?', a: ['NE', 'EQ', 'CS', 'MI'], c: 1, exp: 'EQ (equal) se cumple cuando Z = 1.' },
    { q: 'Para comparar dos números CON SIGNO y saber si A > B, ¿qué condición usarías tras CMP A, B?', a: ['HI', 'GT', 'CS', 'VS'], c: 1, exp: 'GT es la comparación con signo (usa N y V). HI es la versión sin signo (usa C y Z).' },
    { q: 'Para comparar dos números SIN SIGNO y saber si A es mayor, ¿qué condición usarías?', a: ['GT', 'HI', 'LT', 'VC'], c: 1, exp: 'HI (unsigned higher) usa el flag C, adecuado para valores sin signo.' },
    { q: '¿Cuál es la única forma de acceder a memoria en el repertorio ARM?', a: ['Cualquier instrucción aritmética', 'MOV', 'LDR y STR', 'CMP'], c: 2, exp: 'Solo LDR (load) y STR (store) acceden a memoria; el resto opera con registros.' },
    { q: 'En LDR R2, [R0, #8]! (pre-indexado), ¿qué ocurre con R0?', a: ['No cambia', 'Se actualiza a R0+8 antes de usarlo como dirección', 'Se actualiza a R0+8 después de usarlo', 'Se pone a 0'], c: 1, exp: 'El «!» indica pre-indexado: primero R0 ← R0+8, y esa es la dirección usada.' },
    { q: 'En LDR R2, [R0], #8 (post-indexado), ¿qué dirección se usa para el acceso?', a: ['R0 + 8', 'R0 (el valor antes de sumar)', '8 (el inmediato solo)', 'La dirección de R2'], c: 1, exp: 'Post-indexado: se usa R0 tal cual, y solo después R0 ← R0 + 8.' },
    { q: '¿Qué instrucción usarías para cargar un solo byte con signo extendiéndolo a 32 bits?', a: ['LDR', 'LDRB', 'LDRSB', 'STRB'], c: 2, exp: 'LDRSB (load register signed byte) extiende el signo del byte a los 32 bits del registro.' },
    { q: 'ARM guarda las palabras en memoria en formato…', a: ['Big-endian', 'Little-endian', 'Depende de la instrucción', 'No define un orden'], c: 1, exp: 'ARM (en su configuración habitual, la vista en el tema) usa little-endian: el byte menos significativo va en la dirección más baja.' },
    { q: 'Toda instrucción ARMv4 ocupa…', a: ['16 bits siempre', '32 bits siempre', 'Entre 8 y 32 bits, según el tipo', '64 bits siempre'], c: 1, exp: 'Formato de longitud fija: siempre 32 bits, sea cual sea su tipo.' },
    { q: '¿Cuáles son los tres formatos de instrucción de ARMv4?', a: ['Registro, memoria, pila', 'Procesado de datos, memoria, salto', 'Aritmética, lógica, control', 'Carga, almacenamiento, salto'], c: 1, exp: 'Procesado de datos (aritmético-lógicas), memoria (LDR/STR) y salto (B/BL).' },
    { q: '¿Qué campo ocupa siempre los bits 31:28 de una instrucción ARMv4?', a: ['El registro destino Rd', 'El código de condición (cond)', 'El opcode completo', 'El desplazamiento'], c: 1, exp: 'Los 4 bits más altos son siempre «cond», el código de condición.' },
    { q: '¿Qué hace BL además de saltar a la etiqueta?', a: ['Guarda el valor de PC en LR', 'Vacía la pila', 'Pone a cero todos los flags', 'Incrementa SP'], c: 0, exp: 'BL (Branch and Link) guarda en LR la dirección de retorno antes de saltar.' },
    { q: '¿Cómo vuelve una función de una llamada realizada con BL?', a: ['Con RET', 'Con POP PC', 'Con MOV PC, LR', 'Automáticamente al final del archivo'], c: 2, exp: 'MOV PC, LR copia la dirección de retorno guardada en LR al contador de programa.' },
    { q: '¿Hacia qué direcciones crece la pila en ARM?', a: ['Hacia direcciones superiores', 'Hacia direcciones inferiores', 'No tiene una dirección fija', 'Depende del sistema operativo'], c: 1, exp: 'La pila crece hacia direcciones inferiores (menores); SP guarda siempre la dirección más baja ocupada.' },
    { q: 'Si una función usa R4, R8 y R9 en su cuerpo, ¿qué debería hacer al entrar y salir?', a: ['Nada especial', 'Guardarlos (PUSH) al entrar y restaurarlos (POP) al salir', 'Ponerlos a cero al entrar', 'Copiarlos a R0-R3'], c: 1, exp: 'Por convención, R4-R11 deben preservarse: la función debe guardarlos y devolverlos como estaban.' },
    { q: 'En una función recursiva que usa PUSH {R0, LR} al entrar, ¿por qué es necesario apilar también LR (no solo el argumento)?', a: ['LR no se puede modificar de otra forma', 'Porque la llamada recursiva (BL) sobrescribirá LR con su propia dirección de retorno', 'Por simetría con PUSH/POP', 'No es necesario, es solo una costumbre'], c: 1, exp: 'Cada BL anidado pone en LR su propia dirección de retorno; si no se guarda antes, se pierde la del nivel actual.' }
  ];

  function qHtml() {
    return `<header class="view-head"><p class="eyebrow">Tema 1 · Práctica</p><h1>Test de repaso</h1><p class="lede">33 preguntas de repaso de todo el tema, tipo Wooclap. Se guarda tu mejor resultado.</p></header>
    <div class="qz">
      <div class="qz-bar"><span id="qz-n">Pregunta 1 de ${Q.length}</span><div class="meter"><i id="qz-bar-fill" style="width:0%"></i></div><button class="btn ghost sm" type="button" id="qz-restart">Reiniciar</button></div>
      <div id="qz-body"></div>
    </div>`;
  }
  function qInit(sec) {
    let order = Q.map((_, i) => i), idx = 0, score = 0, answered = false;
    const body = $('#qz-body', sec), n = $('#qz-n', sec), bar = $('#qz-bar-fill', sec);
    App.totals.quiz = Q.length;
    function shuffle() { order = Q.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[order[i], order[j]] = [order[j], order[i]]; } }
    function start() { shuffle(); idx = 0; score = 0; answered = false; render(); }
    function render() {
      if (idx >= order.length) { end(); return; }
      const q = Q[order[idx]]; answered = false;
      n.textContent = `Pregunta ${idx + 1} de ${order.length}`; bar.style.width = (idx / order.length * 100) + '%';
      body.innerHTML = `<p class="qz-q">${esc(q.q)}</p><div class="qz-opts">${q.a.map((t, i) => `<button class="qz-opt" type="button" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(t)}</span></button>`).join('')}</div><p class="qz-exp" hidden></p>`;
      $$('.qz-opt', body).forEach(b => b.addEventListener('click', () => choose(b, q)));
    }
    function choose(btn, q) {
      if (answered) return; answered = true;
      const i = +btn.dataset.i; const right = i === q.c;
      if (right) score++;
      $$('.qz-opt', body).forEach(b => { b.disabled = true; if (+b.dataset.i === q.c) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
      const exp = $('.qz-exp', body); exp.hidden = false; exp.innerHTML = `<b class="${right ? 'c-mint' : 'c-alert'}">${right ? '¡Correcto!' : 'No es correcto.'}</b> ${esc(q.exp)}`;
      const cont = document.createElement('button'); cont.className = 'btn go'; cont.style.marginTop = '1rem'; cont.textContent = idx + 1 < order.length ? 'Siguiente pregunta' : 'Ver resultado';
      cont.addEventListener('click', () => { idx++; render(); }); body.appendChild(cont);
    }
    function end() {
      bar.style.width = '100%'; n.textContent = 'Resultado';
      const pct = Math.round(score / order.length * 100);
      const prevBest = App.state.quiz.best || 0;
      App.state.quiz.best = Math.max(prevBest, pct); App.state.quiz.last = pct;
      App.state.quiz.done = 1;
      App.save(); App.refreshProgress();
      body.innerHTML = `<div class="qz-end"><div class="qz-score">${score} / ${order.length}</div><p class="lede">${pct}% de aciertos${prevBest > pct ? ` · tu mejor resultado: ${prevBest}%` : ''}</p><button class="btn go" type="button" id="qz-again">Repetir el test</button></div>`;
      $('#qz-again', body).addEventListener('click', start);
    }
    $('#qz-restart', sec).addEventListener('click', start);
    start();
  }
  App.register('quiz', { title: 'Test de repaso', html: qHtml, init: qInit });
})(window);
