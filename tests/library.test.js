/**
 * Dotfield library tests — exercise shipped lib/dotfield.js
 * Run: node tests/library.test.js
 */
"use strict";

var path = require("path");
var assert = require("assert");

var libPath = path.join(__dirname, "..", "lib", "dotfield.js");
var Dotfield = require(libPath);

var passed = 0;
var failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log("  PASS  " + name);
  } catch (e) {
    failed++;
    console.log("  FAIL  " + name);
    console.log("        " + (e && e.stack ? e.stack : e));
  }
}

console.log("Dotfield library tests");
console.log("library: " + libPath);
console.log("version: " + Dotfield.version);

test("exports create, createSimulation, listModes, getMode, setConfig path", function () {
  assert.strictEqual(typeof Dotfield.create, "function");
  assert.strictEqual(typeof Dotfield.createSimulation, "function");
  assert.strictEqual(typeof Dotfield.listModes, "function");
  assert.strictEqual(typeof Dotfield.getMode, "function");
});

test("catalog has ≥ 1000 modes", function () {
  var modes = Dotfield.listModes();
  assert.ok(Array.isArray(modes), "listModes returns array");
  assert.ok(modes.length >= 1000, "expected ≥1000 modes, got " + modes.length);
  console.log("        catalog size: " + modes.length);
});

test("each catalog entry has stable unique id and non-empty label", function () {
  var modes = Dotfield.listModes();
  var seen = Object.create(null);
  // Sample check all (catalog is large but still fine in Node)
  for (var i = 0; i < modes.length; i++) {
    var m = modes[i];
    assert.ok(m.id && typeof m.id === "string", "missing id at " + i);
    assert.ok(m.label && typeof m.label === "string", "missing label: " + m.id);
    assert.ok(!seen[m.id], "duplicate id: " + m.id);
    seen[m.id] = true;
  }
  // Spot-check getMode on samples
  for (var j = 0; j < 50; j++) {
    var idx = Math.floor((j / 50) * modes.length);
    var full = Dotfield.getMode(modes[idx].id);
    assert.ok(full, "getMode failed for " + modes[idx].id);
    assert.strictEqual(full.id, modes[idx].id);
    assert.ok(full.params && typeof full.params.family === "string");
  }
});

test("sampled modes produce distinct motion (≥10 families)", function () {
  var modes = Dotfield.listModes();
  var byFamily = Object.create(null);
  for (var i = 0; i < modes.length; i++) {
    if (!byFamily[modes[i].family]) byFamily[modes[i].family] = modes[i];
  }
  var samples = Object.keys(byFamily).map(function (f) {
    return byFamily[f];
  });
  assert.ok(samples.length >= 10, "need ≥10 family samples, got " + samples.length);

  function runMode(modeId) {
    var sim = Dotfield.createSimulation({
      width: 400,
      height: 300,
      count: 40,
      seed: 12345,
      mode: modeId,
    });
    for (var t = 0; t < 45; t++) sim.step(1 / 60);
    return sim.getPositions();
  }

  var baseline = runMode(samples[0].id);
  var diffs = 0;
  for (var s = 1; s < samples.length; s++) {
    var pos = runMode(samples[s].id);
    var sum = 0;
    for (var p = 0; p < baseline.length; p++) {
      sum += Math.hypot(baseline[p].x - pos[p].x, baseline[p].y - pos[p].y);
    }
    if (sum > 1.0) diffs++;
    console.log(
      "        vs " + samples[0].id + " → " + samples[s].id + "  Σ|Δpos|=" + sum.toFixed(2)
    );
    assert.ok(sum > 1.0, "mode " + samples[s].id + " too similar (sum=" + sum + ")");
  }
  console.log("        distinct-motion family checks: " + diffs + "/" + (samples.length - 1));
});

test("customization options change motion and config snapshot", function () {
  var modeId = "orbit-steady-cw-mid";

  var base = Dotfield.createSimulation({
    width: 300,
    height: 200,
    count: 36,
    seed: 9,
    mode: modeId,
  });
  var fast = Dotfield.createSimulation({
    width: 300,
    height: 200,
    count: 36,
    seed: 9,
    mode: modeId,
    speed: 3.5,
  });
  for (var i = 0; i < 40; i++) {
    base.step(1 / 60);
    fast.step(1 / 60);
  }
  var pb = base.getPositions();
  var pf = fast.getPositions();
  var motionDiff = 0;
  for (var k = 0; k < pb.length; k++) {
    motionDiff += Math.hypot(pb[k].x - pf[k].x, pb[k].y - pf[k].y);
  }
  console.log("        speed customization Σ|Δpos|=" + motionDiff.toFixed(2));
  assert.ok(motionDiff > 5, "speed override should change motion, got " + motionDiff);

  // palette / background / count via setConfig
  var sim = Dotfield.createSimulation({
    width: 200,
    height: 200,
    count: 20,
    seed: 3,
    mode: modeId,
  });
  var before = sim.getSnapshot();
  sim.setConfig({
    palette: "ocean",
    background: "night",
    count: 12,
    intensity: 2,
  });
  var after = sim.getSnapshot();
  assert.strictEqual(after.count, 12, "count override");
  assert.ok(after.bg.r !== before.bg.r || after.bg.g !== before.bg.g, "bg should change");
  assert.ok(after.palette && after.palette.length > 0);
  // ocean first color should differ from terracotta default
  assert.ok(
    after.palette[0].r !== before.palette[0].r ||
      after.palette[0].b !== before.palette[0].b,
    "palette should change"
  );
  assert.ok(after.params.noiseAmp !== before.params.noiseAmp, "intensity affects noiseAmp");
  console.log(
    "        config: count " +
      before.count +
      "→" +
      after.count +
      " bg " +
      JSON.stringify(after.bg) +
      " noiseAmp " +
      before.params.noiseAmp +
      "→" +
      after.params.noiseAmp
  );
});

test("wrap option is retained for looping particle fields", function () {
  var sim = Dotfield.createSimulation({
    width: 120,
    height: 80,
    count: 24,
    seed: 11,
    mode: "drift-calm-cw-mid",
    wrap: true,
  });
  assert.strictEqual(sim.getSnapshot().params.wrap, true);
  for (var i = 0; i < 240; i++) sim.step(1 / 30);
  sim.getPositions().forEach(function (p) {
    assert.ok(p.x >= 0 && p.x <= 120, "wrapped x remains in bounds");
    assert.ok(p.y >= 0 && p.y <= 80, "wrapped y remains in bounds");
  });
});

test("wrap inset keeps particles out of the visible seam lane", function () {
  var inset = 12;
  var sim = Dotfield.createSimulation({
    width: 120,
    height: 80,
    count: 64,
    seed: 8,
    mode: "float-calm-cw-mid",
    wrap: true,
    wrapInset: inset,
    interactive: false,
  });
  for (var step = 0; step < 240; step++) {
    sim.step(1 / 60);
    sim.getPositions().forEach(function (p) {
      assert.ok(p.x >= inset && p.x <= 120 - inset, "x entered the seam lane: " + p.x);
      assert.ok(p.y >= inset && p.y <= 80 - inset, "y entered the seam lane: " + p.y);
    });
  }
});

test("deterministic same seed", function () {
  var id = Dotfield.listModes()[20].id;
  function once() {
    var sim = Dotfield.createSimulation({
      width: 200,
      height: 200,
      count: 16,
      seed: 7,
      mode: id,
    });
    for (var i = 0; i < 20; i++) sim.step(1 / 60);
    return sim.getPositions();
  }
  var a = once();
  var b = once();
  for (var i = 0; i < a.length; i++) {
    assert.ok(Math.abs(a[i].x - b[i].x) < 1e-9);
    assert.ok(Math.abs(a[i].y - b[i].y) < 1e-9);
  }
});

test("browser-safe script load via vm", function () {
  var fs = require("fs");
  var vm = require("vm");
  var src = fs.readFileSync(libPath, "utf8");
  assert.ok(src.indexOf("root.Dotfield") !== -1 || src.indexOf("globalThis") !== -1);
  var sandbox = {
    console: console,
    Math: Math,
    Date: Date,
    Object: Object,
    Array: Array,
    Uint8Array: Uint8Array,
    parseInt: parseInt,
    isNaN: isNaN,
    performance: { now: function () { return Date.now(); } },
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: "dotfield.js" });
  assert.ok(sandbox.Dotfield);
  assert.ok(sandbox.Dotfield.listModes().length >= 1000);
  console.log("        vm modes=" + sandbox.Dotfield.listModes().length);
});

console.log("");
console.log("Results: " + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
process.exit(0);
