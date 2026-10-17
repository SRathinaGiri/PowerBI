/* Stepped analogy stories. Each [data-story] section gets Back / Next / Play
   controls, clickable step captions, ←/→ keys while focused, and auto-play
   the first time it scrolls into view. The current step is exposed as
   data-step="n" on the section and as a `story:step` event ({ step, total }). */
(function () {
  'use strict';

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init(story) {
    var steps = Array.prototype.slice.call(story.querySelectorAll('.story-steps > li'));
    if (!steps.length) return;
    var total = steps.length;
    var cur = -1;
    var timer = null;
    var touched = false; // any manual step cancels the pending auto-play
    var delay = Number(story.getAttribute('data-delay')) || 3600;

    var side = story.querySelector('.story-side');
    var controls = document.createElement('div');
    controls.className = 'story-controls';
    controls.innerHTML =
      '<button type="button" class="story-prev" aria-label="Previous step">◀ Back</button>' +
      '<button type="button" class="story-next" aria-label="Next step">Next ▶</button>' +
      '<button type="button" class="story-play" aria-label="Play the story">⏵ Play</button>' +
      '<span class="story-progress" aria-hidden="true"><i></i></span>';
    side.appendChild(controls);
    var prevBtn = controls.querySelector('.story-prev');
    var nextBtn = controls.querySelector('.story-next');
    var playBtn = controls.querySelector('.story-play');
    var bar = controls.querySelector('.story-progress');

    story.setAttribute('tabindex', '-1');
    var live = document.createElement('p');
    live.className = 'srg-visually-hidden';
    live.setAttribute('aria-live', 'polite');
    live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
    story.appendChild(live);

    function go(i) {
      i = Math.max(0, Math.min(total - 1, i));
      if (i === cur) return;
      cur = i;
      story.setAttribute('data-step', String(i));
      steps.forEach(function (li, k) {
        if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
        li.classList.toggle('done', k < i);
      });
      prevBtn.disabled = i === 0;
      nextBtn.textContent = i === total - 1 ? '↺ Replay' : 'Next ▶';
      bar.style.setProperty('--p', String((i + 1) / total));
      live.textContent = 'Step ' + (i + 1) + ' of ' + total + ': ' + steps[i].textContent;
      try { story.dispatchEvent(new CustomEvent('story:step', { detail: { step: i, total: total } })); } catch (e) {}
    }

    function stop(byUser) {
      if (byUser !== false) touched = true;
      if (timer) { clearInterval(timer); timer = null; }
      playBtn.textContent = '⏵ Play';
      playBtn.setAttribute('aria-label', 'Play the story');
    }
    function play() {
      stop(false);
      if (cur >= total - 1) go(0);
      playBtn.textContent = '⏸ Pause';
      playBtn.setAttribute('aria-label', 'Pause the story');
      timer = setInterval(function () {
        if (cur >= total - 1) { stop(false); return; }
        go(cur + 1);
      }, delay);
    }

    prevBtn.addEventListener('click', function () { stop(); go(cur - 1); });
    nextBtn.addEventListener('click', function () { stop(); go(cur >= total - 1 ? 0 : cur + 1); });
    playBtn.addEventListener('click', function () { if (timer) stop(); else play(); });
    steps.forEach(function (li, k) {
      li.setAttribute('tabindex', '0');
      li.addEventListener('click', function () { stop(); go(k); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); go(k); } });
    });
    story.addEventListener('keydown', function (e) {
      if (e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowRight') { stop(); go(cur + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { stop(); go(cur - 1); e.preventDefault(); }
    });

    go(0);

    // Auto-play once, the first time the story is mostly on screen.
    if (!reduce && 'IntersectionObserver' in window && story.getAttribute('data-autoplay') !== 'off') {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { io.disconnect(); setTimeout(function () { if (!touched) play(); }, 700); }
      }, { threshold: 0.45 });
      io.observe(story);
    }
    story._story = { go: go, play: play, stop: stop };
  }

  function ready() { document.querySelectorAll('[data-story]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
