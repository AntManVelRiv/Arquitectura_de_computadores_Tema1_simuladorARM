/* editor.js — editor de ensamblador: textarea + capa de resaltado + gutter con puntos de parada */
(function (root) {
  'use strict';
  const LH = 22; // alto de línea en px (debe coincidir con el CSS)

  class AsmEditor {
    constructor(host, opts) {
      opts = opts || {};
      this.host = host; this.opts = opts;
      this.bp = new Set(); this.errors = new Map(); this.cur = 0; this.valid = null;
      host.classList.add('ed');
      host.innerHTML = `<div class="ed-scroll"><div class="ed-body"><div class="ed-gutter" aria-hidden="false"></div><div class="ed-code"><pre class="ed-hl" aria-hidden="true"></pre><textarea class="ed-ta" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="${opts.label || 'Código ensamblador'}"></textarea></div></div></div>`;
      this.scroll = host.querySelector('.ed-scroll'); this.gutter = host.querySelector('.ed-gutter');
      this.hl = host.querySelector('.ed-hl'); this.ta = host.querySelector('.ed-ta');
      if (opts.readOnly) this.ta.readOnly = true;
      this.ta.addEventListener('input', () => { this.render(); if (opts.onChange) opts.onChange(this.ta.value); });
      this.ta.addEventListener('keydown', e => this.key(e));
      this.scroll.addEventListener('mousedown', e => { if (e.target === this.scroll || e.target.closest('.ed-body') && !e.target.closest('.ed-gutter') && e.target !== this.ta) { e.preventDefault(); this.ta.focus(); const n = this.ta.value.length; this.ta.setSelectionRange(n, n); } });
      this.gutter.addEventListener('click', e => {
        const b = e.target.closest('[data-ln]'); if (!b) return;
        const n = +b.dataset.ln; if (opts.onBreakpoint) opts.onBreakpoint(n);
      });
      this.setValue(opts.value || '');
    }
    key(e) {
      const ta = this.ta;
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd;
        ta.setRangeText('        ', s, en, 'end');
        ta.dispatchEvent(new Event('input')); return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const s = ta.selectionStart; const before = ta.value.slice(0, s);
        const line = before.slice(before.lastIndexOf('\n') + 1);
        const ind = (line.match(/^[ \t]*/) || [''])[0];
        e.preventDefault(); ta.setRangeText('\n' + ind, s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input'));
      }
    }
    getValue() { return this.ta.value; }
    setValue(v) { this.ta.value = v; this.render(); }
    render() {
      const lines = this.ta.value.split('\n');
      this.hl.innerHTML = lines.map((l, i) => {
        const cls = 'l' + (this.cur === i + 1 ? ' cur' : '') + (this.errors.has(i + 1) ? ' err' : '') + (this.bp.has(i + 1) ? ' bp' : '');
        return `<div class="${cls}">${root.Asm.hlLine(l) || '&#8203;'}</div>`;
      }).join('');
      let g = '';
      for (let i = 1; i <= lines.length; i++) {
        const cls = 'ln' + (this.cur === i ? ' cur' : '') + (this.errors.has(i) ? ' err' : '') + (this.bp.has(i) ? ' bp' : '');
        const t = this.errors.has(i) ? this.errors.get(i) : (this.bp.has(i) ? 'Punto de parada (clic para quitar)' : 'Clic para poner un punto de parada');
        g += `<button type="button" class="${cls}" data-ln="${i}" title="${root.Asm.esc(t)}" tabindex="-1">${i}</button>`;
      }
      this.gutter.innerHTML = g;
    }
    setErrors(errs) { this.errors = new Map((errs || []).map(e => [e.line, e.msg])); this.render(); }
    setBreakpoints(set) { this.bp = set; this.render(); }
    setCurrent(n, reveal) {
      if (this.cur === n) return;
      const prev = this.cur; this.cur = n;
      const ls = this.hl.children, gs = this.gutter.children;
      if (prev && ls[prev - 1]) { ls[prev - 1].classList.remove('cur'); gs[prev - 1].classList.remove('cur'); }
      if (n && ls[n - 1]) {
        ls[n - 1].classList.add('cur'); gs[n - 1].classList.add('cur');
        if (reveal !== false) {
          const top = (n - 1) * LH, sc = this.scroll;
          if (top < sc.scrollTop + LH) sc.scrollTop = Math.max(0, top - 2 * LH);
          else if (top > sc.scrollTop + sc.clientHeight - 2 * LH) sc.scrollTop = top - sc.clientHeight + 3 * LH;
        }
      }
    }
    setReadOnly(v) { this.ta.readOnly = !!v; this.host.classList.toggle('ro', !!v); }
    focus() { this.ta.focus(); }
  }
  root.AsmEditor = AsmEditor;
})(window);
