/* app.js — enrutado por hash, navegación, progreso, utilidades comunes */
(function (root) {
  'use strict';
  const KEY = 'armlab.v1';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (sel, r) => (r || document).querySelector(sel);
  const $$ = (sel, r) => Array.from((r || document).querySelectorAll(sel));

  /* Orden y grupos de la navegación */
  const NAV = [
    { group: 'Teoría', items: [
      { id: 'm11', num: '1.1', label: 'Clasificación de los computadores' },
      { id: 'm12', num: '1.2', label: 'Arquitectura de un sistema' },
      { id: 'm13', num: '1.3', label: 'Conexión software y hardware' },
      { id: 'm14', num: '1.4', label: 'Evolución de la arquitectura' },
      { id: 'm15a', num: '1.5', label: 'ARMv4: instrucciones y operandos' },
      { id: 'm15b', num: '', label: 'Repertorio de instrucciones', sub: true },
      { id: 'm15c', num: '', label: 'Formato de las instrucciones', sub: true },
      { id: 'm15d', num: '', label: 'Llamadas a procedimientos', sub: true }
    ] },
    { group: 'Práctica', tool: true, items: [
      { id: 'sim', label: 'Simulador ARM' },
      { id: 'ex', label: 'Ejercicios' },
      { id: 'quiz', label: 'Test de repaso' },
      { id: 'ref', label: 'Referencia rápida' }
    ] }
  ];
  const MODULES = ['m11', 'm12', 'm13', 'm14', 'm15a', 'm15b', 'm15c', 'm15d'];
  const ORDER = ['inicio'].concat(NAV.flatMap(g => g.items.map(i => i.id)));

  const views = {};
  const App = {
    views, esc, $, $$, MODULES, ORDER, totals: { ex: 0, quiz: 0 },
    state: { done: {}, quiz: {}, ex: {}, theme: null },
    register(id, def) { views[id] = def; },

    /* ------------------------------ Progreso ------------------------------ */
    load() {
      try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.assign(App.state, { done: {}, quiz: {}, ex: {} }, s); } catch (e) { /* almacenamiento no disponible */ }
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(App.state)); } catch (e) { /* ignorar */ } },
    overall() {
      const th = MODULES.filter(m => App.state.done[m]).length / MODULES.length;
      const ex = App.totals.ex ? Object.values(App.state.ex).filter(Boolean).length / App.totals.ex : 0;
      const qz = App.state.quiz.done ? Math.max(App.state.quiz.best || 0, 1) / 100 : 0;
      return { th, ex, qz, all: th * 0.5 + ex * 0.25 + qz * 0.25 };
    },
    refreshProgress() {
      const o = App.overall(); const pct = Math.round(o.all * 100);
      $('#overall-label').textContent = 'Progreso: ' + pct + ' %';
      $('#overall-bar').style.width = pct + '%';
      $$('.nav-link[data-go]').forEach(a => a.classList.toggle('done', !!App.state.done[a.dataset.go]));
      document.dispatchEvent(new CustomEvent('progress', { detail: o }));
    },
    setDone(id, v) { App.state.done[id] = !!v; App.save(); App.refreshProgress(); },

    /* ------------------------------ Utilidades ---------------------------- */
    toast(msg) {
      const t = $('#toast'); t.textContent = msg; t.classList.add('show');
      clearTimeout(App._tt); App._tt = setTimeout(() => t.classList.remove('show'), 2200);
    },
    /* Bloque de código con resaltado y botones */
    code(src, opts) {
      opts = opts || {};
      const clean = src.replace(/^\n+|\s+$/g, '');
      const btns = (opts.sim === false ? '' : `<button class="btn ghost sm" type="button" data-sim-code>Abrir en el simulador</button>`) + `<button class="btn ghost sm" type="button" data-copy>Copiar</button>`;
      return `<figure class="code" data-code="${esc(clean)}">${opts.title ? `<figcaption><span>${esc(opts.title)}</span><span class="code-btns">${btns}</span></figcaption>` : `<figcaption class="bare"><span class="code-btns">${btns}</span></figcaption>`}<pre>${root.Asm.highlight(clean)}</pre></figure>`;
    },
    /* Barra "marcar como estudiado" + paginación */
    footer(id) {
      const i = ORDER.indexOf(id), p = views[ORDER[i - 1]], n = views[ORDER[i + 1]];
      return `<div class="studied-bar"><label class="chip check"><input type="checkbox" data-studied="${id}" ${App.state.done[id] ? 'checked' : ''}> <span>He estudiado esta sección</span></label>
        <div class="pager">${p ? `<a class="btn ghost sm" href="#/${ORDER[i - 1]}">Anterior: ${esc(p.title)}</a>` : ''}${n ? `<a class="btn sm" href="#/${ORDER[i + 1]}">Siguiente: ${esc(n.title)}</a>` : ''}</div></div>`;
    },
    /* Pestañas genéricas */
    tabs(rootEl) {
      $$('.tabs', rootEl).forEach(tabs => {
        const wrap = tabs.parentElement; const btns = $$('[data-tab]', tabs);
        const show = id => {
          btns.forEach(b => { const on = b.dataset.tab === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
          $$(':scope > [data-panel]', wrap).forEach(p => { p.hidden = p.dataset.panel !== id; });
          wrap.dispatchEvent(new CustomEvent('tabchange', { detail: id, bubbles: true }));
        };
        btns.forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
        tabs.addEventListener('keydown', e => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
          const i = btns.findIndex(b => b.getAttribute('aria-selected') === 'true');
          const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length; btns[j].focus(); show(btns[j].dataset.tab);
        });
        show(btns[0].dataset.tab);
      });
    },
    /* Bloques interactivos: <div data-w="nombre" data-…> se activan al mostrar la vista */
    widget(name, o) {
      o = o || {};
      const a = Object.entries(o.attrs || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ');
      return `<div class="widget panel${o.cls ? ' ' + o.cls : ''}">${o.title ? `<div class="panel-title">${esc(o.title)}</div>` : ''}${o.cap ? `<p class="widget-cap">${o.cap}</p>` : ''}<div data-w="${name}" ${a}></div></div>`;
    },
    mini(code, watch, o) {
      o = o || {};
      return App.widget('miniSim', { title: o.title || 'Pruébalo paso a paso', cap: o.cap, attrs: { code: code.replace(/^\n+|\s+$/g, ''), watch: (watch || [0, 1, 2, 3]).join(','), flags: o.flags === false ? '0' : '1' } });
    },
    mount(rootEl) {
      $$('[data-w]', rootEl).forEach(el => {
        if (el.dataset.mounted) return; el.dataset.mounted = '1';
        const fn = root.Widgets && root.Widgets[el.dataset.w]; if (!fn) { el.textContent = 'Widget no disponible: ' + el.dataset.w; return; }
        const o = {};
        if (el.dataset.ex) o.code = root.Examples.get(el.dataset.ex).code;
        if (el.dataset.code) o.code = el.dataset.code;
        if (el.dataset.watch) o.watch = el.dataset.watch.split(',').map(Number);
        if (el.dataset.flags === '0') o.flags = false;
        if (el.dataset.op) o.op = el.dataset.op;
        if (el.dataset.mod) o.mod = el.dataset.mod;
        if (el.dataset.value) o.value = el.dataset.value;
        fn(el, o);
      });
    },
    /* Ir a una vista */
    go(id) { location.hash = '#/' + id; },
    openSim(code) { App.pendingSim = code; App.go('sim'); },

    /* ------------------------------ Enrutado ------------------------------ */
    current: null,
    show(id) {
      if (!views[id]) id = 'inicio';
      const main = $('#main');
      let sec = $('#v-' + id);
      const def = views[id];
      if (!sec) {
        sec = document.createElement('section'); sec.id = 'v-' + id; sec.className = 'view' + (def.wide ? ' wide' : '');
        sec.innerHTML = def.html(); main.appendChild(sec);
        App.tabs(sec); App.mount(sec);
        if (def.init) def.init(sec);
      }
      $$('.view', main).forEach(v => { v.hidden = v !== sec; });
      App.current = id;
      document.title = (def.title ? def.title + ' · ' : '') + 'Tema 1 · ARMv4';
      $$('.nav-link[data-go]').forEach(a => { if (a.dataset.go === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      $('#app').classList.remove('nav-open'); $('#btn-menu').setAttribute('aria-expanded', 'false');
      if (def.onShow) def.onShow(sec);
      if (!def.keepScroll) window.scrollTo(0, 0);
      document.dispatchEvent(new CustomEvent('viewchange', { detail: id }));
    },
    route() { const id = (location.hash.match(/^#\/([\w-]+)/) || [])[1] || 'inicio'; App.show(id); },

    buildNav() {
      const nav = $('#nav');
      nav.innerHTML = NAV.map(g => `<div class="nav-group"><div class="nav-title">${g.group}</div><ul class="nav-list">${g.items.map(i =>
        `<li><a class="nav-link${i.sub ? ' sub' : ''}${g.tool ? ' tool' : ''}" href="#/${i.id}" data-go="${i.id}"><span class="node"></span>${i.num ? `<span class="num">${i.num}</span>` : ''}<span>${esc(i.label)}</span></a></li>`).join('')}</ul></div>`).join('');
    },

    start() {
      App.load();
      if (App.state.theme) document.documentElement.dataset.theme = App.state.theme;
      App.buildNav();
      const themeBtn = $('#btn-theme');
      const syncTheme = () => { themeBtn.textContent = document.documentElement.dataset.theme === 'light' ? 'Tema oscuro' : 'Tema claro'; };
      syncTheme();
      themeBtn.addEventListener('click', () => {
        const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        document.documentElement.dataset.theme = t; App.state.theme = t; App.save(); syncTheme();
        document.dispatchEvent(new CustomEvent('themechange'));
      });
      $('#btn-reset').addEventListener('click', () => {
        if (confirm('¿Borrar todo tu progreso (secciones, ejercicios y test)?')) { const th = App.state.theme; App.state = { done: {}, quiz: {}, ex: {}, theme: th }; App.save(); location.reload(); }
      });
      $('#btn-menu').addEventListener('click', () => {
        const open = $('#app').classList.toggle('nav-open'); $('#btn-menu').setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', e => {
        const t = e.target;
        if ($('#app').classList.contains('nav-open') && !t.closest('.rail') && !t.closest('#btn-menu')) $('#app').classList.remove('nav-open');
        const go = t.closest('[data-go]:not(.nav-link)'); if (go) { e.preventDefault(); App.go(go.dataset.go); return; }
        const sc = t.closest('[data-sim-code]');
        if (sc) { App.openSim(sc.closest('.code').dataset.code); return; }
        const cp = t.closest('[data-copy]');
        if (cp) { const txt = cp.closest('.code').dataset.code; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => App.toast('Código copiado'), () => App.toast('No se pudo copiar')); return; }
        const ex = t.closest('[data-sim-ex]');
        if (ex) { App.openSim(root.Examples.get(ex.dataset.simEx).code); return; }
      });
      document.addEventListener('change', e => {
        const c = e.target.closest('[data-studied]');
        if (c) { App.setDone(c.dataset.studied, c.checked); if (c.checked) App.toast('Sección marcada como estudiada'); }
      });
      window.addEventListener('hashchange', App.route);
      App.refreshProgress();
      App.route();
    }
  };
  root.App = App;
})(window);
