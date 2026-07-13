# Dotfield

**Installable** living stipple / pointillism particle library — thousands of named modes, deep customization, zero runtime dependencies.

- **Live demo:** [trinlol.github.io/dotfield](https://trinlol.github.io/dotfield/)
- **Docs:** [trinlol.github.io/dotfield/docs/](https://trinlol.github.io/dotfield/docs/)
- **npm:** [`dotfield`](https://www.npmjs.com/package/dotfield)

## Install (package dependency)

```bash
npm install dotfield
```

```js
const Dotfield = require("dotfield");
// ESM-friendly CJS export also works with bundlers:
// import Dotfield from "dotfield";

const field = Dotfield.create(document.getElementById("dots"), {
  mode: "flow-calm-cw-mid",
  fillParent: true,
  palette: "terracotta",   // or [{r,g,b}, ...] / '#c45c3e'
  background: "cream",     // or {r,g,b} / '#f4efe6'
  speed: 1,
  intensity: 1.1,
  count: 2400,             // or density: 1.2
});

field.setMode("orbit-brisk-ccw-fine");
field.setConfig({ palette: "ocean", speedScale: 1.4, density: 1.2 });
field.listModes(); // 3000+ { id, label, family, … }
field.stop();
field.destroy();
```

Package entry: `main` + `exports` → `lib/dotfield.js`.

See [`examples/package-consumer/`](https://github.com/trinlol/dotfield/tree/main/examples/package-consumer) in the repo for a minimal Node consumer sample.

## Gallery & docs

- **Live demo:** https://trinlol.github.io/dotfield/
- **Docs:** https://trinlol.github.io/dotfield/docs/

Local preview (optional):

```bash
npm start   # static server; open the printed URL (default http://localhost:8080)
```

- **Backdrop** full-page field uses a rotating full-field mode (gallery never changes it)
- **Large live preview** updates on mode selection
- Search / filter modes; copy mode id + install snippet

## Customization options

| Option | Description |
|--------|-------------|
| `mode` | Catalog mode id |
| `palette` / `colors` | Named palette, `#hex`, or `[{r,g,b},…]` |
| `background` / `bg` | Named bg, `#hex`, or `{r,g,b}` |
| `speed` / `speedScale` | Absolute speed or multiplier |
| `intensity` | Scales noise amplitude + pull |
| `count` / `density` | Particle count or relative density |
| `scale`, `noiseAmp`, `spin`, `pull` | Low-level motion knobs |
| `fillParent`, `interactive`, `seed`, `autoStart` | Field lifecycle |
| `mouseMode` | `repel` · `attract` · `swirl` · `off` |
| `mouseForce` / `mouseRadius` | Cursor strength &amp; pixel radius (mode-tuned by default) |
| `autoMouse` | Re-tune radius/force on mode change (default `true`) |
| `mouseSmooth` | Pointer follow ease `0–1` (default `0.12`) |

Disable cursor entirely with `interactive: false` (or `mouseMode: 'off'` / `mouseForce: 0`).

Runtime: `field.setConfig({ … })` merges overrides (kept across `setMode`).

Headless: `Dotfield.createSimulation({ mode, seed, count, … })` then `.step(dt)`.

## Modes

**3000+** parametric modes across 36 families (flow, orbit, constellation, wave, spiral, vortex, grid, ribbon, bloom, rain, figure-8, helix, scatter, pulse, drift, magnet, weave, halo, cascade, swarm, aurora, tide, lattice, comet, fog, mill, braid, echo, nexus, gyre, petal, cord, lance, stream, infinity, poles) × speed × spin × scale, plus tint variants.

Ids are stable strings, e.g. `vortex-rush-ccw-vast`, `orbit-tint-ocean-tight`.

## API summary

| API | Role |
|-----|------|
| `Dotfield.create(canvas, opts)` | Live canvas field |
| `Dotfield.createSimulation(opts)` | Headless simulation |
| `Dotfield.listModes()` / `getMode(id)` | Catalog |
| `field.setMode(id)` / `setConfig(opts)` | Control |
| `start` / `stop` / `destroy` / `pulse` | Lifecycle |

## Tests

```bash
npm test              # catalog ≥1000, motion, customization
npm run test:gallery  # dual-field isolation + source wiring
npm run test:consumer # file: install + require('dotfield')
npm run test:browser  # Playwright gallery probe (optional)
```

## License

MIT. Visual language inspired by modern AI brand films; not affiliated with Anthropic.
