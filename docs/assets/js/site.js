// SPDX-License-Identifier: AGPL-3.0-or-later
// Strata website: the hero film (a looping video with a chapter strip), the player with sound,
// the theme switch, copy buttons, the day/night comparison and the documentation table of contents.
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- page theme (Auto / Day / Night), remembered in this browser ---------- */
  const KEY = 'strata-site-theme';
  function setTheme(t, save) {
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === (t || 'auto'))));
    if (save) { try { if (t === 'light' || t === 'dark') localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch (e) { /* private mode */ } }
  }
  setTheme(document.documentElement.dataset.theme || 'auto', false);
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-theme-set]'); if (b) setTheme(b.dataset.themeSet, true); });

  /* ---------- copy buttons ---------- */
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.copy'); if (!b) return;
    const txt = b.parentElement.querySelector('code').innerText.replace(/\s+#.*$/gm, '');
    try { await navigator.clipboard.writeText(txt); b.textContent = 'Copied'; } catch (err) { b.textContent = 'Select and copy'; }
    setTimeout(() => { b.textContent = 'Copy'; }, 1800);
  });

  /* ---------- day / night comparison ---------- */
  const cmp = $('#compare');
  if (cmp) { const r = $('input', cmp); const upd = () => cmp.style.setProperty('--cut', r.value + '%'); r.addEventListener('input', upd); upd(); }

  /* ---------- documentation: highlight the section in view ---------- */
  const toc = $('.toc');
  if (toc && 'IntersectionObserver' in window) {
    const links = new Map([...toc.querySelectorAll('a')].map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { if (en.isIntersecting) { links.forEach((a) => a.removeAttribute('aria-current')); const a = links.get(en.target.id); if (a) a.setAttribute('aria-current', 'true'); } });
    }, { rootMargin: '-15% 0px -75% 0px' });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- the film: a real video; the chapter strip is its timeline ---------- */
  const film = $('#film'), strip = $('#chapters');
  if (!film || !strip) return;
  const CHAPTERS = [
    [0, 4, 's6', 'Layers'], [4, 8, 's2', 'The stack'], [8, 12, 's1', 'Assets'], [12, 16, 's3', 'Flows'],
    [16, 20, 's0', 'Exposure'], [20, 24, 's4', 'From the Internet'], [24, 28, 's7', '2D diagram'],
    [28, 32, 's5', 'Proposals'], [32, 36, 's8', 'Connectors'], [36, 40, 's9', 'Night shift'], [40, 48, 's6', 'Strata'],
  ];
  const DUR = 48, list = $('ol', strip), head = $('.playhead', strip);
  CHAPTERS.forEach(([a, b, c, name], i) => {
    const li = document.createElement('li');
    li.style.setProperty('--len', b - a);
    li.innerHTML = `<button type="button" style="--c:var(--${c})" aria-label="Play from chapter ${i + 1}: ${name}" title="${name}">${name}</button>`;
    li.querySelector('button').addEventListener('click', () => { film.currentTime = a + 0.05; film.play().catch(() => {}); });
    list.appendChild(li);
  });
  const items = [...list.children];
  let last = -1;
  function tick() {
    const t = film.currentTime || 0;
    const r = list.getBoundingClientRect(), sr = strip.getBoundingClientRect();
    head.style.setProperty('--x', (r.left - sr.left + (t / DUR) * r.width).toFixed(1) + 'px');
    const k = CHAPTERS.findIndex(([a, b]) => t >= a && t < b);
    if (k !== last) { last = k; items.forEach((li, i) => li.classList.toggle('on', i === k)); }
  }
  (function loop() { tick(); requestAnimationFrame(loop); })();
  // reduced motion: no autoplay, the poster stays until the visitor presses play
  if (reduce) { film.removeAttribute('autoplay'); film.pause(); film.controls = true; }
  // pause the loop when it is off screen (saves battery), resume when back
  if ('IntersectionObserver' in window && !reduce) {
    new IntersectionObserver(([en]) => { if (en.isIntersecting) film.play().catch(() => {}); else film.pause(); }, { threshold: 0.15 }).observe(film);
  }

  /* ---------- player: the film from the start, with sound ---------- */
  const player = $('#player'), pv = $('#playerVideo');
  let opener = null;
  function openPlayer() {
    opener = document.activeElement; film.pause();
    player.hidden = false; document.body.style.overflow = 'hidden';
    pv.currentTime = 0; pv.muted = false; pv.play().catch(() => {});
    $('#pClose').focus();
  }
  function closePlayer() {
    pv.pause(); player.hidden = true; document.body.style.overflow = '';
    if (!reduce) film.play().catch(() => {});
    if (opener) opener.focus();
  }
  $('#playBtn').addEventListener('click', openPlayer);
  $('#pClose').addEventListener('click', closePlayer);
  player.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closePlayer(); }
    else if (e.key === 'Tab') {
      const f = [pv, $('#pClose')], i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
})();
