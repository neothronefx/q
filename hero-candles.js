/* =====================================================================
   neothrone - Animated Demo: Moving Candlestick
   Latar animasi candlestick untuk kotak hero (.hero) di beranda.
   Letak file : assets/js/hero-candles.js
   Pemasangan : <script src="assets/js/hero-candles.js" defer></script>
   Tidak perlu mengubah CSS: gaya yang dibutuhkan dipasang oleh file ini.
   ===================================================================== */
(function () {
  'use strict';

  var hero = document.querySelector('.hero');
  if (!hero || hero.querySelector('.hero-candles')) return;

  /* ---------- Pengaturan yang boleh diubah ---------- */
  var SPEED = 26;          // kecepatan geser (px per detik)
  var BODY_ALPHA = 0.30;   // ketebalan badan candle (0 - 1)
  var WICK_ALPHA = 0.55;   // ketebalan sumbu candle
  var SHOW_LINE = true;    // garis rata-rata bergerak (warna teal)
  var SHOW_GRID = true;    // garis bantu horizontal

  /* ---------- Gaya: kanvas di belakang isi hero, memudar ke arah teks ---------- */
  var fade = 'linear-gradient(90deg,rgba(0,0,0,.30) 0%,rgba(0,0,0,.55) 42%,#000 100%)';
  var style = document.createElement('style');
  style.textContent =
    '.hero{position:relative;isolation:isolate;overflow:hidden}' +
    '.hero-candles{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;border-radius:inherit;' +
    '-webkit-mask-image:' + fade + ';mask-image:' + fade + '}';
  document.head.appendChild(style);

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-candles';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 1, H = 1, step = 22, bodyW = 13;
  var candles = [], offset = 0, price = 100, drift = 0, driftLeft = 0;
  var yMin = 99, yMax = 101, scaled = false;
  var running = false, inView = true, raf = 0, last = 0;

  /* ---------- Data candle acak (simulasi, bukan data pasar) ---------- */
  function nextCandle() {
    if (driftLeft <= 0) {                           // pergantian tren tiap beberapa candle
      drift = (Math.random() - 0.48) * 0.55;
      driftLeft = 6 + Math.floor(Math.random() * 14);
    }
    driftLeft--;
    var o = price, vol = 0.55 + Math.random() * 0.9;
    var c = o + drift + (Math.random() - 0.5) * vol * 2.2 + (100 - o) * 0.002;
    var hi = Math.max(o, c) + Math.random() * vol * 1.1;
    var lo = Math.min(o, c) - Math.random() * vol * 1.1;
    price = c;
    return { o: o, c: c, h: hi, l: lo };
  }

  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function ease(p) { return 1 - Math.pow(1 - p, 3); }

  function resize() {
    var r = hero.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    step = Math.max(14, Math.min(26, Math.round(W / 62)));
    bodyW = Math.round(step * 0.62);
    var need = Math.ceil(W / step) + 4;
    while (candles.length < need) candles.push(nextCandle());
    while (candles.length > need) candles.shift();
    draw(0);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    var n = candles.length;
    if (!n) return;
    var light = isLight();
    var up = light ? '88,170,0' : '150,232,28';
    var dn = light ? '214,48,44' : '230,60,55';
    var teal = light ? '11,143,128' : '45,212,191';
    var p = reduce ? 1 : offset / step;          // kemajuan pembentukan candle terakhir
    var e = ease(p);

    // rentang harga mengikuti candle yang terlihat, dihaluskan agar tidak melompat
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < n; i++) {
      if (candles[i].l < lo) lo = candles[i].l;
      if (candles[i].h > hi) hi = candles[i].h;
    }
    var span = Math.max(1.5, hi - lo), mid = (hi + lo) / 2;
    var tMin = mid - span * 0.62, tMax = mid + span * 0.62;
    if (!scaled) { yMin = tMin; yMax = tMax; scaled = true; }
    var k = 1 - Math.pow(0.001, dt || 0.016);      // laju penghalusan bebas frame-rate
    yMin += (tMin - yMin) * k;
    yMax += (tMax - yMax) * k;

    var padT = 0.16, padB = 0.12, plotH = H * (1 - padT - padB);
    function y(v) { return H * (1 - padB) - ((v - yMin) / (yMax - yMin)) * plotH; }
    function cx(idx) { return W - (n - 1 - idx) * step - offset + step * 0.5; }

    if (SHOW_GRID) {
      ctx.fillStyle = light ? 'rgba(15,23,42,.06)' : 'rgba(147,161,186,.08)';
      for (i = 1; i <= 4; i++) ctx.fillRect(0, Math.round(H * (padT + (1 - padT - padB) * i / 5)), W, 1);
    }

    // titik penutupan (candle terakhir sedang terbentuk)
    var closes = [];
    for (i = 0; i < n; i++) {
      var cc = candles[i];
      closes.push(i === n - 1 && !reduce ? cc.o + (cc.c - cc.o) * e : cc.c);
    }

    for (i = 0; i < n; i++) {
      var cd = candles[i], x = cx(i);
      if (x < -step || x > W + step) continue;
      var o = cd.o, c = closes[i], h = cd.h, l = cd.l;
      if (i === n - 1 && !reduce) {
        h = Math.max(o, c) + (cd.h - Math.max(cd.o, cd.c)) * e;
        l = Math.min(o, c) - (Math.min(cd.o, cd.c) - cd.l) * e;
      }
      var rgb = c >= o ? up : dn;
      var top = y(Math.max(o, c)), bot = y(Math.min(o, c));
      ctx.fillStyle = 'rgba(' + rgb + ',' + WICK_ALPHA + ')';
      ctx.fillRect(x - 0.75, y(h), 1.5, Math.max(1, y(l) - y(h)));
      ctx.fillStyle = 'rgba(' + rgb + ',' + BODY_ALPHA + ')';
      var bh = Math.max(2, bot - top);
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x - bodyW / 2, top, bodyW, bh, 2); ctx.fill(); }
      else ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
    }

    if (SHOW_LINE) {                                 // rata-rata bergerak 6 candle
      ctx.beginPath();
      var started = false;
      for (i = 0; i < n; i++) {
        var s = 0, cnt = 0;
        for (var j = Math.max(0, i - 5); j <= i; j++) { s += closes[j]; cnt++; }
        var px = cx(i), py = y(s / cnt);
        if (px < -step || px > W + step) continue;
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
      }
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(' + teal + ',.5)';
      ctx.stroke();
    }
  }

  /* ---------- Perulangan animasi ---------- */
  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    offset += SPEED * dt;
    while (offset >= step) { offset -= step; candles.shift(); candles.push(nextCandle()); }
    draw(dt);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce || !inView || document.hidden) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* ---------- Pemasangan ---------- */
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
  else window.addEventListener('resize', resize);

  if ('IntersectionObserver' in window) {            // hemat baterai: berhenti saat hero tidak terlihat
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      inView ? start() : stop();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  new MutationObserver(function () { draw(0); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  start();
})();
