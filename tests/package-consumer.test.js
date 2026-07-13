/**
 * Package-as-dependency: install via file: and require('dotfield').
 * Run: node tests/package-consumer.test.js
 */
"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");
var { execSync } = require("child_process");

var root = path.join(__dirname, "..");
var consumerDir = path.join(root, "examples", "package-consumer");
var scratch =
  process.env.SCRATCH ||
  path.join(
    process.env.LOCALAPPDATA || "/tmp",
    "Temp",
    "grok-goal-8ebd2e4b8ee6",
    "implementer"
  );

var logLines = [];
function log(msg) {
  logLines.push(msg);
  console.log(msg);
}

log("Package consumer tests");
log("consumer: " + consumerDir);

// Ensure package.json is installable
var pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert.ok(pkg.main, "package.main");
assert.ok(pkg.exports, "package.exports");
assert.strictEqual(pkg.types, "index.d.ts", "package.types points at declarations");
assert.ok(fs.existsSync(path.join(root, pkg.types)), "type declarations are shipped");
log("package name=" + pkg.name + " main=" + pkg.main + " version=" + pkg.version);

// Install dependency into consumer
log("npm install in consumer…");
execSync("npm install", { cwd: consumerDir, stdio: "pipe", encoding: "utf8" });

// Resolve from consumer node_modules — not relative lib path
var resolved = require.resolve("dotfield", { paths: [consumerDir] });
log("resolved: " + resolved);
assert.ok(
  resolved.indexOf("node_modules") !== -1 || resolved.replace(/\\/g, "/").indexOf("/lib/dotfield.js") !== -1,
  "should resolve package entry"
);

// Run consumer entry
var result = require(path.join(consumerDir, "index.js"));
log(
  "consumer result: modes=" +
    result.modeCount +
    " version=" +
    result.version +
    " mode=" +
    result.mode +
    " positions=" +
    result.positionCount
);

assert.ok(result.modeCount >= 1000, "modeCount ≥ 1000, got " + result.modeCount);
assert.ok(result.positionCount > 0, "stepped simulation returned positions");
assert.ok(result.sample && typeof result.sample.x === "number");
assert.ok(result.bg && typeof result.bg.r === "number");
assert.strictEqual(typeof result.Dotfield.createSimulation, "function");

// README must describe install path
var readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
assert.ok(
  /npm install/i.test(readme) && (/require\(['"]dotfield['"]\)/.test(readme) || /from ['"]dotfield['"]/.test(readme)),
  "README must document npm install + require/import"
);
log("README documents package install");

log("PACKAGE_CONSUMER_OK");

fs.mkdirSync(scratch, { recursive: true });
fs.writeFileSync(path.join(scratch, "package-consumer.log"), logLines.join("\n") + "\n");
log("wrote " + path.join(scratch, "package-consumer.log"));
