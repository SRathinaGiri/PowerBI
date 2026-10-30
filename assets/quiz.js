/* Quick challenges at the foot of a lesson. The challenges live in quiz-data.js,
   keyed by page file name. Formats differ on purpose so that no two lessons feel
   the same: order, sort, match, predict, bug, fill, myth.
   Each format returns { check(), reveal() }; the shell handles the retry flow. */
(function () {
  'use strict';
  var LABELS = { order: 'Put it in order', sort: 'Sort the cards', match: 'Match the pairs', predict: 'Predict the number', bug: 'Spot the bug', fill: 'Complete it', myth: 'Myth or fact?' };

  function h(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function btn(cls, text, onClick) {
    var b = h('button', cls, text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function shuffled(list) {
    var a = list.slice();
    // A shuffle that lands on the answer would make the challenge pointless.
    for (var tries = 0; tries < 8; tries++) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      if (a.some(function (x, k) { return x !== list[k]; })) break;
    }
    return a;
  }
  function mark(el, ok) {
    el.classList.remove('qz-ok', 'qz-bad');
    el.classList.add(ok ? 'qz-ok' : 'qz-bad');
  }

  var FORMATS = {
    order: function (c, host) {
      var list = h('ol', 'qz-order');
      host.appendChild(list);
      function move(li, d) {
        var to = d < 0 ? li.previousElementSibling : (li.nextElementSibling && li.nextElementSibling.nextElementSibling);
        if (d < 0 && !to) return;
        if (d > 0 && !li.nextElementSibling) return;
        list.insertBefore(li, to);
        li.querySelector(d < 0 ? '.qz-up' : '.qz-down').focus();
      }
      function fill(items) {
        list.textContent = '';
        items.forEach(function (text) {
          var li = h('li');
          li.dataset.v = text;
          li.appendChild(h('span', 'qz-grow', text));
          li.appendChild(btn('qz-mini qz-up', '↑', function () { move(li, -1); })).setAttribute('aria-label', 'Move ' + text + ' up');
          li.appendChild(btn('qz-mini qz-down', '↓', function () { move(li, 1); })).setAttribute('aria-label', 'Move ' + text + ' down');
          list.appendChild(li);
        });
      }
      fill(shuffled(c.items));
      return {
        check: function () {
          var all = true;
          Array.prototype.forEach.call(list.children, function (li, i) {
            var ok = li.dataset.v === c.items[i];
            mark(li, ok);
            all = all && ok;
          });
          return all;
        },
        reveal: function () { fill(c.items); Array.prototype.forEach.call(list.children, function (li) { mark(li, true); }); }
      };
    },

    sort: function (c, host) {
      var selected = null;
      var pool = h('div', 'qz-pool');
      var buckets = h('div', 'qz-buckets');
      host.appendChild(pool);
      host.appendChild(buckets);
      var chips = shuffled(c.items).map(function (it) {
        var b = btn('qz-chip', it[0]);
        b.dataset.b = it[1];
        b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () {
          if (selected) selected.setAttribute('aria-pressed', 'false');
          selected = selected === b ? null : b;
          if (selected) selected.setAttribute('aria-pressed', 'true');
        });
        pool.appendChild(b);
        return b;
      });
      var slots = c.buckets.map(function (name, i) {
        var box = h('div', 'qz-bucket');
        var slot = h('div', 'qz-slot');
        box.appendChild(btn('qz-bucket-btn', name, function () {
          if (!selected) return;
          slot.appendChild(selected);
          selected.dataset.at = i;
          selected.setAttribute('aria-pressed', 'false');
          selected = null;
        }));
        box.appendChild(slot);
        buckets.appendChild(box);
        return slot;
      });
      return {
        hint: 'Tap a card, then tap the box it belongs to.',
        incomplete: function () { return pool.children.length ? 'Place every card in a box first.' : ''; },
        check: function () {
          var all = true;
          chips.forEach(function (b) {
            var ok = b.dataset.at === b.dataset.b;
            mark(b, ok);
            all = all && ok;
          });
          return all;
        },
        reveal: function () { chips.forEach(function (b) { slots[Number(b.dataset.b)].appendChild(b); mark(b, true); }); }
      };
    },

    match: function (c, host) {
      var picked = null;
      var links = {};
      var grid = h('div', 'qz-match');
      var left = h('div', 'qz-col');
      var right = h('div', 'qz-col');
      grid.appendChild(left);
      grid.appendChild(right);
      host.appendChild(grid);
      var lefts = c.pairs.map(function (p, i) {
        var b = btn('qz-chip', p[0], function () {
          if (picked) picked.setAttribute('aria-pressed', 'false');
          picked = b;
          b.setAttribute('aria-pressed', 'true');
        });
        b.dataset.i = i;
        b.setAttribute('aria-pressed', 'false');
        left.appendChild(b);
        return b;
      });
      var rights = shuffled(c.pairs.map(function (p) { return p[1]; })).map(function (text) {
        var b = btn('qz-chip', text, function () {
          if (!picked) return;
          var i = picked.dataset.i;
          Object.keys(links).forEach(function (k) { if (links[k] === text) delete links[k]; });
          links[i] = text;
          picked.setAttribute('aria-pressed', 'false');
          picked = null;
          paint();
        });
        b.dataset.v = text;
        right.appendChild(b);
        return b;
      });
      function paint() {
        lefts.forEach(function (b, i) {
          b.dataset.tag = links[i] ? i + 1 : '';
          b.classList.remove('qz-ok', 'qz-bad');
        });
        rights.forEach(function (b) {
          var k = Object.keys(links).filter(function (x) { return links[x] === b.dataset.v; })[0];
          b.dataset.tag = k === undefined ? '' : Number(k) + 1;
          b.classList.remove('qz-ok', 'qz-bad');
        });
      }
      return {
        hint: 'Tap an item on the left, then its partner on the right.',
        incomplete: function () { return Object.keys(links).length < c.pairs.length ? 'Pair up every item first.' : ''; },
        check: function () {
          var all = true;
          c.pairs.forEach(function (p, i) {
            var ok = links[i] === p[1];
            mark(lefts[i], ok);
            all = all && ok;
          });
          return all;
        },
        reveal: function () {
          c.pairs.forEach(function (p, i) { links[i] = p[1]; });
          paint();
          lefts.forEach(function (b) { mark(b, true); });
        }
      };
    },

    predict: function (c, host) {
      if (c.table) {
        var t = h('table', 'qz-table');
        var head = t.createTHead().insertRow();
        c.table[0].forEach(function (x) { head.appendChild(h('th', '', x)); });
        var body = t.createTBody();
        c.table.slice(1).forEach(function (r) {
          var row = body.insertRow();
          r.forEach(function (x) { row.insertCell().textContent = x; });
        });
        var wrap = h('div', 'qz-scroll');
        wrap.appendChild(t);
        host.appendChild(wrap);
      }
      if (c.code) host.appendChild(h('pre', 'qz-code', c.code));
      var label = h('label', 'qz-answer');
      label.appendChild(h('span', '', c.ask));
      var line = h('span', 'qz-input');
      if (c.prefix) line.appendChild(h('b', '', c.prefix));
      var input = h('input');
      input.inputMode = 'numeric';
      input.autocomplete = 'off';
      line.appendChild(input);
      label.appendChild(line);
      host.appendChild(label);
      // Amounts in the quizzes are whole numbers, so digits alone are enough to compare.
      function value() { return input.value.replace(/[^0-9]/g, ''); }
      return {
        incomplete: function () { return value() ? '' : 'Type your answer first.'; },
        check: function () { var ok = Number(value()) === c.answer; mark(input, ok); return ok; },
        reveal: function () { input.value = c.answer.toLocaleString('en-IN'); mark(input, true); }
      };
    },

    bug: function (c, host) {
      var picked = -1;
      var box = h('div', 'qz-bugline');
      host.appendChild(box);
      var parts = c.tokens.map(function (text, i) {
        var b = btn('qz-token', text, function () {
          picked = i;
          parts.forEach(function (x, k) { x.setAttribute('aria-pressed', String(k === i)); x.classList.remove('qz-ok', 'qz-bad'); });
        });
        b.setAttribute('aria-pressed', 'false');
        box.appendChild(b);
        return b;
      });
      return {
        hint: 'Tap the part that is wrong.',
        incomplete: function () { return picked < 0 ? 'Tap the part you think is wrong.' : ''; },
        check: function () { var ok = picked === c.bad; mark(parts[picked], ok); return ok; },
        reveal: function () { parts.forEach(function (x) { x.classList.remove('qz-ok', 'qz-bad'); }); mark(parts[c.bad], true); }
      };
    },

    fill: function (c, host) {
      var line = h('div', 'qz-fill');
      var bank = h('div', 'qz-pool');
      host.appendChild(line);
      host.appendChild(bank);
      var blanks = [];
      c.parts.forEach(function (p) {
        if (typeof p === 'string') { line.appendChild(h('span', '', p)); return; }
        var b = btn('qz-blank', '····', function () {
          if (b.dataset.v === undefined) return;
          chipFor[b.dataset.v].disabled = false;
          delete b.dataset.v;
          b.textContent = '····';
          b.classList.remove('qz-ok', 'qz-bad');
        });
        b.dataset.want = p;
        blanks.push(b);
        line.appendChild(b);
      });
      var chipFor = {};
      shuffled(c.bank).forEach(function (text) {
        var chip = btn('qz-chip', text, function () {
          var open = blanks.filter(function (b) { return b.dataset.v === undefined; })[0];
          if (!open) return;
          open.dataset.v = text;
          open.textContent = text;
          chip.disabled = true;
        });
        chipFor[text] = chip;
        bank.appendChild(chip);
      });
      return {
        hint: 'Tap a word to fill the next gap. Tap a gap to clear it.',
        incomplete: function () { return blanks.some(function (b) { return b.dataset.v === undefined; }) ? 'Fill every gap first.' : ''; },
        check: function () {
          var all = true;
          blanks.forEach(function (b) {
            var ok = b.dataset.v === c.bank[Number(b.dataset.want)];
            mark(b, ok);
            all = all && ok;
          });
          return all;
        },
        reveal: function () {
          Object.keys(chipFor).forEach(function (k) { chipFor[k].disabled = true; });
          blanks.forEach(function (b) {
            b.dataset.v = c.bank[Number(b.dataset.want)];
            b.textContent = b.dataset.v;
            mark(b, true);
          });
        }
      };
    },

    myth: function (c, host) {
      var rows = c.items.map(function (it) {
        var row = h('div', 'qz-myth');
        row.appendChild(h('span', 'qz-grow', it[0]));
        var state = { row: row, want: it[1], got: null, btns: {} };
        ['Myth', 'Fact'].forEach(function (name) {
          var val = name === 'Fact';
          var b = btn('qz-mini qz-pick', name, function () {
            state.got = val;
            state.btns.Myth.setAttribute('aria-pressed', String(!val));
            state.btns.Fact.setAttribute('aria-pressed', String(val));
            row.classList.remove('qz-ok', 'qz-bad');
          });
          b.setAttribute('aria-pressed', 'false');
          state.btns[name] = b;
          row.appendChild(b);
        });
        host.appendChild(row);
        return state;
      });
      return {
        incomplete: function () { return rows.some(function (s) { return s.got === null; }) ? 'Decide every statement first.' : ''; },
        check: function () {
          var all = true;
          rows.forEach(function (s) { var ok = s.got === s.want; mark(s.row, ok); all = all && ok; });
          return all;
        },
        reveal: function () {
          rows.forEach(function (s) {
            s.btns.Myth.setAttribute('aria-pressed', String(!s.want));
            s.btns.Fact.setAttribute('aria-pressed', String(s.want));
            mark(s.row, true);
          });
        }
      };
    }
  };

  function run(root, set) {
    var at = 0;
    var firstTry = 0;
    var head = h('p', 'qz-kicker');
    var title = h('h2', 'qz-title', '');
    var stage = h('div', 'qz-stage');
    root.appendChild(head);
    root.appendChild(title);
    root.appendChild(stage);

    function finish() {
      head.textContent = 'Quick challenge';
      title.textContent = firstTry === set.length ? 'Clean sweep!' : 'Done. Concepts stick when you test them.';
      stage.textContent = '';
      stage.appendChild(h('p', 'qz-score', firstTry + ' of ' + set.length + ' right first time'));
      stage.appendChild(btn('qz-go', 'Play again', function () { at = 0; firstTry = 0; show(); }));
    }

    function show() {
      var c = set[at];
      var wrong = 0;
      head.textContent = 'Quick challenge ' + (at + 1) + ' of ' + set.length + ' · ' + LABELS[c.type];
      title.textContent = c.prompt;
      stage.textContent = '';
      var work = h('div', 'qz-work');
      stage.appendChild(work);
      var api = FORMATS[c.type](c, work);
      if (api.hint) stage.insertBefore(h('p', 'qz-hint', api.hint), work);
      var say = h('p', 'qz-say');
      say.setAttribute('aria-live', 'polite');
      var bar = h('div', 'qz-bar');
      stage.appendChild(say);
      stage.appendChild(bar);
      var checkBtn = btn('qz-go', 'Check', onCheck);
      bar.appendChild(checkBtn);

      function solved(text) {
        work.classList.add('qz-done');
        say.textContent = text + ' ' + c.why;
        bar.textContent = '';
        var next = btn('qz-go', at + 1 < set.length ? 'Next challenge' : 'See my score', function () {
          at += 1;
          if (at < set.length) show(); else finish();
        });
        bar.appendChild(next);
        next.focus({ preventScroll: true });
      }
      function onCheck() {
        var need = api.incomplete && api.incomplete();
        if (need) { say.textContent = need; return; }
        if (api.check()) {
          if (!wrong) firstTry += 1;
          solved('Correct!');
          return;
        }
        wrong += 1;
        say.textContent = 'Not yet. Change what is marked and try again.';
        if (wrong === 2) bar.appendChild(btn('qz-link', 'Show the answer', function () { api.reveal(); solved('Here it is.'); }));
      }
    }
    show();
  }

  function init() {
    var file = location.pathname.split('/').pop();
    var set = window.SRG_QUIZZES && window.SRG_QUIZZES[file];
    if (!set) return;
    var root = h('section', 'qz');
    root.setAttribute('aria-label', 'Quick challenge');
    var footer = document.querySelector('.srg-footer');
    // Beside the footer, because .container and main are inner layout boxes on some lessons.
    if (footer) footer.parentNode.insertBefore(root, footer);
    else document.body.appendChild(root);
    run(root, set);
  }
  // Deferred scripts run before DOMContentLoaded, and site.js builds the footer at that event.
  if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);
})();
