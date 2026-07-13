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
