import Dotfield from "dotfield";
import "./style.css";

const canvas = document.querySelector("#field");
const modeButton = document.querySelector("#mode-button");
const modeReadout = document.querySelector("#mode-readout");
const particleReadout = document.querySelector("#particle-readout");

const modes = [
  { id: "flow-calm-cw-mid", label: "flow · calm" },
  { id: "orbit-steady-cw-mid", label: "orbit · steady" },
  { id: "rain-brisk-ccw", label: "rain · brisk" },
];
let modeIndex = 0;

const field = Dotfield.create(canvas, {
  mode: modes[modeIndex].id,
  // Embedded fields size to their parent; fillParent is for full-window canvases.
  fillParent: false,
  autoStart: true,
  autoPause: true,
  adaptiveQuality: true,
  quality: "medium",
  count: 1400,
  minParticles: 500,
  maxParticles: 2200,
  palette: "ocean",
  background: "ink",
  interactive: true,
  mouseMode: "repel",
  mouseForce: 1.4,
  mouseRadius: 170,
  glow: true,
  trail: true,
  seed: 1107,
});

function updateReadout() {
  modeReadout.textContent = modes[modeIndex].label;
  particleReadout.textContent = `${field.getConfig().count} particles · ${modes[modeIndex].label}`;
}

modeButton.addEventListener("click", () => {
  modeIndex = (modeIndex + 1) % modes.length;
  field.setMode(modes[modeIndex].id);
  updateReadout();
});

updateReadout();
