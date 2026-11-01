// ==UserScript==
// @name         FAU.tv Resume
// @name:de      FAU.tv Weiterschauen
// @name:zh-CN   FAU.tv 继续观看
// @namespace    https://github.com/fautv-resume
// @version      1.0.0
// @description  Pick up where you left off on FAU.tv: remembers playback position, marks watched episodes, adds a Continue button to series pages and keeps your last-used language.
// @description:de  Auf FAU.tv genau dort weitermachen, wo du aufgehört hast: merkt sich die Wiedergabeposition, markiert gesehene Folgen, ergänzt einen „Fortsetzen“-Button und behält deine zuletzt gewählte Sprache.
// @description:zh-CN  在 FAU.tv 上接着上次的进度继续看：记住播放位置、标记已看的集数、在系列页加“继续观看”按钮，并记住你上次使用的语言。
// @license      MIT
// @match        https://www.fau.tv/*
// @match        https://fau.tv/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Settings
  // UI_LANG: language of the labels this script adds ("auto" | "en" | "de" | "zh").
  // "auto" follows the browser language. This does NOT change the FAU.tv site language.
  // ------------------------------------------------------------------
  const UI_LANG = 'auto';

  const STRINGS = {
    en: { done: '✓ Watched',  here: '← Continue here', cont: 'Continue', next: 'Next',          replay: 'Replay' },
    de: { done: '✓ Gesehen',  here: '← Hier zuletzt',  cont: 'Fortsetzen', next: 'Nächste Folge', replay: 'Erneut ansehen' },
    zh: { done: '✓ 已看完',   here: '← 上次看到这里',   cont: '继续观看',  next: '下一集',        replay: '重新观看' }
  };
  const nav = (navigator.language || 'en').toLowerCase();
  const uiLang = UI_LANG !== 'auto' ? UI_LANG : nav.startsWith('zh') ? 'zh' : nav.startsWith('de') ? 'de' : 'en';
  const T = STRINGS[uiLang] || STRINGS.en;

  const P = 'faututv2:';
  const LANG_KEY = 'faututv-lang';
  const LANG_TRY = 'faututv-lang-try';
  const EP_RE = /^\/series\/([^/]+)\/([^/]+?)\/?$/;   // /series/<series>/<episode>
  const SERIES_RE = /^\/series\/([^/]+)\/?$/;          // /series/<series>
  const load = k => { try { return JSON.parse(localStorage.getItem(P + k)); } catch { return null; } };
  const store = (k, o) => { try { localStorage.setItem(P + k, JSON.stringify(o)); } catch {} };
  const epKey = path => {
    const m = path.match(EP_RE);
    return m && m[2] !== 'feed' ? m[1] + '/' + m[2] : null;
  };

  // ---------- 0) Remember the site language ----------
  const siteLang = () => (document.querySelector('meta[name="app-locale"]') || {}).content || '';

  // Remember the language the user switches to
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#language-switcher, [aria-label="Toggle language"]');
    if (!t) return;
    const cur = siteLang();
    if (cur === 'en' || cur === 'de') {
      try { localStorage.setItem(LANG_KEY, cur === 'en' ? 'de' : 'en'); } catch {}
    }
  }, true);

  function ensureLanguage() {
    const cur = siteLang();
    if (cur !== 'en' && cur !== 'de') return;
    let want = null;
    try { want = localStorage.getItem(LANG_KEY); } catch {}
    if (!want) {
      // Nothing stored yet: the site defaults to German, so English means the user chose it.
      if (cur === 'en') { try { localStorage.setItem(LANG_KEY, 'en'); } catch {} }
      return;
    }
    if (want === cur) { try { sessionStorage.removeItem(LANG_TRY); } catch {} return; }
    let n = 0;
    try { n = +sessionStorage.getItem(LANG_TRY) || 0; } catch {}
    if (n >= 2) return;                                  // never loop (e.g. cookies blocked)
    try { sessionStorage.setItem(LANG_TRY, String(n + 1)); } catch {}
    fetch('/set_lang/' + want, { credentials: 'same-origin' })
      .then(() => location.reload())
      .catch(() => {});
  }

  // ---------- 1) Episode page: save / restore playback position ----------
  const key = epKey(location.pathname);
  const legacyKey = 'resume:' + location.origin + location.pathname;   // progress saved by early versions

  function init(v) {
    if (!key || v.dataset.rs) return;
    v.dataset.rs = '1';

    const rec = load(key);
    let saved = 0;
    if (rec) { if (!rec.done) saved = rec.t; }
    else { const l = parseFloat(localStorage.getItem(legacyKey)); if (l > 0) saved = l; }

    let ready = false;
    const restore = () => {
      if (ready) return;
      ready = true;
      if (saved > 5 && saved < v.duration - 10) v.currentTime = saved;
    };
    if (v.readyState >= 1) restore();
    else v.addEventListener('loadedmetadata', restore, { once: true });

    const save = force => {
      if (!ready) return;                       // don't overwrite old progress with 0:00 before restoring
      const t = v.currentTime, d = v.duration;
      if (!(t > 0) || !(d > 0)) return;
      store(key, { t, d, done: !!force || t > d - 10, ts: Date.now() });
    };
    setInterval(() => { if (!v.paused) save(); }, 5000);
    v.addEventListener('pause', () => save());
    v.addEventListener('ended', () => save(true));
  }
  const scanVideos = () => document.querySelectorAll('video').forEach(init);

  // ---------- 2) Series page: progress badge on every episode ----------
  function mark() {
    document.querySelectorAll('.rs-badge').forEach(b => b.remove());
    document.querySelectorAll('li[data-rs-last]').forEach(li => { li.style.outline = ''; delete li.dataset.rsLast; });

    const rows = new Map();
    document.querySelectorAll('li a[href*="/series/"]').forEach(a => {
      let k; try { k = epKey(new URL(a.href, location.href).pathname); } catch { return; }
      const li = a.closest('li');
      if (!k || !li || rows.has(li)) return;
      const s = load(k);
      if (s) rows.set(li, { s });
    });
    if (!rows.size) return;

    let last = null;
    rows.forEach((v, li) => { if (!last || v.s.ts > rows.get(last).s.ts) last = li; });

    rows.forEach(({ s }, li) => {
      const isLast = li === last;
      const b = document.createElement('span');
      b.className = 'rs-badge';
      b.style.cssText = 'display:inline-block;margin:2px 8px;padding:1px 8px;border-radius:4px;font-size:12px;font-weight:600;' +
        (isLast ? 'background:#fff3cd;color:#7a5b00;' : 'background:#e8f0fe;color:#1a56b0;');
      b.textContent = (s.done ? T.done : '▶ ' + Math.round(s.t / s.d * 100) + '%') + (isLast ? '  ' + T.here : '');
      li.querySelectorAll('.line-clamp-2, .xl\\:flex .text-xl').forEach(t => t.appendChild(b.cloneNode(true)));
      if (!li.querySelector('.rs-badge')) li.insertBefore(b, li.firstChild);
      if (isLast) { li.dataset.rsLast = '1'; li.style.outline = '2px solid #e0a800'; }
    });
  }

  // ---------- 3) Series page: "Continue" button before "Share this series" ----------
  function addContinue() {
    document.getElementById('rs-continue')?.remove();
    const m = location.pathname.match(SERIES_RE);
    if (!m) return;
    const slug = m[1];

    let best = null;                                   // most recently watched episode of this series
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(P + slug + '/')) continue;
      const rec = load(k.slice(P.length));
      if (rec && (!best || rec.ts > best.rec.ts)) best = { ep: k.slice(P.length + slug.length + 1), rec };
    }
    if (!best) return;

    // Find the RSS/share button by its icon, so it works in both site languages.
    const icon = document.querySelector('button svg path[d^="M4 11a9 9 0 0 1 9 9"]');
    const span = icon ? null : [...document.querySelectorAll('button span')].find(x => /share|teilen/i.test(x.textContent));
    const shareBtn = icon ? icon.closest('button') : span && span.closest('button');
    if (!shareBtn) return;
    const wrap = shareBtn.closest('[x-data]') || shareBtn.parentElement;

    let ep = best.ep, label;
    const n = parseInt(ep, 10);
    const num = isNaN(n) ? '' : ' · #' + n;
    if (best.rec.done) {
      const next = isNaN(n) ? null : [...document.querySelectorAll('a[href*="/series/"]')].find(a => {
        try { const k = epKey(new URL(a.href, location.href).pathname); return k && k.startsWith(slug + '/' + (n + 1) + '-'); }
        catch { return false; }
      });
      if (next) { ep = epKey(new URL(next.href, location.href).pathname).split('/')[1]; label = T.next + ' · #' + (n + 1); }
      else label = T.replay + num;
    } else {
      label = T.cont + num + ' · ' + Math.round(best.rec.t / best.rec.d * 100) + '%';
    }

    const box = document.createElement('div');
    box.id = 'rs-continue';
    box.className = wrap.className;
    const a = document.createElement('a');
    a.href = location.origin + '/series/' + slug + '/' + ep;
    a.className = shareBtn.className;
    a.style.textDecoration = 'none';
    a.innerHTML = '<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';
    const t = document.createElement('span');
    t.textContent = label;
    a.appendChild(t);
    box.appendChild(a);
    wrap.parentElement.insertBefore(box, wrap);
  }

  // ---------- Scheduling (the site renders dynamically: observe + debounce) ----------
  let timer = null;
  const obs = new MutationObserver(() => {
    scanVideos();
    clearTimeout(timer);
    timer = setTimeout(() => { obs.disconnect(); mark(); addContinue(); attach(); }, 400);
  });
  const attach = () => obs.observe(document.documentElement, { childList: true, subtree: true });

  ensureLanguage();
  scanVideos(); mark(); addContinue(); attach();
})();
