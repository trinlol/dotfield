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

  function wrapPosition(value, size, inset) {
    inset = Number(inset);
    if (!isFinite(inset)) inset = 0;
    inset = Math.max(0, Math.min(size * 0.5, inset));

    // Treat inset as an off-screen gutter. Particles leave the visible canvas
    // before wrapping into the opposite gutter, so the wrap point cannot
    // inject slow or tangential particles into a visible border lane.
    var min = -inset;
    var max = size + inset;
    var span = max - min;
    if (value < min) {
      var below = (min - value) % span;
      return below === 0 ? max : max - below;
    }
    if (value > max) {
      var above = (value - max) % span;
      return above === 0 ? min : min + above;
    }
    return value;
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
      // Keep the force field continuous across a visual wrap. Sampling from a
      // teleported display coordinate funnels particles back through the same
      // edge-local vectors and creates a visible border stream.
      var sampleX = params.wrap && p.flowX != null ? p.flowX : p.x;
      var sampleY = params.wrap && p.flowY != null ? p.flowY : p.y;
      var flow = flowVector(sampleX, sampleY, t, params);
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

      if (params.wrap && params.wrapInset > 0) {
        // A slow flow can become almost perfectly tangent to an edge. Lock the
        // particle's normal direction when it enters the visible seam band and
        // gently carry it through after a short grace period. The direction is
        // not recalculated while inside the band, so a changing flow cannot
        // turn the escape nudge into another border rail.
        var seamMargin = Math.max(24, params.wrapInset * 2);
        var nearSeamX = (p.x >= 0 && p.x < seamMargin) ||
          (p.x <= w && p.x > w - seamMargin);
        var nearSeamY = (p.y >= 0 && p.y < seamMargin) ||
          (p.y <= h && p.y > h - seamMargin);

        if (nearSeamX) {
          if (!p._seamXDirection) {
            p._seamXDirection = Math.abs(p.vx) > 0.0001
              ? (p.vx < 0 ? -1 : 1)
              : (ax < 0 ? -1 : 1);
            p._seamXFrames = 1;
          } else {
            p._seamXFrames = (p._seamXFrames || 0) + 1;
          }
          if (p._seamXFrames > 12) {
            ax += p._seamXDirection * Math.min(0.28, (p._seamXFrames - 12) * 0.015);
          }
        } else {
          p._seamXFrames = 0;
          p._seamXDirection = 0;
        }

        if (nearSeamY) {
          if (!p._seamYDirection) {
            p._seamYDirection = Math.abs(p.vy) > 0.0001
              ? (p.vy < 0 ? -1 : 1)
              : (ay < 0 ? -1 : 1);
            p._seamYFrames = 1;
          } else {
            p._seamYFrames = (p._seamYFrames || 0) + 1;
          }
          if (p._seamYFrames > 12) {
            ay += p._seamYDirection * Math.min(0.28, (p._seamYFrames - 12) * 0.015);
          }
        } else {
          p._seamYFrames = 0;
          p._seamYDirection = 0;
        }
      }

      // Higher damping on calm modes = smoother, less jittery paths
      var damp = calm ? 0.94 : 0.92;
      var stepMul = calm ? 0.42 + p.depth * 0.4 : 0.55 + p.depth * 0.55;
      p.vx = (p.vx + ax) * damp;
      p.vy = (p.vy + ay) * damp;
      var moveX = p.vx * stepMul;
      var moveY = p.vy * stepMul;
      p.x += moveX;
      p.y += moveY;
      // Subtle drift — smaller on calm for easy-on-the-eyes motion
      var drift = Math.sin(t * (calm ? 0.25 : 0.4) + p.phase) *
        (calm ? 0.012 : 0.02) * p.depth;
      p.y += drift;

      if (params.wrap) {
        p.flowX = sampleX + moveX;
        p.flowY = sampleY + moveY + drift;
        // Preserve velocity through the seam. The optional off-screen gutter
        // hides the wrap point while the dwell guard prevents border lanes.
        p.x = wrapPosition(p.x, w, params.wrapInset);
        p.y = wrapPosition(p.y, h, params.wrapInset);
      } else {
        p.flowX = p.x;
        p.flowY = p.y;
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
      "trail", "rainbow", "wrap", "wrapInset",
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
