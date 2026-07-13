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

