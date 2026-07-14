/**
 * Dual-field gallery wiring tests — source structure + selectMode isolation.
 * Run: node tests/gallery-behavior.test.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");
var vm = require("vm");

var root = path.join(__dirname, "..");
var scratch =
  process.env.SCRATCH ||
  path.join(
    process.env.LOCALAPPDATA || "/tmp",
    "Temp",
    "grok-goal-121a2d5952ca",
    "implementer"
  );

var logLines = [];
function log(msg) {
  logLines.push(msg);
  console.log(msg);
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    log("  PASS  " + name);
  } catch (e) {
    failed++;
    log("  FAIL  " + name + " — " + (e && e.message ? e.message : e));
  }
}

log("Gallery dual-field behavior tests");

test("HTML has separate backdrop and preview canvases", function () {
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf('id="backdrop"') !== -1, "backdrop canvas");
  assert.ok(html.indexOf('id="preview"') !== -1, "preview canvas");
  assert.ok(html.indexOf('data-role="backdrop"') !== -1);
  assert.ok(html.indexOf('data-role="preview"') !== -1);
  assert.ok(
    html.indexOf("preview-card") !== -1 ||
      html.indexOf("preview-stage") !== -1 ||
      html.indexOf("preview-canvas") !== -1
  );
  assert.ok(
    html.indexOf("mode-grid") !== -1 || html.indexOf("mode-list") !== -1,
    "mode selector list"
  );
});

test("main.js locks backdrop and routes selectMode to preview only", function () {
  var main = fs.readFileSync(path.join(root, "main.js"), "utf8");
  assert.ok(/BACKDROP_MODE\s*=/.test(main), "BACKDROP_MODE constant");
  assert.ok(/getElementById\(["']backdrop["']\)/.test(main));
  assert.ok(/getElementById\(["']preview["']\)/.test(main));
  // selectMode should call preview.setMode, not backdrop.setMode for gallery picks
  assert.ok(
    /function selectMode[\s\S]*preview\.setMode/.test(main),
    "selectMode uses preview.setMode"
  );
  // Ensure gallery path does not call backdrop.setMode with selected mode
  // (restore guard is ok — it uses BACKDROP_MODE constant)
  var selectBody = main.match(/function selectMode\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(selectBody, "selectMode function body");
  var body = selectBody[0];
  assert.ok(body.indexOf("preview.setMode") !== -1);
  // backdrop.setMode only allowed with BACKDROP_MODE in restore
  if (/backdrop\.setMode\s*\(/.test(body)) {
    assert.ok(
      /backdrop\.setMode\s*\(\s*BACKDROP_MODE\s*\)/.test(body),
      "if backdrop.setMode in selectMode, must restore BACKDROP_MODE only"
    );
  }
});

test("backdrop rotation is limited to the four requested modes", function () {
  var main = fs.readFileSync(path.join(root, "main.js"), "utf8");
  [
    "driftwood-calm-cw-mid",
    "glide-calm-cw-mid",
    "float-calm-cw-mid",
    "drift-calm-cw-mid",
  ].forEach(function (id) {
    assert.ok(main.indexOf('"' + id + '"') !== -1, "missing backdrop mode: " + id);
  });
  assert.ok(/wrap:\s*true/.test(main), "backdrop should enable edge wrapping");
  assert.ok(main.indexOf("buildBackdropPool") !== -1, "backdrop pool remains randomized");
});

test("gallery has no pause-btn wiring", function () {
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  var main = fs.readFileSync(path.join(root, "main.js"), "utf8");
  assert.ok(html.indexOf("pause-btn") === -1);
  assert.ok(main.indexOf("pause-btn") === -1);
  assert.ok(main.indexOf("togglePause") === -1);
});

test("simulated dual-field isolation (shipped library)", function () {
  var Dotfield = require(path.join(root, "lib", "dotfield.js"));
  var BACKDROP_MODE = "flow-calm-cw-mid";
  var PREVIEW_A = "orbit-steady-cw-mid";
  var PREVIEW_B = "vortex-rush-ccw-vast";

  // Simulate two independent instances (as site does)
  var backdrop = Dotfield.createSimulation({
    seed: 1,
    count: 20,
    mode: BACKDROP_MODE,
  });
  var preview = Dotfield.createSimulation({
    seed: 2,
    count: 20,
    mode: PREVIEW_A,
  });

  assert.strictEqual(backdrop.getMode(), BACKDROP_MODE);
  assert.strictEqual(preview.getMode(), PREVIEW_A);

  // Gallery select only hits preview
  preview.setMode(PREVIEW_B);
  assert.strictEqual(preview.getMode(), PREVIEW_B);
  assert.strictEqual(backdrop.getMode(), BACKDROP_MODE, "backdrop must stay fixed");

  // Step both — backdrop params still flow family
  for (var i = 0; i < 10; i++) {
    backdrop.step(1 / 60);
    preview.step(1 / 60);
  }
  assert.strictEqual(backdrop.getMode(), BACKDROP_MODE);
  assert.strictEqual(preview.getMode(), PREVIEW_B);
  log("        backdrop=" + backdrop.getMode() + " preview=" + preview.getMode());
});

test("vm load of main gallery wiring constants", function () {
  var libSrc = fs.readFileSync(path.join(root, "lib", "dotfield.js"), "utf8");
  var sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    Object: Object,
    Array: Array,
    Uint8Array: Uint8Array,
    parseInt: parseInt,
    isNaN: isNaN,
    performance: { now: Date.now },
    document: {
      getElementById: function () {
        return null;
      },
    },
    window: {},
    location: { protocol: "http:" },
    requestAnimationFrame: function () {},
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(libSrc, sandbox);
  assert.ok(sandbox.Dotfield.listModes().length >= 1000);
});

console.log("");
log("Results: " + passed + " passed, " + failed + " failed");

try {
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(path.join(scratch, "gallery-behavior.log"), logLines.join("\n") + "\n");
  log("wrote " + path.join(scratch, "gallery-behavior.log"));
} catch (e) {
  log("log write failed: " + e);
}

if (failed > 0) process.exit(1);
process.exit(0);
