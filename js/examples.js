/* examples.js — programas de ejemplo (basados en los ejemplos y ejercicios del tema) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Examples = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const list = [
    /* ------------------------------ Primeros pasos ------------------------------ */
    { id: 'suma', group: 'Primeros pasos', title: 'a = b + c − d', desc: 'Traducción de una expresión aritmética a ensamblador.',
      expect: { R1: 14 },
      code: `@ a = b + c - d      (a en R1, b en R2, c en R3, d en R4)
        MOV  R2, #10        @ b = 10
        MOV  R3, #7         @ c = 7
        MOV  R4, #3         @ d = 3
        ADD  R1, R2, R3     @ R1 = b + c
        SUB  R1, R1, R4     @ R1 = (b + c) - d
` },
    { id: 'logicas', group: 'Primeros pasos', title: 'Lógicas y desplazamientos', desc: 'Los registros del ejercicio 7: AND, ORR, EOR, BIC, MVN, LSL, LSR y ASR.',
      expect: { R1: 0x0486B040, R8: 0xF0500F3C, R9: 0xBFC30C00 },
      code: `@ Registros del ejercicio 7
        LDR  R7, =0x0FAFF0C3
        LDR  R3, =0xB4D6B268
        MOV  R4, #9
        AND  R1, R7, R3     @ AND bit a bit
        ORR  R2, R7, R3     @ OR bit a bit
        EOR  R5, R7, R3     @ XOR bit a bit
        BIC  R6, R7, R3     @ R7 AND (NOT R3): pone a 0 los bits de la máscara
        MVN  R8, R7         @ NOT R7
        LSL  R9, R7, #10    @ R7 << 10   (multiplica por 2^10)
        LSR  R10, R3, #7    @ R3 >> 7 sin signo (rellena con ceros)
        ASR  R11, R3, #7    @ R3 >> 7 con signo (copia el bit de signo)
        LSL  R12, R7, R4    @ desplazamiento con el nº de posiciones en R4
` },
    { id: 'flags', group: 'Primeros pasos', title: 'Flags: CMP, SUBS y condiciones', desc: 'Ejercicio 8: qué instrucciones se ejecutan según los flags.',
      expect: { R1: 18, R2: 0, R5: 0 },
      code: `@ Ejercicio 8
        MOV    R3, #9
        MOV    R4, #9
        LDR    R7, =0x0FAFF0C3
        CMP    R3, R4          @ R3 - R4 = 0  ->  Z = 1 (no guarda el resultado)
        ADDEQ  R1, R4, R3      @ EQ se cumple: R1 = 18
        CMP    R7, R3          @ R7 - R3 != 0 ->  Z = 0
        ADDEQ  R2, R4, R3      @ EQ NO se cumple: R2 no cambia
        SUBS   R5, R3, R4      @ como CMP, pero además guarda el resultado en R5
` },
    /* ---------------------------------- Control ---------------------------------- */
    { id: 'ifelse', group: 'Control de flujo', title: 'if / else con saltos', desc: 'if (i == j) f = g + h; else f = f - i;',
      expect: { R0: 11 },
      code: `@ if (i == j) f = g + h; else f = f - i;
@ f=R0  g=R1  h=R2  i=R3  j=R4
        MOV  R1, #5
        MOV  R2, #6
        MOV  R3, #4
        MOV  R4, #4
        MOV  R0, #100
        CMP  R3, R4         @ compara i y j
        BNE  ELSE           @ si i != j salta al else
        ADD  R0, R1, R2     @ f = g + h
        B    FIN            @ evita ejecutar el else
ELSE    SUB  R0, R0, R3     @ f = f - i
FIN
` },
    { id: 'predicada', group: 'Control de flujo', title: 'if / else predicado', desc: 'La misma idea sin saltos: ejecución condicional.',
      expect: { R0: 11 },
      code: `@ if (i == j) f = g + h; else f = f - i;   sin saltos
        MOV    R1, #5
        MOV    R2, #6
        MOV    R3, #4
        MOV    R4, #4
        MOV    R0, #100
        CMP    R3, R4
        ADDEQ  R0, R1, R2   @ solo se ejecuta si i == j
        SUBNE  R0, R0, R3   @ solo se ejecuta si i != j
` },
    { id: 'while', group: 'Control de flujo', title: 'Bucle while', desc: 'while (pow != 128) { pow = pow * 2; x = x + 1; }',
      expect: { R0: 128, R1: 7 },
      code: `@ while (pow != 128) { pow = pow * 2; x = x + 1; }
        MOV  R0, #1         @ pow
        MOV  R1, #0         @ x
WHILE   CMP  R0, #128
        BEQ  FIN            @ si pow == 128 sale del bucle
        LSL  R0, R0, #1     @ pow = pow * 2
        ADD  R1, R1, #1     @ x = x + 1
        B    WHILE
FIN
` },
    { id: 'for', group: 'Control de flujo', title: 'Bucle for', desc: 'for (i = 0; i < 10; i++) sum = sum + i;',
      expect: { R0: 45 },
      code: `@ for (i = 0; i < 10; i = i + 1) sum = sum + i;
        MOV  R0, #0         @ sum
        MOV  R1, #0         @ i
FOR     CMP  R1, #10
        BGE  FIN            @ si i >= 10 termina
        ADD  R0, R0, R1
        ADD  R1, R1, #1
        B    FOR
FIN
` },
    { id: 'switch', group: 'Control de flujo', title: 'switch / case', desc: 'Una cadena de comparaciones con CMP y BEQ.',
      expect: { R0: 14 },
      code: `@ switch (k) { case 0: f=i+j; break;  case 1: f=g+h; break;  case 2: f=g-h; break;  default: f=0; }
@ f=R0  g=R1  h=R2  i=R3  j=R4  k=R5
        MOV  R1, #20
        MOV  R2, #6
        MOV  R3, #1
        MOV  R4, #2
        MOV  R5, #2         @ prueba con k = 0, 1, 2 y 3
        CMP  R5, #0
        BEQ  CASE0
        CMP  R5, #1
        BEQ  CASE1
        CMP  R5, #2
        BEQ  CASE2
        MOV  R0, #0         @ default
        B    FIN
CASE0   ADD  R0, R3, R4
        B    FIN
CASE1   ADD  R0, R1, R2
        B    FIN
CASE2   SUB  R0, R1, R2
FIN
` },
    /* ---------------------------------- Memoria ---------------------------------- */
    { id: 'array', group: 'Memoria', title: 'Recorrer un array', desc: 'Suma 10 a cada elemento: dirección base + índice·4.',
      expect: { mem: { scores: [13, 11, 14, 11, 15, 19, 12, 16] } },
      code: `        .data
scores: .word 3, 1, 4, 1, 5, 9, 2, 6
        .equ N, 8
        .text
        LDR  R0, =scores            @ R0 = dirección base del array
        MOV  R1, #0                 @ i = 0
FOR     CMP  R1, #N
        BGE  FIN
        LDR  R2, [R0, R1, LSL #2]   @ R2 = scores[i]   (cada palabra ocupa 4 bytes)
        ADD  R2, R2, #10
        STR  R2, [R0, R1, LSL #2]   @ scores[i] = R2
        ADD  R1, R1, #1
        B    FOR
FIN
` },
    { id: 'indexacion', group: 'Memoria', title: 'Offset, pre y post-indexado', desc: 'Los tres modos de indexación y qué le pasa a la base.',
      expect: { R1: 20, R2: 30, R3: 30, R4: 40 },
      code: `        .data
vec:    .word 10, 20, 30, 40
        .text
        LDR  R0, =vec
        LDR  R1, [R0, #4]      @ offset:       R1 = vec[1];               R0 no cambia
        LDR  R2, [R0, #8]!     @ pre-indexado: R0 = R0 + 8 y luego R2 = vec[2]
        LDR  R3, [R0], #4      @ post-indexado: R3 = vec[2]  y luego R0 = R0 + 4
        LDR  R4, [R0]          @ R0 apunta ya a vec[3]
` },
    { id: 'postindex', group: 'Memoria', title: 'Array × 8 con post-indexación', desc: 'Ejercicio 12: array[i] = array[i] * 8 usando un puntero.',
      expect: { mem: { array: [8, 16, 24, 32, 40, 48] } },
      code: `        .data
array:  .word 1, 2, 3, 4, 5, 6
        .text
        LDR  R0, =array        @ puntero al elemento actual
        ADD  R1, R0, #24       @ dirección final (6 palabras * 4 bytes)
LOOP    CMP  R0, R1
        BGE  FIN
        LDR  R2, [R0]
        MOV  R2, R2, LSL #3    @ * 8
        STR  R2, [R0], #4      @ guarda y avanza el puntero
        B    LOOP
FIN
` },
    { id: 'bytes', group: 'Memoria', title: 'Bytes: LDRB, STRB, LDRSB', desc: 'Ejercicio 13 y la diferencia entre LDRB y LDRSB.',
      expect: { R5: 0xF0, R6: 0xFFFFFFF0 },
      code: `        .data
T:      .byte 1, 2, 3, 4, 5, 6, 7, 8
array:  .space 8
neg:    .byte 0xF0
        .text
        LDR   R0, =array
        LDR   R1, =T
        MOV   R2, #0
FOR     CMP   R2, #8
        BGE   FIN
        LDRB  R3, [R1, R2]     @ un byte: el índice se suma sin multiplicar
        ADD   R3, R3, #20
        STRB  R3, [R0, R2]
        ADD   R2, R2, #1
        B     FOR
FIN     LDR   R4, =neg
        LDRB  R5, [R4]         @ sin signo: 0x000000F0
        LDRSB R6, [R4]         @ con signo: 0xFFFFFFF0
` },
    { id: 'endian', group: 'Memoria', title: 'Little-endian en memoria', desc: 'Guarda una palabra y lee sus bytes uno a uno.',
      expect: { R2: 0x0D, R3: 0x0C, R4: 0x0B, R5: 0x0A },
      code: `        .data
dato:   .space 4
        .text
        LDR   R0, =dato
        LDR   R1, =0x0A0B0C0D
        STR   R1, [R0]         @ escribe la palabra completa
        LDRB  R2, [R0]         @ byte de la dirección más baja
        LDRB  R3, [R0, #1]
        LDRB  R4, [R0, #2]
        LDRB  R5, [R0, #3]     @ ¿Qué byte queda en cada dirección?
` },
    { id: 'smull', group: 'Memoria', title: 'Multiplicación de 64 bits', desc: 'MUL se queda con 32 bits; SMULL da el resultado completo.',
      expect: { R2: 0, R3: 0xFFFFFFFF },
      code: `        LDR    R0, =0x80000000
        MOV    R1, #2
        MUL    R4, R0, R1         @ solo los 32 bits bajos
        SMULL  R2, R3, R0, R1     @ R3:R2 = R0 * R1 con signo (64 bits)
` },
    /* --------------------------------- Funciones --------------------------------- */
    { id: 'llamada', group: 'Funciones', title: 'Llamada simple con BL', desc: 'BL guarda el retorno en LR; MOV PC, LR vuelve.',
      expect: { R4: 7 },
      code: `@ Programa principal
main:   MOV  R0, #3
        MOV  R1, #4
        BL   SUMA            @ LR = dirección de la instrucción siguiente
        MOV  R4, R0          @ R4 = resultado
        SWI  0x11            @ fin del programa
@ Función: R0 = R0 + R1
SUMA:   ADD  R0, R0, R1
        MOV  PC, LR          @ vuelve al invocador
` },
    { id: 'diffofsums', group: 'Funciones', title: 'DIFFOFSUMS con la pila', desc: 'La función guarda en la pila los registros que va a modificar.',
      expect: { R0: 0xFFFFFFFC },
      code: `@ int diffofsums(f, g, h, i) { return (f + g) - (h + i); }
main:   MOV  R0, #2
        MOV  R1, #3
        MOV  R2, #4
        MOV  R3, #5
        BL   DIFFOFSUMS
        MOV  R5, R0          @ resultado (-4)
        SWI  0x11

DIFFOFSUMS  PUSH {R4, R8, R9}     @ guarda los registros que va a usar
        ADD  R8, R0, R1
        ADD  R9, R2, R3
        SUB  R4, R8, R9
        MOV  R0, R4
        POP  {R4, R8, R9}         @ los restaura
        MOV  PC, LR
` },
    { id: 'reduce', group: 'Funciones', title: 'x = reduce(3, 4, 5)', desc: 'Ejercicio 14: sum = a + b + c; return sum.',
      expect: { R4: 12 },
      code: `@ x = reduce(3, 4, 5)      (x en R4)
main:   MOV  R0, #3
        MOV  R1, #4
        MOV  R2, #5
        BL   REDUCE
        MOV  R4, R0
        SWI  0x11

@ int reduce(int a, int b, int c) { int sum = a + b + c; return sum; }
REDUCE: ADD  R3, R0, R1      @ sum en R3 (registro temporal: no hace falta la pila)
        ADD  R3, R3, R2
        MOV  R0, R3          @ el resultado se devuelve en R0
        MOV  PC, LR
` },
    { id: 'factorial', group: 'Funciones', title: 'Factorial recursivo', desc: 'Cada llamada apila R0 y LR. Mira la pestaña "Pila".',
      expect: { R4: 6 },
      code: `@ int factorial(int n) { if (n <= 1) return 1; else return n * factorial(n - 1); }
main:   MOV  R0, #3
        BL   FACTORIAL
        MOV  R4, R0          @ R4 = 3! = 6
        SWI  0x11

FACTORIAL PUSH {R0, LR}      @ guarda n y la dirección de retorno
        CMP  R0, #1
        BGT  ELSE
        MOV  R0, #1          @ caso base
        ADD  SP, SP, #8      @ descarta R0 y LR sin restaurarlos
        MOV  PC, LR
ELSE    SUB  R0, R0, #1      @ n - 1
        BL   FACTORIAL       @ llamada recursiva
        POP  {R1, LR}        @ R1 = n original, recupera el retorno
        MUL  R0, R1, R0      @ n * factorial(n - 1)
        MOV  PC, LR
` },
    { id: 'sumacuad', group: 'Funciones', title: 'SumaCuadrados(n) recursivo', desc: 'Ejercicio de clase: 1² + 2² + … + n².',
      expect: { R4: 30 },
      code: `@ int SumaCuadrados(int n) { if (n <= 1) return 1; else return n*n + SumaCuadrados(n - 1); }
main:   MOV  R0, #4
        BL   SumaCuadrados
        MOV  R4, R0          @ 1 + 4 + 9 + 16 = 30
        SWI  0x11

SumaCuadrados PUSH {R0, LR}
        CMP  R0, #1
        BGT  ELSE
        MOV  R0, #1
        ADD  SP, SP, #8
        MOV  PC, LR
ELSE    SUB  R0, R0, #1
        BL   SumaCuadrados
        POP  {R1, LR}        @ R1 = n
        MUL  R2, R1, R1      @ n * n
        ADD  R0, R0, R2      @ + SumaCuadrados(n - 1)
        MOV  PC, LR
` },
    /* ----------------------------- Código máquina ----------------------------- */
    { id: 'codif', group: 'Código máquina', title: 'Programa de codificación', desc: 'El ejemplo de las diapositivas: mira el código máquina de cada línea.',
      expect: {}, noRun: true,
      code: `@ Ejemplo del tema: codifica cada instrucción y observa sus campos.
@ (Solo para estudiar la codificación: LDR R5,[R0,#1] leería una dirección no alineada.)
label:  ADD  R1, R2, R3
        LDR  R5, [R0, R3, LSL #2]
        MOV  R1, R2, LSL #2
        LDR  R5, [R0, #1]
        BLT  label
` }
  ];
  const byId = {}; list.forEach(e => { byId[e.id] = e; });
  return { list, get: id => byId[id] };
});
