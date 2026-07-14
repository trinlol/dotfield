/**
 * Dotfield gallery site — dual fields:
 *  - backdrop: fixed mode, never changed by gallery selection
 *  - preview: cinematic stage; setMode only hits this instance
 */
(function () {
  "use strict";

  if (typeof location !== "undefined" && location.protocol === "file:") {
    var banner = document.getElementById("file-protocol-banner");
    if (banner) banner.hidden = false;
  }

  if (typeof Dotfield === "undefined") {
    console.error("Dotfield library failed to load.");
    return;
  }

  var modes = Dotfield.listModes();

  function isCalmModeId(id) {
    if (typeof Dotfield.isCalmMode === "function") return Dotfield.isCalmMode(id);
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

  function modeFamily(m) {
    if (m && m.family) return m.family;
    if (!m || !m.id) return "";
    var id = m.id;
    if (id.indexOf("serene-") === 0) {
      return id.slice(7).split("-")[0] || "";
    }
    return id.split("-")[0] || "";
  }

  /**
   * Full-page free-field engines only.
   * These keep dots distributed across the entire canvas (noise flow, not
   * ring / donut / cluster / band attractors that leave most of the page empty).
   */
  var FULLSCREEN_FAMILIES = {
    flow: 1,
    stream: 1,
    glide: 1,
    mistflow: 1,
    drift: 1,
    float: 1,
    meadow: 1,
    driftwood: 1,
    scatter: 1,
    fog: 1,
    hush: 1,
    rain: 1,
    cascade: 1,
    comet: 1,
  };

  function isFullscreenMode(m) {
    return !!FULLSCREEN_FAMILIES[modeFamily(m)];
  }

  /** Cryptographically stronger random int in [0, max) when available */
  function randInt(max) {
    if (max <= 0) return 0;
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        var buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0] % max;
      }
    } catch (e) {}
    return Math.floor(Math.random() * max);
  }

  /** Recent backdrop ids so refresh / rotate don't keep replaying the same look */
  var RECENT_KEY = "dotfield-backdrop-recent";
  var RECENT_MAX = 24;
  var BACKDROP_MODE_IDS = [
    "driftwood-calm-cw-mid",
    "glide-calm-cw-mid",
    "float-calm-cw-mid",
    "drift-calm-cw-mid",
  ];

  function loadRecentBackdrop() {
    try {
      var raw = sessionStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function pushRecentBackdrop(id) {
    if (!id) return;
    var recent = loadRecentBackdrop().filter(function (x) {
      return x !== id;
    });
    recent.push(id);
    while (recent.length > RECENT_MAX) recent.shift();
    try {
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch (e) {}
  }

  /** Build the deliberately small site-backdrop pool. */
  function buildBackdropPool(excludeId, avoidRecent) {
    var recent = avoidRecent ? loadRecentBackdrop() : [];
    var recentSet = Object.create(null);
    for (var r = 0; r < recent.length; r++) recentSet[recent[r]] = 1;

    var pool = [];
    var fallback = [];
    for (var i = 0; i < BACKDROP_MODE_IDS.length; i++) {
      var m = Dotfield.getMode(BACKDROP_MODE_IDS[i]);
      if (!m || m.id === excludeId) continue;
      fallback.push(m);
      if (!recentSet[m.id]) pool.push(m);
    }
    // If we've cycled through everything recently, clear history and use full pool
    if (!pool.length) {
      try {
        sessionStorage.removeItem(RECENT_KEY);
      } catch (e) {}
      pool = fallback;
    }
    if (!pool.length) {
      // Last resort: any free-field mode (even non-calm)
      for (var j = 0; j < modes.length; j++) {
        if (modes[j].id !== excludeId && isFullscreenMode(modes[j])) {
          pool.push(modes[j]);
        }
      }
    }
    return pool;
  }

  /** Site backdrop: true random full-page field mode */
  function pickBackdropMode(excludeId) {
    var pool = buildBackdropPool(excludeId, true);
    if (!pool.length) return "flow-calm-cw-mid";
    var pick = pool[randInt(pool.length)].id;
    pushRecentBackdrop(pick);
    return pick;
  }

  /** Gallery preview: any mode is fine (not restricted to fullscreen) */
  function pickRandomMode(excludeId, calmOnly) {
    if (!modes.length) return "flow-calm-cw-mid";
    var pool = [];
    for (var i = 0; i < modes.length; i++) {
      var m = modes[i];
      if (m.id === excludeId) continue;
      if (calmOnly) {
        if (!(m.calm || m.serene || isCalmModeId(m.id))) continue;
        if (!isFullscreenMode(m)) continue;
      }
      pool.push(m);
    }
    if (!pool.length) {
      pool = modes.filter(function (m) {
        return m.id !== excludeId;
      });
    }
    if (!pool.length) pool = modes;
    return pool[randInt(pool.length)].id;
  }

  var BACKDROP_MODE = pickBackdropMode(null);
  var DEFAULT_PREVIEW = pickRandomMode(BACKDROP_MODE, false);

  var backdropCanvas = document.getElementById("backdrop");
  var previewCanvas = document.getElementById("preview");
  if (!backdropCanvas || !previewCanvas) return;

  function themeFieldConfig(theme) {
    if (theme === "dark") {
      return { background: "night", palette: "ember" };
    }
    return { background: "cream", palette: "terracotta" };
  }

  function currentTheme() {
    if (typeof DotfieldTheme !== "undefined") return DotfieldTheme.getTheme();
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  var themeCfg = themeFieldConfig(currentTheme());

  // Backdrop: full-page free-field only — random seed so each load looks different
  var backdrop = Dotfield.create(backdropCanvas, {
    mode: BACKDROP_MODE,
    fillParent: true,
    autoStart: true,
    quality: "low",
    dpr: 1.1,
    maxParticles: 1800,
    minParticles: 900,
    areaDivisor: 480,
    wrap: true,
    glow: false,
    interactive: true,
    trail: false,
    seed: (Date.now() ^ (randInt(1e9) << 0)) >>> 0,
    background: themeCfg.background,
    palette: themeCfg.palette,
    mouseMode: "repel",
    mouseForce: 1.6,
    mouseRadius: 180,
  });

  // Preview stage — medium quality, cursor interaction, paused when off-screen
  var preview = Dotfield.create(previewCanvas, {
    mode: DEFAULT_PREVIEW,
    fillParent: false,
    autoStart: true,
    quality: "medium",
    dpr: 1.25,
    count: 1100,
    maxParticles: 2200,
    minParticles: 300,
    glow: false,
    interactive: true,
    seed: 77,
    background: themeCfg.background,
    palette: themeCfg.palette,
    mouseMode: "repel",
    mouseForce: 1.8,
    mouseRadius: 160,
    trail: false,
  });

  // Preview palette: "theme" follows site light/dark; named keys or custom hex override
  var previewPaletteChoice = "theme";
  var previewCustomHex = "#c45c3e";
  var previewBgChoice = "theme";
  var previewBgCustomHex = "#f4efe6";
  var previewSpinBase = 1;
  var previewControls = {
    speed: 1,
    intensity: 1,
    count: 1100,
    mouseForce: 1.8,
    mouseRadius: 160,
    mouseMode: "repel",
    mouseSmooth: 0.12,
    interactive: true,
    autoMouse: true,
    glow: false,
    spinFlip: false,
    trail: false,
    rainbow: false,
  };

  function hexToRgb(hex) {
    var h = String(hex || "").replace(/^#/, "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return { r: 196, g: 92, b: 62 };
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 196, g: 92, b: 62 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /** Build a soft multi-stop palette from a single brand color */
  function paletteFromHex(hex) {
    var c = hexToRgb(hex);
    function shade(f, toward) {
      return {
        r: Math.round(c.r * f + toward * (1 - f)),
        g: Math.round(c.g * f + toward * (1 - f)),
        b: Math.round(c.b * f + toward * (1 - f)),
      };
    }
    return [
      c,
      shade(0.82, 40),
      shade(0.65, 20),
      shade(1.05, 180),
      shade(0.5, 10),
    ];
  }

  function resolvePreviewPalette() {
    if (previewControls.rainbow || previewPaletteChoice === "rainbow") {
      return "rainbow";
    }
    if (previewPaletteChoice === "theme") {
      return themeFieldConfig(currentTheme()).palette;
    }
    if (previewPaletteChoice === "custom") {
      return paletteFromHex(previewCustomHex);
    }
    return previewPaletteChoice;
  }

  function resolvePreviewBackground() {
    if (previewBgChoice === "theme") {
      return themeFieldConfig(currentTheme()).background;
    }
    if (previewBgChoice === "custom") {
      return previewBgCustomHex;
    }
    return previewBgChoice;
  }

  var previewMouseUserLocked = false;

  function syncPreviewMouseFromField() {
    if (typeof preview.getMouseSettings !== "function") return;
    var ms = preview.getMouseSettings();
    if (ms.mouseRadius != null) previewControls.mouseRadius = ms.mouseRadius;
    if (ms.mouseForce != null) previewControls.mouseForce = ms.mouseForce;
    if (ms.mouseSmooth != null) previewControls.mouseSmooth = ms.mouseSmooth;
    syncControlReadouts();
  }

  function applyPreviewMotionConfig(opts) {
    opts = opts || {};
    var spin = previewControls.spinFlip ? -previewSpinBase : previewSpinBase;
    var pal = resolvePreviewPalette();
    var cfg = {
      palette: pal,
      rainbow: !!previewControls.rainbow || pal === "rainbow",
      background: resolvePreviewBackground(),
      speed: previewControls.speed,
      intensity: previewControls.intensity,
      count: previewControls.count,
      mouseMode: previewControls.mouseMode,
      mouseSmooth: previewControls.mouseSmooth,
      interactive: !!previewControls.interactive,
      glow: previewControls.glow,
      trail: previewControls.trail,
      spin: spin,
    };
    // Auto-tune radius/force unless the user locked them via sliders or Auto cursor is off
    var wantAuto = !!previewControls.autoMouse && !previewMouseUserLocked && !opts.fromSliders;
    if (wantAuto) {
      cfg.autoMouse = true;
    } else {
      cfg.mouseForce = previewControls.mouseForce;
      cfg.mouseRadius = previewControls.mouseRadius;
      cfg.autoMouse = false;
    }
    preview.setConfig(cfg);
    if (wantAuto) {
      if (typeof preview.retuneMouse === "function") preview.retuneMouse();
      syncPreviewMouseFromField();
    }
    syncSwatchUI();
    syncBgSwatchUI();
    syncControlReadouts();
    if (typeof updateEmbedSnippet === "function" && preview.getMode) {
      try {
        updateEmbedSnippet(preview.getMode());
      } catch (e) {}
    }
  }

  function applyPreviewPalette() {
    applyPreviewMotionConfig();
  }

  function applyThemeToFields(theme) {
    var cfg = themeFieldConfig(theme);
    // Site backdrop: always no trail/stain; palette/bg follow theme
    backdrop.setConfig({
      background: cfg.background,
      palette: cfg.palette,
      trail: false,
    });
    // Keep user preview overrides; only theme-linked fields re-sync
    applyPreviewMotionConfig();
  }

  window.addEventListener("dotfield:theme", function (e) {
    var t = (e && e.detail && e.detail.theme) || currentTheme();
    applyThemeToFields(t);
  });

  function resizePreview() {
    if (preview && preview.resize) preview.resize();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("resize", resizePreview);
    requestAnimationFrame(function () {
      requestAnimationFrame(resizePreview);
    });
  }

  // Pause preview when not visible — big FPS win while scrolling hero
  var previewStage = document.getElementById("preview-card");
  if (previewStage && typeof IntersectionObserver === "function") {
    var io = new IntersectionObserver(
      function (entries) {
        var vis = entries[0] && entries[0].isIntersecting;
        if (vis) {
          preview.resume();
          if (!preview.isRunning()) preview.start();
          resizePreview();
        } else {
          preview.pause();
        }
      },
      { root: null, threshold: 0.08 }
    );
    io.observe(previewStage);
  }

  // —— DOM ——
  var pulseBtn = document.getElementById("pulse-btn");
  var copyPreviewModeBtn = document.getElementById("copy-preview-mode-btn");
  var previewRandomBtn = document.getElementById("preview-random-btn");
  var previewControlsEl = document.getElementById("preview-controls");
  var previewControlsToggle = document.getElementById("preview-controls-toggle");
  var previewControlsToggleLabel = document.getElementById("preview-controls-toggle-label");
  var previewSwatches = document.getElementById("preview-swatches");
  var previewColorInput = document.getElementById("preview-color-input");
  var previewCustomColorLabel = document.querySelector(
    "#preview-color-picker .preview-custom-color"
  );
  var previewBgSwatches = document.getElementById("preview-bg-swatches");
  var previewBgInput = document.getElementById("preview-bg-input");
  var previewBgCustomLabel = document.querySelector(".preview-bg-custom");
  var previewSpeed = document.getElementById("preview-speed");
  var previewIntensity = document.getElementById("preview-intensity");
  var previewDensity = document.getElementById("preview-density");
  var previewMouseForce = document.getElementById("preview-mouse-force");
  var previewMouseRadius = document.getElementById("preview-mouse-radius");
  var previewMouseSmooth = document.getElementById("preview-mouse-smooth");
  var previewMouseMode = document.getElementById("preview-mouse-mode");
  var previewInteractive = document.getElementById("preview-interactive");
  var previewAutoMouse = document.getElementById("preview-auto-mouse");
  var previewGlow = document.getElementById("preview-glow");
  var previewSpinFlip = document.getElementById("preview-spin-flip");
  var previewTrail = document.getElementById("preview-trail");
  var previewRainbow = document.getElementById("preview-rainbow");
  var previewResetBtn = document.getElementById("preview-reset-btn");
  var modeGrid = document.getElementById("mode-grid");
  var modeSearch = document.getElementById("mode-search");
  var familyFilter = document.getElementById("family-filter");
  var familyChips = document.getElementById("family-chips");
  var visibleCount = document.getElementById("visible-count");
  var modeCountEl = document.getElementById("mode-count");
  var embedSnippet = document.getElementById("embed-snippet");
  var statParticles = document.getElementById("stat-particles");
  var statFps = document.getElementById("stat-fps");
  var statModes = document.getElementById("stat-modes");
  var libVersion = document.getElementById("lib-version");
  var toastEl = document.getElementById("toast");

  var backdropModeId = document.getElementById("backdrop-mode-id");
  var backdropModeLabel = document.getElementById("backdrop-mode-label");
  var backdropBar = document.getElementById("backdrop-mode-bar");
  var previewCardModeId = document.getElementById("preview-card-mode-id");
  var previewCardLabel = document.getElementById("preview-card-label");
  var previewCardDesc = document.getElementById("preview-card-desc");

  if (modeCountEl) modeCountEl.textContent = String(modes.length);
  if (statModes) statModes.textContent = String(modes.length);
  if (libVersion) libVersion.textContent = Dotfield.version || "1.1.0";

  // Named palette swatches (from library) + "Theme" auto + rainbow
  var SWATCH_PRESETS = [
    { id: "theme", label: "Theme", className: "preview-swatch-theme" },
    { id: "rainbow", label: "Rainbow", className: "preview-swatch-rainbow" },
    { id: "terracotta", label: "Terracotta", color: "#c45c3e" },
    { id: "ember", label: "Ember", color: "#dc5028" },
    { id: "ocean", label: "Ocean", color: "#4682a0" },
    { id: "dusk", label: "Dusk", color: "#78466e" },
    { id: "forest", label: "Forest", color: "#3c6446" },
    { id: "frost", label: "Frost", color: "#a0bed2" },
    { id: "gold", label: "Gold", color: "#c8a03c" },
    { id: "rose", label: "Rose", color: "#c86478" },
    { id: "ink", label: "Ink", color: "#46403a" },
  ];

  var BG_PRESETS = [
    { id: "theme", label: "Theme", color: null },
    { id: "cream", label: "Cream", color: "#f4efe6" },
    { id: "paper", label: "Paper", color: "#faf7f0" },
    { id: "night", label: "Night", color: "#121014" },
    { id: "slate", label: "Slate", color: "#1e2228" },
    { id: "mist", label: "Mist", color: "#e6eaee" },
    { id: "sand", label: "Sand", color: "#ece2d2" },
    { id: "ink", label: "Ink", color: "#0c0c0e" },
  ];

  function syncSwatchUI() {
    var activeId = previewControls.rainbow ? "rainbow" : previewPaletteChoice;
    if (previewSwatches) {
      var buttons = previewSwatches.querySelectorAll(".preview-swatch");
      for (var i = 0; i < buttons.length; i++) {
        var id = buttons[i].getAttribute("data-palette");
        buttons[i].classList.toggle("active", id === activeId);
      }
    }
    if (previewCustomColorLabel) {
      previewCustomColorLabel.classList.toggle(
        "active",
        !previewControls.rainbow && previewPaletteChoice === "custom"
      );
    }
    if (previewColorInput && previewPaletteChoice === "custom") {
      previewColorInput.value = previewCustomHex;
    }
  }

  function syncBgSwatchUI() {
    if (previewBgSwatches) {
      var buttons = previewBgSwatches.querySelectorAll(".preview-bg-swatch");
      for (var i = 0; i < buttons.length; i++) {
        var id = buttons[i].getAttribute("data-bg");
        buttons[i].classList.toggle("active", id === previewBgChoice);
      }
    }
    if (previewBgCustomLabel) {
      previewBgCustomLabel.classList.toggle(
        "active",
        previewBgChoice === "custom"
      );
    }
    if (previewBgInput && previewBgChoice === "custom") {
      previewBgInput.value = previewBgCustomHex;
    }
  }

  function syncControlReadouts() {
    function setText(id, v) {
      var el = document.getElementById(id);
      if (el) el.textContent = v;
    }
    setText("preview-speed-val", Number(previewControls.speed).toFixed(2));
    setText("preview-intensity-val", Number(previewControls.intensity).toFixed(2));
    setText("preview-density-val", String(previewControls.count));
    setText("preview-mouse-force-val", Number(previewControls.mouseForce).toFixed(1));
    setText("preview-mouse-radius-val", String(previewControls.mouseRadius));
    setText("preview-mouse-smooth-val", Number(previewControls.mouseSmooth).toFixed(2));
    if (previewSpeed) previewSpeed.value = String(previewControls.speed);
    if (previewIntensity) previewIntensity.value = String(previewControls.intensity);
    if (previewDensity) previewDensity.value = String(previewControls.count);
    if (previewMouseForce) previewMouseForce.value = String(previewControls.mouseForce);
    if (previewMouseRadius) previewMouseRadius.value = String(previewControls.mouseRadius);
    if (previewMouseSmooth) previewMouseSmooth.value = String(previewControls.mouseSmooth);
    if (previewGlow) previewGlow.checked = !!previewControls.glow;
    if (previewSpinFlip) previewSpinFlip.checked = !!previewControls.spinFlip;
    if (previewTrail) previewTrail.checked = !!previewControls.trail;
    if (previewRainbow) previewRainbow.checked = !!previewControls.rainbow;
    if (previewInteractive) previewInteractive.checked = !!previewControls.interactive;
    if (previewAutoMouse) previewAutoMouse.checked = !!previewControls.autoMouse;
    if (previewMouseMode) {
      var modeKey = previewControls.mouseMode === "none" ? "off" : previewControls.mouseMode;
      var btns = previewMouseMode.querySelectorAll(".preview-seg-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle(
          "active",
          btns[i].getAttribute("data-mouse-mode") === modeKey
        );
      }
    }
    if (previewControlsEl) {
      previewControlsEl.classList.toggle(
        "is-cursor-off",
        !previewControls.interactive
      );
    }
    // Update "On" label next to the master switch
    if (previewInteractive && previewInteractive.parentElement) {
      var labelSpan = previewInteractive.parentElement.querySelector("span");
      if (labelSpan) labelSpan.textContent = previewControls.interactive ? "On" : "Off";
    }
  }

  function setPreviewPalette(choice, customHex) {
    previewPaletteChoice = choice;
    if (choice === "custom" && customHex) {
      previewCustomHex = customHex;
    }
    previewControls.rainbow = choice === "rainbow";
    applyPreviewMotionConfig();
  }

  function setPreviewBackground(choice, customHex) {
    previewBgChoice = choice;
    if (choice === "custom" && customHex) {
      previewBgCustomHex = customHex;
    }
    applyPreviewMotionConfig();
  }

  if (previewSwatches) {
    SWATCH_PRESETS.forEach(function (preset) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "preview-swatch" + (preset.className ? " " + preset.className : "");
      btn.setAttribute("data-palette", preset.id);
      btn.setAttribute("title", preset.label);
      btn.setAttribute("aria-label", "Dot color: " + preset.label);
      if (preset.color) {
        btn.style.setProperty("--swatch", preset.color);
      }
      if (preset.id === "theme") {
        btn.classList.add("active");
      }
      btn.addEventListener("click", function () {
        setPreviewPalette(preset.id);
      });
      previewSwatches.appendChild(btn);
    });
  }

  if (previewBgSwatches) {
    BG_PRESETS.forEach(function (preset) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preview-bg-swatch";
      btn.setAttribute("data-bg", preset.id);
      btn.setAttribute("title", preset.label);
      btn.setAttribute("aria-label", "Background: " + preset.label);
      if (preset.color) {
        btn.style.setProperty("--swatch", preset.color);
      } else {
        btn.style.setProperty(
          "--swatch",
          currentTheme() === "dark" ? "#121014" : "#f4efe6"
        );
        btn.classList.add("preview-swatch-theme");
      }
      if (preset.id === "theme") btn.classList.add("active");
      btn.addEventListener("click", function () {
        setPreviewBackground(preset.id);
      });
      previewBgSwatches.appendChild(btn);
    });
  }

  if (previewColorInput) {
    previewColorInput.addEventListener("input", function () {
      setPreviewPalette("custom", previewColorInput.value);
    });
  }
  if (previewBgInput) {
    previewBgInput.addEventListener("input", function () {
      setPreviewBackground("custom", previewBgInput.value);
    });
  }

  function bindSlider(el, key, parseFn, locksMouse) {
    if (!el) return;
    el.addEventListener("input", function () {
      previewControls[key] = parseFn(el.value);
      if (locksMouse) previewMouseUserLocked = true;
      applyPreviewMotionConfig({ fromSliders: !!locksMouse });
    });
  }
  bindSlider(previewSpeed, "speed", parseFloat, false);
  bindSlider(previewIntensity, "intensity", parseFloat, false);
  bindSlider(previewDensity, "count", function (v) {
    return parseInt(v, 10);
  }, false);
  bindSlider(previewMouseForce, "mouseForce", parseFloat, true);
  bindSlider(previewMouseRadius, "mouseRadius", function (v) {
    return parseInt(v, 10);
  }, true);
  bindSlider(previewMouseSmooth, "mouseSmooth", parseFloat, false);

  if (previewMouseMode) {
    previewMouseMode.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-mouse-mode]");
      if (!btn) return;
      previewControls.mouseMode = btn.getAttribute("data-mouse-mode") || "repel";
      applyPreviewMotionConfig();
    });
  }
  if (previewInteractive) {
    previewInteractive.addEventListener("change", function () {
      previewControls.interactive = !!previewInteractive.checked;
      applyPreviewMotionConfig();
    });
  }
  if (previewAutoMouse) {
    previewAutoMouse.addEventListener("change", function () {
      previewControls.autoMouse = !!previewAutoMouse.checked;
      if (previewControls.autoMouse) {
        previewMouseUserLocked = false;
        if (typeof preview.retuneMouse === "function") preview.retuneMouse();
        syncPreviewMouseFromField();
      } else {
        previewMouseUserLocked = true;
      }
      applyPreviewMotionConfig();
    });
  }
  if (previewGlow) {
    previewGlow.addEventListener("change", function () {
      previewControls.glow = !!previewGlow.checked;
      applyPreviewMotionConfig();
    });
  }
  if (previewSpinFlip) {
    previewSpinFlip.addEventListener("change", function () {
      previewControls.spinFlip = !!previewSpinFlip.checked;
      applyPreviewMotionConfig();
    });
  }
  if (previewTrail) {
    previewTrail.addEventListener("change", function () {
      previewControls.trail = !!previewTrail.checked;
      applyPreviewMotionConfig();
    });
  }
  if (previewRainbow) {
    previewRainbow.addEventListener("change", function () {
      previewControls.rainbow = !!previewRainbow.checked;
      if (previewControls.rainbow) {
        previewPaletteChoice = "rainbow";
      } else if (previewPaletteChoice === "rainbow") {
        previewPaletteChoice = "theme";
      }
      applyPreviewMotionConfig();
    });
  }
  if (previewResetBtn) {
    previewResetBtn.addEventListener("click", function () {
      previewPaletteChoice = "theme";
      previewBgChoice = "theme";
      previewControls = {
        speed: 1,
        intensity: 1,
        count: 1100,
        mouseForce: 1.8,
        mouseRadius: 160,
        mouseMode: "repel",
        mouseSmooth: 0.12,
        interactive: true,
        autoMouse: true,
        glow: false,
        spinFlip: false,
        trail: false,
        rainbow: false,
      };
      previewMouseUserLocked = false;
      if (typeof preview.retuneMouse === "function") preview.retuneMouse();
      syncPreviewMouseFromField();
      applyPreviewMotionConfig();
      toast("Preview controls reset");
    });
  }

  function updateBackdropUI(modeId, statusText) {
    var info = Dotfield.getMode(modeId) || { label: modeId };
    if (backdropModeId) backdropModeId.textContent = modeId;
    if (backdropModeLabel) backdropModeLabel.textContent = info.label;
    if (backdropBar) backdropBar.setAttribute("data-backdrop-mode", modeId);
    var statusEl = document.getElementById("backdrop-mode-status");
    if (statusEl) statusEl.textContent = statusText || "";
  }

  function setBackdropMode(modeId, statusText) {
    var prevId = BACKDROP_MODE;
    BACKDROP_MODE = modeId;
    // setMode auto-tunes mouseRadius / mouseForce for this mode + canvas size
    backdrop.setMode(modeId);
    if (typeof backdrop.retuneMouse === "function") backdrop.retuneMouse();
    // Keep site trail off + theme colours (do not pass mouse* — preserves auto-tune)
    var cfg = themeFieldConfig(currentTheme());
    backdrop.setConfig({
      background: cfg.background,
      palette: cfg.palette,
      trail: false,
    });
    updateBackdropUI(modeId, statusText);
    // Swap Dotfield, / Living dots, when the backdrop particle mode changes
    if (prevId && modeId && prevId !== modeId && typeof window.swapHeroLeadTitle === "function") {
      window.swapHeroLeadTitle();
    }
  }

  updateBackdropUI(BACKDROP_MODE, "Next change soon…");

  /* —— Hero: lead title swap + typewriter accent —— */
  (function initHeroTitle() {
    var lead = document.getElementById("hero-title-lead");
    var el = document.getElementById("hero-rotate-word");
    var prefersReduced = false;
    try {
      prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {}

    // Lead line: Dotfield, ↔ Living dots, — only when backdrop particle mode changes
    if (lead) {
      var leads = ["Dotfield,", "Living dots,"];
      var leadIdx = 0;
      lead.textContent = leads[0];

      window.swapHeroLeadTitle = function swapLead() {
        leadIdx = (leadIdx + 1) % leads.length;
        if (prefersReduced) {
          lead.textContent = leads[leadIdx];
          return;
        }
        lead.classList.remove("is-swap-in");
        lead.classList.add("is-swap-out");
        setTimeout(function () {
          lead.textContent = leads[leadIdx];
          lead.classList.remove("is-swap-out");
          void lead.offsetWidth;
          lead.classList.add("is-swap-in");
        }, 280);
      };
    }

    if (!el) return;
    var phrases = [
      "pure motion",
      "living pointillism",
      "your canvas",
      "soft density",
    ];
    var idx = 0;
    // Reserve space with longest phrase padding via CSS; keep nbsp when empty
    el.textContent = phrases[0];
    if (prefersReduced) return;

    var typing = false;
    var TYPE_MS = 48;
    var DELETE_MS = 32;
    var HOLD_MS = 2200;
    var PAUSE_BETWEEN_MS = 400;

    function typePhrase(text, done) {
      var i = 0;
      el.textContent = "\u00a0";
      el.classList.add("is-typing");
      function step() {
        if (i <= text.length) {
          el.textContent = i === 0 ? "\u00a0" : text.slice(0, i);
          i += 1;
          setTimeout(step, TYPE_MS);
        } else {
          el.classList.remove("is-typing");
          if (done) done();
        }
      }
      step();
    }

    function deletePhrase(done) {
      var text = el.textContent || "";
      if (text === "\u00a0") text = "";
      el.classList.add("is-typing");
      function step() {
        if (text.length > 0) {
          text = text.slice(0, -1);
          el.textContent = text.length ? text : "\u00a0";
          setTimeout(step, DELETE_MS);
        } else {
          el.textContent = "\u00a0";
          el.classList.remove("is-typing");
          if (done) done();
        }
      }
      step();
    }

    function cycle() {
      if (typing) return;
      typing = true;
      deletePhrase(function () {
        setTimeout(function () {
          idx = (idx + 1) % phrases.length;
          typePhrase(phrases[idx], function () {
            typing = false;
            setTimeout(cycle, HOLD_MS);
          });
        }, PAUSE_BETWEEN_MS);
      });
    }

    setTimeout(cycle, HOLD_MS);
  })();

  /* —— Backdrop auto-rotate (pause while Current card hovered) —— */
  (function initBackdropRotate() {
    var HOLD_MS = 10000;
    var COUNTDOWN_S = 3;
    var held = false;
    var switchTimer = null;
    var countdownTimer = null;
    var countdownLeft = 0;

    function clearTimers() {
      if (switchTimer) {
        clearTimeout(switchTimer);
        switchTimer = null;
      }
      if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }

    function scheduleNext() {
      clearTimers();
      if (held) return;
      if (backdropBar) {
        backdropBar.classList.remove("is-held", "is-countdown");
      }
      updateBackdropUI(BACKDROP_MODE, "Full-page field · hover to hold");
      switchTimer = setTimeout(function () {
        if (held) return;
        var next = pickBackdropMode(BACKDROP_MODE);
        setBackdropMode(next, "Full-page field · hover to hold");
        scheduleNext();
      }, HOLD_MS);
    }

    function startCountdownThenRotate() {
      clearTimers();
      countdownLeft = COUNTDOWN_S;
      if (backdropBar) {
        backdropBar.classList.remove("is-held");
        backdropBar.classList.add("is-countdown");
      }
      updateBackdropUI(
        BACKDROP_MODE,
        "Resuming in " + countdownLeft + "s…"
      );
      countdownTimer = setInterval(function () {
        if (held) {
          clearTimers();
          return;
        }
        countdownLeft -= 1;
        if (countdownLeft <= 0) {
          clearTimers();
          if (backdropBar) backdropBar.classList.remove("is-countdown");
          var next = pickBackdropMode(BACKDROP_MODE);
          setBackdropMode(next, "Full-page field · hover to hold");
          scheduleNext();
          return;
        }
        updateBackdropUI(
          BACKDROP_MODE,
          "Resuming in " + countdownLeft + "s…"
        );
      }, 1000);
    }

    if (backdropBar) {
      backdropBar.addEventListener("mouseenter", function () {
        held = true;
        clearTimers();
        backdropBar.classList.add("is-held");
        backdropBar.classList.remove("is-countdown");
        updateBackdropUI(BACKDROP_MODE, "Held · leave to resume");
      });
      backdropBar.addEventListener("mouseleave", function () {
        held = false;
        startCountdownThenRotate();
      });
      // Touch: tap toggles hold
      backdropBar.addEventListener(
        "touchstart",
        function (e) {
          e.preventDefault();
          if (held) {
            held = false;
            startCountdownThenRotate();
          } else {
            held = true;
            clearTimers();
            backdropBar.classList.add("is-held");
            backdropBar.classList.remove("is-countdown");
            updateBackdropUI(BACKDROP_MODE, "Held · tap again to resume");
          }
        },
        { passive: false }
      );
    }

    scheduleNext();
  })();

  var families = {};
  modes.forEach(function (m) {
    families[m.family] = m.familyLabel || m.family;
  });
  var familyIds = Object.keys(families).sort();

  if (familyFilter) {
    familyIds.forEach(function (fid) {
      var opt = document.createElement("option");
      opt.value = fid;
      opt.textContent = families[fid];
      familyFilter.appendChild(opt);
    });
  }

  function setFamily(fam) {
    if (familyFilter) familyFilter.value = fam || "";
    if (familyChips) {
      var chips = familyChips.querySelectorAll(".family-chip");
      for (var i = 0; i < chips.length; i++) {
        var on = (chips[i].getAttribute("data-family") || "") === (fam || "");
        chips[i].classList.toggle("active", on);
        chips[i].setAttribute("aria-selected", on ? "true" : "false");
      }
    }
    renderGrid();
  }

  if (familyChips) {
    var allChip = document.createElement("button");
    allChip.type = "button";
    allChip.className = "family-chip active";
    allChip.setAttribute("data-family", "");
    allChip.setAttribute("role", "tab");
    allChip.setAttribute("aria-selected", "true");
    allChip.textContent = "All";
    allChip.addEventListener("click", function () {
      setFamily("");
    });
    familyChips.appendChild(allChip);

    familyIds.forEach(function (fid) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "family-chip";
      chip.setAttribute("data-family", fid);
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", "false");
      chip.textContent = families[fid];
      chip.addEventListener("click", function () {
        setFamily(fid);
      });
      familyChips.appendChild(chip);
    });
  }

  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      toastEl.hidden = true;
    }, 1800);
  }

  function paletteSnippetValue() {
    if (previewPaletteChoice === "custom") {
      return "'" + previewCustomHex + "'";
    }
    if (previewPaletteChoice === "theme") {
      return "'" + themeFieldConfig(currentTheme()).palette + "'";
    }
    return "'" + previewPaletteChoice + "'";
  }

  function backgroundSnippetValue() {
    if (previewBgChoice === "custom") {
      return "'" + previewBgCustomHex + "'";
    }
    if (previewBgChoice === "theme") {
      return "'" + themeFieldConfig(currentTheme()).background + "'";
    }
    return "'" + previewBgChoice + "'";
  }

  function updateEmbedSnippet(modeId) {
    if (!embedSnippet) return;
    var mouseLines = "";
    if (!previewControls.interactive) {
      mouseLines =
        "  interactive: false,  // no cursor interaction\n";
    } else {
      mouseLines =
        "  interactive: true,\n" +
        "  mouseMode: '" +
        previewControls.mouseMode +
        "',\n" +
        "  mouseForce: " +
        Number(previewControls.mouseForce).toFixed(1) +
        ",\n" +
        "  mouseRadius: " +
        previewControls.mouseRadius +
        ",\n" +
        "  mouseSmooth: " +
        Number(previewControls.mouseSmooth).toFixed(2) +
        ",\n" +
        "  autoMouse: " +
        !!previewControls.autoMouse +
        ",\n";
    }
    var code =
      "const Dotfield = require('dotfield');\n" +
      "// or: import Dotfield from 'dotfield';\n\n" +
      "const field = Dotfield.create(document.getElementById('dots'), {\n" +
      "  mode: '" +
      modeId +
      "',\n" +
      "  fillParent: true,\n" +
      mouseLines +
      "  palette: " +
      paletteSnippetValue() +
      ",\n" +
      "  background: " +
      backgroundSnippetValue() +
      ",\n" +
      "  speed: " +
      Number(previewControls.speed).toFixed(2) +
      ",\n" +
      "  intensity: " +
      Number(previewControls.intensity).toFixed(2) +
      ",\n" +
      "  count: " +
      previewControls.count +
      ",\n" +
      "  trail: " +
      !!previewControls.trail +
      ",\n" +
      "  rainbow: " +
      !!previewControls.rainbow +
      ",\n" +
      "});\n" +
      "// field.setMode('orbit-brisk-ccw-fine');\n" +
      "// field.setConfig({ interactive: false }); // disable cursor\n" +
      "// field.setConfig({ palette: 'ocean', speedScale: 1.4 });\n" +
      "// field.listModes();";
    embedSnippet.innerHTML = "<code></code>";
    embedSnippet.querySelector("code").textContent = code;
    if (window.DotfieldCopyCode && DotfieldCopyCode.enhanceAll) {
      DotfieldCopyCode.enhanceAll(document.getElementById("embed") || document);
    }
  }

  function setPreviewUI(modeId) {
    var info = Dotfield.getMode(modeId) || {
      label: modeId,
      familyLabel: "",
      family: "",
      description: "",
    };
    if (previewCardModeId) previewCardModeId.textContent = modeId;
    if (previewCardLabel) previewCardLabel.textContent = info.label;
    if (previewCardDesc) previewCardDesc.textContent = info.description || "";

    if (modeGrid) {
      var rows = modeGrid.querySelectorAll(".mode-row, .mode-card");
      for (var i = 0; i < rows.length; i++) {
        var on = rows[i].getAttribute("data-mode") === modeId;
        rows[i].classList.toggle("active", on);
        rows[i].setAttribute("aria-selected", on ? "true" : "false");
      }
    }
    updateEmbedSnippet(modeId);
  }

  // Collapse / expand settings only (mode selection stays available)
  function setControlsExpanded(expanded) {
    if (!previewControlsEl || !previewControlsToggle) return;
    previewControlsEl.hidden = !expanded;
    previewControlsEl.classList.toggle("is-collapsed", !expanded);
    previewControlsToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (previewControlsToggleLabel) {
      previewControlsToggleLabel.textContent = expanded ? "Hide controls" : "Show controls";
    }
    try {
      localStorage.setItem("dotfield-preview-controls", expanded ? "open" : "closed");
    } catch (e) {}
  }
  (function initControlsToggle() {
    // Always start compacted; only expand after the user clicks Show controls
    try {
      localStorage.setItem("dotfield-preview-controls", "closed");
    } catch (e) {}
    setControlsExpanded(false);
    if (previewControlsToggle) {
      previewControlsToggle.addEventListener("click", function () {
        var expanded = previewControlsToggle.getAttribute("aria-expanded") !== "true";
        setControlsExpanded(expanded);
      });
    }
  })();

  function selectMode(modeId) {
    // Auto cursor re-tunes radius/force per mode; when off, keep manual values
    if (previewControls.autoMouse) previewMouseUserLocked = false;
    preview.setMode(modeId);
    // Mode params may include a native spin; keep flip relative to +1 catalog default
    previewSpinBase = 1;
    if (previewControls.autoMouse) {
      if (typeof preview.retuneMouse === "function") preview.retuneMouse();
      syncPreviewMouseFromField();
    }
    applyPreviewMotionConfig();
    setPreviewUI(modeId);
    // Gallery never drives the site backdrop — re-sync if something drifted
    if (backdrop.getMode() !== BACKDROP_MODE) {
      setBackdropMode(BACKDROP_MODE);
    }
    resizePreview();
  }

  if (previewRandomBtn) {
    previewRandomBtn.addEventListener("click", function () {
      var next = pickRandomMode(preview.getMode(), false);
      selectMode(next);
      toast("Random: " + next);
    });
  }

  var renderTimer = null;
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderGrid, 40);
  }

  function renderGrid() {
    if (!modeGrid) return;
    var q = (modeSearch && modeSearch.value ? modeSearch.value : "").trim().toLowerCase();
    var fam = familyFilter ? familyFilter.value : "";
    var filtered = modes.filter(function (m) {
      if (fam && m.family !== fam) return false;
      if (!q) return true;
      return (
        m.id.toLowerCase().indexOf(q) !== -1 ||
        m.label.toLowerCase().indexOf(q) !== -1 ||
        (m.familyLabel && m.familyLabel.toLowerCase().indexOf(q) !== -1) ||
        (m.description && m.description.toLowerCase().indexOf(q) !== -1)
      );
    });

    // Prefer representative mid-scale modes first when unfiltered
    if (!q && !fam) {
      filtered = filtered.slice().sort(function (a, b) {
        var as = a.id.indexOf("-mid") !== -1 ? 0 : 1;
        var bs = b.id.indexOf("-mid") !== -1 ? 0 : 1;
        if (as !== bs) return as - bs;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }

    var MAX_RENDER = 180;
    var shown = filtered;
    var truncated = false;
    if (filtered.length > MAX_RENDER) {
      shown = filtered.slice(0, MAX_RENDER);
      truncated = true;
    }

    if (visibleCount) {
      visibleCount.textContent = truncated
        ? shown.length + " / " + filtered.length
        : String(filtered.length);
    }

    var active = preview.getMode();
    var frag = document.createDocumentFragment();
    shown.forEach(function (m) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mode-row" + (m.id === active ? " active" : "");
      btn.setAttribute("data-mode", m.id);
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", m.id === active ? "true" : "false");
      btn.innerHTML =
        '<span class="mode-dot"></span>' +
        "<strong></strong>" +
        '<span class="mode-id"></span>' +
        '<span class="mode-family-tag"></span>';
      btn.querySelector("strong").textContent = m.label;
      btn.querySelector(".mode-id").textContent = m.id;
      btn.querySelector(".mode-family-tag").textContent = m.familyLabel || m.family;
      btn.addEventListener("click", function () {
        selectMode(m.id);
        btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      frag.appendChild(btn);
    });
    modeGrid.innerHTML = "";
    modeGrid.appendChild(frag);
  }

  if (modeSearch) modeSearch.addEventListener("input", scheduleRender);
  if (familyFilter) familyFilter.addEventListener("change", renderGrid);

  if (pulseBtn) {
    pulseBtn.addEventListener("click", function () {
      preview.pulse();
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (e) {
        reject(e);
      }
      document.body.removeChild(ta);
    });
  }

  function copyModeId() {
    var id = preview.getMode();
    copyText(id).then(
      function () {
        toast("Copied " + id);
      },
      function () {
        toast("Copy failed");
      }
    );
  }

  if (copyPreviewModeBtn) copyPreviewModeBtn.addEventListener("click", copyModeId);

  window.addEventListener("keydown", function (e) {
    if (e.target && e.target.matches && e.target.matches("input, textarea, select, button")) return;
    if (e.key === "p" || e.key === "P") {
      preview.pulse();
    }
  });

  // Throttled stats — don't burn a rAF just for DOM text
  function updateStats() {
    if (statParticles) statParticles.textContent = backdrop.getParticleCount().toLocaleString();
    if (statFps) statFps.textContent = String(backdrop.getFps());
  }
  updateStats();
  setInterval(updateStats, 500);

  setPreviewUI(preview.getMode());
  renderGrid();
  applyPreviewMotionConfig();

  window.__dotfieldGallery = {
    BACKDROP_MODE: BACKDROP_MODE,
    backdrop: backdrop,
    preview: preview,
    selectMode: selectMode,
    setPreviewPalette: setPreviewPalette,
    setPreviewBackground: setPreviewBackground,
    getPreviewPalette: function () {
      return previewPaletteChoice;
    },
    getPreviewControls: function () {
      return Object.assign({}, previewControls);
    },
    listModes: function () {
      return modes;
    },
    getBackdropMode: function () {
      return backdrop.getMode();
    },
    getPreviewMode: function () {
      return preview.getMode();
    },
    getActiveMode: function () {
      return preview.getMode();
    },
  };
})();
