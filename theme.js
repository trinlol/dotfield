/**
 * Dotfield site theme.
 * Default: follow the OS/system color scheme until the user picks light or dark.
 * Shared by home + docs.
 */
(function (root) {
  "use strict";

  var STORAGE_KEY = "dotfield-theme";
  var PREF = { system: "system", light: "light", dark: "dark" };

  function systemPrefersDark() {
    try {
      return (
        typeof matchMedia === "function" &&
        matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (e) {
      return false;
    }
  }

  /** Resolved visual theme: only "light" | "dark" */
  function resolveTheme(pref) {
    if (pref === PREF.light || pref === PREF.dark) return pref;
    return systemPrefersDark() ? PREF.dark : PREF.light;
  }

  /** Stored preference: "system" | "light" | "dark" (missing → system) */
  function getPreference() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === PREF.light || stored === PREF.dark || stored === PREF.system) {
        return stored;
      }
    } catch (e) {}
    return PREF.system;
  }

  function setPreference(pref) {
    var p =
      pref === PREF.light || pref === PREF.dark || pref === PREF.system
        ? pref
        : PREF.system;
    try {
      if (p === PREF.system) {
        // No explicit choice — follow OS (and stay in sync)
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, p);
      }
    } catch (e) {}
    return p;
  }

  function applyResolved(theme) {
    var t = theme === PREF.dark ? PREF.dark : PREF.light;
    var rootEl = document.documentElement;
    rootEl.setAttribute("data-theme", t);
    rootEl.style.colorScheme = t;

    var pref = getPreference();
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var isDark = t === PREF.dark;
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
      btn.setAttribute("data-theme-pref", pref);
      btn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      var title =
        pref === PREF.system
          ? isDark
            ? "Following system (dark) — click for light"
            : "Following system (light) — click for dark"
          : isDark
            ? "Light mode"
            : "Dark mode";
      btn.setAttribute("title", title);
      var label = btn.querySelector("[data-theme-label]");
      if (label) label.textContent = isDark ? "Light" : "Dark";
    }
    return t;
  }

  function getTheme() {
    return resolveTheme(getPreference());
  }

  function emit(theme) {
    try {
      root.dispatchEvent(
        new CustomEvent("dotfield:theme", {
          detail: { theme: theme, preference: getPreference() },
        })
      );
    } catch (e) {}
  }

  /** Set explicit light/dark, or "system" to follow OS again. */
  function setTheme(themeOrPref) {
    var pref;
    if (themeOrPref === PREF.system) {
      pref = setPreference(PREF.system);
    } else if (themeOrPref === PREF.light || themeOrPref === PREF.dark) {
      pref = setPreference(themeOrPref);
    } else {
      pref = setPreference(PREF.system);
    }
    var resolved = applyResolved(resolveTheme(pref));
    emit(resolved);
    return resolved;
  }

  function toggleTheme() {
    // Explicit override opposite of what is currently shown
    var next = getTheme() === PREF.dark ? PREF.light : PREF.dark;
    return setTheme(next);
  }

  function useSystemTheme() {
    return setTheme(PREF.system);
  }

  function bindToggles() {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        if (btn.__themeBound) return;
        btn.__themeBound = true;
        btn.addEventListener("click", function () {
          toggleTheme();
        });
      })(buttons[i]);
    }
    applyResolved(getTheme());
  }

  function watchSystem() {
    if (typeof matchMedia !== "function") return;
    try {
      var mq = matchMedia("(prefers-color-scheme: dark)");
      var onChange = function () {
        // Only auto-update while preference is system (no stored light/dark)
        if (getPreference() === PREF.system) {
          var resolved = applyResolved(resolveTheme(PREF.system));
          emit(resolved);
        }
      };
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", onChange);
      } else if (typeof mq.addListener === "function") {
        mq.addListener(onChange);
      }
    } catch (e) {}
  }

  // Apply immediately (default = system → OS preference)
  if (typeof document !== "undefined" && document.documentElement) {
    applyResolved(getTheme());
  }
  watchSystem();

  var api = {
    getTheme: getTheme,
    getPreference: getPreference,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    useSystemTheme: useSystemTheme,
    bindToggles: bindToggles,
    STORAGE_KEY: STORAGE_KEY,
  };

  root.DotfieldTheme = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindToggles);
    } else {
      bindToggles();
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
