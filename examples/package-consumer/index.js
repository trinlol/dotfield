/**
 * Minimal dependency consumer — requires the installed `dotfield` package
 * (not a relative path into lib/ internals).
 */
const Dotfield = require("dotfield");

const modes = Dotfield.listModes();
const sim = Dotfield.createSimulation({
  width: 320,
  height: 240,
  count: 24,
  seed: 42,
  mode: "orbit-steady-cw-mid",
  palette: "ocean",
  speed: 1.2,
  background: "night",
});

for (let i = 0; i < 20; i++) sim.step(1 / 60);

const positions = sim.getPositions();
const snapshot = sim.getSnapshot();

module.exports = {
  Dotfield,
  modeCount: modes.length,
  version: Dotfield.version,
  mode: sim.getMode(),
  positionCount: positions.length,
  sample: positions[0],
  bg: snapshot.bg,
  paletteLen: snapshot.palette.length,
};

if (require.main === module) {
  console.log(
    JSON.stringify(
      {
        version: module.exports.version,
        modeCount: module.exports.modeCount,
        mode: module.exports.mode,
        positionCount: module.exports.positionCount,
        bg: module.exports.bg,
      },
      null,
      2
    )
  );
}
