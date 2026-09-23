/* views-1.js — portada y teoría 1.1 a 1.4 */
(function (root) {
  'use strict';
  const App = root.App, esc = root.Asm.esc, $ = App.$;
  const head = (num, title, lede) => `<header class="view-head"><p class="eyebrow">${num ? 'Tema 1 · ' + num : 'Tema 1'}</p><h1>${esc(title)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</header>`;

  /* ===================================== PORTADA ===================================== */
  App.register('inicio', {
    title: 'Inicio', wide: true, keepScroll: false,
    html() {
      return `
      <section class="hero">
        <div class="hero-top">
          <div>
            <p class="eyebrow">Arquitectura de Computadores · UAL</p>
            <h1>Tema 1 — Introducción a la Arquitectura de Computadores<br>Repertorio de instrucciones ARMv4</h1>
            <p class="lede">Cómo se organiza un computador por dentro y cómo el ensamblador ARMv4 se convierte, instrucción a instrucción, en los unos y ceros que ejecuta la CPU. Con un simulador para ver el efecto de cada instrucción en tiempo real.</p>
          </div>
          <div class="ring" id="hero-ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="bg" cx="50" cy="50" r="44"/><circle class="fg" id="ring-fg" cx="50" cy="50" r="44" stroke-dasharray="276" stroke-dashoffset="276"/></svg><div class="val"><span id="ring-pct">0%</span><small>completado</small></div></div>
        </div>
        <div class="hero-cta"><a class="btn go" href="#/m11">Empezar por 1.1 →</a><a class="btn ghost" href="#/sim">Ir directo al simulador</a><a class="btn ghost" href="#/ref">Referencia rápida</a></div>
      </section>

      <section class="decoder panel">
        <div class="panel-title"><span>Prueba a codificar una instrucción</span></div>
        <p class="widget-cap">Escribe cualquier instrucción ARMv4 y observa al instante en qué palabra de 32 bits se traduce, con cada campo explicado. Esta misma pieza aparecerá integrada en las páginas de teoría.</p>
        <div data-w="encoder" data-value="ADD R1, R2, R3"></div>
      </section>

      <h2 class="tiles-h">Teoría</h2>
      <div class="bento">
        ${tile('t-a', 'm11', '1.1', 'Clasificación de los computadores', 'Móviles, servidores, embebidos… y lo que todos comparten: el modelo de Von Neumann.', glyphChip())}
        ${tile('t-b', 'm12', '1.2', 'Arquitectura de un sistema', 'Memoria, CPU (unidad de control + camino de datos), E/S y buses.', glyphVN())}
        ${tile('t-c', 'm13', '1.3', 'Conexión software–hardware', 'De un programa en alto nivel al ensamblador y de ahí al lenguaje máquina.', glyphLayers())}
        ${tile('t-d', 'm14', '1.4', 'Evolución de la arquitectura', 'Ley de Moore, el muro de la frecuencia, memoria DDR, CISC vs RISC, multinúcleo.', glyphMoore())}
        ${tile('t-e', 'm15a', '1.5', 'ARMv4: repertorio de instrucciones', 'El núcleo del tema: registros, instrucciones, flags, memoria, formato y llamadas a funciones.', glyphAsm())}
        <div class="tile panel t-wide" style="justify-content:center">
          <div class="sub-tiles">
            <a class="sub-tile" data-go="sim">Simulador ARM<span>Ejecuta y depura ensamblador</span></a>
            <a class="sub-tile" data-go="ex">Ejercicios<span>14 ejercicios del tema, autocorregidos</span></a>
            <a class="sub-tile" data-go="quiz">Test de repaso<span>Preguntas tipo Wooclap</span></a>
            <a class="sub-tile" data-go="ref">Referencia rápida<span>Tabla de instrucciones y condiciones</span></a>
          </div>
        </div>
      </div>

      <section class="panel">
        <div class="panel-title"><span>Cómo sacarle partido a esta web</span></div>
        <div class="study-loop">
          <div><h3>1. Lee y experimenta</h3><p>Cada página de teoría tiene widgets interactivos: cambia los valores y observa qué ocurre, no te quedes solo leyendo.</p></div>
          <div><h3>2. Ábrelo en el simulador</h3><p>Todo ejemplo de código tiene un botón «Abrir en el simulador»: ejecútalo paso a paso y mira registros, flags y memoria.</p></div>
          <div><h3>3. Practica</h3><p>En «Ejercicios» resuelves los 14 problemas del tema con corrección automática comparando con la solución.</p></div>
          <div><h3>4. Repasa</h3><p>El test de repaso y la referencia rápida son ideales los días antes del examen.</p></div>
        </div>
      </section>`;
    },
    onShow(sec) {
      const o = App.overall(); const pct = Math.round(o.all * 100);
      const c = $('#ring-fg', sec); if (c) { const C = 276; c.style.strokeDashoffset = C - (pct / 100) * C; }
      const p = $('#ring-pct', sec); if (p) p.textContent = pct + '%';
      document.addEventListener('progress', () => { const o2 = App.overall(); const pc = Math.round(o2.all * 100); const cc = $('#ring-fg', sec); if (cc) cc.style.strokeDashoffset = 276 - (pc / 100) * 276; const pp = $('#ring-pct', sec); if (pp) pp.textContent = pc + '%'; });
      sec.querySelectorAll('.sub-tile[data-go]').forEach(a => a.classList.toggle('done', !!App.state.done[a.dataset.go]));
    }
  });
  function tile(cls, id, num, title, desc, glyph) {
    return `<a class="tile panel ${cls}" href="#/${id}"><div class="glyph">${glyph}</div><span class="eyebrow">${num}</span><h3>${esc(title)}</h3><p>${esc(desc)}</p></a>`;
  }
  function glyphChip() { return `<svg viewBox="0 0 200 64"><g fill="none" stroke="var(--copper)" stroke-width="2"><rect x="60" y="10" width="80" height="44" fill="var(--die-3)" stroke="var(--ice)"/><path d="M75 10V2M95 10V2M115 10V2M75 54v8M95 54v8M115 54v8M60 22H50M60 34H50M60 46H50M140 22h10M140 34h10M140 46h10"/></g><rect x="78" y="22" width="24" height="20" fill="var(--mint)"/></svg>`; }
  function glyphVN() { return `<svg viewBox="0 0 200 64"><g fill="var(--die-3)" stroke="var(--trace)" stroke-width="1.5"><rect x="10" y="8" width="70" height="20"/><rect x="10" y="36" width="70" height="20"/><rect x="120" y="8" width="70" height="20"/><rect x="120" y="36" width="70" height="20"/></g><g stroke="var(--ice)" stroke-width="2"><path d="M80 18H120M80 46H120"/></g><text x="45" y="21" text-anchor="middle" font-size="11" fill="var(--ink-dim)" font-family="var(--font-display)">CPU</text><text x="45" y="49" text-anchor="middle" font-size="11" fill="var(--ink-dim)" font-family="var(--font-display)">Memoria</text><text x="155" y="21" text-anchor="middle" font-size="11" fill="var(--ink-dim)" font-family="var(--font-display)">E/S</text><text x="155" y="49" text-anchor="middle" font-size="11" fill="var(--ink-dim)" font-family="var(--font-display)">Buses</text></svg>`; }
  function glyphLayers() { return `<svg viewBox="0 0 200 64"><g font-family="var(--font-mono)" font-size="11"><rect x="10" y="6" width="180" height="16" fill="var(--sun)" opacity=".25"/><text x="100" y="18" text-anchor="middle" fill="var(--sun)">a = b + c;</text><rect x="10" y="24" width="180" height="16" fill="var(--violet)" opacity=".25"/><text x="100" y="36" text-anchor="middle" fill="var(--violet)">ADD R1,R2,R3</text><rect x="10" y="42" width="180" height="16" fill="var(--ice)" opacity=".25"/><text x="100" y="54" text-anchor="middle" fill="var(--ice)">E0821003</text></g></svg>`; }
  function glyphMoore() { return `<svg viewBox="0 0 200 64"><polyline points="10,54 40,50 70,40 100,26 130,16 160,10 190,6" fill="none" stroke="var(--copper)" stroke-width="2.5"/><g fill="var(--mint)"><circle cx="40" cy="50" r="3"/><circle cx="100" cy="26" r="3"/><circle cx="160" cy="10" r="3"/></g></svg>`; }
  function glyphAsm() { return `<svg viewBox="0 0 200 64"><g font-family="var(--font-mono)" font-size="10" fill="var(--ice)"><text x="10" y="16">MOV R1,#3</text><text x="10" y="32">ADD R2,R1,R1</text><text x="10" y="48">STR R2,[R0]</text></g><path d="M150 8h40M150 8v48M150 56h40" stroke="var(--violet)" stroke-width="1.5" fill="none"/></svg>`; }

  /* ================================== 1.1 CLASIFICACIÓN ================================== */
  App.register('m11', {
    title: '1.1 Clasificación de los computadores actuales',
    html: () => `${head('1.1', 'Clasificación de los computadores actuales')}
    <p>Aunque hoy conviven sistemas muy distintos entre sí —desde un microcontrolador embebido en una lavadora hasta un servidor de un centro de datos—, casi todos comparten la misma idea de fondo a la hora de organizarse por dentro.</p>
    <div class="grid three">
      <div class="panel tight"><h3>Sistemas empotrados</h3><p>Integrados dentro de otro producto (electrodomésticos, coches, sensores…). Suelen tener recursos limitados y un propósito muy concreto.</p></div>
      <div class="panel tight"><h3>Móviles, tablets, portátiles y PCs</h3><p>Propósito general: ejecutan sistemas operativos completos y una gran variedad de aplicaciones.</p></div>
      <div class="panel tight"><h3>Servidores de alto rendimiento</h3><p>Diseñados para dar servicio a muchos usuarios o procesos a la vez: prioridad al rendimiento y a la fiabilidad.</p></div>
    </div>
    <h2>Lo que casi todos tienen en común</h2>
    <ul class="check-list">
      <li>Se fabrican con especificaciones muy distintas: tiempo de respuesta, consumo de potencia, coste…</li>
      <li>Responden al <b>modelo de computador propuesto por Von Neumann</b> (lo veremos en 1.2): un procesador que ejecuta instrucciones almacenadas en memoria junto con los datos.</li>
      <li>Incluyen técnicas de diseño comunes, especialmente orientadas a mejorar el <b>rendimiento</b> (el tiempo de respuesta).</li>
    </ul>
    <div class="note">Este es el hilo conductor del tema: sea cual sea el tipo de computador, en 1.2 veremos las piezas que lo componen y en 1.5 estudiaremos en detalle cómo se le dan instrucciones a una de esas piezas, la CPU, usando el repertorio ARMv4.</div>
    ${App.footer('m11')}`
  });

  /* ============================ 1.2 ARQUITECTURA DE UN SISTEMA ============================ */
  App.register('m12', {
    title: '1.2 Arquitectura de un sistema de computación', wide: true,
    html: () => `${head('1.2', 'Arquitectura de un sistema de computación', 'El modelo de Von Neumann: memoria, CPU, entrada/salida y los buses que los conectan.')}
    ${App.widget('vonNeumann', { title: 'Modelo de Von Neumann', cap: 'Pulsa cada bloque o cada bus para leer su descripción. Los botones de abajo simulan una lectura y una escritura en memoria.' })}

    <h2>Memoria</h2>
    <p>Guarda el <b>programa y los datos</b>, ambos codificados en binario y en el mismo espacio de direcciones (esta es precisamente la idea central de Von Neumann). Su estructura lógica es una tabla de celdas: cada <b>dirección</b> identifica una <b>palabra</b>.</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Dirección</th><th>Palabra</th></tr></thead><tbody>
      <tr><td class="mono">0000 0000 (00H)</td><td class="mono">0000 0100 0100 0000</td></tr>
      <tr><td class="mono">0000 0001 (01H)</td><td class="mono">0010 0100 0100 0000</td></tr>
      <tr><td class="mono">0000 0010 (02H)</td><td class="mono">0100 0100 0100 0010</td></tr>
      <tr><td class="mono">…</td><td class="mono">…</td></tr>
    </tbody></table></div>
    <p>La capacidad se mide en bytes, normalmente con múltiplos de potencias de 2 (aunque se lean como si fueran decimales):</p>
    ${App.widget('units', { title: 'Direcciones ↔ capacidad', cap: 'Con n líneas de bus de direcciones se distinguen 2ⁿ posiciones distintas. Prueba con 32 líneas: es el caso de ARMv4.' })}
    <p>La memoria se caracteriza por su <b>tiempo de acceso</b> y su <b>precio por bit</b> — características inversamente relacionadas — por lo que se organiza en niveles, cada uno con una tecnología distinta. La CPU solo accede directamente al nivel más bajo (los registros).</p>
    ${App.widget('memHier', { title: 'Jerarquía de memoria', cap: 'De abajo arriba: más capacidad y más lenta. De arriba abajo: más rápida, más cara por bit y más pequeña.' })}

    <h2>CPU (unidad central de proceso)</h2>
    <p>Se compone de dos grandes bloques:</p>
    <ul class="check-list">
      <li><b>Camino de datos:</b> la <b>ALU</b> (unidad aritmético-lógica), encargada de transformar los datos, y los <b>registros</b>: PC, IR, SR (flags) y el banco de registros.</li>
      <li><b>Unidad de control:</b> genera las señales que gobiernan tanto el camino de datos como el acceso a memoria y a los periféricos.</li>
    </ul>
    <div class="grid two">
      <div class="panel tight"><h3>PC — Contador de programa</h3><p>Guarda la dirección de la <b>siguiente</b> instrucción a ejecutar. Normalmente se incrementa para avanzar secuencialmente; en un salto se escribe en él la dirección de destino.</p></div>
      <div class="panel tight"><h3>IR — Registro de instrucción</h3><p>Guarda la instrucción que se acaba de leer de memoria y que se está ejecutando ahora mismo.</p></div>
      <div class="panel tight"><h3>SR — Registro de estado (flags)</h3><p>Bits que informan del resultado de la última operación de la ALU (los <b>flags</b> N, Z, C, V). Las instrucciones de salto condicional se basan en él.</p></div>
      <div class="panel tight"><h3>Banco de registros</h3><p>Registros de propósito general. En la mayoría de arquitecturas, incluida ARM, la ALU solo puede operar con datos que estén en estos registros (no directamente con memoria).</p></div>
    </div>
    <div class="note">Este mismo camino de datos —PC, memoria de instrucciones, IR, unidad de control, banco de registros, ALU y memoria de datos— es el diagrama que verás animado en el simulador cada vez que ejecutes una instrucción.</div>

    <h2>Entrada / Salida</h2>
    <p>Cada periférico (teclado, pantalla, disco, red…) se conecta mediante una <b>interfaz</b> con su propio controlador. Los módulos de E/S agrupan uno o varios de estos controladores. El objetivo de cada transferencia de E/S es mover datos entre el periférico y una zona de memoria.</p>

    <h2>Buses</h2>
    <p>Un <b>bus</b> es un enlace de comunicación compartido: varios dispositivos usan las mismas líneas. Si dos transmiten a la vez, las señales se solapan y se produce una <b>contención de bus</b>.</p>
    ${App.widget('busDemo', { title: 'Contención de bus', cap: 'Activa uno o varios dispositivos a la vez y observa qué pasa en la línea compartida.' })}
    <div class="grid two">
      <div class="panel tight"><h3>Bus de datos</h3><p>Transporta los datos entre CPU, memoria y E/S.</p></div>
      <div class="panel tight"><h3>Bus de direcciones</h3><p>Indica la posición del dato al que se quiere acceder.</p></div>
      <div class="panel tight"><h3>Bus de control</h3><p>Señales que gobiernan el acceso: quién transmite, quién recibe y de qué tipo es la operación.</p></div>
      <div class="panel tight"><h3>Bus de alimentación</h3><p>Suministra la energía; los distintos dispositivos pueden requerir tensiones distintas.</p></div>
    </div>

    <details class="reveal"><summary>Ejercicio 3 del tema (esquema del procesador)</summary><div>
      <p>Dado el esquema completo del camino de datos y la unidad de control de un procesador ARM simplificado:</p>
      <ol><li>Identifica las entradas y salidas de la unidad de control.</li><li>Describe qué valores debe tomar la señal <code>PCSrc</code> para que se ejecuten instrucciones consecutivas.</li><li>¿Se ajusta al modelo de procesador de Von Neumann?</li></ol>
      <p class="dim small">El esquema completo del ejercicio aparece en las diapositivas del tema; usa el diagrama animado de esta página como apoyo: identifica en él qué corresponde a la unidad de control y qué al camino de datos.</p>
    </div></details>
    ${App.footer('m12')}`
  });

  /* =========================== 1.3 CONEXIÓN SOFTWARE - HARDWARE =========================== */
  App.register('m13', {
    title: '1.3 Conexión entre el software y el hardware',
    html: () => `${head('1.3', 'Conexión entre el software y el hardware de un computador', 'Cómo un programa escrito en un lenguaje de alto nivel termina siendo una secuencia de instrucciones máquina que la unidad de control puede interpretar.')}
    <p>Un <b>programa</b> es una secuencia de instrucciones máquina almacenadas en memoria de forma consecutiva. Cada instrucción máquina la recibe la unidad de control, que emite las señales correspondientes en el camino de datos para ejecutarla.</p>
    <h2>De alto nivel a lenguaje máquina</h2>
    <p>Entre el programa que escribe una persona y el que ejecuta la CPU hay (al menos) dos niveles de traducción:</p>
    <ol class="check-list">
      <li><b>Alto nivel</b> — un lenguaje como C, legible por personas: <code>a = b + c;</code></li>
      <li><b>Ensamblador</b> — una representación textual, legible, de cada instrucción máquina: <code>ADD R1, R2, R3</code></li>
      <li><b>Máquina</b> — la codificación binaria que realmente entiende la CPU: <code>E0821003</code></li>
    </ol>
    ${App.widget('translator', { title: 'De alto nivel a máquina', cap: 'Elige un fragmento y observa su traducción a ensamblador y a lenguaje máquina, instrucción por instrucción. Pulsa una fila para ver los campos de su codificación.' })}
    <div class="note">Un <b>compilador</b> traduce de alto nivel a ensamblador (o directamente a máquina); un <b>ensamblador</b> traduce de ensamblador a máquina. En el resto del tema trabajaremos sobre todo con el nivel de ensamblador, porque es el que deja ver con claridad qué hace cada instrucción — y con el simulador podrás comprobar también su codificación máquina.</div>
    ${App.footer('m13')}`
  });

  /* ============================= 1.4 EVOLUCIÓN DE LA ARQUITECTURA ============================= */
  App.register('m14', {
    title: '1.4 Evolución de la arquitectura y tecnología', wide: true,
    html: () => `${head('1.4', 'Evolución de la arquitectura y tecnología de los computadores', 'El objetivo de diseño de siempre —maximizar el rendimiento— se ha apoyado en avances en cuatro frentes: tecnología de integración, frecuencia de reloj, memoria y arquitectura del procesador.')}

    <h2>Tecnología de integración: la Ley de Moore</h2>
    <p>En 1965, Gordon Moore predijo que el número de transistores que se pueden integrar en un chip se duplicaría periódicamente. La consecuencia práctica de más transistores es más capacidad de procesamiento, más rendimiento, miniaturización… pero también nuevos retos: coste, calentamiento, complejidad del diseño, interferencias e incluso efectos cuánticos como el túnel cuántico a escalas muy pequeñas.</p>
    ${App.widget('moore', { title: 'La Ley de Moore con datos reales', cap: 'Ocho procesadores de Intel entre 1971 y 2014. Compara transistores, frecuencia y número de núcleos, y ajusta el periodo de duplicación para ver qué tan bien se acerca a los datos reales.' })}
    <p>Con más transistores por chip: puede subir la <b>frecuencia</b> (los circuitos responden más rápido), caben más niveles de <b>jerarquía de memoria</b> en el propio chip, las arquitecturas pueden ser más complejas y realizar varias tareas a la vez (<b>multinúcleo</b>), baja el <b>voltaje</b> de alimentación (menos consumo) y disminuye el <b>coste</b> de fabricación por transistor.</p>

    <h2>Frecuencia de reloj</h2>
    <p>Mide la velocidad con la que se suceden los ciclos del procesador; depende del tiempo de respuesta de sus circuitos. A igualdad de todo lo demás, más frecuencia significa más velocidad — pero el rendimiento real depende de más factores, así que un procesador con más frecuencia no siempre gana.</p>
    <p>La Ley de Moore ha seguido cumpliéndose aunque la frecuencia dejó de crecer hacia los 3-4 GHz: la <b>potencia disipada crece con el cuadrado de la frecuencia</b>, y llega un punto en que no se puede refrigerar el chip (mira la pestaña «Frecuencia» del widget anterior).</p>

    <h2>Memoria</h2>
    <p>Se busca una jerarquía con capacidades elevadas y tiempos de acceso cortos en cada nivel; los niveles más bajos (más rápidos) están directamente en el chip del procesador — de ahí las cachés integradas. La memoria principal actual (DDRAM) mejora sobre todo en velocidad de acceso y en el número de canales de conexión a la memoria.</p>

    <h2>Arquitectura del procesador: CISC vs. RISC</h2>
    <p>El conjunto de instrucciones (ISA) también ha evolucionado. Dos grandes filosofías:</p>
    ${App.widget('riscCisc', { title: 'CISC frente a RISC', cap: 'ARM es una arquitectura RISC (Reduced Instruction Set Computer): pocas instrucciones simples, de longitud fija, con acceso a memoria solo mediante LDR/STR.' })}
    <h2>El giro hacia el multinúcleo</h2>
    <p>Al topar con el límite de frecuencia, los transistores extra que sigue dando la Ley de Moore se han dedicado a <b>replicar núcleos completos</b> dentro del mismo chip, en vez de acelerar un único núcleo.</p>
    ${App.widget('growth', { title: 'Ritmo de crecimiento del rendimiento por época', cap: 'Tres épocas con ritmos de mejora muy distintos. Mueve el control para ver el efecto acumulado tras varios años.' })}

    <details class="reveal"><summary>Ejercicio 4 del tema</summary><div>
      <ol><li>Describe cómo se reflejan en la gráfica de la Ley de Moore los hitos de la evolución de los procesadores que hemos destacado.</li><li>¿Se puede afirmar que los núcleos de los procesadores actuales tienen más rendimiento que los núcleos de los procesadores anteriores?</li></ol>
      <p class="dim small">Pista para el apartado 2: compara el Core 2 Duo (2006, 2 núcleos) y el Core i7-5960X (2014, 8 núcleos) en la gráfica: fíjate en la frecuencia de cada uno, no solo en el número de transistores.</p>
    </div></details>
    <details class="reveal"><summary>Ejercicio 5 del tema</summary><div>
      <p>Describe las características del procesador de tu propio teléfono móvil: número de núcleos, frecuencia de funcionamiento, memoria RAM y tecnología o escala de integración (nm).</p>
      <p class="dim small">Busca el modelo exacto de tu teléfono y su ficha técnica; verás que incluso los móviles actuales son ya multinúcleo.</p>
    </details>
    ${App.footer('m14')}`
  });
})(window);
