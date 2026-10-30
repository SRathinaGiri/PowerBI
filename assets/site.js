/* Power BI Visual Lessons — theme + lesson navigation.
   Load synchronously in <head> (no defer) so the theme is applied before
   first paint; the bar and footer are injected once the DOM is ready.
   Reorder or add lessons by editing LESSONS only. */
(function () {
  'use strict';

  var LESSONS = [
    { path: 'pages/ElementsOfDataCube.html', track: 'Foundations', title: 'Elements of the Data Cube',
      blurb: 'Fact, dimension, hierarchy and measure: four words that explain every report.' },
    { path: 'pages/stages-of-data-analysis.html', track: 'Foundations', title: 'Stages of Data Analysis',
      blurb: 'From cross tabs and pivot tables to cubes, interactive BI and AI-enabled insight.' },
    { path: 'pages/OLAPConcept.html', track: 'Foundations', title: 'OLTP vs OLAP',
      blurb: 'Why analytics engines are built differently from transaction systems, and why columnstores win.' },
    { path: 'pages/OLAPDataCube.html', track: 'Foundations', title: 'OLAP Data Cube Operations',
      blurb: 'Pivot, slice, dice, drill down and roll up a 3D cube linked to its table.' },
    { path: 'pages/5d-datacube/index.html', track: 'Foundations', title: '5D Sales Datacube',
      blurb: 'Build dimensional thinking from a single total all the way to a five-dimension cube.' },
    { path: 'pages/PowerQueryJoins.html', track: 'Power Query', title: 'Power Query Joins',
      blurb: 'Left, right, full, inner and anti joins with live Venn diagrams.' },
    { path: 'pages/StarSchema.html', track: 'Data Modeling', title: 'Star Schema Filter Flow',
      blurb: 'Watch filters cascade from dimensions to the fact table, including bidirectional links.' },
    { path: 'pages/RowContextVsFilterContext.html', track: 'DAX', title: 'Row Context vs Filter Context',
      blurb: 'The current row being evaluated versus the rows visible to a calculation.' },
    { path: 'pages/CalculatedColumnVsMeasureLab.html', track: 'DAX', title: 'Calculated Column vs Measure',
      blurb: 'Stored row-by-row values versus calculations that react to the filter context.' },
    { path: 'pages/SumVsSumXLab.html', track: 'DAX', title: 'SUM vs SUMX',
      blurb: 'When a plain aggregation is enough and when you must iterate row by row.' },
    { path: 'pages/FilterContextCamera.html', track: 'DAX', title: 'Filter Context Camera',
      blurb: 'A measure as a camera: report, page, visual and slicer filters decide who is in frame.' },
    { path: 'pages/DAXFilterHierarchy.html', track: 'DAX', title: 'Filter Context Water Plant',
      blurb: 'Filters applied level by level, and how CALCULATE overrides them (except RLS).' },
    { path: 'pages/ContextTransitionLab.html', track: 'DAX', title: 'Context Transition Lab',
      blurb: 'How CALCULATE turns the current row into a filter, through a commission example.' },
    { path: 'pages/AllVsAllexceptVsAllselectedLab.html', track: 'DAX', title: 'ALL vs ALLEXCEPT vs ALLSELECTED',
      blurb: 'Three denominators for percent-of-total: grand total, subtotal and visible total.' },
    { path: 'pages/DateFilterContextTrain.html', track: 'DAX', title: 'Date Filter Context Train',
      blurb: 'Time intelligence as a train yard: current, previous and next periods.' },
    { path: 'pages/PowerBIChartGuide.html', track: 'Visualization', title: 'Choose the Right Chart',
      blurb: 'Chart types, when to use them, and animated previews for Power BI storytelling.' }
  ];

  var KEY = 'srg-theme';
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var listeners = [];

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(t) { try { localStorage.setItem(KEY, t); } catch (e) { /* private mode: theme just won't persist */ } }
  function systemTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function current() { return root.getAttribute('data-theme') || 'light'; }

  function apply(theme) {
    root.classList.add('srg-theme-swap');
    root.setAttribute('data-theme', theme);
    var btn = document.querySelector('.srg-theme');
    if (btn) {
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      btn.title = btn.getAttribute('aria-label');
    }
    // Let canvas/SVG/chart pages repaint with the new tokens.
    listeners.forEach(function (fn) { try { fn(theme); } catch (e) { console.error(e); } });
    try { window.dispatchEvent(new CustomEvent('srg:themechange', { detail: { theme: theme } })); } catch (e) {}
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('srg-theme-swap'); }); });
  }

  apply(stored() || systemTheme());
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () { if (!stored()) apply(systemTheme()); });
  }

  // Circular reveal from the toggle where View Transitions are supported.
  function toggle(evt) {
    var next = current() === 'dark' ? 'light' : 'dark';
    save(next);
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Hidden tabs don't render frames, so a view transition would stall the swap.
    if (!document.startViewTransition || reduce || document.visibilityState !== 'visible') { apply(next); return; }
    var x = evt && evt.clientX ? evt.clientX : innerWidth - 40;
    var y = evt && evt.clientY ? evt.clientY : 30;
    var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('srg-theme-vt');
    var swapped = false;
    var vt = document.startViewTransition(function () { swapped = true; apply(next); });
    // Safety net: if the browser never renders a frame, swap without the effect.
    setTimeout(function () { if (!swapped) { try { vt.skipTransition(); } catch (e) {} apply(next); } }, 900);
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () {});
    vt.finished.then(function () { root.classList.remove('srg-theme-vt'); }, function () { root.classList.remove('srg-theme-vt'); });
  }

  // Resolve lesson URLs relative to this script (assets/ sits at the repo root).
  var scriptSrc = (document.currentScript && document.currentScript.src) || '';
  var base = scriptSrc ? new URL('../', scriptSrc) : new URL('./', location.href);
  function urlOf(path) { return new URL(path, base).href; }
  function norm(p) {
    try { p = decodeURIComponent(p); } catch (e) {}
    return p.replace(/\/index\.html$/i, '/').toLowerCase();
  }
  var here = norm(location.pathname);
  var idx = -1;
  for (var i = 0; i < LESSONS.length; i++) {
    if (norm(new URL(LESSONS[i].path, base).pathname) === here) { idx = i; break; }
  }
  var isHome = idx === -1 && norm(new URL('index.html', base).pathname) === here;

  var ICON = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
    chev: '<svg class="srg-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    sun: '<svg class="srg-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></svg>',
    moon: '<svg class="srg-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>'
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function buildMenu() {
    var html = '', track = '';
    LESSONS.forEach(function (l, i) {
      if (l.track !== track) { track = l.track; html += '<h4>' + esc(track) + '</h4>'; }
      html += '<a href="' + urlOf(l.path) + '"' + (i === idx ? ' aria-current="page"' : '') + '>' +
        '<b>' + pad(i + 1) + '</b><span>' + esc(l.title) + '<small>' + esc(l.blurb) + '</small></span></a>';
    });
    return html;
  }

  function navBtn(kind, lesson) {
    if (!lesson) {
      return '<span class="srg-btn srg-' + kind + '" aria-disabled="true">' + (kind === 'prev' ? ICON.left : '') +
        '<span><small>' + (kind === 'prev' ? 'Start' : 'End') + '</small><em>' + (kind === 'prev' ? 'First lesson' : 'Last lesson') + '</em></span>' +
        (kind === 'next' ? ICON.right : '') + '</span>';
    }
    var label = kind === 'prev' ? 'Previous' : 'Next';
    return '<a class="srg-btn srg-' + kind + '" href="' + urlOf(lesson.path) + '" rel="' + kind + '" ' +
      'aria-label="' + label + ' lesson: ' + esc(lesson.title) + '" title="' + label + ': ' + esc(lesson.title) + '">' +
      (kind === 'prev' ? ICON.left : '') +
      '<span><small>' + label + '</small><em>' + esc(lesson.title) + '</em></span>' +
      (kind === 'next' ? ICON.right : '') + '</a>';
  }

  function buildBar() {
    var bar = document.createElement('nav');
    bar.className = 'srg-bar';
    bar.setAttribute('aria-label', 'Lesson navigation');
    var total = LESSONS.length;
    var cur = LESSONS[idx];
    var supportsPopover = typeof HTMLElement !== 'undefined' && HTMLElement.prototype.hasOwnProperty('popover');

    var whereLabel = cur
      ? '<span class="srg-step">' + pad(idx + 1) + '/' + total + '</span><span class="srg-title">' + esc(cur.title) + '</span>'
      : '<span class="srg-step">' + total + '</span><span class="srg-title">All lessons</span>';

    bar.innerHTML =
      '<a class="srg-btn srg-brand" href="' + urlOf('index.html') + '" aria-label="Home: all Power BI lessons" title="Home">' +
        '<span class="srg-logo" aria-hidden="true"><i><b></b><b></b><b></b></i></span>' +
        '<span class="srg-brand-text"><small>Power BI</small>Visual Lessons</span></a>' +
      '<span class="srg-sep" aria-hidden="true"></span>' +
      '<button class="srg-btn srg-where" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="srg-menu"' +
        (supportsPopover ? ' popovertarget="srg-menu"' : '') + ' title="Jump to any lesson">' + whereLabel + ICON.chev + '</button>' +
      '<span class="srg-spacer"></span>' +
      (cur ? '<span class="srg-nav">' + navBtn('prev', LESSONS[idx - 1]) + navBtn('next', LESSONS[idx + 1]) + '</span>'
           : (isHome ? '<span class="srg-nav">' + navBtn('next', LESSONS[0]).replace('<small>Next</small>', '<small>Start</small>') + '</span>' : '')) +
      '<button class="srg-btn srg-theme" type="button" aria-pressed="false">' + ICON.sun + ICON.moon + '</button>' +
      '<span class="srg-progress" aria-hidden="true"></span>';

    var menu = document.createElement('div');
    menu.className = 'srg-menu';
    menu.id = 'srg-menu';
    menu.setAttribute('role', 'navigation');
    menu.setAttribute('aria-label', 'All lessons');
    if (supportsPopover) menu.setAttribute('popover', '');
    menu.innerHTML = buildMenu();

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(menu);

    var where = bar.querySelector('.srg-where');
    if (supportsPopover) {
      menu.addEventListener('toggle', function (e) {
        where.setAttribute('aria-expanded', String(e.newState === 'open'));
        if (e.newState === 'open') {
          var a = menu.querySelector('[aria-current="page"]') || menu.querySelector('a');
          if (a) { a.scrollIntoView({ block: 'center' }); a.focus({ preventScroll: true }); }
        }
      });
    } else {
      where.addEventListener('click', function () {
        var open = menu.classList.toggle('srg-open');
        where.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu.classList.contains('srg-open')) { menu.classList.remove('srg-open'); where.setAttribute('aria-expanded', 'false'); where.focus(); }
      });
    }

    bar.querySelector('.srg-theme').addEventListener('click', toggle);
    apply(current()); // sync toggle aria state
    requestAnimationFrame(function () {
      bar.style.setProperty('--srg-p', cur ? String((idx + 1) / total) : '0');
    });
  }

  function buildFooter() {
    if (idx === -1 || document.body.getAttribute('data-srg-footer') === 'off') return;
    var prev = LESSONS[idx - 1], next = LESSONS[idx + 1];
    var f = document.createElement('nav');
    f.className = 'srg-footer srg-reveal';
    f.setAttribute('aria-label', 'Continue learning');
    var prevCard = prev
      ? '<a class="srg-card" href="' + urlOf(prev.path) + '"><small>' + ICON.left.replace('<svg', '<svg style="width:12px;height:12px;vertical-align:-1px"') + ' Previous · ' + pad(idx) + '</small><strong>' + esc(prev.title) + '</strong></a>'
      : '<a class="srg-card" href="' + urlOf('index.html') + '"><small>Back to</small><strong>All lessons</strong></a>';
    var nextCard = next
      ? '<a class="srg-card srg-up" href="' + urlOf(next.path) + '"><small>Up next · ' + pad(idx + 2) + ' · ' + esc(next.track) + '</small><strong>' + esc(next.title) + '</strong><p>' + esc(next.blurb) + '</p><span class="srg-arrow">' + ICON.arrow + '</span></a>'
      : '<a class="srg-card srg-up" href="' + urlOf('index.html') + '"><small>Path complete</small><strong>You finished all ' + LESSONS.length + ' lessons</strong><p>Head back home for case studies, Power Query exercises and custom visuals.</p><span class="srg-arrow">' + ICON.home + '</span></a>';
    f.innerHTML = prevCard + nextCard;
    var host = document.querySelector('[data-srg-footer-host]') || document.body;
    host.appendChild(f);
  }

  function reveal() {
    var els = document.querySelectorAll('.srg-reveal');
    if (!els.length || !('IntersectionObserver' in window)) return;
    root.classList.add('srg-io');
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.forEach(function (e, i) {
        e.target.style.setProperty('--srg-delay', Math.min(i, 4) * 0.08 + 's');
        e.target.classList.add('srg-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  function ready() {
    buildBar();
    buildFooter();
    reveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();

  window.SRG = {
    lessons: LESSONS,
    index: idx,
    theme: current,
    onThemeChange: function (fn) { listeners.push(fn); },
    // Read a resolved CSS custom property (for canvas / chart libraries).
    token: function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  };
})();
