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
      "trail", "rainbow",
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
