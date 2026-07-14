export type RGB = { r: number; g: number; b: number };
export type Palette = string | RGB | string[] | RGB[];
export type Background = string | RGB;
export type MouseMode = "repel" | "attract" | "swirl" | "vortex" | "off" | "none";
export type Quality = "high" | "medium" | "low";

export interface DotfieldOptions {
  mode?: string;
  fillParent?: boolean;
  width?: number;
  height?: number;
  count?: number;
  density?: number;
  minParticles?: number;
  maxParticles?: number;
  quality?: Quality;
  dpr?: number;
  adaptiveQuality?: boolean;
  autoPause?: boolean;
  autoStart?: boolean;
  paused?: boolean;
  seed?: number;
  palette?: Palette;
  colors?: Palette;
  background?: Background;
  bg?: Background;
  speed?: number;
  speedScale?: number;
  intensity?: number;
  scale?: number;
  noiseAmp?: number;
  spin?: number;
  pull?: number;
  morphBias?: number;
  rings?: number;
  clusters?: number;
  waveFreq?: number;
  waveAmp?: number;
  trail?: boolean;
  glow?: boolean;
  glowStride?: number;
  rainbow?: boolean;
  interactive?: boolean;
  mouseMode?: MouseMode;
  mouseForce?: number;
  mouseRadius?: number;
  mouseSmooth?: number;
  autoMouse?: boolean;
  wrap?: boolean;
  wrapInset?: number;
}

export interface ModeInfo {
  id: string;
  label: string;
  family: string;
  familyLabel?: string;
  description?: string;
  calm?: boolean;
  serene?: boolean;
  params?: Record<string, unknown>;
}

export interface Position {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface DotfieldInstance {
  start(): this;
  stop(): this;
  destroy(): this;
  setMode(id: string): this;
  setConfig(options: DotfieldOptions): this;
  getConfig(): Record<string, unknown>;
  getMode(): string;
  getModeInfo(): ModeInfo | null;
  listModes(): ModeInfo[];
  pulse(): this;
  pause(): this;
  resume(): this;
  togglePause(): boolean;
  isPaused(): boolean;
  isAutoPaused(): boolean;
  isRunning(): boolean;
  resize(): void;
  step(dt?: number): this;
  getParticleCount(): number;
  getFps(): number;
  getPositions(): Position[];
  retuneMouse(): this;
  getMouseSettings(): Record<string, unknown>;
  canvas: HTMLCanvasElement;
}

export interface Simulation extends Omit<DotfieldInstance, "canvas" | "start" | "stop" | "destroy" | "isRunning" | "isAutoPaused" | "resize" | "getFps" | "retuneMouse" | "getMouseSettings"> {
  getSnapshot(): Record<string, unknown>;
}

export interface DotfieldAPI {
  version: string;
  create(canvas: HTMLCanvasElement, options?: DotfieldOptions): DotfieldInstance;
  createSimulation(options?: DotfieldOptions): Simulation;
  listModes(): ModeInfo[];
  listCalmModes(): ModeInfo[];
  getMode(id: string): ModeInfo | null;
  isCalmMode(id: string): boolean;
  families: ModeInfo[];
  palettes: string[];
  backgrounds: string[];
}

declare const Dotfield: DotfieldAPI;
export = Dotfield;
