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

  var VERSION = "1.1.1";

  /* ------------------------------------------------------------------ */
  /* Simplex noise                                                       */
