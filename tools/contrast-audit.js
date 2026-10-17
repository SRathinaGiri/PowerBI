/* Contrast audit for the lesson pages.
   Paste into the browser console on any page of the locally served site
   (python -m http.server) and run:  await srgAudit()
   It loads every lesson in a hidden iframe, in light and dark theme, and
   lists text whose contrast against its effective background is below the
   threshold (WCAG AA is 4.5 for body text, 3 for large text). */
async function srgAudit(opts) {
  opts = Object.assign({ min: 3, wait: 1800 }, opts || {});
  const pages = ['index.html'].concat(SRG.lessons.map(l => l.path));
  const report = [];

  const parse = (s) => {
    const m = s && s.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a), a: 1
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  // Average the colour stops of a gradient as a stand-in for its colour.
  const gradColor = (img) => {
    // Only the last layer covers the whole box; radial highlights above it are decoration.
    const layers = img.split(/,(?![^(]*\))(?=\s*(?:linear|radial|conic|repeating))/);
    const last = layers[layers.length - 1];
    const cols = (last.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
    if (!cols.length) return null;
    // Alpha-weighted mean so `transparent` stops don't pull the colour toward black.
    const wsum = cols.reduce((s, c) => s + c.a, 0);
    if (!wsum) return null;
    const mix = cols.reduce((acc, c) => ({ r: acc.r + c.r * c.a / wsum, g: acc.g + c.g * c.a / wsum, b: acc.b + c.b * c.a / wsum }), { r: 0, g: 0, b: 0 });
    mix.a = wsum / cols.length;
    return mix;
  };

  function effectiveBg(el, win, base) {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = win.getComputedStyle(n);
      const bc = parse(cs.backgroundColor);
      const gi = cs.backgroundImage !== 'none' && !/url\(/.test(cs.backgroundImage) ? gradColor(cs.backgroundImage) : null;
      if (gi && gi.a > 0) layers.push(gi);
      if (bc && bc.a > 0) layers.push(bc);
      if (bc && bc.a >= 1) break;
    }
    let c = base;
    for (let i = layers.length - 1; i >= 0; i--) c = over(layers[i], c);
    return c;
  }

  for (const theme of ['light', 'dark']) {
    try { localStorage.setItem('srg-theme', theme); } catch (e) {}
    for (const p of pages) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:-4000px;top:0;width:1280px;height:900px';
      document.body.appendChild(f);
      await new Promise(res => { f.onload = res; f.src = '/' + p + '?audit=' + Date.now(); });
      await new Promise(r => setTimeout(r, opts.wait));
      const d = f.contentDocument, w = f.contentWindow;
      const base = parse(w.getComputedStyle(d.documentElement).getPropertyValue('--bg').trim().replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgb(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)})`)) || { r: 255, g: 255, b: 255, a: 1 };
      const seen = new Set();
      const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
      for (let t = walker.nextNode(); t; t = walker.nextNode()) {
        if (!t.textContent.trim()) continue;
        const el = t.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        const cs = w.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[hidden],script,style,canvas,.srg-menu:not(:popover-open)')) continue;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const isSvg = el instanceof w.SVGElement;
        let fg = parse(isSvg ? cs.fill : cs.color);
        if (!fg) continue;
        if (cs.webkitTextFillColor && /rgba?\(0, 0, 0, 0\)/.test(cs.webkitTextFillColor)) continue; // gradient text
        if (cs.textShadow && cs.textShadow !== 'none' && /rgba?\(0, 0, 0/.test(cs.textShadow)) continue; // haloed label on a coloured tile
        const bg = effectiveBg(el, w, base);
        fg = over(fg, bg);
        const r = ratio(fg, bg);
        if (r < opts.min) {
          report.push({ theme, page: p, ratio: +r.toFixed(2), text: t.textContent.trim().slice(0, 40),
            el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
            fg: cs.color, bg: `rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})` });
        }
      }
      f.remove();
    }
  }
  return report;
}
