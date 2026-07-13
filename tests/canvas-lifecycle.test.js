"use strict";

var assert = require("assert");
var Dotfield = require("../lib/dotfield.js");

function eventTarget() {
  var handlers = Object.create(null);
  return {
    addEventListener: function (name, fn) { handlers[name] = fn; },
    removeEventListener: function (name) { delete handlers[name]; },
    emit: function (name) { if (handlers[name]) handlers[name](); },
    handlers: handlers,
  };
}

var canvas = {
  style: {},
  clientWidth: 240,
  clientHeight: 160,
  parentElement: null,
  getBoundingClientRect: function () { return { left: 0, top: 0, width: 240, height: 160 }; },
  getContext: function () {
    return { setTransform: function () {}, fillRect: function () {} };
  },
};

var field = Dotfield.create(canvas, {
  autoStart: false,
  autoPause: false,
  count: 8,
});

assert.strictEqual(field.isAutoPaused(), false);
assert.strictEqual(field.isRunning(), false);
field.destroy();

var oldWindow = global.window;
var oldDocument = global.document;
var windowEvents = eventTarget();
var documentEvents = eventTarget();
var intersectionCallback = null;
var disconnected = false;
global.window = Object.assign(windowEvents, {
  devicePixelRatio: 1,
  matchMedia: function () { return { matches: false }; },
  IntersectionObserver: function (callback) {
    intersectionCallback = callback;
    this.observe = function () {};
    this.disconnect = function () { disconnected = true; };
  },
});
global.document = Object.assign(documentEvents, { visibilityState: "hidden" });

var browserField = Dotfield.create(canvas, {
  autoStart: false,
  count: 8,
});
assert.strictEqual(browserField.isAutoPaused(), true, "hidden documents pause the field");
global.document.visibilityState = "visible";
documentEvents.emit("visibilitychange");
assert.strictEqual(browserField.isAutoPaused(), false, "visible documents resume the field");
intersectionCallback([{ isIntersecting: false }]);
assert.strictEqual(browserField.isAutoPaused(), true, "offscreen canvases pause the field");
intersectionCallback([{ isIntersecting: true }]);
assert.strictEqual(browserField.isAutoPaused(), false, "onscreen canvases resume the field");
browserField.destroy();
assert.strictEqual(disconnected, true, "destroy disconnects the intersection observer");

global.window = oldWindow;
global.document = oldDocument;
console.log("CANVAS_LIFECYCLE_OK");
