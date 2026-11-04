// ==UserScript==
// @name         FAU.tv Resume
// @name:de      FAU.tv Weiterschauen
// @name:zh-CN   FAU.tv 继续观看
// @namespace    https://github.com/Whohahaha/fautv-resume
// @version      1.2.0
// @description  Pick up where you left off on FAU.tv: remembers playback position, marks watched episodes, adds a Continue button to series pages, remembers your playback speed, keeps your last-used language and can sync progress between devices.
// @description:de  Auf FAU.tv genau dort weitermachen, wo du aufgehört hast: merkt sich die Wiedergabeposition, markiert gesehene Folgen, ergänzt einen „Fortsetzen“-Button, merkt sich die Wiedergabegeschwindigkeit, behält deine zuletzt gewählte Sprache und kann den Fortschritt zwischen Geräten synchronisieren.
// @description:zh-CN  在 FAU.tv 上接着上次的进度继续看：记住播放位置、标记已看的集数、在系列页加“继续观看”按钮、记住播放速度和语言，并可在多台设备间同步进度。
// @license      MIT
// @homepageURL  https://github.com/Whohahaha/fautv-resume
// @supportURL   https://github.com/Whohahaha/fautv-resume/issues
// @downloadURL  https://raw.githubusercontent.com/Whohahaha/fautv-resume/main/fautv-resume.user.js
// @updateURL    https://raw.githubusercontent.com/Whohahaha/fautv-resume/main/fautv-resume.user.js
// @match        https://www.fau.tv/*
// @match        https://fau.tv/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @connect      api.github.com
// ==/UserScript==

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Settings
  // UI_LANG: language of the labels this script adds ("auto" | "en" | "de" | "zh").
  // "auto" follows the language of the FAU.tv page (English page -> English, German page -> German);
  // if that cannot be detected it falls back to the browser language.
  // This does NOT change the FAU.tv site language.
  // ------------------------------------------------------------------
  const UI_LANG = 'auto';

  const STRINGS = {
    en: { done: '✓ Watched',  here: '← Continue here', cont: 'Continue', next: 'Next',          replay: 'Replay',         left: m => m + ' min left' },
    de: { done: '✓ Gesehen',  here: '← Hier zuletzt',  cont: 'Fortsetzen', next: 'Nächste Folge', replay: 'Erneut ansehen', left: m => 'noch ' + m + ' Min.' },
    zh: { done: '✓ 已看完',   here: '← 上次看到这里',   cont: '继续观看',  next: '下一集',        replay: '重新观看',       left: m => '还剩 ' + m + ' 分钟' }
  };
  const SYNC_STRINGS = {
    en: { sync: 'Sync', title: 'Sync between devices',
      desc: 'Progress is kept in a private (secret) GitHub Gist of your own. You need a GitHub token (classic) with only the "gist" scope. The token stays in this browser\'s userscript manager.',
      mk: 'Create a token', ph: 'Paste token (ghp_…)', connect: 'Connect', now: 'Sync now', off: 'Disconnect',
      exp: 'Export progress', imp: 'Import progress', close: 'Close',
      none: 'Not connected', last: 'Last sync: ', fail: 'Sync failed: ', busy: 'Syncing…', imported: 'Imported: ' },
    de: { sync: 'Sync', title: 'Zwischen Geräten synchronisieren',
      desc: 'Der Fortschritt liegt in einem privaten (geheimen) GitHub-Gist in deinem eigenen Konto. Du brauchst ein GitHub-Token (classic) nur mit dem Scope „gist“. Das Token bleibt im Userscript-Manager dieses Browsers.',
      mk: 'Token erstellen', ph: 'Token einfügen (ghp_…)', connect: 'Verbinden', now: 'Jetzt synchronisieren', off: 'Trennen',
      exp: 'Fortschritt exportieren', imp: 'Fortschritt importieren', close: 'Schließen',
      none: 'Nicht verbunden', last: 'Zuletzt synchronisiert: ', fail: 'Synchronisierung fehlgeschlagen: ', busy: 'Synchronisiere…', imported: 'Importiert: ' },
    zh: { sync: '同步', title: '多端同步',
      desc: '进度保存在你自己 GitHub 账号下的一个私密 Gist 里。需要一个只勾选 “gist” 权限的 GitHub token（classic）。token 只保存在这个浏览器的脚本管理器里。',
      mk: '创建 token', ph: '粘贴 token（ghp_…）', connect: '连接', now: '立即同步', off: '断开',
      exp: '导出进度', imp: '导入进度', close: '关闭',
      none: '未连接', last: '上次同步：', fail: '同步失败：', busy: '同步中…', imported: '已导入：' }
  };
  for (const l in SYNC_STRINGS) Object.assign(STRINGS[l], SYNC_STRINGS[l]);
  let T = STRINGS.en;
  const refreshLabels = () => {
    let lang = UI_LANG;
    if (lang === 'auto') {
      const site = siteLang();                       // 'en' | 'de' (from the page itself)
      const nav = (navigator.language || 'en').toLowerCase();
      lang = site === 'en' || site === 'de' ? site : nav.startsWith('de') ? 'de' : nav.startsWith('zh') ? 'zh' : 'en';
    }
    T = STRINGS[lang] || STRINGS.en;
  };

  const P = 'faututv2:';
  const LANG_KEY = 'faututv-lang';
  const LANG_TRY = 'faututv-lang-try';
  const EP_RE = /^\/series\/([^/]+)\/([^/]+?)\/?$/;   // /series/<series>/<episode>
  const SERIES_RE = /^\/series\/([^/]+)\/?$/;          // /series/<series>
  const load = k => { try { return JSON.parse(localStorage.getItem(P + k)); } catch { return null; } };
  const store = (k, o) => { try { localStorage.setItem(P + k, JSON.stringify(o)); } catch {} onLocalChange(); };
  let onLocalChange = () => {};                          // replaced by the sync section
  const epKey = path => {
    const m = path.match(EP_RE);
    return m && m[2] !== 'feed' ? m[1] + '/' + m[2] : null;
  };

  // ---------- Use one domain: fau.tv -> www.fau.tv ----------
  // localStorage is per origin, so progress saved on fau.tv is invisible on www.fau.tv.
  // Redirect to www and, the first time, carry the progress along in the URL hash.
  const MOVED = 'faututv-moved';
  const IMPORT = '#rs-import=';
  if (location.hostname === 'fau.tv') {
    let hash = location.hash;
    try {
      if (!localStorage.getItem(MOVED)) {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith(P) || k === LANG_KEY)) data[k] = localStorage.getItem(k);
        }
        if (Object.keys(data).length) hash = IMPORT + encodeURIComponent(JSON.stringify(data));
        localStorage.setItem(MOVED, '1');
      }
    } catch {}
    location.replace('https://www.fau.tv' + location.pathname + location.search + hash);
    return;
  }
  if (location.hash.startsWith(IMPORT)) {
    try {
      const data = JSON.parse(decodeURIComponent(location.hash.slice(IMPORT.length)));
      for (const k in data) {
        if (k === LANG_KEY) { if (!localStorage.getItem(k)) localStorage.setItem(k, data[k]); continue; }
        if (!k.startsWith(P)) continue;
        const mine = load(k.slice(P.length)), theirs = JSON.parse(data[k]);
        if (theirs && (!mine || theirs.ts > mine.ts)) localStorage.setItem(k, data[k]);   // newest wins
      }
    } catch {}
    history.replaceState(null, '', location.pathname + location.search);
  }

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

  // ---------- 1) Episode page: save / restore playback position and speed ----------
  // The key is read from the URL every time (not once at load), so progress is never
  // written to the wrong episode if the site switches episodes without a full reload.
  const RATE_KEY = 'faututv-rate';
  const curKey = () => epKey(location.pathname);

  function init(v) {
    const key = curKey();
    if (!key || v.dataset.rs === key) return;
    v.dataset.rs = key;
    const st = v._rs || (v._rs = {});
    st.key = key;
    st.ready = false;

    let rec = load(key);
    const legacyKey = 'resume:' + location.origin + location.pathname;   // progress saved by early versions
    if (!rec) {
      try {
        const l = parseFloat(localStorage.getItem(legacyKey));
        if (l > 0) rec = { t: l, d: 0, done: false, ts: 0 };
        localStorage.removeItem(legacyKey);
      } catch {}
    }
    const saved = rec && !rec.done ? rec.t : 0;

    const restore = () => {
      if (st.ready || st.key !== key) return;
      st.ready = true;
      if (saved > 5 && saved < v.duration - 10) v.currentTime = saved;
      applyRate(v);
    };
    if (v.readyState >= 1) restore();
    else v.addEventListener('loadedmetadata', restore, { once: true });

    if (st.bound) return;                      // listeners below are attached only once per <video>
    st.bound = true;
    const save = force => {
      if (!st.ready || st.key !== curKey()) return;   // don't overwrite progress with 0:00 or into another episode
      const t = v.currentTime, d = v.duration;
      if (!(t > 0) || !(d > 0)) return;
      store(st.key, { t, d, done: !!force || t > d - 10, ts: Date.now() });
    };
    setInterval(() => { if (!v.paused) save(); }, 5000);
    v.addEventListener('pause', () => save());
    v.addEventListener('ended', () => save(true));

    // Playback speed: remember what the user picks, re-apply when the player resets it.
    // Players often reset the rate to 1 while loading, so rate changes right after
    // load/play are not taken as the user's choice.
    v.addEventListener('ratechange', () => {
      if (st.applying) { st.applying = false; return; }
      if (!st.ready || Date.now() - (st.quiet || 0) < 1500 || !(v.playbackRate > 0)) return;
      try { localStorage.setItem(RATE_KEY, String(v.playbackRate)); localStorage.setItem(RATE_KEY + '-ts', String(Date.now())); } catch {}
      onLocalChange();
    });
    const reapply = () => { st.quiet = Date.now(); applyRate(v); };
    v.addEventListener('loadedmetadata', reapply);
    v.addEventListener('play', reapply);
    v.addEventListener('playing', reapply);
  }
  function applyRate(v) {
    let r = 0;
    try { r = parseFloat(localStorage.getItem(RATE_KEY)); } catch {}
    if (r > 0 && r <= 4 && v.playbackRate !== r) { v._rs.applying = true; v.playbackRate = r; }
  }
  const scanVideos = () => document.querySelectorAll('video').forEach(init);

  // ---------- 2) Series page: progress badge on every episode ----------
  function mark() {
    refreshLabels();
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
      const left = Math.round((s.d - s.t) / 60);
      b.textContent = (s.done ? T.done : '▶ ' + Math.round(s.t / s.d * 100) + '%' + (left > 0 ? ' · ' + T.left(left) : '')) +
        (isLast ? '  ' + T.here : '');
      li.querySelectorAll('.line-clamp-2, .xl\\:flex .text-xl').forEach(t => t.appendChild(b.cloneNode(true)));
      if (!li.querySelector('.rs-badge')) li.insertBefore(b, li.firstChild);
      if (isLast) { li.dataset.rsLast = '1'; li.style.outline = '2px solid #e0a800'; }
    });
  }

  // ---------- 3) Series page: "Continue" button before "Share this series" ----------
  function addContinue() {
    refreshLabels();
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
    // Find the RSS/share button by its icon, so it works in both site languages.
    const icon = document.querySelector('button svg path[d^="M4 11a9 9 0 0 1 9 9"]');
    const span = icon ? null : [...document.querySelectorAll('button span')].find(x => /share|teilen/i.test(x.textContent));
    const shareBtn = icon ? icon.closest('button') : span && span.closest('button');
    if (!shareBtn) return;
    const wrap = shareBtn.closest('[x-data]') || shareBtn.parentElement;

    const box = document.createElement('div');
    box.id = 'rs-continue';
    box.className = wrap.className;
    box.style.display = 'flex';
    box.style.gap = '8px';
    box.style.flexWrap = 'wrap';

    if (best) {
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
      const a = document.createElement('a');
      a.href = location.origin + '/series/' + slug + '/' + ep;
      a.className = shareBtn.className;
      a.style.textDecoration = 'none';
      a.innerHTML = '<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>';
      const t = document.createElement('span');
      t.textContent = label;
      a.appendChild(t);
      box.appendChild(a);
    }

    // Small "Sync" button that opens the sync panel.
    const sb = document.createElement('button');
    sb.type = 'button';
    sb.id = 'rs-sync-btn';
    sb.className = shareBtn.className;
    sb.textContent = '☁ ' + T.sync;
    sb.title = syncStatusText();
    sb.addEventListener('click', openPanel);
    box.appendChild(sb);

    wrap.parentElement.insertBefore(box, wrap);
  }

  // ---------- 4) Sync between devices (private GitHub Gist) ----------
  // Optional. Nothing leaves the browser unless the user connects a token.
  // Merge rule: per episode, the record with the newer timestamp wins; same for playback speed.
  const GIST_FILE = 'fautv-resume.json';
  const hasGM = typeof GM !== 'undefined' && GM;
  const gmGet = async (k, d) => {
    try {
      if (hasGM && GM.getValue) return await GM.getValue(k, d);
      if (typeof GM_getValue === 'function') return GM_getValue(k, d);
    } catch {}
    try { const v = localStorage.getItem('faututv-gm-' + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  };
  const gmSet = async (k, v) => {
    try {
      if (hasGM && GM.setValue) return await GM.setValue(k, v);
      if (typeof GM_setValue === 'function') return GM_setValue(k, v);
    } catch {}
    try { localStorage.setItem('faututv-gm-' + k, JSON.stringify(v)); } catch {}
  };

  function api(method, path, token, body) {
    const url = 'https://api.github.com' + path;
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
    const data = body ? JSON.stringify(body) : undefined;
    const xhr = (hasGM && GM.xmlHttpRequest) || (typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null);
    if (xhr) {
      return new Promise((resolve, reject) => xhr({
        method, url, headers, data, timeout: 20000,
        onload: r => {
          if (r.status >= 200 && r.status < 300) { try { resolve(JSON.parse(r.responseText || 'null')); } catch (e) { reject(e); } }
          else reject(new Error('HTTP ' + r.status));
        },
        onerror: () => reject(new Error('network')),
        ontimeout: () => reject(new Error('timeout'))
      }));
    }
    return fetch(url, { method, headers, body: data }).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  // Everything that is synced, read from localStorage.
  function snapshot() {
    const progress = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(P)) continue;
      const r = load(k.slice(P.length));
      if (r && r.ts > 0 && r.d > 0) progress[k.slice(P.length)] = r;
    }
    let rate = null;
    try {
      const v = parseFloat(localStorage.getItem(RATE_KEY)), ts = +localStorage.getItem(RATE_KEY + '-ts') || 0;
      if (v > 0) rate = { v, ts };
    } catch {}
    return { v: 1, progress, rate };
  }

  // Merge `other` into localStorage. Returns { changed: local got newer data, ahead: local has data `other` lacks }.
  function mergeIn(other) {
    let changed = false, ahead = false;
    const mine = snapshot();
    const theirs = (other && other.progress) || {};
    for (const k in theirs) {
      const r = theirs[k], l = mine.progress[k];
      if (!r || !(r.ts > 0) || !(r.d > 0) || !EP_RE.test('/series/' + k)) continue;
      if (!l || r.ts > l.ts) { try { localStorage.setItem(P + k, JSON.stringify(r)); } catch {} changed = true; }
    }
    for (const k in mine.progress) if (!theirs[k] || mine.progress[k].ts > theirs[k].ts) ahead = true;
    const rr = other && other.rate, lr = mine.rate;
    if (rr && rr.v > 0 && rr.v <= 4 && (!lr || rr.ts > lr.ts)) {
      try { localStorage.setItem(RATE_KEY, String(rr.v)); localStorage.setItem(RATE_KEY + '-ts', String(rr.ts)); } catch {}
      changed = true;
    }
    if (lr && (!rr || lr.ts > rr.ts)) ahead = true;
    return { changed, ahead };
  }

  let syncing = null, dirty = false, syncTimer = null, status = { state: 'none' };
  function syncStatusText() {
    if (status.state === 'busy') return T.busy;
    if (status.state === 'ok') return T.last + new Date(status.at).toLocaleString();
    if (status.state === 'fail') return T.fail + status.msg;
    return T.none;
  }

  async function findOrCreateGist(token) {
    for (let page = 1; page <= 5; page++) {
      const list = await api('GET', '/gists?per_page=100&page=' + page, token);
      const g = list.find(x => x.files && x.files[GIST_FILE]);
      if (g) return g.id;
      if (list.length < 100) break;
    }
    const g = await api('POST', '/gists', token, {
      description: 'FAU.tv Resume – watch progress sync (managed by the userscript)',
      public: false,
      files: { [GIST_FILE]: { content: JSON.stringify(snapshot()) } }
    });
    return g.id;
  }

  function sync() {
    if (syncing) return syncing;
    syncing = (async () => {
      const token = await gmGet('syncToken', '');
      if (!token) { status = { state: 'none' }; return; }
      status = { state: 'busy' }; refreshStatus();
      try {
        let id = await gmGet('syncGist', '');
        if (!id) { id = await findOrCreateGist(token); await gmSet('syncGist', id); }
        let g;
        try { g = await api('GET', '/gists/' + id, token); }
        catch (e) {
          if (!/404/.test(e.message)) throw e;
          id = await findOrCreateGist(token); await gmSet('syncGist', id);   // gist was deleted: start over
          g = await api('GET', '/gists/' + id, token);
        }
        const f = g.files && g.files[GIST_FILE];
        let remote = null;
        try { remote = f && f.content ? JSON.parse(f.content) : null; } catch {}
        dirty = false;
        const { changed, ahead } = mergeIn(remote);
        if (ahead || !remote) {
          await api('PATCH', '/gists/' + id, token, { files: { [GIST_FILE]: { content: JSON.stringify(snapshot()) } } });
        }
        status = { state: 'ok', at: Date.now() };
        await gmSet('syncLast', Date.now());
        if (changed) applyRemote();
      } catch (e) {
        status = { state: 'fail', msg: (e && e.message) || String(e) };
      } finally {
        refreshStatus();
        syncing = null;
      }
    })();
    return syncing;
  }

  // After newer progress arrived: refresh badges/buttons, and jump in a video that has not really started yet.
  function applyRemote() {
    mark(); addContinue();
    document.querySelectorAll('video').forEach(v => {
      const st = v._rs; if (!st || !st.ready || st.key !== curKey()) return;
      const r = load(st.key);
      if (r && !r.done && r.t > 5 && v.currentTime < 5 && r.t < v.duration - 10) v.currentTime = r.t;
      applyRate(v);
    });
  }

  onLocalChange = () => {
    dirty = true;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { gmGet('syncToken', '').then(t => { if (t) sync(); }); }, 20000);
  };
  const syncIfStale = async () => {
    if (!(await gmGet('syncToken', ''))) return;
    if (Date.now() - (await gmGet('syncLast', 0)) > 30000 || dirty) sync();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncIfStale();
    else if (dirty) gmGet('syncToken', '').then(t => { if (t) sync(); });
  });
  window.addEventListener('pagehide', () => { if (dirty) sync(); });

  // ----- Sync panel -----
  function refreshStatus() {
    const el = document.getElementById('rs-sync-status');
    if (el) { el.textContent = syncStatusText(); el.style.color = status.state === 'fail' ? '#b00020' : ''; }
    const b = document.getElementById('rs-sync-btn');
    if (b) b.title = syncStatusText();
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fautv-resume-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function importProgress(file, done) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const n = Object.keys((data && data.progress) || {}).length;
        mergeIn(data); applyRemote(); onLocalChange();
        done(T.imported + n);
      } catch (e) { done(T.fail + e.message); }
    };
    r.readAsText(file);
  }

  async function openPanel() {
    refreshLabels();
    document.getElementById('rs-sync-panel')?.remove();
    const token = await gmGet('syncToken', '');
    const wrap = document.createElement('div');
    wrap.id = 'rs-sync-panel';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:16px;';
    const card = document.createElement('div');
    card.style.cssText = 'background:#fff;color:#111;max-width:440px;width:100%;border-radius:10px;padding:20px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3);';
    const btn = 'padding:6px 12px;border-radius:6px;border:1px solid #ccc;background:#f6f6f6;color:#111;cursor:pointer;font:inherit;';
    card.innerHTML =
      '<div style="font-size:17px;font-weight:600;margin-bottom:8px"></div>' +
      '<p style="margin:0 0 8px"></p>' +
      '<p style="margin:0 0 12px"><a target="_blank" rel="noopener" href="https://github.com/settings/tokens/new?scopes=gist&description=FAU.tv%20Resume"></a></p>' +
      '<div data-k="tokenRow" style="display:flex;gap:8px;margin-bottom:12px"><input type="password" autocomplete="off" style="flex:1;padding:6px 8px;border:1px solid #ccc;border-radius:6px;font:inherit"><button data-k="connect"></button></div>' +
      '<div data-k="onRow" style="display:flex;gap:8px;margin-bottom:12px"><button data-k="now"></button><button data-k="off"></button></div>' +
      '<div id="rs-sync-status" style="margin-bottom:12px;color:#555"></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid #eee;padding-top:12px"><button data-k="exp"></button><button data-k="imp"></button><input type="file" accept="application/json,.json" style="display:none"><span style="flex:1"></span><button data-k="close"></button></div>';
    const [h, p, linkP] = card.children;
    h.textContent = T.title; p.textContent = T.desc; linkP.firstChild.textContent = T.mk + ' ↗';
    card.querySelectorAll('button').forEach(b => { b.style.cssText = btn; b.textContent = T[b.dataset.k]; });
    const input = card.querySelector('input[type=password]');
    input.placeholder = T.ph;
    const file = card.querySelector('input[type=file]');
    const showRows = on => {
      card.querySelector('[data-k=tokenRow]').style.display = on ? 'none' : 'flex';
      card.querySelector('[data-k=onRow]').style.display = on ? 'flex' : 'none';
    };
    showRows(!!token);
    const q = k => card.querySelector('button[data-k=' + k + ']');
    q('connect').onclick = async () => {
      const t = input.value.trim(); if (!t) return;
      await gmSet('syncToken', t); await gmSet('syncGist', ''); input.value = '';
      showRows(true); sync();
    };
    q('now').onclick = () => sync();
    q('off').onclick = async () => { await gmSet('syncToken', ''); await gmSet('syncGist', ''); status = { state: 'none' }; showRows(false); refreshStatus(); };
    q('exp').onclick = exportProgress;
    q('imp').onclick = () => file.click();
    file.onchange = () => { if (file.files[0]) importProgress(file.files[0], msg => { document.getElementById('rs-sync-status').textContent = msg; }); };
    q('close').onclick = () => wrap.remove();
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    refreshStatus();
  }

  try { if (typeof GM_registerMenuCommand === 'function') GM_registerMenuCommand('☁ FAU.tv Resume: Sync', openPanel); } catch {}

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
  syncIfStale();
})();
