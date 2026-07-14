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
