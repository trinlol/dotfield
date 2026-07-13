/**
 * Structural checks: no Pause UI, large preview, docs page.
 * Run: node tests/ui-docs-structure.test.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");

var root = path.join(__dirname, "..");
var scratch =
  process.env.SCRATCH ||
  path.join(
    process.env.LOCALAPPDATA || "/tmp",
    "Temp",
    "grok-goal-121a2d5952ca",
    "implementer"
  );

var log = [];
function L(msg) {
  log.push(msg);
  console.log(msg);
}

var passed = 0;
var failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    L("  PASS  " + name);
  } catch (e) {
    failed++;
    L("  FAIL  " + name + " — " + (e && e.message ? e.message : e));
  }
}

L("UI + docs structure tests");

test("main index has no pause-btn", function () {
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf("pause-btn") === -1, "pause-btn must be absent");
  assert.ok(html.indexOf('href="test-site/"') === -1, "test site should not be in primary home nav");
  assert.ok(!/\bPause\b/.test(html.replace(/<!--[\s\S]*?-->/g, "")), "no Pause label in page");
  assert.ok(html.indexOf('id="preview"') !== -1);
  assert.ok(html.indexOf("docs/") !== -1 || html.indexOf("href=\"docs") !== -1, "nav link to docs");
});

test("main.js has no pause-btn wiring or Space pause", function () {
  var main = fs.readFileSync(path.join(root, "main.js"), "utf8");
  assert.ok(main.indexOf("pause-btn") === -1, "no pause-btn in main.js");
  assert.ok(main.indexOf("togglePause") === -1, "no gallery togglePause wiring");
  // Space key should not pause
  assert.ok(main.indexOf('e.key === " "') === -1 && main.indexOf("e.key === ' '") === -1, "no Space key handler");
});

test("preview CSS is large / primary", function () {
  var css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(
    html.indexOf("preview-stage") !== -1 || html.indexOf("preview-canvas-wrap") !== -1,
    "cinematic preview stage markup"
  );
  assert.ok(
    /preview-canvas-wrap[\s\S]{0,600}(min-height|height):\s*(clamp\(|min\(|\d{3}px)/i.test(css),
    "preview canvas wrap has substantial height"
  );
  assert.ok(
    !/grid-template-columns:\s*1fr\s+minmax\(\s*260px,\s*340px\s*\)/.test(css),
    "old compact 340px preview column should be gone"
  );
});

test("docs page exists with extensive sections", function () {
  var docsPath = path.join(root, "docs", "index.html");
  assert.ok(fs.existsSync(docsPath), "docs/index.html");
  var docs = fs.readFileSync(docsPath, "utf8");
  var required = [
    'id="install"',
    'id="api"',
    'id="customization"',
    'id="modes"',
    'id="examples"',
    'id="api-create"',
    'id="api-simulation"',
    'id="api-setconfig"',
    'id="api-lifecycle"',
    "Installation",
    "API reference",
    "Customization",
    "listModes",
    "setConfig",
    "createSimulation",
  ];
  required.forEach(function (needle) {
    assert.ok(docs.indexOf(needle) !== -1, "docs missing: " + needle);
  });
  // Non-trivial length
  assert.ok(docs.length > 8000, "docs should be extensive, got " + docs.length);
  assert.ok(fs.existsSync(path.join(root, "docs", "docs.css")), "docs.css");
  L("        docs length=" + docs.length);
});

test("docs linked from main nav", function () {
  var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(/href=["']docs\/?["']/.test(html) || /href=["']docs\//.test(html));
});

test("theme icons match the mode switch action", function () {
  ["styles.css", path.join("docs", "docs.css")].forEach(function (relativePath) {
    var css = fs.readFileSync(path.join(root, relativePath), "utf8");
    var light = css.match(/\[data-theme="light"\] \.theme-toggle \.theme-icon::before\s*\{([\s\S]*?)\}/);
    var dark = css.match(/\[data-theme="dark"\] \.theme-toggle \.theme-icon::before\s*\{([\s\S]*?)\}/);
    assert.ok(light && dark, relativePath + " must define both theme icons");
    assert.ok(/background:\s*transparent/.test(light[1]), relativePath + " light mode should use the moon");
    assert.ok(/inset\s+-0\.28rem/.test(light[1]), relativePath + " light mode should use a crescent");
    assert.ok(/background:\s*var\(--accent\)/.test(dark[1]), relativePath + " dark mode should use the sun");
    assert.ok(/0\s+-0\.38rem/.test(dark[1]), relativePath + " dark mode should include sun rays");
  });
});

test("docs TOC scroll spy handles nested headings", function () {
  var docs = fs.readFileSync(path.join(root, "docs", "index.html"), "utf8");
  assert.ok(docs.indexOf("getBoundingClientRect().top") !== -1, "TOC should use viewport positions");
  assert.ok(docs.indexOf("sections[i].el.offsetTop") === -1, "TOC should not compare mixed offset parents");
});

L("");
L("Results: " + passed + " passed, " + failed + " failed");

fs.mkdirSync(scratch, { recursive: true });
fs.writeFileSync(path.join(scratch, "ui-docs-structure.log"), log.join("\n") + "\n");
L("wrote " + path.join(scratch, "ui-docs-structure.log"));

if (failed > 0) process.exit(1);
process.exit(0);
