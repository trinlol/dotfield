/**
 * Dotfield — zero-dependency living stipple / pointillism particle field.
 *
 * Browser (global):
 *   <script src="dotfield.js"></script>
 *   const field = Dotfield.create(canvas, { mode: 'flow-calm' });
 *   field.start();
 *
 * Headless / tests:
 *   const sim = Dotfield.createSimulation({ width: 400, height: 300, count: 40, seed: 1, mode: 'orbit-rings-3' });
 *   sim.step(0.016); sim.setMode('wave-gentle');
 *
 * Public surface: create, createSimulation, listModes, getMode, version
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof root === "object") {
    root.Dotfield = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VERSION = "1.1.2";

  /* ------------------------------------------------------------------ */
  /* Simplex noise                                                       */

  /* ------------------------------------------------------------------ */
  var Noise = (function () {
    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;
    var F3 = 1 / 3;
    var G3 = 1 / 6;
    var grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var seed = 1337;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    for (var i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      permMod12[i] = perm[i] % 12;
    }
    function dot2(g, x, y) { return g[0] * x + g[1] * y; }
    function dot3(g, x, y, z) { return g[0] * x + g[1] * y + g[2] * z; }

    function noise2D(xin, yin) {
      var s = (xin + yin) * F2;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var t = (i + j) * G2;
      var X0 = i - t, Y0 = j - t;
      var x0 = xin - X0, y0 = yin - Y0;
      var i1, j1;
      if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
      var x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255;
      var gi0 = permMod12[ii + perm[jj]];
      var gi1 = permMod12[ii + i1 + perm[jj + j1]];
      var gi2 = permMod12[ii + 1 + perm[jj + 1]];
      var n0 = 0, n1 = 0, n2 = 0;
      var t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
      var t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
      var t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
      return 70 * (n0 + n1 + n2);
    }

    function noise3D(xin, yin, zin) {
      var s = (xin + yin + zin) * F3;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var X0 = i - t, Y0 = j - t, Z0 = k - t;
      var x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      var x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      var ii = i & 255, jj = j & 255, kk = k & 255;
      var gi0 = permMod12[ii + perm[jj + perm[kk]]];
      var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      var n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot3(grad3[gi0], x0, y0, z0); }
      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot3(grad3[gi1], x1, y1, z1); }
      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot3(grad3[gi2], x2, y2, z2); }
      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * dot3(grad3[gi3], x3, y3, z3); }
      return 32 * (n0 + n1 + n2 + n3);
    }
    return { noise2D: noise2D, noise3D: noise3D };
  })();

  /* ------------------------------------------------------------------ */

  /* Seeded RNG                                                          */

  /* ------------------------------------------------------------------ */
  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Palettes                                                            */

  /* ------------------------------------------------------------------ */
  var PALETTES = {
    terracotta: [
      { r: 196, g: 92, b: 62 },
      { r: 217, g: 120, b: 87 },
      { r: 154, g: 63, b: 40 },
      { r: 201, g: 140, b: 110 },
      { r: 130, g: 78, b: 58 },
      { r: 180, g: 100, b: 75 },
    ],
    ink: [
      { r: 40, g: 36, b: 32 },
      { r: 70, g: 62, b: 54 },
      { r: 100, g: 90, b: 78 },
      { r: 55, g: 48, b: 42 },
    ],
    ocean: [
      { r: 45, g: 90, b: 120 },
      { r: 70, g: 130, b: 150 },
      { r: 30, g: 70, b: 95 },
      { r: 100, g: 150, b: 160 },
    ],
    dusk: [
      { r: 120, g: 70, b: 110 },
      { r: 90, g: 50, b: 90 },
      { r: 160, g: 100, b: 120 },
      { r: 70, g: 40, b: 70 },
    ],
    forest: [
      { r: 60, g: 100, b: 70 },
      { r: 40, g: 80, b: 55 },
      { r: 90, g: 120, b: 80 },
      { r: 50, g: 70, b: 50 },
    ],
    ember: [
      { r: 220, g: 80, b: 40 },
      { r: 180, g: 50, b: 30 },
      { r: 240, g: 120, b: 60 },
      { r: 140, g: 40, b: 25 },
    ],
    frost: [
      { r: 160, g: 190, b: 210 },
      { r: 120, g: 160, b: 185 },
      { r: 200, g: 220, b: 230 },
      { r: 90, g: 130, b: 155 },
    ],
    gold: [
      { r: 200, g: 160, b: 60 },
      { r: 170, g: 130, b: 40 },
      { r: 230, g: 190, b: 90 },
      { r: 140, g: 100, b: 30 },
    ],
    rose: [
      { r: 200, g: 100, b: 120 },
      { r: 170, g: 70, b: 95 },
      { r: 230, g: 140, b: 150 },
      { r: 140, g: 55, b: 75 },
    ],
  };

  var BG = {
    cream: { r: 244, g: 239, b: 230 },
    paper: { r: 250, g: 247, b: 240 },
    night: { r: 18, g: 16, b: 20 },
    slate: { r: 30, g: 34, b: 40 },
    mist: { r: 230, g: 234, b: 238 },
    sand: { r: 236, g: 226, b: 210 },
    ink: { r: 12, g: 12, b: 14 },
  };

  /* ------------------------------------------------------------------ */
  /* Mode catalog — families × parameter axes ≥1000 modes                */
  /* ------------------------------------------------------------------ */
  // engineFamily maps public family id → motion kernel used in attractor
  var FAMILIES = [
    { id: "flow", label: "Flow", desc: "Open noise-driven current", engine: "flow" },
    { id: "orbit", label: "Orbit", desc: "Concentric rings that turn", engine: "orbit" },
    { id: "constellation", label: "Constellation", desc: "Soft clusters that form and dissolve", engine: "constellation" },
    { id: "wave", label: "Wave", desc: "Rolling undulation", engine: "wave" },
    { id: "spiral", label: "Spiral", desc: "Archimedean spiral pull", engine: "spiral" },
    { id: "vortex", label: "Vortex", desc: "Swirl toward a center", engine: "vortex" },
    { id: "grid", label: "Grid", desc: "Lattice snap with drift", engine: "grid" },
    { id: "ribbon", label: "Ribbon", desc: "Parallel sine ribbons", engine: "ribbon" },
    { id: "bloom", label: "Bloom", desc: "Radial breathe expand/contract", engine: "bloom" },
    { id: "rain", label: "Rain", desc: "Vertical fall with noise sway", engine: "rain" },
    { id: "figure8", label: "Figure-8", desc: "Lemniscate path", engine: "figure8" },
    { id: "helix", label: "Helix", desc: "Twisting vertical helix", engine: "helix" },
    { id: "scatter", label: "Scatter", desc: "High-noise turbulent field", engine: "scatter" },
    { id: "pulse", label: "Pulse", desc: "Rhythmic radial pulses", engine: "pulse" },
    { id: "drift", label: "Drift", desc: "Slow wind with low noise", engine: "drift" },
    { id: "magnet", label: "Magnet", desc: "Dual poles attract/repel", engine: "magnet" },
    { id: "weave", label: "Weave", desc: "Crossing sine weaves", engine: "weave" },
    { id: "halo", label: "Halo", desc: "Ring band with thickness", engine: "halo" },
    { id: "cascade", label: "Cascade", desc: "Stepped waterfall bands", engine: "cascade" },
    { id: "swarm", label: "Swarm", desc: "Boid-like local cohesion", engine: "swarm" },
    { id: "aurora", label: "Aurora", desc: "Curtain-like vertical waves", engine: "wave" },
    { id: "tide", label: "Tide", desc: "Slow horizontal surge", engine: "wave" },
    { id: "lattice", label: "Lattice", desc: "Crystalline grid lock", engine: "grid" },
    { id: "comet", label: "Comet", desc: "Streaking fall trails", engine: "rain" },
    { id: "fog", label: "Fog", desc: "Soft diffuse scatter", engine: "scatter" },
    { id: "mill", label: "Mill", desc: "Wheel-like multi rings", engine: "orbit" },
    { id: "braid", label: "Braid", desc: "Interlaced weave strands", engine: "weave" },
    { id: "echo", label: "Echo", desc: "Repeating radial echoes", engine: "pulse" },
    { id: "nexus", label: "Nexus", desc: "Hub clusters with spokes", engine: "constellation" },
    { id: "gyre", label: "Gyre", desc: "Wide ocean swirl", engine: "vortex" },
    { id: "petal", label: "Petal", desc: "Flower bloom cycles", engine: "bloom" },
    { id: "cord", label: "Cord", desc: "Tight ribbon bands", engine: "ribbon" },
    { id: "lance", label: "Lance", desc: "Sharp helical climb", engine: "helix" },
    { id: "stream", label: "Stream", desc: "Directional current", engine: "flow" },
    { id: "infinity", label: "Infinity", desc: "Figure-eight orbits", engine: "figure8" },
    { id: "poles", label: "Poles", desc: "Magnetic dual wells", engine: "magnet" },
    // Calm-first families — soft engines, easy on the eyes
    { id: "float", label: "Float", desc: "Weightless open drift", engine: "drift", calm: true },
    { id: "glide", label: "Glide", desc: "Long smooth current lines", engine: "flow", calm: true },
    { id: "hush", label: "Hush", desc: "Near-still fog of motion", engine: "scatter", calm: true },
    { id: "murmur", label: "Murmur", desc: "Quiet clustered whispers", engine: "constellation", calm: true },
    { id: "lull", label: "Lull", desc: "Gentle rolling hush", engine: "wave", calm: true },
    { id: "breath", label: "Breath", desc: "Slow expand and rest", engine: "bloom", calm: true },
    { id: "meadow", label: "Meadow", desc: "Soft field sway", engine: "drift", calm: true },
    { id: "glass", label: "Glass", desc: "Clear slow orbit rings", engine: "halo", calm: true },
    { id: "zen", label: "Zen", desc: "Minimal centered stillness", engine: "orbit", calm: true },
    { id: "cloud", label: "Cloud", desc: "Soft coalescing haze", engine: "swarm", calm: true },
    { id: "velvet", label: "Velvet", desc: "Silky ribbon drift", engine: "ribbon", calm: true },
    { id: "silk", label: "Silk", desc: "Fine woven glide", engine: "weave", calm: true },
    { id: "mistflow", label: "Mistflow", desc: "Diffuse quiet current", engine: "flow", calm: true },
    { id: "lagoon", label: "Lagoon", desc: "Wide still water swirl", engine: "vortex", calm: true },
    { id: "emberglow", label: "Emberglow", desc: "Warm slow radial rest", engine: "pulse", calm: true },
    { id: "moonring", label: "Moonring", desc: "Pale slow halo turn", engine: "halo", calm: true },
    { id: "softgrid", label: "Softgrid", desc: "Barely-there lattice drift", engine: "grid", calm: true },
    { id: "driftwood", label: "Driftwood", desc: "Lazy shoreline float", engine: "drift", calm: true },
  ];

  var FAMILY_BY_ID = Object.create(null);
  for (var _fi = 0; _fi < FAMILIES.length; _fi++) {
    FAMILY_BY_ID[FAMILIES[_fi].id] = FAMILIES[_fi];
  }

  var SPEEDS = [
    { id: "whisper", label: "Whisper", speed: 0.18, calm: true },
    { id: "gentle", label: "Gentle", speed: 0.28, calm: true },
    { id: "still", label: "Still", speed: 0.32, calm: true },
    { id: "calm", label: "Calm", speed: 0.48, calm: true },
    { id: "steady", label: "Steady", speed: 0.85 },
    { id: "brisk", label: "Brisk", speed: 1.45 },
    { id: "rush", label: "Rush", speed: 2.1 },
  ];
  var SCALES = [
    { id: "micro", label: "Micro", scale: 0.00045, noiseAmp: 0.4 },
    { id: "fine", label: "Fine", scale: 0.00075, noiseAmp: 0.65 },
    { id: "mid", label: "Mid", scale: 0.0011, noiseAmp: 0.85 },
    { id: "broad", label: "Broad", scale: 0.0018, noiseAmp: 1.05 },
    { id: "vast", label: "Vast", scale: 0.0028, noiseAmp: 1.25 },
  ];
  // Extra-soft scales used only for serene / calm-first series
  var CALM_SCALES = [
    { id: "silk", label: "Silk", scale: 0.0004, noiseAmp: 0.32 },
    { id: "soft", label: "Soft", scale: 0.00065, noiseAmp: 0.48 },
    { id: "ease", label: "Ease", scale: 0.00095, noiseAmp: 0.58 },
    { id: "open", label: "Open", scale: 0.0014, noiseAmp: 0.7 },
  ];
  var SPINS = [
    { id: "cw", label: "Clockwise", spin: 1 },
    { id: "ccw", label: "Counter", spin: -1 },
  ];
  var DENSITIES = [
    { id: "sparse", label: "Sparse", pull: 0.01, morphBias: 0.5 },
    { id: "balanced", label: "Balanced", pull: 0.018, morphBias: 0.75 },
    { id: "tight", label: "Tight", pull: 0.032, morphBias: 1.0 },
  ];
  var CALM_DENSITIES = [
    { id: "air", label: "Air", pull: 0.008, morphBias: 0.42 },
    { id: "soft", label: "Soft", pull: 0.014, morphBias: 0.62 },
    { id: "held", label: "Held", pull: 0.02, morphBias: 0.78 },
  ];

  function isCalmSpeed(sp) {
    return !!(sp && sp.calm);
  }

  function softParamsForCalm(params, fam, sp) {
    // Calm modes only: lower noise, softer pull, gentler waves
    var out = Object.assign({}, params);
    var calmFamily = !!(fam && fam.calm);
    var calmSpeed = isCalmSpeed(sp);
    var forceCalm = !!(params && (params.calm || params.serene));
    if (calmFamily || calmSpeed || forceCalm) {
      out.calm = true;
      out.noiseAmp = Math.min(out.noiseAmp || 1, calmFamily || forceCalm ? 0.55 : 0.72) * (calmFamily || forceCalm ? 0.85 : 1);
      out.pull = Math.min(out.pull || 0.02, calmFamily || forceCalm ? 0.016 : 0.02);
      out.morphBias = Math.min(out.morphBias || 0.85, calmFamily || forceCalm ? 0.7 : 0.8);
      out.waveAmp = Math.min(out.waveAmp || 40, calmFamily || forceCalm ? 28 : 36);
      out.waveFreq = Math.min(out.waveFreq || 0.003, calmFamily || forceCalm ? 0.0022 : 0.0028);
      // Cap speed so calm families stay gentle
      if ((calmFamily || forceCalm) && out.speed > 0.55) out.speed = 0.55;
      if (calmSpeed && sp && out.speed > sp.speed) out.speed = sp.speed;
    } else {
      out.calm = false;
    }
    return out;
  }

  /**
   * Build full catalog.
   * Core product: family × speed × spin × scale
   * Plus tint row + dedicated serene calm series.
   */
  function buildCatalog() {
    var modes = [];
    var seen = Object.create(null);
    var paletteKeys = Object.keys(PALETTES);
    var bgKeys = Object.keys(BG);

    function add(mode) {
      if (seen[mode.id]) return;
      seen[mode.id] = true;
      modes.push(mode);
    }

    // 1) Full combinatorial core
    for (var fi = 0; fi < FAMILIES.length; fi++) {
      var fam = FAMILIES[fi];
      for (var si = 0; si < SPEEDS.length; si++) {
        var sp = SPEEDS[si];
        // Calm-first families never ship brisk/rush variants
        if (fam.calm && (sp.id === "brisk" || sp.id === "rush")) continue;
        for (var ri = 0; ri < SPINS.length; ri++) {
          var spin = SPINS[ri];
          for (var sci = 0; sci < SCALES.length; sci++) {
            var scale = SCALES[sci];
            var dens = DENSITIES[(fi + si + sci) % DENSITIES.length];
            // Prefer softer scales for calm families
            if (fam.calm && (scale.id === "vast" || scale.id === "broad")) {
              scale = CALM_SCALES[sci % CALM_SCALES.length];
            }
            var baseParams = {
              family: fam.id,
              engine: fam.engine,
              familyBias: fi * 1.618,
              speed: sp.speed * (fam.calm ? 0.75 : 1),
              scale: scale.scale * (1 + (fi % 5) * 0.03),
              noiseAmp: scale.noiseAmp * (fam.calm ? 0.7 : 1) * (1 + (fi % 3) * 0.05),
              spin: spin.spin,
              pull: dens.pull * (fam.calm ? 0.75 : 1) * (1 + (fi % 4) * 0.04),
              morphBias: dens.morphBias * (fam.calm ? 0.85 : 1),
              rings: 2 + ((fi + sci) % 5),
              clusters: 3 + ((si + ri + fi) % 4),
              waveFreq: 0.002 + sci * 0.0005 + si * 0.0002 + fi * 0.0001,
              waveAmp: (fam.calm ? 18 : 26) + sci * 10 + si * 4 + (fi % 5) * 3,
              palette: paletteKeys[fi % paletteKeys.length],
              bg: "cream",
            };
            baseParams = softParamsForCalm(baseParams, fam, sp);
            add({
              id: fam.id + "-" + sp.id + "-" + spin.id + "-" + (scale.id || "mid"),
              label: fam.label + " · " + sp.label + " · " + spin.label + " · " + (scale.label || "Mid"),
              family: fam.id,
              familyLabel: fam.label,
              description:
                fam.desc +
                " — " +
                sp.label.toLowerCase() +
                ", " +
                spin.label.toLowerCase() +
                ", " +
                (scale.label || "mid").toLowerCase() +
                " scale" +
                (fam.calm || isCalmSpeed(sp) ? " · smooth & easy on the eyes." : "."),
              params: baseParams,
            });
          }
        }
      }
    }

    // 1b) Dedicated serene series — ultra-smooth calm modes (easy on the eyes).
    // Prefer open field engines that fill the canvas; skip ring/donut/radial
    // motifs (orbit, halo, bloom, vortex, spiral, figure8, …).
    var SERENE_SKIP_ENGINES = {
      orbit: 1,
      halo: 1,
      bloom: 1,
      pulse: 1,
      vortex: 1,
      spiral: 1,
      figure8: 1,
      helix: 1,
      magnet: 1,
    };
    var SERENE_FAMILIES = FAMILIES.filter(function (f) {
      if (SERENE_SKIP_ENGINES[f.engine]) return false;
      return (
        f.calm ||
        f.engine === "flow" ||
        f.engine === "drift" ||
        f.engine === "wave" ||
        f.engine === "scatter" ||
        f.engine === "grid" ||
        f.engine === "ribbon" ||
        f.engine === "weave" ||
        f.engine === "constellation" ||
        f.engine === "swarm" ||
        f.engine === "rain"
      );
    });
    var SERENE_SPEEDS = SPEEDS.filter(function (s) {
      return s.calm;
    });
    for (var sfi = 0; sfi < SERENE_FAMILIES.length; sfi++) {
      var sfam = SERENE_FAMILIES[sfi];
      for (var ssi = 0; ssi < SERENE_SPEEDS.length; ssi++) {
        var ssp = SERENE_SPEEDS[ssi];
        for (var sri = 0; sri < SPINS.length; sri++) {
          var sspin = SPINS[sri];
          for (var ssc = 0; ssc < CALM_SCALES.length; ssc++) {
            var csc = CALM_SCALES[ssc];
            var cdens = CALM_DENSITIES[(sfi + ssi + ssc) % CALM_DENSITIES.length];
            var sereneParams = softParamsForCalm(
              {
                family: sfam.id,
                engine: sfam.engine,
                familyBias: sfi * 1.3 + ssc * 0.2,
                speed: ssp.speed * 0.85,
                scale: csc.scale,
                noiseAmp: csc.noiseAmp * 0.9,
                spin: sspin.spin,
                pull: cdens.pull,
                morphBias: cdens.morphBias,
                rings: 2 + (ssc % 3),
                clusters: 3 + (ssi % 3),
                waveFreq: 0.0016 + ssc * 0.00035,
                waveAmp: 14 + ssc * 6,
                palette: paletteKeys[(sfi + ssc) % paletteKeys.length],
                bg: "cream",
                serene: true,
              },
              { calm: true },
              ssp
            );
            add({
              id:
                "serene-" +
                sfam.id +
                "-" +
                ssp.id +
                "-" +
                sspin.id +
                "-" +
                csc.id,
              label:
                "Serene · " +
                sfam.label +
                " · " +
                ssp.label +
                " · " +
                csc.label,
              family: sfam.id,
              familyLabel: sfam.label,
              description:
                "Ultra-smooth " +
                sfam.label.toLowerCase() +
                " — " +
                ssp.label.toLowerCase() +
                " motion, soft noise, easy on the eyes.",
              params: sereneParams,
            });
          }
        }
      }
    }

    // 2) Tint × density showcase (extra character, unique ids)
    for (var fi = 0; fi < FAMILIES.length; fi++) {
      var fam = FAMILIES[fi];
      for (var pi = 0; pi < paletteKeys.length; pi++) {
        for (var di = 0; di < DENSITIES.length; di++) {
          var dens = DENSITIES[di];
          var sc = SCALES[(pi + di) % SCALES.length];
          add({
            id: fam.id + "-tint-" + paletteKeys[pi] + "-" + dens.id,
            label: fam.label + " · " + titleCase(paletteKeys[pi]) + " · " + dens.label,
            family: fam.id,
            familyLabel: fam.label,
            description:
              fam.desc +
              " with " +
              paletteKeys[pi] +
              " palette, " +
              dens.label.toLowerCase() +
              " pull.",
            params: softParamsForCalm(
              {
                family: fam.id,
                engine: fam.engine,
                familyBias: fi * 1.618 + pi * 0.3,
                speed: fam.calm ? 0.4 + (pi % 3) * 0.05 : 0.9 + (fi % 4) * 0.04,
                scale: sc.scale * (1 + (fi % 4) * 0.03),
                noiseAmp: sc.noiseAmp * (fam.calm ? 0.65 : 1) * (1 + (di % 3) * 0.05),
                spin: pi % 2 === 0 ? 1 : -1,
                pull: dens.pull * (fam.calm ? 0.7 : 1),
                morphBias: dens.morphBias * (fam.calm ? 0.8 : 1),
                rings: 3 + (pi % 4) + (fi % 3),
                clusters: 4 + (di % 3) + (fi % 2),
                waveFreq: 0.003 + pi * 0.0003 + fi * 0.0001,
                waveAmp: (fam.calm ? 22 : 36) + pi * 6 + (fi % 5) * 3,
                palette: paletteKeys[pi],
                bg: bgKeys[pi % bgKeys.length],
              },
              fam,
              { calm: fam.calm, speed: fam.calm ? 0.45 : 1 }
            ),
          });
        }
      }
    }

    // Legacy short ids (family-speed-spin) alias to mid-scale variant for old snippets
    for (var fi = 0; fi < FAMILIES.length; fi++) {
      var fam = FAMILIES[fi];
      for (var si = 0; si < SPEEDS.length; si++) {
        var sp = SPEEDS[si];
        for (var ri = 0; ri < SPINS.length; ri++) {
          var spin = SPINS[ri];
          var legacyId = fam.id + "-" + sp.id + "-" + spin.id;
          if (!seen[legacyId]) {
            var base = CATALOG_LOOKUP_HELPER(
              fam,
              sp,
              spin,
              SCALES[2],
              DENSITIES[1],
              paletteKeys,
              fi
            );
            base.id = legacyId;
            base.label = fam.label + " · " + sp.label + " · " + spin.label;
            add(base);
          }
        }
      }
    }

    modes.sort(function (a, b) {
      if (a.family < b.family) return -1;
      if (a.family > b.family) return 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return modes;
  }

  function CATALOG_LOOKUP_HELPER(fam, sp, spin, scale, dens, paletteKeys, fi) {
    fi = fi || 0;
    return {
      id: "",
      label: "",
      family: fam.id,
      familyLabel: fam.label,
      description: fam.desc,
      params: {
        family: fam.id,
        engine: fam.engine,
        familyBias: fi * 1.618,
        speed: sp.speed,
        scale: scale.scale * (1 + (fi % 5) * 0.04),
        noiseAmp: scale.noiseAmp * (1 + (fi % 3) * 0.08),
        spin: spin.spin,
        pull: dens.pull * (1 + (fi % 4) * 0.05),
        morphBias: dens.morphBias,
        rings: 3 + (fi % 4),
        clusters: 4 + (fi % 3),
        waveFreq: 0.0035 + fi * 0.00015,
        waveAmp: 40 + (fi % 7) * 5,
        palette: paletteKeys[fi % paletteKeys.length],
        bg: "cream",
      },
    };
  }

  function titleCase(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  var CATALOG = buildCatalog();
  var CATALOG_BY_ID = Object.create(null);
  for (var ci = 0; ci < CATALOG.length; ci++) {
    CATALOG_BY_ID[CATALOG[ci].id] = CATALOG[ci];
  }

  function listModes() {
    return CATALOG.map(function (m) {
      return {
        id: m.id,
        label: m.label,
        family: m.family,
        familyLabel: m.familyLabel,
        description: m.description,
        calm: !!(m.params && m.params.calm),
        serene: !!(m.params && m.params.serene),
      };
    });
  }

  function getMode(id) {
    var m = CATALOG_BY_ID[id];
    if (!m) return null;
    return {
      id: m.id,
      label: m.label,
      family: m.family,
      familyLabel: m.familyLabel,
      description: m.description,
      calm: !!(m.params && m.params.calm),
      serene: !!(m.params && m.params.serene),
      params: Object.assign({}, m.params),
    };
  }

  function listCalmModes() {
    return listModes().filter(function (m) {
      return m.calm || m.serene || isCalmModeIdPublic(m.id);
    });
  }

  function isCalmModeIdPublic(id) {
    if (!id) return false;
    if (id.indexOf("serene-") === 0) return true;
    if (id.indexOf("-rush") !== -1 || id.indexOf("-brisk") !== -1) return false;
    return (
      id.indexOf("-whisper") !== -1 ||
      id.indexOf("-gentle") !== -1 ||
      id.indexOf("-still") !== -1 ||
      id.indexOf("-calm") !== -1
    );
  }

  function resolveModeId(id) {
    if (id && CATALOG_BY_ID[id]) return id;
    // Legacy short names → first catalog entry of that family
    if (id && typeof id === "string") {
      for (var i = 0; i < CATALOG.length; i++) {
        if (CATALOG[i].family === id || CATALOG[i].id === id) return CATALOG[i].id;
      }

    }
    return CATALOG[0].id;
  }


  /* ------------------------------------------------------------------ */
  /* Pure motion engine (testable without canvas)                        */
  /* ------------------------------------------------------------------ */
  function parseHexColor(hex) {
    if (typeof hex !== "string") return null;
    var h = hex.replace(/^#/, "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return null;
    var n = parseInt(h, 16);
    if (isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }

  function rainbowColorAt(t) {
    return hslToRgb(t * 360, 0.72, 0.55);
  }

  /** Build N distinct rainbow colours (for palette lists / retint). */
  function rainbowPalette(n) {
    n = Math.max(12, n || 48);
    var out = [];
    for (var i = 0; i < n; i++) out.push(rainbowColorAt(i / n));
    return out;
  }

  /** Resolve palette: named string, array of {r,g,b} or #hex, or single color. */
  function resolvePalette(input) {
    if (!input) return PALETTES.terracotta.slice();
    if (typeof input === "string") {
      if (input === "rainbow") return rainbowPalette(64);
      if (PALETTES[input]) return PALETTES[input].map(function (c) {
        return { r: c.r, g: c.g, b: c.b };
      });
      var single = parseHexColor(input);
      if (single) return [single];
      return PALETTES.terracotta.slice();
    }
    if (Array.isArray(input) && input.length) {
      return input.map(function (c) {
        if (typeof c === "string") return parseHexColor(c) || { r: 196, g: 92, b: 62 };
        return {
          r: c.r != null ? c.r : 196,
          g: c.g != null ? c.g : 92,
          b: c.b != null ? c.b : 62,
        };
      });
    }
    if (typeof input === "object" && (input.r != null || input.g != null)) {
      return [{ r: input.r || 0, g: input.g || 0, b: input.b || 0 }];
    }
    return PALETTES.terracotta.slice();
  }

  function resolveBg(input) {
    if (!input) return { r: BG.cream.r, g: BG.cream.g, b: BG.cream.b };
    if (typeof input === "string") {
      if (BG[input]) return { r: BG[input].r, g: BG[input].g, b: BG[input].b };
      var hex = parseHexColor(input);
      if (hex) return hex;
    }
    if (typeof input === "object" && input.r != null) {
      return { r: input.r, g: input.g, b: input.b };
    }
    return { r: BG.cream.r, g: BG.cream.g, b: BG.cream.b };
  }

  function isRainbowPalette(input) {
    return input === "rainbow" || (input && input._rainbow === true);
  }

  function createParticles(w, h, count, rng, paletteInput) {
    var rainbow = isRainbowPalette(paletteInput);
    var palette = rainbow ? null : resolvePalette(paletteInput);
    var particles = [];
    for (var i = 0; i < count; i++) {
      var depth = rng();
      var color = rainbow
        ? rainbowColorAt((i / Math.max(1, count)) * 0.85 + rng() * 0.15)
        : palette[Math.floor(rng() * palette.length)];
      particles.push({
        x: rng() * w,
        y: rng() * h,
        vx: 0,
        vy: 0,
        size: 0.55 + depth * 1.9 + rng() * 0.4,
        alpha: 0.25 + depth * 0.55,
        depth: depth,
        phase: rng() * Math.PI * 2,
        color: { r: color.r, g: color.g, b: color.b },
        seed: rng() * 1000,
        homeAngle: (i / count) * Math.PI * 2,
        homeRadius: 0.15 + rng() * 0.55,
        hue: rainbow ? (i / Math.max(1, count)) : null,
      });
    }
    return particles;
  }

  function retintParticles(particles, paletteInput) {
    var rainbow = isRainbowPalette(paletteInput);
    var palette = rainbow ? null : resolvePalette(paletteInput);
    var n = particles.length || 1;
    for (var i = 0; i < particles.length; i++) {
      var c;
      if (rainbow) {
        var t =
          particles[i].hue != null
            ? particles[i].hue
            : (i / n + (particles[i].seed || 0) * 0.0003) % 1;
        c = rainbowColorAt(t);
        particles[i].hue = t;
      } else {
        c = palette[i % palette.length];
      }
      particles[i].color = { r: c.r, g: c.g, b: c.b };
    }
  }

  /**
   * Merge consumer customization onto mode params.
   * Overrides: speed, speedScale, intensity, scale, noiseAmp, spin, pull,
   * palette/colors, background/bg, rings, clusters, waveFreq, waveAmp.
   */
  function applyCustomization(params, options) {
    if (!options) return params;
    var out = Object.assign({}, params);

    if (options.speed != null) out.speed = Number(options.speed);
    if (options.speedScale != null) out.speed = (out.speed || 1) * Number(options.speedScale);
    if (options.intensity != null) {
      out.noiseAmp = (out.noiseAmp || 1) * Number(options.intensity);
      out.pull = (out.pull || 0.02) * (0.5 + Number(options.intensity) * 0.5);
    }
    if (options.scale != null) out.scale = Number(options.scale);
    if (options.noiseAmp != null) out.noiseAmp = Number(options.noiseAmp);
    if (options.spin != null) out.spin = Number(options.spin);
    if (options.pull != null) out.pull = Number(options.pull);
    if (options.morphBias != null) out.morphBias = Number(options.morphBias);
    if (options.rings != null) out.rings = Number(options.rings);
    if (options.clusters != null) out.clusters = Number(options.clusters);
    if (options.waveFreq != null) out.waveFreq = Number(options.waveFreq);
    if (options.waveAmp != null) out.waveAmp = Number(options.waveAmp);
    if (options.mouseForce != null) out.mouseForce = Number(options.mouseForce);
    if (options.mouseRadius != null) out.mouseRadius = Number(options.mouseRadius);
    if (options.mouseMode != null) out.mouseMode = String(options.mouseMode);
    if (options.interactive != null) out.interactive = !!options.interactive;
    if (options.autoMouse != null) out.autoMouse = !!options.autoMouse;
    if (options.mouseSmooth != null) out.mouseSmooth = Number(options.mouseSmooth);
    if (options.trail != null) out.trail = !!options.trail;
    if (options.wrap != null) out.wrap = !!options.wrap;
    if (options.rainbow != null) {
      out.rainbow = !!options.rainbow;
      if (out.rainbow) {
        out.palette = "rainbow";
        out._paletteResolved = "rainbow";
      }
    }

    var pal = options.palette != null ? options.palette : options.colors;
    if (pal != null) {
      out.palette = pal;
      out._paletteResolved = pal === "rainbow" ? "rainbow" : resolvePalette(pal);
      if (pal === "rainbow") out.rainbow = true;
      else if (out.rainbow && pal !== "rainbow") out.rainbow = false;
    }
    var bg = options.background != null ? options.background : options.bg;
    if (bg != null) {
      out.bg = bg;
      out._bgResolved = resolveBg(bg);
    }
    return out;
  }

  function getActivePalette(params) {
    if (params.rainbow || params.palette === "rainbow" || params._paletteResolved === "rainbow") {
      return "rainbow";
    }
    if (params._paletteResolved && params._paletteResolved !== "rainbow") {
      return params._paletteResolved;
    }
    return resolvePalette(params.palette);
  }

  function getActiveBg(params) {
    if (params._bgResolved) return params._bgResolved;
    return resolveBg(params.bg);
  }


  function flowVector(x, y, t, params) {
    var scale = params.scale;
    var amp = params.noiseAmp;
    var bias = params.familyBias || 0;
    // Calm / serene: slower noise evolution + smoother strength
    var calm = !!(params.calm || params.serene);
    var tScale = calm ? 0.045 : 0.08;
    var n1 = Noise.noise3D(x * scale + bias, y * scale, t * tScale * params.speed + bias * 0.1);
    var n2 = Noise.noise3D(x * scale + 40 + bias, y * scale + 40, t * tScale * params.speed + 10);
    var angle = n1 * Math.PI * 2 * params.spin;
    var strength = (0.28 + n2 * (calm ? 0.14 : 0.25)) * amp * (calm ? 0.75 : 1);
    return { x: Math.cos(angle) * strength, y: Math.sin(angle) * strength };
  }

  function attractorTarget(p, t, w, h, params) {
    var cx = w * 0.55;
    var cy = h * 0.42;
    var family = params.engine || params.family;
    var spin = params.spin;
    var speed = params.speed;
    var tx = p.x;
    var ty = p.y;

    if (family === "flow" || family === "scatter" || family === "drift") {
      // Stay near free flow; light anchor so modes still differ via noise params
      var driftY = family === "drift" ? 0.15 : family === "scatter" ? 0.4 : 0.25;
      tx = p.x + Math.sin(t * 0.2 * speed + p.phase) * 20 * params.noiseAmp;
      ty = p.y + Math.cos(t * 0.15 * speed + p.seed) * 15 * driftY;
    } else if (family === "orbit" || family === "halo") {
      var r = Math.min(w, h) * (0.12 + p.homeRadius * 0.32);
      var ring = Math.floor(p.seed * params.rings) % params.rings;
      var rr = r * (0.55 + ring * 0.18);
      if (family === "halo") rr = r * (0.85 + (p.seed % 1) * 0.2);
      var a = p.homeAngle + t * (0.08 + ring * 0.02) * speed * spin + p.phase * 0.1;
      tx = cx + Math.cos(a) * rr;
      ty = cy + Math.sin(a) * rr * 0.72;
    } else if (family === "constellation" || family === "swarm") {
      var clusters = params.clusters;
      var ci = Math.floor(p.seed * clusters) % clusters;
      var ca = (ci / clusters) * Math.PI * 2 + t * 0.04 * speed * spin;
      var cr = Math.min(w, h) * 0.22;
      var ccx = cx + Math.cos(ca) * cr;
      var ccy = cy + Math.sin(ca) * cr * 0.65;
      if (family === "swarm") {
        // tighter local cloud
        cr *= 0.55;
        ccx = cx + Math.cos(ca) * cr + Math.sin(t * 0.3 + ci) * 20;
        ccy = cy + Math.sin(ca) * cr * 0.65;
      }
      var jitter = (family === "swarm" ? 25 : 40) + p.depth * 50;
      var jx = Noise.noise2D(p.seed, t * 0.15 * speed) * jitter;
      var jy = Noise.noise2D(p.seed + 5, t * 0.15 * speed) * jitter;
      tx = ccx + jx;
      ty = ccy + jy;
    } else if (family === "wave" || family === "ribbon" || family === "weave") {
      var wf = params.waveFreq;
      var wa = params.waveAmp * params.noiseAmp;
      var fbias = params.familyBias || 0;
      if (family === "ribbon") {
        var band = Math.floor(p.seed * 5) % 5;
        ty = h * (0.2 + band * 0.14) + Math.sin(p.x * wf + t * 0.6 * speed + p.phase + fbias) * wa * 0.6;
        tx = p.x + Math.sin(t * 0.2 + band + fbias) * 5;
      } else if (family === "weave") {
        tx = p.x + Math.sin(p.y * wf + t * 0.5 * speed + fbias) * wa * 0.4;
        ty = p.y + Math.cos(p.x * wf * 1.1 - t * 0.4 * speed + fbias) * wa * 0.4;
      } else {
        // tide/aurora/wave — familyBias shifts phase & vertical band
        var wave = Math.sin(p.x * wf + t * 0.6 * speed + p.phase + fbias) * wa;
        var wave2 = Math.cos(p.y * wf * 0.75 - t * 0.4 * speed + fbias * 0.5) * (wa * 0.55);
        tx = p.x + wave2 * 0.15 + Math.sin(fbias) * 8;
        ty = h * (0.3 + (fbias % 1) * 0.1) + (p.y / h) * h * 0.45 + wave;
      }
    } else if (family === "spiral") {
      var turns = 2.5 + params.rings * 0.3;
      var a = p.homeAngle + t * 0.15 * speed * spin;
      var r = Math.min(w, h) * (0.05 + p.homeRadius * 0.4) * (0.3 + (a % (Math.PI * 2)) / (Math.PI * 2));
      // Archimedean: r grows with angle index
      r = Math.min(w, h) * (0.08 + ((p.homeAngle + t * 0.05 * speed) % (Math.PI * 2 * turns)) / (Math.PI * 2 * turns) * 0.45);
      a = p.homeAngle * turns + t * 0.2 * speed * spin;
      tx = cx + Math.cos(a) * r;
      ty = cy + Math.sin(a) * r * 0.78;
    } else if (family === "vortex") {
      var dx = p.x - cx;
      var dy = p.y - cy;
      var dist = Math.hypot(dx, dy) || 1;
      var ang = Math.atan2(dy, dx) + 0.08 * speed * spin;
      var nr = Math.max(20, dist - 0.4 * speed);
      tx = cx + Math.cos(ang) * nr;
      ty = cy + Math.sin(ang) * nr;
    } else if (family === "grid") {
      var cell = 40 + params.rings * 8;
      tx = Math.round(p.x / cell) * cell + Math.sin(t * 0.3 * speed + p.phase) * 6;
      ty = Math.round(p.y / cell) * cell + Math.cos(t * 0.25 * speed + p.seed) * 6;
    } else if (family === "bloom" || family === "pulse") {
      var breathe = family === "pulse"
        ? 0.55 + 0.45 * Math.abs(Math.sin(t * 1.2 * speed))
        : 0.7 + 0.3 * Math.sin(t * 0.5 * speed);
      var br = Math.min(w, h) * (0.1 + p.homeRadius * 0.35) * breathe;
      var ba = p.homeAngle + t * 0.05 * speed * spin;
      tx = cx + Math.cos(ba) * br;
      ty = cy + Math.sin(ba) * br * 0.85;
    } else if (family === "rain" || family === "cascade") {
      var sway = Math.sin(t * 0.8 * speed + p.x * 0.01 + p.phase) * 12 * params.noiseAmp;
      tx = p.x + sway * 0.1;
      if (family === "cascade") {
        var step = Math.floor(p.y / 50) * 50;
        ty = step + ((t * 40 * speed + p.seed * 10) % 50);
      } else {
        ty = p.y; // flow will push down via bias
      }
    } else if (family === "figure8") {
      var u = p.homeAngle + t * 0.25 * speed * spin;
      var sc = Math.min(w, h) * (0.18 + p.homeRadius * 0.12);
      tx = cx + sc * Math.sin(u);
      ty = cy + sc * Math.sin(u) * Math.cos(u) * 0.9;
    } else if (family === "helix") {
      var hu = p.homeAngle + t * 0.3 * speed * spin;
      var hr = Math.min(w, h) * 0.18;
      tx = cx + Math.cos(hu) * hr;
      ty = (h * 0.15) + ((p.homeRadius + t * 0.05 * speed + p.seed * 0.001) % 1) * h * 0.7;
    } else if (family === "magnet") {
      var pole = p.seed > 500 ? 1 : -1;
      var px = cx + pole * w * 0.18;
      var py = cy;
      tx = px + Math.cos(p.homeAngle + t * 0.1 * speed) * 40;
      ty = py + Math.sin(p.homeAngle + t * 0.1 * speed) * 40;
    } else {
      tx = p.x;
      ty = p.y;
    }

    return { x: tx, y: ty };
  }

  function stepParticles(state, dt) {
    var particles = state.particles;
    var w = state.w;
    var h = state.h;
    var params = state.params;
    var t = state.time;
    var mouse = state.mouse;
    var burst = state.burst;
    var family = params.engine || params.family;

    // Morph strength: free field engines keep dots across the whole canvas;
    // structured engines (orbit/halo/bloom/…) pull hard toward motifs.
    var free =
      family === "flow" ||
      family === "scatter" ||
      family === "drift" ||
      family === "rain" ||
      family === "cascade";
    var calm = !!(params.calm || params.serene);
    var morph = free
      ? (calm ? 0.06 : 0.12) * params.morphBias
      : (calm ? 0.55 : 0.85) * params.morphBias;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var flow = flowVector(p.x, p.y, t, params);
      var home = attractorTarget(p, t, w, h, params);

      var ax = flow.x * (0.9 + p.depth * 0.6) * params.speed;
      var ay = flow.y * (0.9 + p.depth * 0.6) * params.speed;

      // Family-specific force bias
      if (family === "rain") {
        ay += 0.6 * params.speed;
        ax += Math.sin(t + p.phase) * 0.05;
      } else if (family === "vortex") {
        var dxv = p.x - w * 0.55;
        var dyv = p.y - h * 0.42;
        var dv = Math.hypot(dxv, dyv) || 1;
        ax += (-dyv / dv) * 0.35 * params.speed * params.spin;
        ay += (dxv / dv) * 0.35 * params.speed * params.spin;
        ax -= (dxv / dv) * 0.08;
        ay -= (dyv / dv) * 0.08;
      }

      var pull = params.pull * morph;
      ax += (home.x - p.x) * pull;
      ay += (home.y - p.y) * pull;

      if (mouse && mouse.active && params.interactive !== false) {
        var dx = p.x - mouse.sx;
        var dy = p.y - mouse.sy;
        var d2 = dx * dx + dy * dy;
        var radius = params.mouseRadius != null ? params.mouseRadius : 140;
        var mForce = params.mouseForce != null ? params.mouseForce : 1.8;
        var mMode = params.mouseMode || "repel";
        if (mMode === "none" || mMode === "off" || mForce <= 0) {
          // Cursor interaction disabled
        } else if (d2 < radius * radius && d2 > 0.1) {
          var d = Math.sqrt(d2);
          var falloff = (1 - d / radius) * mForce * (0.55 + p.depth * 0.9);
          var nx = dx / d;
          var ny = dy / d;
          if (mMode === "attract") {
            ax -= nx * falloff;
            ay -= ny * falloff;
          } else if (mMode === "swirl" || mMode === "vortex") {
            // Tangential swirl + light pull
            ax += -ny * falloff * 1.15 - nx * falloff * 0.25;
            ay += nx * falloff * 1.15 - ny * falloff * 0.25;
          } else {
            // repel (default)
            ax += nx * falloff;
            ay += ny * falloff;
          }
        }
      }

      if (burst > 0) {
        var cx = w * 0.5;
        var cy = h * 0.42;
        var bx = p.x - cx;
        var by = p.y - cy;
        var bd = Math.hypot(bx, by) || 1;
        var bf = burst * 2.2 * (0.5 + p.depth);
        ax += (bx / bd) * bf;
        ay += (by / bd) * bf;
      }

      // Higher damping on calm modes = smoother, less jittery paths
      var damp = calm ? 0.94 : 0.92;
      var stepMul = calm ? 0.42 + p.depth * 0.4 : 0.55 + p.depth * 0.55;
      p.vx = (p.vx + ax) * damp;
      p.vy = (p.vy + ay) * damp;
      p.x += p.vx * stepMul;
      p.y += p.vy * stepMul;
      // Subtle drift — smaller on calm for easy-on-the-eyes motion
      p.y += Math.sin(t * (calm ? 0.25 : 0.4) + p.phase) * (calm ? 0.012 : 0.02) * p.depth;

      if (params.wrap) {
        // Toroidal bounds: particles leaving one edge re-enter on the opposite edge.
        if (p.x < 0) p.x = w + (p.x % w);
        else if (p.x > w) p.x = p.x % w;
        if (p.y < 0) p.y = h + (p.y % h);
        else if (p.y > h) p.y = p.y % h;
      } else {
        // Default bounded behavior for consumers that prefer a soft edge bounce.
        if (p.x < 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx) * 0.85;
        } else if (p.x > w) {
          p.x = w;
          p.vx = -Math.abs(p.vx) * 0.85;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy) * 0.85;
        } else if (p.y > h) {
          p.y = h;
          p.vy = -Math.abs(p.vy) * 0.85;
        }
      }
    }

    state.time += dt;
    state.burst = Math.max(0, burst - dt * 0.55);
  }

  function cloneParticles(particles) {
    return particles.map(function (p) {
      return {
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        size: p.size,
        alpha: p.alpha,
        depth: p.depth,
        phase: p.phase,
        color: { r: p.color.r, g: p.color.g, b: p.color.b },
        seed: p.seed,
        homeAngle: p.homeAngle,
        homeRadius: p.homeRadius,
      };
    });
  }

  /**
   * Derive cursor radius / force for a mode so interaction feels right.
   * Dense/precise modes → smaller radius; calm/serene → compact (not oversized).
   */
  function suggestMouseInteraction(params, size) {
    params = params || {};
    var w = (size && size.w) || 800;
    var h = (size && size.h) || 600;
    var minDim = Math.max(200, Math.min(w, h));
    var engine = params.engine || params.family || "flow";
    var speed = params.speed != null ? params.speed : 1;
    var calm = !!(params.calm || params.serene);
    var mult = 1;

    // Engine fit — keep overall modest
    if (engine === "grid") mult = 0.62;
    else if (engine === "orbit" || engine === "halo") mult = 0.72;
    else if (engine === "constellation" || engine === "swarm") mult = 0.78;
    else if (engine === "magnet") mult = 0.76;
    else if (engine === "spiral" || engine === "figure8" || engine === "helix") mult = 0.82;
    else if (engine === "bloom" || engine === "pulse") mult = 0.85;
    else if (engine === "vortex") mult = 0.9;
    else if (engine === "wave" || engine === "ribbon" || engine === "weave") mult = 0.92;
    else if (engine === "rain" || engine === "cascade") mult = 0.88;
    else if (engine === "flow" || engine === "drift" || engine === "scatter") mult = 0.95;

    // Speed: calm/slow stay compact (not huge); fast get tighter
    if (speed <= 0.25) mult *= 0.88;
    else if (speed <= 0.4) mult *= 0.92;
    else if (speed <= 0.65) mult *= 0.96;
    else if (speed >= 1.8) mult *= 0.7;
    else if (speed >= 1.3) mult *= 0.82;

    // Calm / serene: smaller, more precise cursor (was oversized)
    if (calm) mult *= 0.68;
    if (params.serene) mult *= 0.88;

    var noise = params.noiseAmp != null ? params.noiseAmp : 1;
    if (noise < 0.5) mult *= 0.92;
    else if (noise > 1.15) mult *= 1.05;

    var base = minDim * (calm ? 0.09 : 0.12);
    var maxR = minDim * (calm ? 0.18 : 0.34);
    var minR = calm ? 40 : 52;
    var radius = Math.round(Math.max(minR, Math.min(maxR, base * mult)));

    var force = 1.75;
    if (calm) force = 1.35;
    if (speed <= 0.35) force = Math.min(force, 1.25);
    if (speed >= 1.5) force = 2.15;
    if (engine === "flow" || engine === "drift") force *= 0.92;
    if (engine === "vortex") force *= 0.95;
    if (engine === "grid") force *= 1.1;
    force = Math.round(force * 100) / 100;

    return {
      mouseRadius: radius,
      mouseForce: force,
      mouseMode: params.mouseMode || "repel",
    };
  }

  function applySuggestedMouse(state, force) {
    var suggested = suggestMouseInteraction(state.params, {
      w: state.w || 800,
      h: state.h || 600,
    });
    // Auto-apply unless user locked radius/force (autoMouse === false)
    var locked = state.overrides && state.overrides.autoMouse === false;
    if (force || !locked) {
      if (force || state.overrides.mouseRadius == null || state._mouseAuto) {
        state.params.mouseRadius = suggested.mouseRadius;
        if (state.overrides) state.overrides.mouseRadius = suggested.mouseRadius;
      }
      if (force || state.overrides.mouseForce == null || state._mouseAuto) {
        state.params.mouseForce = suggested.mouseForce;
        if (state.overrides) state.overrides.mouseForce = suggested.mouseForce;
      }
      state._mouseAuto = true;
    }
    return suggested;
  }

  function applyModeToState(state, modeId, keepOverrides) {
    var id = resolveModeId(modeId);
    var mode = CATALOG_BY_ID[id];
    state.modeId = id;
    var base = Object.assign({}, mode.params);
    var overrides = keepOverrides !== false ? state.overrides || {} : {};
    // Mode change: drop previous auto radius/force so new mode can retune
    if (state._mouseAuto) {
      delete overrides.mouseRadius;
      delete overrides.mouseForce;
    }
    state.overrides = overrides;
    state.params = applyCustomization(base, overrides);
    // Ensure engine is set for aliased families
    if (!state.params.engine && FAMILY_BY_ID[state.params.family]) {
      state.params.engine = FAMILY_BY_ID[state.params.family].engine;
    }
    applySuggestedMouse(state, true);
    retintParticles(state.particles, getActivePalette(state.params));
    return id;
  }

  function applyConfigToState(state, config) {
    if (!config) return state.params;
    state.overrides = state.overrides || {};
    var keys = [
      "speed", "speedScale", "intensity", "scale", "noiseAmp", "spin", "pull",
      "morphBias", "rings", "clusters", "waveFreq", "waveAmp",
      "palette", "colors", "background", "bg", "count", "density",
      "mouseForce", "mouseRadius", "mouseMode", "interactive", "autoMouse", "mouseSmooth",
      "trail", "rainbow", "wrap",
    ];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (config[k] != null) state.overrides[k] = config[k];
    }
    if (config.mode != null) {
      applyModeToState(state, config.mode, true);
    } else {
      var mode = CATALOG_BY_ID[state.modeId];
      state.params = applyCustomization(Object.assign({}, mode.params), state.overrides);
      if (!state.params.engine && FAMILY_BY_ID[state.params.family]) {
        state.params.engine = FAMILY_BY_ID[state.params.family].engine;
      }
      retintParticles(state.particles, getActivePalette(state.params));
    }
    // Particle count change for simulations / fields that support respawn
    if (config.count != null && state._respawn) {
      state._respawn(Number(config.count));
    }
    return state.params;

  }

  /* ------------------------------------------------------------------ */
  /* createSimulation — headless / tests                                 */
  /* ------------------------------------------------------------------ */

  function createSimulation(options) {
    options = options || {};
    var w = options.width || 400;
    var h = options.height || 300;
    var count = options.count || 48;
    var seed = options.seed != null ? options.seed : 42;
    var rng = mulberry32(seed >>> 0);
    var modeId = resolveModeId(options.mode || "flow-calm-cw-mid");
    if (!CATALOG_BY_ID[modeId]) modeId = resolveModeId(options.mode || CATALOG[0].id);
    var mode = CATALOG_BY_ID[modeId];
    var overrides = {};
    // Seed overrides from create options
    [
      "speed", "speedScale", "intensity", "scale", "noiseAmp", "spin", "pull",
      "morphBias", "rings", "clusters", "waveFreq", "waveAmp",
      "palette", "colors", "background", "bg",
      "mouseForce", "mouseRadius", "mouseMode", "interactive", "autoMouse", "mouseSmooth",
      "trail", "rainbow", "wrap",
    ].forEach(function (k) {
      if (options[k] != null) overrides[k] = options[k];
    });
    var params = applyCustomization(Object.assign({}, mode.params), overrides);
    if (!params.engine && FAMILY_BY_ID[params.family]) {
      params.engine = FAMILY_BY_ID[params.family].engine;
    }
    if (params.trail == null) params.trail = true;
    if (params.interactive == null) params.interactive = true;
    if (params.mouseMode == null) params.mouseMode = "repel";
    var particles = createParticles(w, h, count, rng, getActivePalette(params));

    var state = {
      w: w,
      h: h,
      particles: particles,
      params: params,
      overrides: overrides,
      modeId: modeId,
      time: 0,
      burst: 0,
      mouse: { x: 0, y: 0, active: false, sx: 0, sy: 0 },
      seed: seed,
      _count: count,
    };

    state._respawn = function (n) {
      state._count = n;
      var r = mulberry32(state.seed >>> 0);
      state.particles = createParticles(w, h, n, r, getActivePalette(state.params));
    };

    return {
      setMode: function (id) {
        return applyModeToState(state, id, true);
      },
      setConfig: function (config) {
        applyConfigToState(state, config);
        return state.params;
      },
      getConfig: function () {
        return {
          mode: state.modeId,
          overrides: Object.assign({}, state.overrides),
          params: Object.assign({}, state.params),
          count: state.particles.length,
          background: getActiveBg(state.params),
          palette: getActivePalette(state.params),
        };
      },
      getMode: function () {
        return state.modeId;
      },
      step: function (dt) {
        stepParticles(state, dt == null ? 1 / 60 : dt);
      },
      pulse: function () {
        state.burst = 1;
      },
      getPositions: function () {
        return state.particles.map(function (p) {
          return { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
        });
      },
      getSnapshot: function () {
        return {
          modeId: state.modeId,
          time: state.time,
          params: Object.assign({}, state.params),
          count: state.particles.length,
          bg: getActiveBg(state.params),
          palette: getActivePalette(state.params),
          particles: cloneParticles(state.particles),
        };
      },
      resetParticles: function () {
        var r = mulberry32(state.seed >>> 0);
        state.particles = createParticles(
          w,
          h,
          state._count,
          r,
          getActivePalette(state.params)
        );
        state.time = 0;
        state.burst = 0;
      },
      listModes: listModes,

    };
  }

  /* ------------------------------------------------------------------ */
  /* create — canvas field                                               */
  /* ------------------------------------------------------------------ */

  function create(canvas, options) {
    if (!canvas || typeof canvas.getContext !== "function") {
      throw new Error("Dotfield.create requires a canvas element");
    }
    options = options || {};
    var ctx = canvas.getContext("2d", { alpha: true });
    // quality: "high" | "medium" | "low" — low skips glows, caps DPR for 60fps dual-canvas pages
    var quality = options.quality === "low" || options.quality === "medium" ? options.quality : "high";
    var defaultDpr = quality === "low" ? 1.15 : quality === "medium" ? 1.5 : 2;
    var dprCap = options.dpr != null ? options.dpr : defaultDpr;
    var dpr = 1;
    if (typeof window !== "undefined" && window.devicePixelRatio) {
      dpr = Math.min(window.devicePixelRatio, dprCap);
    }

    var maxParticles =
      options.maxParticles != null
        ? options.maxParticles
        : quality === "low"
          ? 2200
          : quality === "medium"
            ? 3600
            : 5200;
    var minParticles =
      options.minParticles != null
        ? options.minParticles
        : quality === "low"
          ? 600
          : quality === "medium"
            ? 900
            : 1200;
    var areaDivisor =
      options.areaDivisor != null
        ? options.areaDivisor
        : quality === "low"
          ? 520
          : quality === "medium"
            ? 380
            : 280;
    // fillParent: true = window/parent full-bleed; false = size to canvas client box / options
    var fillParent = options.fillParent === true || (options.fillParent !== false && !options.width);
    if (options.fillParent === false) fillParent = false;
    var interactive = options.interactive !== false;
    var seed = options.seed != null ? options.seed : Math.floor(Math.random() * 1e9);
    var fixedCount = options.count != null ? Number(options.count) : null;
    var enableGlow = options.glow != null ? !!options.glow : quality !== "low";
    var glowStride = options.glowStride != null ? options.glowStride : quality === "medium" ? 28 : 18;
    var adaptiveQuality = options.adaptiveQuality !== false;
    var autoPause = options.autoPause !== false;

    var modeId = resolveModeId(options.mode || "flow-calm-cw-mid");
    if (!CATALOG_BY_ID[modeId]) modeId = resolveModeId(options.mode || CATALOG[0].id);
    var mode = CATALOG_BY_ID[modeId];
    var overrides = {};
    [
      "speed", "speedScale", "intensity", "scale", "noiseAmp", "spin", "pull",
      "morphBias", "rings", "clusters", "waveFreq", "waveAmp",
      "palette", "colors", "background", "bg",
      "mouseForce", "mouseRadius", "mouseMode", "interactive", "autoMouse", "mouseSmooth",
      "trail", "rainbow", "wrap",
    ].forEach(function (k) {
      if (options[k] != null) overrides[k] = options[k];
    });
    // Top-level create flag also seeds params (stepParticles reads params.interactive)
    if (options.interactive != null) overrides.interactive = !!options.interactive;
    var params = applyCustomization(Object.assign({}, mode.params), overrides);
    if (!params.engine && FAMILY_BY_ID[params.family]) {
      params.engine = FAMILY_BY_ID[params.family].engine;
    }
    // Defaults for cursor interaction + trail (stain / motion smear)
    if (params.mouseMode == null) params.mouseMode = "repel";
    if (params.interactive == null) params.interactive = interactive;
    if (params.mouseSmooth == null) params.mouseSmooth = 0.12;
    if (params.trail == null) params.trail = options.trail !== false;
    // Mode-suited radius/force (overridden if create options set them)
    var suggested0 = suggestMouseInteraction(params, {
      w: options.width || 800,
      h: options.height || 600,
    });
    if (params.mouseForce == null) params.mouseForce = suggested0.mouseForce;
    if (params.mouseRadius == null) params.mouseRadius = suggested0.mouseRadius;

    var reducedMotion = false;
    if (typeof window !== "undefined" && window.matchMedia) {
      try {
        reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      } catch (e) {}
    }

    var state = {
      w: 0,
      h: 0,
      particles: [],
      params: params,
      overrides: overrides,
      modeId: modeId,
      time: 0,
      burst: 0,
      mouse: { x: 0, y: 0, active: false, sx: 0, sy: 0 },
      seed: seed,
    };

    var running = false;
    var paused = !!options.paused;
    var autoPaused = false;
    var visibilityPaused = false;
    var intersectionPaused = false;
    var raf = null;
    var prev = 0;
    var fps = 60;
    var frames = 0;
    var lastFps = 0;
    var renderStride = 1;
    var listeners = [];

    function setAutoPaused(value, reason) {
      if (reason === "visibility") visibilityPaused = !!value;
      if (reason === "intersection") intersectionPaused = !!value;
      autoPaused = visibilityPaused || intersectionPaused;
    }

    function updateAdaptiveQuality() {
      if (!adaptiveQuality || quality === "low") return;
      if (fps > 0 && fps < 38) renderStride = Math.min(3, renderStride + 1);
      else if (fps > 54) renderStride = Math.max(1, renderStride - 1);
    }

    function bgColor() {
      return getActiveBg(state.params);
    }

    function targetParticleCount() {
      if (fixedCount != null) return fixedCount;
      if (state.overrides && state.overrides.count != null) return Number(state.overrides.count);
      var area = state.w * state.h;
      var div = areaDivisor;
      if (state.overrides && state.overrides.density != null) {
        // density 0.5 → fewer, 2 → more
        div = areaDivisor / Math.max(0.15, Number(state.overrides.density));
      }
      return Math.min(maxParticles, Math.max(minParticles, Math.floor(area / div)));
    }

    function resize() {
      var w, h;
      if (options.width && options.height) {
        w = options.width;
        h = options.height;
      } else if (fillParent) {
        if (typeof window !== "undefined") {
          w = window.innerWidth;
          h = window.innerHeight;
        } else {
          w = 800;
          h = 600;
        }
      } else if (canvas.parentElement) {
        var rect = canvas.parentElement.getBoundingClientRect();
        w = rect.width || canvas.clientWidth || 400;
        h = rect.height || canvas.clientHeight || 300;
      } else {
        w = canvas.clientWidth || 400;
        h = canvas.clientHeight || 300;
      }
      state.w = Math.max(1, Math.floor(w));
      state.h = Math.max(1, Math.floor(h));
      dpr = typeof window !== "undefined" && window.devicePixelRatio
        ? Math.min(window.devicePixelRatio, dprCap)
        : 1;
      canvas.width = Math.floor(state.w * dpr);
      canvas.height = Math.floor(state.h * dpr);
      canvas.style.width = state.w + "px";
      canvas.style.height = state.h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var target = targetParticleCount();
      if (Math.abs(target - state.particles.length) > 200 || state.particles.length === 0) {
        var rng = mulberry32((state.seed + target) >>> 0);
        state.particles = createParticles(
          state.w,
          state.h,
          target,
          rng,
          getActivePalette(state.params)
        );
      }
      // Canvas size changed — retune cursor radius for the mode
      if (state._mouseAuto !== false) {
        applySuggestedMouse(state, !!state._mouseAuto);
      }
    }

    state._respawn = function (n) {
      fixedCount = n;
      var rng = mulberry32((state.seed + n) >>> 0);
      state.particles = createParticles(
        state.w,
        state.h,
        n,
        rng,
        getActivePalette(state.params)
      );
    };

    function pointerToLocal(e) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = state.w / (rect.width || 1);
      var scaleY = state.h / (rect.height || 1);
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function isInteractive() {
      // Runtime toggle via setConfig({ interactive }) + params flag
      return interactive && state.params.interactive !== false;
    }

    function onPointer(e) {
      if (!isInteractive()) return;
      var pt = pointerToLocal(e);
      state.mouse.x = pt.x;
      state.mouse.y = pt.y;
      state.mouse.active = true;
    }
    function onPointerLeave() {
      state.mouse.active = false;
    }

    function bind() {
      if (typeof window === "undefined") return;
      var onResize = function () { resize(); };
      window.addEventListener("resize", onResize);
      listeners.push(function () { window.removeEventListener("resize", onResize); });
      if (autoPause) {
        if (typeof document !== "undefined" && document.addEventListener) {
          var onVisibility = function () {
            setAutoPaused(document.visibilityState === "hidden", "visibility");
          };
          document.addEventListener("visibilitychange", onVisibility);
          setAutoPaused(document.visibilityState === "hidden", "visibility");
          listeners.push(function () { document.removeEventListener("visibilitychange", onVisibility); });
        }
        if (typeof window.IntersectionObserver === "function") {
          var observer = new window.IntersectionObserver(function (entries) {
            if (entries && entries.length) setAutoPaused(!entries[0].isIntersecting, "intersection");
          }, { threshold: 0 });
          observer.observe(canvas);
          listeners.push(function () { observer.disconnect(); });
        }
      }
      // Always attach listeners so setConfig({ interactive: true/false }) works at runtime.
      // Full-bleed fields often sit under UI with pointer-events:none on the canvas —
      // track on window. Embedded previews use canvas-local events.
      var useWindow = !!fillParent;
      if (useWindow) {
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("pointerdown", onPointer, { passive: true });
        listeners.push(function () {
          window.removeEventListener("pointermove", onPointer);
          window.removeEventListener("pointerdown", onPointer);
        });
      } else {
        var target = canvas;
        target.style.touchAction = "none";
        target.addEventListener("pointermove", onPointer, { passive: true });
        target.addEventListener("pointerdown", onPointer, { passive: true });
        target.addEventListener("pointerenter", onPointer, { passive: true });
        target.addEventListener("pointerleave", onPointerLeave);
        window.addEventListener("pointerup", onPointerLeave, { passive: true });
        listeners.push(function () {
          target.removeEventListener("pointermove", onPointer);
          target.removeEventListener("pointerdown", onPointer);
          target.removeEventListener("pointerenter", onPointer);
          target.removeEventListener("pointerleave", onPointerLeave);
          window.removeEventListener("pointerup", onPointerLeave);
        });
      }
    }

    function draw() {
      var bg = bgColor();
      ctx.globalCompositeOperation = "source-over";
      // Trail/stain: translucent clear leaves soft paths. trail:false = clean solid wipe.
      var useTrail = state.params.trail !== false;
      if (useTrail) {
        var fade = quality === "low" ? 0.26 : 0.2;
        ctx.fillStyle = "rgba(" + bg.r + "," + bg.g + "," + bg.b + "," + fade + ")";
      } else {
        // Solid wipe — avoid partial alpha stacking which sparkles on some GPUs
        ctx.fillStyle = "rgb(" + bg.r + "," + bg.g + "," + bg.b + ")";
      }
      ctx.fillRect(0, 0, state.w, state.h);

      var particles = state.particles;
      var t = state.time;
      var rainbow =
        state.params.rainbow ||
        state.params.palette === "rainbow" ||
        state.params._paletteResolved === "rainbow";
      // Stable alpha when trail is off (breathing + solid clear = flicker)
      var breatheAmp = useTrail ? 0.1 : 0.03;
      for (var i = 0; i < particles.length; i += renderStride) {
        var p = particles[i];
        // Animated rainbow: hues cycle continuously over time
        if (rainbow) {
          var base = p.hue != null ? p.hue : i / Math.max(1, particles.length);
          var rc = rainbowColorAt((base + t * 0.08) % 1);
          p.color.r = rc.r;
          p.color.g = rc.g;
          p.color.b = rc.b;
        }
        var c = p.color;
        var breathe = 1 - breatheAmp + breatheAmp * Math.sin(t * 0.55 + p.phase);
        var a = Math.min(1, Math.max(0.12, p.alpha * breathe));
        var s = p.size;
        // Snap draw coords when not trailing — kills subpixel shimmer
        var dx = useTrail ? p.x : Math.round(p.x * 2) / 2;
        var dy = useTrail ? p.y : Math.round(p.y * 2) / 2;
        ctx.fillStyle = "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
        // Always circles — square fillRect at subpixels looked glitchy
        ctx.beginPath();
        ctx.arc(dx, dy, s, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enableGlow) {
        ctx.globalCompositeOperation = "lighter";
        for (var i = 0; i < particles.length; i += glowStride) {
          var p = particles[i];
          if (p.depth < 0.65) continue;
          var c = p.color;
          var glow = p.size * 2.6;
          var grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
          grd.addColorStop(0, "rgba(" + c.r + "," + c.g + "," + c.b + "," + 0.06 * p.depth + ")");
          grd.addColorStop(1, "rgba(" + c.r + "," + c.g + "," + c.b + ",0)");
          ctx.fillStyle = grd;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      }
    }

    function tick(now) {
      if (!running) return;
      if (!prev) prev = now;
      var dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (!paused && !autoPaused && !reducedMotion) {
        // mouseSmooth: 0 = snap, ~0.12 default ease, 1 = follow instantly
        var smooth = state.params.mouseSmooth;
        if (smooth == null || isNaN(smooth)) smooth = 0.12;
        smooth = Math.max(0, Math.min(1, Number(smooth)));
        if (smooth >= 1) {
          state.mouse.sx = state.mouse.x;
          state.mouse.sy = state.mouse.y;
        } else if (smooth > 0) {
          state.mouse.sx += (state.mouse.x - state.mouse.sx) * smooth;
          state.mouse.sy += (state.mouse.y - state.mouse.sy) * smooth;
        }
        stepParticles(state, dt);
      }
      draw();

      frames++;
      if (!lastFps) lastFps = now;
      if (now - lastFps > 500) {
        fps = Math.round((frames * 1000) / (now - lastFps));
        frames = 0;
        lastFps = now;
        updateAdaptiveQuality();
      }

      raf = (typeof requestAnimationFrame === "function")
        ? requestAnimationFrame(tick)
        : setTimeout(function () { tick(Date.now()); }, 16);
    }

    // Init
    resize();
    // solid first paint
    var bg0 = bgColor();
    ctx.fillStyle = "rgb(" + bg0.r + "," + bg0.g + "," + bg0.b + ")";
    ctx.fillRect(0, 0, state.w, state.h);
    bind();

    var api = {
      start: function () {
        if (running) return api;
        running = true;
        prev = 0;
        if (typeof requestAnimationFrame === "function") {
          raf = requestAnimationFrame(tick);
        } else {
          raf = setTimeout(function () { tick(Date.now()); }, 16);
        }
        return api;
      },
      stop: function () {
        running = false;
        if (raf != null) {
          if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(raf);
          else clearTimeout(raf);
          raf = null;
        }
        return api;
      },
      destroy: function () {
        api.stop();
        for (var i = 0; i < listeners.length; i++) listeners[i]();
        listeners = [];
        state.particles = [];
        return api;
      },
      setMode: function (id) {
        return applyModeToState(state, id, true);
      },
      /** Recompute cursor radius/force for current mode + canvas size */
      retuneMouse: function () {
        return applySuggestedMouse(state, true);
      },
      getMouseSettings: function () {
        return {
          mouseRadius: state.params.mouseRadius,
          mouseForce: state.params.mouseForce,
          mouseMode: state.params.mouseMode || "repel",
          interactive: interactive && state.params.interactive !== false,
          autoMouse: state._mouseAuto !== false && state.params.autoMouse !== false,
          mouseSmooth: state.params.mouseSmooth != null ? state.params.mouseSmooth : 0.12,
        };
      },
      setConfig: function (config) {
        // Manual radius/force locks auto-tune until next setMode
        if (config && (config.mouseRadius != null || config.mouseForce != null)) {
          state._mouseAuto = false;
          if (state.overrides) state.overrides.autoMouse = false;
        }
        if (config && config.autoMouse === true) {
          state._mouseAuto = true;
          if (state.overrides) delete state.overrides.autoMouse;
        }
        if (config && config.autoMouse === false) {
          state._mouseAuto = false;
          if (state.overrides) state.overrides.autoMouse = false;
        }
        applyConfigToState(state, config);
        if (config && (config.count != null || config.density != null)) {
          resize();
        }
        if (config && config.glow != null) {
          enableGlow = !!config.glow;
        }
        if (config && config.interactive != null) {
          interactive = !!config.interactive;
          if (state.params) state.params.interactive = interactive;
          if (!interactive) state.mouse.active = false;
        }
        if (config && config.autoMouse === true) {
          applySuggestedMouse(state, true);
        }
        return api;
      },
      getConfig: function () {
        return {
          mode: state.modeId,
          overrides: Object.assign({}, state.overrides),
          params: Object.assign({}, state.params),
          count: state.particles.length,
          background: getActiveBg(state.params),
          palette: getActivePalette(state.params),
        };
      },
      getMode: function () {
        return state.modeId;
      },
      getModeInfo: function () {
        return getMode(state.modeId);
      },
      listModes: listModes,
      pulse: function () {
        state.burst = 1;
        return api;
      },
      pause: function () {
        paused = true;
        return api;
      },
      resume: function () {
        paused = false;
        return api;
      },
      togglePause: function () {
        paused = !paused;
        return paused;
      },
      isPaused: function () {
        return paused;
      },
      isAutoPaused: function () {
        return autoPaused;
      },
      isRunning: function () {
        return running;
      },
      resize: resize,
      getParticleCount: function () {
        return state.particles.length;
      },
      getFps: function () {
        return fps;
      },
      getPositions: function () {
        return state.particles.map(function (p) {
          return { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
        });
      },

      /** Advance one simulation step (also used by tests on canvas instances) */
      step: function (dt) {
        stepParticles(state, dt == null ? 1 / 60 : dt);
        return api;
      },
      canvas: canvas,
    };


    if (options.autoStart !== false) {
      api.start();
    }
    return api;
  }

  return {
    version: VERSION,
    create: create,
    createSimulation: createSimulation,
    listModes: listModes,
    listCalmModes: listCalmModes,
    getMode: getMode,
    isCalmMode: isCalmModeIdPublic,
    suggestMouseInteraction: suggestMouseInteraction,
    families: FAMILIES.map(function (f) {
      return {
        id: f.id,
        label: f.label,
        description: f.desc,
        engine: f.engine,
        calm: !!f.calm,
      };
    }),
    palettes: Object.keys(PALETTES).concat(["rainbow"]),
    backgrounds: Object.keys(BG),
    // exposed for advanced consumers / tests
    _catalogLength: CATALOG.length,
    _resolveModeId: resolveModeId,
  };
});
