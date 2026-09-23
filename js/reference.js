/* reference.js — referencia rápida: instrucciones, condiciones y glosario */
(function (root) {
  'use strict';
  const App = root.App, ARM = root.ARM, esc = root.Asm.esc, $ = App.$, $$ = App.$$;

  const INSTR = [
    ['MOV', 'MOV Rd, op2', 'Rd ← op2', 'Copia un valor (registro, inmediato o con desplazamiento) a Rd.'],
    ['MVN', 'MVN Rd, op2', 'Rd ← NOT op2', 'Copia el complemento a uno (todos los bits invertidos).'],
    ['ADD', 'ADD Rd, Rn, op2', 'Rd ← Rn + op2', 'Suma entera de 32 bits.'],
    ['SUB', 'SUB Rd, Rn, op2', 'Rd ← Rn − op2', 'Resta entera de 32 bits.'],
    ['RSB', 'RSB Rd, Rn, op2', 'Rd ← op2 − Rn', 'Resta invertida: útil para negar (RSB Rd, Rn, #0).'],
    ['MUL', 'MUL Rd, Rm, Rs', 'Rd ← (Rm × Rs) mod 2³²', 'Multiplicación; solo conserva los 32 bits bajos.'],
    ['SMULL', 'SMULL RdLo, RdHi, Rm, Rs', 'RdHi:RdLo ← Rm × Rs (con signo)', 'Multiplicación de 64 bits con signo.'],
    ['AND', 'AND Rd, Rn, op2', 'Rd ← Rn AND op2', 'Y lógica bit a bit; sirve para enmascarar bits.'],
    ['ORR', 'ORR Rd, Rn, op2', 'Rd ← Rn OR op2', 'O lógica bit a bit; sirve para activar bits.'],
    ['EOR', 'EOR Rd, Rn, op2', 'Rd ← Rn XOR op2', 'O-exclusiva; invierte los bits marcados en op2.'],
    ['BIC', 'BIC Rd, Rn, op2', 'Rd ← Rn AND NOT op2', 'Borra (a 0) los bits marcados en op2.'],
    ['LSL', 'LSL Rd, Rm, #n / Rs', 'Rd ← Rm << n', 'Desplazamiento lógico a la izquierda; equivale a × 2ⁿ.'],
    ['LSR', 'LSR Rd, Rm, #n / Rs', 'Rd ← Rm >> n (sin signo)', 'Desplazamiento lógico a la derecha, rellena con ceros; equivale a ÷ 2ⁿ sin signo.'],
    ['ASR', 'ASR Rd, Rm, #n / Rs', 'Rd ← Rm >> n (con signo)', 'Desplazamiento aritmético a la derecha, copia el bit de signo; equivale a ÷ 2ⁿ con signo.'],
    ['ROR', 'ROR Rd, Rm, #n / Rs', 'Rd ← Rm rotado n bits', 'Rotación a la derecha: los bits que salen entran por el otro lado.'],
    ['CMP', 'CMP Rn, op2', 'flags ← Rn − op2', 'Como SUBS pero sin guardar el resultado: solo actualiza NZCV.'],
    ['CMN', 'CMN Rn, op2', 'flags ← Rn + op2', 'Como ADDS pero sin guardar el resultado.'],
    ['TST', 'TST Rn, op2', 'flags ← Rn AND op2', 'Prueba bits: pone Z = 1 si Rn AND op2 = 0 (ningún bit común).'],
    ['B', 'B etiqueta', 'PC ← etiqueta', 'Salto incondicional (o condicional con sufijo, p. ej. BNE).'],
    ['BL', 'BL etiqueta', 'LR ← PC + 4; PC ← etiqueta', 'Salto con enlace: guarda la dirección de retorno para volver con una función.'],
    ['BX', 'BX Rm', 'PC ← Rm', 'Salto a la dirección contenida en un registro.'],
    ['LDR', 'LDR Rd, [Rn, offset]', 'Rd ← memoria[dirección]', 'Carga una palabra (32 bits) desde memoria.'],
    ['STR', 'STR Rd, [Rn, offset]', 'memoria[dirección] ← Rd', 'Guarda una palabra (32 bits) en memoria.'],
    ['LDRB', 'LDRB Rd, [Rn, offset]', 'Rd ← byte (sin signo)', 'Carga un solo byte, extendido con ceros.'],
    ['STRB', 'STRB Rd, [Rn, offset]', 'memoria[dirección] ← Rd[7:0]', 'Guarda el byte menos significativo de Rd.'],
    ['LDRSB', 'LDRSB Rd, [Rn, offset]', 'Rd ← byte (con signo)', 'Carga un byte extendiendo su signo a 32 bits.'],
    ['PUSH', 'PUSH {lista}', 'SP ← SP − 4n; guarda los registros', 'Apila varios registros; SP decrece.'],
    ['POP', 'POP {lista}', 'restaura los registros; SP ← SP + 4n', 'Desapila varios registros; SP crece.'],
    ['SWI', 'SWI #n', '(llamada al sistema / fin de programa)', 'En el simulador: 0x11 termina el programa; 0x6B imprime R1.']
  ];

  const GLOSS = [
    ['ALU', 'Unidad Aritmético-Lógica: parte del camino de datos que realiza las operaciones.'],
    ['Bus', 'Enlace de comunicación compartido entre varios dispositivos (CPU, memoria, E/S).'],
    ['Caché', 'Nivel de memoria pequeño y rápido, más cercano a la CPU que la memoria principal.'],
    ['CISC', 'Complex Instruction Set Computer: instrucciones potentes, de longitud variable.'],
    ['Contención de bus', 'Error que se produce cuando dos dispositivos transmiten a la vez por el mismo bus.'],
    ['Ensamblador', 'Representación textual y legible de las instrucciones máquina; también, el programa que las traduce a binario.'],
    ['Flags (NZCV)', 'Bits del registro de estado que indican Negativo, Cero, Carry y oVerflow tras una operación.'],
    ['IR', 'Instruction Register: guarda la instrucción que se está ejecutando.'],
    ['ISA', 'Instruction Set Architecture: el repertorio de instrucciones que define una arquitectura.'],
    ['Ley de Moore', 'Predicción de que el número de transistores por chip se duplica periódicamente.'],
    ['Little-endian', 'Orden de bytes en memoria donde el byte menos significativo va en la dirección más baja (el que usa ARM).'],
    ['LR', 'Link Register (R14): guarda la dirección de retorno tras una llamada BL.'],
    ['Mnemónico', 'Nombre textual de una instrucción en ensamblador (p. ej. ADD, LDR).'],
    ['PC', 'Program Counter (R15): dirección de la siguiente instrucción a ejecutar.'],
    ['Pila (stack)', 'Zona de memoria LIFO usada para guardar temporalmente registros; en ARM crece hacia direcciones bajas.'],
    ['Predicación', 'Ejecutar una instrucción solo si se cumple una condición, sin usar un salto.'],
    ['RISC', 'Reduced Instruction Set Computer: instrucciones simples, de longitud fija; ARM es RISC.'],
    ['SP', 'Stack Pointer (R13): dirección más baja ocupada de la pila.'],
    ['SR', 'Status Register: contiene los flags de condición.'],
    ['Unidad de control', 'Genera las señales que gobiernan el camino de datos y el acceso a memoria.'],
    ['Von Neumann', 'Modelo de computador donde programa y datos comparten la misma memoria.']
  ];

  function html() {
    return `<header class="view-head"><p class="eyebrow">Tema 1 · Práctica</p><h1>Referencia rápida</h1><p class="lede">Tabla de instrucciones, códigos de condición y glosario. Usa el buscador para filtrar.</p></header>
    <div class="ref-tools"><input type="search" id="ref-q" placeholder="Buscar instrucción, condición o término…" aria-label="Buscar en la referencia"></div>

    <section class="ref-sec" id="ref-instr"><h2>Instrucciones</h2>
      <div class="tbl-wrap"><table class="tbl ref-tbl"><thead><tr><th>Mnemónico</th><th>Sintaxis</th><th>Efecto</th><th>Descripción</th></tr></thead><tbody>
        ${INSTR.map(([m, s, e, d]) => `<tr data-k="${esc((m + ' ' + s + ' ' + d).toLowerCase())}"><td class="mono c-ice">${esc(m)}</td><td class="mono">${esc(s)}</td><td class="mono dim">${esc(e)}</td><td>${esc(d)}</td></tr>`).join('')}
      </tbody></table></div>
    </section>

    <section class="ref-sec" id="ref-cond"><h2>Códigos de condición</h2>
      <div class="tbl-wrap"><table class="tbl ref-tbl"><thead><tr><th>Sufijo</th><th>Nombre</th><th>Se cumple si…</th></tr></thead><tbody>
        ${ARM.COND_TABLE.map(c => `<tr data-k="${esc((c.mn + ' ' + (c.alt || '') + ' ' + c.name).toLowerCase())}"><td class="mono c-violet">${c.mn}${c.alt ? ' / ' + c.alt : ''}</td><td>${esc(c.name)}</td><td class="mono dim">${esc(c.flags)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="dim small">Cualquier instrucción puede llevar uno de estos sufijos (excepto AL, que es el comportamiento por defecto cuando no se indica ninguno) para ejecutarse solo si se cumple la condición.</p>
    </section>

    <section class="ref-sec" id="ref-regs"><h2>Convención de registros</h2>
      <div class="widget panel"><div data-w="regmap"></div></div>
    </section>

    <section class="ref-sec" id="ref-gloss"><h2>Glosario</h2>
      <dl class="gloss">${GLOSS.map(([t, d]) => `<div data-k="${esc((t + ' ' + d).toLowerCase())}"><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
    </section>
    <p id="ref-empty" class="dim" hidden>Sin resultados para esta búsqueda.</p>`;
  }
  function init(sec) {
    const q = $('#ref-q', sec);
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase();
      let any = false;
      $$('tbody tr[data-k]', sec).forEach(r => { const show = !v || r.dataset.k.includes(v); r.hidden = !show; if (show) any = true; });
      $$('.gloss > div[data-k]', sec).forEach(r => { const show = !v || r.dataset.k.includes(v); r.hidden = !show; if (show) any = true; });
      $('#ref-empty', sec).hidden = any || !v;
      $$('.ref-sec', sec).forEach(s => { const rows = $$('[data-k]', s); if (!rows.length) return; s.hidden = v && rows.every(r => r.hidden); });
    });
  }
  App.register('ref', { title: 'Referencia rápida', wide: true, html, init });
})(window);
