/* views-2.js — teoría 1.5: visión general, repertorio, formato y llamadas a procedimientos */
(function (root) {
  'use strict';
  const App = root.App, esc = root.Asm.esc;
  const head = (num, title, lede) => `<header class="view-head"><p class="eyebrow">Tema 1 · ${num}</p><h1>${esc(title)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</header>`;
  const chapNav = cur => `<nav class="chapter-nav" aria-label="Apartados de 1.5">${[['m15a', '1. Visión general'], ['m15b', '2. Repertorio'], ['m15c', '3. Formato'], ['m15d', '4. Llamadas a funciones']].map(([id, t]) => `<a href="#/${id}"${id === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  const REGS = [
    ['R0', 'Argumento 1 / resultado', 'g-arg'], ['R1', 'Argumento 2', 'g-arg'], ['R2', 'Argumento 3', 'g-arg'], ['R3', 'Argumento 4', 'g-arg'],
    ['R4', 'A preservar por la función', 'g-pres'], ['R5', 'A preservar', 'g-pres'], ['R6', 'A preservar', 'g-pres'], ['R7', 'A preservar', 'g-pres'],
    ['R8', 'A preservar', 'g-pres'], ['R9', 'A preservar', 'g-pres'], ['R10', 'A preservar', 'g-pres'], ['R11', 'A preservar', 'g-pres'],
    ['R12', 'Temporal (IP)', 'g-tmp'], ['R13', 'SP — puntero de pila', 'g-sp'], ['R14', 'LR — dirección de retorno', 'g-lr'], ['R15', 'PC — contador de programa', 'g-pc']
  ];

  /* ============================= 1.5.1 VISIÓN GENERAL ============================= */
  App.register('m15a', {
    title: '1.5 (1) Instrucciones y operandos', wide: true,
    html: () => `${head('1.5 · 1', 'Visión general: instrucciones y operandos')}${chapNav('m15a')}
    <p>ARMv4 es el núcleo del ISA (<i>Instruction Set Architecture</i>) de ARM moderno: cada ISA define el diseño de un procesador, y procesadores con arquitecturas distintas tienen ISA diferentes. La mayoría de procesadores actuales, incluido ARM, siguen la filosofía <b>RISC</b>: reducir la complejidad del repertorio de instrucciones (lo vimos en 1.4).</p>
    <div class="grid two">
      <div class="panel tight"><h3>Características de ARMv4</h3><ul class="check-list"><li>Bus de direcciones de <b>32 bits</b></li><li>Palabras de memoria de <b>32 bits</b></li><li>Instrucciones de <b>32 bits</b> (tamaño fijo)</li><li>Banco de <b>16 registros</b></li></ul></div>
      <div class="panel tight"><h3>Alto nivel vs. ensamblador</h3><table class="tbl"><tbody><tr><td><b>Alto nivel</b></td><td>variables, estructuras, sintaxis variada; una instrucción puede traducirse en varias de ensamblador</td></tr><tr><td><b>Ensamblador</b></td><td>sin variables: opera con registros, inmediatos y memoria; instrucciones muy limitadas; existen además directivas</td></tr></tbody></table></div>
    </div>
    <p>Cada instrucción de ensamblador representa el mnemónico de <b>una</b> instrucción máquina (salvo las directivas y macros, que no generan código directamente):</p>
    ${App.widget('translator', { title: 'De C a ensamblador y a máquina', cap: 'a = b + c − d;  con b→R2, c→R3, d→R4 y a→R1.' })}

    <h2>Los 16 registros de ARM</h2>
    <p>Son el primer tipo de operando. Los registros R0–R12 son de propósito general, pero la <b>convención de uso</b> —que seguiremos en todo el tema— reserva un papel especial a varios de ellos, sobre todo al llamar a funciones (lo veremos en el apartado 4):</p>
    <div class="widget panel"><div class="panel-title"><span>Banco de registros</span></div><div data-w="regmap"></div></div>
    <h2>Inmediatos</h2>
    <p>El segundo tipo de operando: constantes que se escriben directamente en la instrucción. En ensamblador ARM se preceden del símbolo <code>#</code>, por ejemplo <code>MOV R1, #10</code>.</p>
    <h2>Memoria</h2>
    <p>El tercer tipo de operando, accesible solo con LDR/STR (lo veremos en el apartado 2). Por ejemplo, <code>LDR R7, [R5, #8]</code> carga en R7 el contenido de la dirección R5 + 8. Cada palabra y cada dirección de memoria también ocupan 32 bits.</p>
    ${App.mini(root.Examples.get('array').code, [0, 1, 2], { title: 'LDR con un desplazamiento constante', cap: 'Prueba a ejecutarlo paso a paso.' })}

    <h2>Little-endian: cómo se ordenan los bytes</h2>
    <p>Al guardar una palabra de varios bytes en memoria hay dos formas de repartirlos entre las direcciones: <b>big-endian</b> (el byte más significativo en la dirección más baja) o <b>little-endian</b> (el byte menos significativo en la dirección más baja). <b>ARM usa little-endian</b>.</p>
    ${App.widget('endianLab', { title: 'Little-endian en memoria', cap: 'Cambia la palabra o la dirección base y observa en qué dirección queda cada byte.' })}
    <details class="reveal"><summary>Ejercicio 6 del tema</summary><div>
      <p>Identifica los operandos de las siguientes instrucciones:</p>
      ${App.code('ADD R1, R2, R3\nSUB R1, R3, #8\nLDR R5, [R4, #8]', { sim: false })}
      <p class="dim small">Para cada una, di si cada operando es un registro, un inmediato o una posición de memoria, y cuál es el registro destino.</p>
    </div></details>
    ${App.footer('m15a')}`
  });

  /* ================================ 1.5.2 REPERTORIO ================================ */
  App.register('m15b', {
    title: '1.5 (2) Repertorio de instrucciones', wide: true,
    html: () => `${head('1.5 · 2', 'Repertorio de instrucciones')}${chapNav('m15b')}
    <h2>Instrucciones aritmético-lógicas</h2>
    <p>Operan siempre entre registros (o un registro y un inmediato) y dejan el resultado en un registro destino: <code>OP Rd, Rn, operando2</code>. El «operando2» puede ser un registro o un inmediato, y opcionalmente llevar un desplazamiento.</p>
    ${App.widget('bitLab', { title: 'Laboratorio de operaciones', cap: 'Cambia los valores, elige la operación y observa el resultado bit a bit. Por defecto están los registros del ejercicio 7 del tema.' })}
    <div class="grid two">
      <div class="panel tight"><h3>Lógicas</h3><table class="tbl"><tbody><tr><td class="mono">AND</td><td>Y bit a bit</td></tr><tr><td class="mono">ORR</td><td>O bit a bit</td></tr><tr><td class="mono">EOR</td><td>O-exclusiva (XOR)</td></tr><tr><td class="mono">BIC</td><td>AND con el complemento (borra bits de una máscara)</td></tr><tr><td class="mono">MVN</td><td>NOT (complemento a uno)</td></tr></tbody></table></div>
      <div class="panel tight"><h3>Aritméticas y desplazamientos</h3><table class="tbl"><tbody><tr><td class="mono">ADD / SUB</td><td>suma / resta</td></tr><tr><td class="mono">MUL</td><td>multiplicación (32 bits bajos)</td></tr><tr><td class="mono">LSL / LSR</td><td>desplazamiento lógico izq./der.</td></tr><tr><td class="mono">ASR</td><td>desplazamiento aritmético derecho (con signo)</td></tr><tr><td class="mono">ROR</td><td>rotación a la derecha</td></tr></tbody></table></div>
    </div>
    <div class="note">Un desplazamiento a la izquierda de n posiciones equivale a multiplicar por 2ⁿ. LSR (sin signo) y ASR (con signo) a la derecha equivalen a dividir entre 2ⁿ: LSR rellena con ceros, ASR copia el bit de signo para conservarlo.</div>

    <h2>Flags y ejecución condicional</h2>
    <p>Las instrucciones aritmético-lógicas pueden llevar el sufijo <b>S</b> (por ejemplo <code>ADDS</code>) para actualizar los flags <b>N Z C V</b> del registro de estado según el resultado. <code>CMP Rn, operando2</code> es como una resta (<code>SUBS</code>) que solo actualiza los flags, sin guardar el resultado.</p>
    ${App.widget('flagsLab', { title: 'Flags NZCV y condiciones', cap: 'Cambia A y B (CMP A, B calcula A − B) y observa qué condiciones se cumplen. También puedes pulsar cada flag para forzarlo a mano.' })}
    <p>Casi cualquier instrucción puede llevar un <b>código de condición</b> como sufijo (dos letras) y solo se ejecuta si los flags cumplen esa condición — así se evitan saltos para construcciones sencillas como un <code>if</code>:</p>
    ${App.mini(root.Examples.get('predicada').code, [0, 1, 2, 3, 4], { title: 'if / else con instrucciones predicadas', cap: 'Compara este código con la versión con saltos del apartado siguiente.' })}

    <h2>Instrucciones de salto</h2>
    <p><b>B</b> (salto incondicional) cambia el flujo saltando a una etiqueta; con condición, por ejemplo <code>BNE</code>, solo salta si se cumple. <b>BL</b> (salto con enlace) además guarda en <b>LR</b> la dirección de retorno — lo veremos en el apartado 4 al hablar de funciones.</p>
    <div class="grid three">
      <div class="panel tight"><h3>if / else</h3><p class="dim small">Con saltos condicionales</p></div>
      <div class="panel tight"><h3>while</h3><p class="dim small">Comprueba y repite</p></div>
      <div class="panel tight"><h3>for</h3><p class="dim small">Bucle acotado</p></div>
    </div>
    <p>Ábrelos en el simulador para verlos completos y ejecutarlos:</p>
    <div class="btn-row"><button class="btn ghost sm" type="button" data-sim-ex="ifelse">if / else</button><button class="btn ghost sm" type="button" data-sim-ex="while">while</button><button class="btn ghost sm" type="button" data-sim-ex="for">for</button><button class="btn ghost sm" type="button" data-sim-ex="switch">switch</button></div>
    ${App.mini(root.Examples.get('ifelse').code, [0, 1, 2, 3, 4], { title: 'if / else con saltos', cap: 'La forma "clásica": compara, salta si no se cumple, ejecuta el then, salta al final.' })}

    <h2>Instrucciones de acceso a memoria</h2>
    <p><b>LDR</b> (load) trae un valor de memoria a un registro; <b>STR</b> (store) hace lo contrario. Son las <b>únicas</b> instrucciones que acceden a memoria en ARM (de ahí que sea RISC: «load/store architecture»). La dirección se calcula con distintos <b>modos de indexación</b>, y la posición de los corchetes es la clave para distinguirlos:</p>
    ${App.widget('indexLab', { title: 'Modos de indexación', cap: 'Offset, pre-indexado, post-indexado y con registro + desplazamiento (para recorrer arrays).' })}
    <h3>Acceso a bytes y caracteres</h3>
    <p>Además de LDR/STR (palabra completa, 4 bytes), existen <b>LDRB / STRB</b> para un solo byte y <b>LDRSB</b> para cargar un byte extendiendo su signo a 32 bits (útil con valores negativos de tipo <code>char</code>).</p>
    ${App.mini(root.Examples.get('bytes').code, [3, 4, 5, 6], { title: 'LDRB frente a LDRSB', cap: 'Fíjate en R5 y R6: mismo byte, dos formas de extenderlo a 32 bits.' })}
    <details class="reveal"><summary>Ejercicio 12 del tema</summary><div>
      <p>Expresa en ensamblador:</p>
      ${App.code('int i;\nint array[75];\nfor (i = 0; i < 75; i = i + 1) {\n    array[i] = array[i] * 8;\n}', { sim: false })}
      <p>Primero con indexación por registro y después usando <b>post-indexación</b> para recorrer el array con un puntero.</p>
      <details class="reveal" style="margin-top:.6rem"><summary>Ver una solución</summary><div>${App.code(root.Examples.get('postindex').code, { title: 'Con post-indexación' })}</div></details>
    </div></details>
    <details class="reveal"><summary>Ejercicio 13 del tema</summary><div>
      <p>Expresar en ensamblador (arrays de <code>char</code>, es decir, de bytes):</p>
      ${App.code('int i;\nchar array[40], T[40];\nfor (i = 0; i < 40; i = i + 1) {\n    array[i] = T[i] + 20;\n}', { sim: false })}
      <details class="reveal" style="margin-top:.6rem"><summary>Ver una solución</summary><div>${App.code(root.Examples.get('bytes').code, { title: 'Con LDRB/STRB' })}</div></details>
    </div></details>
    ${App.footer('m15b')}`
  });

  /* ================================ 1.5.3 FORMATO ================================ */
  App.register('m15c', {
    title: '1.5 (3) Formato de las instrucciones', wide: true,
    html: () => `${head('1.5 · 3', 'Formato de las instrucciones', 'Toda instrucción ARMv4 ocupa una palabra de 32 bits. Hay tres formatos según el tipo de instrucción.')}${chapNav('m15c')}
    <p>Los cuatro bits más altos (31:28) son siempre el campo <b>cond</b>: el código de condición bajo el que se ejecuta la instrucción (visto en el apartado 2). El resto de los 28 bits varían según el formato:</p>
    <div class="grid three">
      <div class="panel tight acc-copper"><h3>1. Procesado de datos</h3><p>Instrucciones aritmético-lógicas. Campos: cond, op, cmd, S, Rn, Rd y el operando2 (inmediato o registro con desplazamiento).</p></div>
      <div class="panel tight acc-ice"><h3>2. Memoria</h3><p>LDR/STR. Campos: cond, op, indicadores del modo de direccionamiento, L (load/store), Rn (base), Rd (destino/origen) y un desplazamiento.</p></div>
      <div class="panel tight acc-violet"><h3>3. Salto</h3><p>B/BL. Campos: cond, op, L (si enlaza) y un desplazamiento de 24 bits relativo al PC.</p></div>
    </div>
    <h2>Prueba a codificar cualquier instrucción</h2>
    <p>Este codificador funciona con cualquiera de los tres formatos; identifica automáticamente cuál usar y colorea cada campo:</p>
    ${App.widget('encoder', { title: 'Codificador en vivo', attrs: { value: 'MOV R1, R2, LSL #2' }, cap: 'Pasa el ratón (o toca) cada campo de la fila de bits para ver su nombre y significado.' })}

    <h2>Ejemplo resuelto del tema</h2>
    <p>Dado el siguiente programa, codificarlo en lenguaje máquina e identificar los campos que se definen en el formato de cada instrucción:</p>
    ${App.code('label:  ADD  R1, R2, R3\n        LDR  R5, [R0, R3, LSL #2]\n        MOV  R1, R2, LSL #2\n        LDR  R5, [R0, #1]\n        BLT  label', { sim: false, title: 'Programa a codificar' })}
    <p>Fíjate en cada fila: pulsa sobre los campos para ver su valor y su significado.</p>
    <div id="codif-tbl"></div>
    <div class="note">La instrucción <code>LDR R5, [R0, #1]</code> es un caso ilustrativo del tema para mostrar la codificación del campo de desplazamiento (offset = 1); en la práctica, un acceso de palabra debe usar una dirección múltiplo de 4.</div>

    <h2>Estrategias del formato de ARMv4</h2>
    <ul class="check-list">
      <li><b>Ejecución condicional</b> (el campo cond en casi cualquier instrucción) reduce el número de saltos.</li>
      <li>El <b>operando2</b> con desplazamiento integrado (por ejemplo <code>LSL #2</code> dentro de la misma instrucción) evita instrucciones extra para escalar índices de array.</li>
      <li>Formato de <b>longitud fija</b> (siempre 32 bits): más sencillo de decodificar y de segmentar que un formato de longitud variable (como en CISC, visto en 1.4).</li>
    </ul>
    ${App.footer('m15c')}`,
    init(sec) {
      const box = sec.querySelector('#codif-tbl'); const ARM = root.ARM;
      const src = 'label:  ADD  R1, R2, R3\n        LDR  R5, [R0, R3, LSL #2]\n        MOV  R1, R2, LSL #2\n        LDR  R5, [R0, #1]\n        BLT  label\n';
      const p = ARM.assemble(src);
      const rows = p.listing.map(l => `<tr data-a="${l.addr}"><td class="mono c-copper">${ARM.H(l.addr)}</td><td class="mono">${root.Asm.hlLine(l.src)}</td><td class="mono c-violet">${ARM.hex(l.word)}</td><td class="mono dim">${l.ins.format}</td></tr>`).join('');
      box.innerHTML = `<div class="tbl-wrap"><table class="tbl table-click"><thead><tr><th>Dirección</th><th>Ensamblador</th><th>Máquina</th><th>Formato</th></tr></thead><tbody>${rows}</tbody></table></div><div class="tr-fields"></div>`;
      box.querySelectorAll('tbody tr').forEach(tr => tr.addEventListener('click', () => {
        const l = p.listing.find(x => x.addr === +tr.dataset.a); if (!l) return;
        box.querySelectorAll('tbody tr').forEach(r => r.classList.toggle('sel', r === tr));
        const f = box.querySelector('.tr-fields'); f.innerHTML = root.Widgets.bitRow(l.ins.fields) + '<p class="enc-info"></p>';
        root.Widgets.bindFieldInfo(f, l.ins.fields, f.querySelector('.enc-info'));
      }));
      box.querySelector('tbody tr').click();
    }
  });

  /* ============================ 1.5.4 LLAMADAS A PROCEDIMIENTOS ============================ */
  App.register('m15d', {
    title: '1.5 (4) Llamadas a procedimientos', wide: true,
    html: () => `${head('1.5 · 4', 'Llamadas a procedimientos o funciones')}${chapNav('m15d')}
    <p><b>BL</b> (branch and link) salta a la función y, de paso, guarda en <b>LR</b> (R14) la dirección de la instrucción siguiente a la propia BL, para saber a dónde volver. Al terminar, la función vuelve con <code>MOV PC, LR</code>.</p>
    ${App.mini(root.Examples.get('llamada').code, [0, 1, 4], { title: 'Llamada simple con BL', cap: 'Observa cómo LR se llena al ejecutar BL y cómo PC salta a él al ejecutar el MOV final.', showPC: true })}

    <h2>La pila (memoria LIFO)</h2>
    <p>Cuando una función necesita más registros de los que tiene libres, guarda temporalmente su contenido en la <b>pila</b>: una zona de memoria <b>LIFO</b> (el último en entrar es el primero en salir) que <b>crece hacia direcciones inferiores</b>. El <b>puntero de pila SP</b> (R13) siempre guarda la dirección más baja ocupada.</p>
    ${App.widget('stackDemo', { title: 'PUSH y POP', cap: 'PUSH guarda registros en la pila y resta a SP; POP los recupera y suma a SP. El orden de los registros en la lista no importa: PUSH/POP siempre los coloca en orden creciente de registro.' })}
    <p><code>PUSH {R4, R8, R9}</code> equivale a varios STR consecutivos con predecremento de SP; <code>POP {R4, R8, R9}</code> equivale a varios LDR con posincremento. Una función que use R4, R8 y R9 debe guardarlos al entrar y restaurarlos al salir, para no romper el código que la llamó:</p>
    ${App.mini(root.Examples.get('diffofsums').code, [0, 1, 2, 3, 4, 5, 8, 9], { title: 'Una función que preserva registros', cap: 'diffofsums(f,g,h,i) = (f+g) − (h+i). Mira la pila en el simulador completo para verla crecer y encogerse.' })}

    <h2>Paso de argumentos y valor de retorno</h2>
    <p>Por convención (no impuesta por el hardware, pero universalmente seguida): los <b>primeros cuatro argumentos</b> se pasan en <b>R0-R3</b> y el <b>resultado</b> se devuelve en <b>R0</b>. Si la función es sencilla y no necesita más registros que estos, ni siquiera hace falta tocar la pila:</p>
    ${App.mini(root.Examples.get('reduce').code, [0, 1, 2, 3, 4], { title: 'x = reduce(3, 4, 5)', cap: 'sum = a + b + c; return sum;  — cabe en registros temporales, sin pila.' })}

    <h2>Llamadas recursivas</h2>
    <p>Una función recursiva se llama a sí misma con <code>BL</code>. Como cada llamada anidada sobrescribiría LR (y normalmente también el argumento en R0), <b>cada invocación debe apilar lo que necesite recuperar después</b> de la llamada recursiva:</p>
    ${App.mini(root.Examples.get('factorial').code, [0, 1, 4], { title: 'Factorial recursivo', cap: 'PUSH {R0, LR} al entrar; POP {R1, LR} al volver de la llamada recursiva, para recuperar la n de este nivel y el LR de este nivel.', showPC: true })}
    <details class="reveal"><summary>Ejercicio de clase: SumaCuadrados(n)</summary><div>
      <p>Misma estructura que el factorial, pero sumando cuadrados: <code>SumaCuadrados(n) = 1² + 2² + … + n²</code>.</p>
      ${App.code(root.Examples.get('sumacuad').code, { title: 'SumaCuadrados(n) recursivo' })}
    </div></details>
    <details class="reveal"><summary>Ejercicio 14 del tema</summary><div>
      <p>Expresar en ensamblador:</p>
      ${App.code('void main() {\n    int x;\n    ...\n    x = reduce(3, 4, 5);\n    ...\n}\n\nint reduce(int a, int b, int c) {\n    int sum;\n    sum = a + b + c;\n    return sum;\n}', { sim: false })}
      <details class="reveal" style="margin-top:.6rem"><summary>Ver una solución</summary><div>${App.code(root.Examples.get('reduce').code, { title: 'x = reduce(3, 4, 5)' })}</div></details>
    </div></details>
    ${App.footer('m15d')}`
  });

  /* --------------------------- widget: mapa de registros (usado en m15a) --------------------------- */
  root.Widgets.regmap = function (host) {
    host.innerHTML = `<div class="regmap">${REGS.map((r, i) => `<button type="button" class="${r[2]}" data-i="${i}"><b>${r[0]}${i === 12 ? ' / IP' : i === 13 ? ' / SP' : i === 14 ? ' / LR' : i === 15 ? ' / PC' : ''}</b><span>${esc(r[1])}</span></button>`).join('')}</div><div class="regmap-info panel tight" id="regmap-info"></div>`;
    const info = host.querySelector('#regmap-info');
    const show = i => { info.innerHTML = `<b>${REGS[i][0]}</b> — ${esc(REGS[i][1])}` + (i < 4 ? ' <span class="dim">(usado también para devolver el resultado si es R0)</span>' : i >= 4 && i <= 11 ? ' <span class="dim">Si la función lo usa, debe guardarlo (PUSH) y restaurarlo (POP) antes de volver.</span>' : ''); host.querySelectorAll('.regmap button').forEach((b, j) => b.setAttribute('aria-pressed', j === i)); };
    host.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) show(+b.dataset.i); });
    show(0);
  };
})(window);
