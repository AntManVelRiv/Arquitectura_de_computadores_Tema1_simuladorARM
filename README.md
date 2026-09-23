# Tema 1 · Introducción a la Arquitectura de Computadores — Repertorio ARMv4

Web interactiva de estudio para el Tema 1 de *Arquitectura de Computadores* (Universidad de Almería): introducción a la arquitectura de computadores y repertorio de instrucciones ARMv4, con un simulador de ensamblador completo integrado.

**[👉 Ver la demo](#)** *https://tema1-arquitecturas-de-computadores.netlify.app/#/inicio*

![Estado](https://img.shields.io/badge/estado-completo-brightgreen) ![Sin dependencias](https://img.shields.io/badge/dependencias-ninguna-blue) ![Licencia](https://img.shields.io/badge/uso-educativo-lightgrey)

## ✨ Qué incluye

- **Portada** con anillo de progreso, codificador de instrucciones en vivo y accesos directos a todo el temario.
- **Teoría 1.1 – 1.4**: clasificación de los computadores, arquitectura de un sistema (modelo de Von Neumann, jerarquía de memoria, buses), conexión software-hardware y evolución de la arquitectura (Ley de Moore con datos reales, CISC vs. RISC, multinúcleo).
- **Teoría 1.5 (a-d)**, el núcleo del tema: registros y operandos, repertorio de instrucciones, formato binario de 32 bits y llamadas a procedimientos — con más de 15 widgets interactivos (laboratorio de operaciones lógicas, flags NZCV, modos de indexación, codificador de instrucciones, pila PUSH/POP, ciclo de instrucción animado…).
- **Simulador ARMv4 completo**: editor con resaltado de sintaxis y puntos de parada, ejecución paso a paso / continua / con retroceso, panel de registros y flags, memoria (datos, pila, código, ir a dirección), traza de ejecución y diagrama animado del camino de datos.
- **14 ejercicios** del tema con corrección automática (se ejecuta tu código real y se compara el resultado).
- **Test de repaso** de 33 preguntas tipo Wooclap.
- **Referencia rápida** con buscador: tabla de instrucciones, códigos de condición y glosario.

Diseño «placa de circuito» con tema oscuro/claro, totalmente responsive y **sin ninguna dependencia externa**: no hay build step, ni npm, ni frameworks. Es HTML/CSS/JS puro que funciona abriendo `index.html` directamente, incluso sin conexión a internet (las fuentes están incluidas).

## 🚀 Cómo usarlo

### En local
Clona el repositorio y abre `index.html` en el navegador:

```bash
git clone https://github.com/<tu-usuario>/<tu-repo>.git
cd <tu-repo>
```

Después haz doble clic en `index.html`, o sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

### Publicarlo con GitHub Pages
1. Sube este contenido a un repositorio de GitHub (asegúrate de que `index.html` quede en la raíz, o en `/docs` si prefieres esa carpeta).
2. Ve a **Settings → Pages**.
3. En «Source» elige la rama (p. ej. `main`) y la carpeta (`/` o `/docs`).
4. Guarda; GitHub Pages te dará una URL del tipo `https://<tu-usuario>.github.io/<tu-repo>/`.

No hace falta ninguna acción de build: todo el sitio es estático.

## 🗂️ Estructura del proyecto

```
tema1-arm/
├── index.html            # Punto de entrada (SPA con enrutado por hash)
├── css/
│   ├── base.css           # Sistema de diseño: tokens, tipografía, layout
│   ├── components.css     # Widgets, código, tablas, portada, ejercicios…
│   ├── sim.css             # Estilos específicos del simulador
│   └── fonts.css
├── fonts/                 # Tipografías (Chakra Petch, Barlow, JetBrains Mono) en .woff2
└── js/
    ├── arm.js              # Motor: ensamblador ARMv4 + emulador de CPU
    ├── hl.js                # Resaltado de sintaxis de ensamblador
    ├── examples.js          # Programas de ejemplo usados en toda la web
    ├── editor.js            # Editor de código (textarea + gutter + breakpoints)
    ├── cpu-diagram.js        # Diagrama SVG animado del camino de datos
    ├── widgets.js            # Widgets interactivos (parte 1)
    ├── widgets2.js           # Widgets interactivos (parte 2)
    ├── sim.js                # Vista del simulador completo
    ├── views-1.js             # Portada y teoría 1.1–1.4
    ├── views-2.js             # Teoría 1.5 (a–d)
    ├── practice.js            # Ejercicios y test de repaso
    ├── reference.js           # Referencia rápida
    └── app.js                 # Núcleo de la SPA: rutas, navegación, progreso
```

## 🧠 Sobre el simulador

El motor de `arm.js` implementa un ensamblador de dos pasadas y un emulador de CPU para un subconjunto amplio de ARMv4: instrucciones de procesado de datos con todos los códigos de condición, desplazamientos y flags NZCV; acceso a memoria (`LDR`/`STR`/`LDRB`/`STRB`/`LDRSB`) con los modos offset, pre-indexado, post-indexado e indexado por registro; saltos (`B`/`BL`/`BX`); `PUSH`/`POP`; multiplicaciones (`MUL`/`SMULL`); directivas de ensamblador (`.text`, `.data`, `.word`, `.byte`, `.space`, `.equ`…) y pseudo-instrucciones habituales como `LDR Rd, =valor`.

El progreso del usuario (secciones estudiadas, ejercicios superados, mejor nota del test) se guarda en `localStorage`, en el propio navegador — no hay backend ni se envían datos a ningún servidor.

## 📄 Fuente del contenido

El contenido teórico y los ejercicios están basados en el material de la asignatura *Arquitectura de Computadores* de la Universidad de Almería (Tema 1: Introducción a la Arquitectura de Computadores. Repertorio de instrucciones ARMv4).

## 📜 Licencia

Proyecto de uso educativo. Puedes adaptarlo libremente para tu propio estudio o el de tus compañeros; si lo reutilizas o lo amplías, se agradece una mención.
