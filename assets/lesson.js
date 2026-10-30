/* Helpers for the foundations lessons: the 16-step map and FLIP movement. */
(function () {
  'use strict';
  var GROUPS = {
    process: { title: 'Data Processing · R2R', href: 'DataProcessingR2R.html', steps: ['Recording', 'Classifying', 'Sorting', 'Summarizing', 'Reporting'] },
    analyse: { title: 'Data Analytics · APPASA', href: 'DataAnalyticsAPPASA.html', steps: ['Ask', 'Prepare', 'Process', 'Analyze', 'Share', 'Act'] },
    cube: { title: 'OLAP Operations', href: 'OLAPDataCube.html', steps: ['Pivoting', 'Slicing', 'Dicing', 'Drilling Down', 'Rolling Up'] }
  };
  function buildMaps() {
    document.querySelectorAll('[data-steps-map]').forEach(function (host) {
      var now = host.getAttribute('data-steps-map');
      host.className = 'steps-map';
      host.setAttribute('aria-label', 'The 16 steps of the data cube world');
      host.innerHTML = Object.keys(GROUPS).map(function (k) {
        var g = GROUPS[k];
        var body = '<b>' + g.title + '</b>' + g.steps.map(function (s) { return '<span>' + s + '</span>'; }).join('');
        return k === now
          ? '<div class="sm-group now" aria-current="true">' + body + '</div>'
          : '<a class="sm-group" href="' + g.href + '">' + body + '</a>';
      }).join('');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMaps); else buildMaps();

  // Move elements smoothly across a re-render: FLIP keyed by data-key.
  window.flipRender = function (host, render) {
    var first = {};
    host.querySelectorAll('[data-key]').forEach(function (el) { first[el.dataset.key] = el.getBoundingClientRect(); });
    render();
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    host.querySelectorAll('[data-key]').forEach(function (el) {
      var a = first[el.dataset.key];
      if (!a) return;
      var b = el.getBoundingClientRect();
      el.animate([{ transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)' }, { transform: 'none' }],
        { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
  };
})();
