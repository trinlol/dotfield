"use strict";

// Dotfield intentionally ships a single dependency-free IIFE. The source is
// kept in ordered runtime fragments so motion, catalog, simulation, and canvas
// code can be maintained independently without changing the published shape.
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var sourceDir = path.join(root, "src", "runtime");
var output = path.join(root, "lib", "dotfield.js");
var parts = [
  "bootstrap.js",
  "noise.js",
  "rng.js",
  "catalog.js",
  "colors.js",
  "physics.js",
  "simulation.js",
  "canvas.js",
  "public-api.js",
];

var source = parts.map(function (name) {
  return fs.readFileSync(path.join(sourceDir, name), "utf8")
    .replace(/^\r?\n+/, "")
    .replace(/\s+$/, "");
}).join("\n\n") + "\n";

fs.writeFileSync(output, source, "utf8");
console.log("Built " + path.relative(root, output) + " from " + parts.length + " source fragments");
