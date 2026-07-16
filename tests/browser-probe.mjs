/**
 * Playwright probe — large preview, no pause, docs page, dual-field isolation.
 */
import { createServer } from "http";
import { readFile } from "fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCRATCH =
  process.env.SCRATCH ||
  path.join(
    process.env.LOCALAPPDATA || "/tmp",
    "Temp",
    "grok-goal-121a2d5952ca",
    "implementer"
  );

if (!existsSync(SCRATCH)) mkdirSync(SCRATCH, { recursive: true });

const logPath = path.join(SCRATCH, "browser.log");
const galleryShot = path.join(SCRATCH, "gallery.png");
const docsShot = path.join(SCRATCH, "docs.png");
const logLines = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  logLines.push(line);
  console.log(line);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";
        if (urlPath === "/docs" || urlPath === "/docs/") urlPath = "/docs/index.html";
        const filePath = path.join(ROOT, urlPath.replace(/^\//, ""));
        if (!filePath.startsWith(ROOT)) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        const data = await readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function main() {
  log("starting server from " + ROOT);
  const { server, port } = await startServer();
  const base = `http://127.0.0.1:${port}`;
  log("server on " + base);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(String(err)));

    // —— Home / gallery ——
    await page.goto(base + "/", { waitUntil: "networkidle", timeout: 45000 });
    log("home loaded");

    const pauseCount = await page.locator("#pause-btn").count();
    const pauseText = await page.locator("button:has-text('Pause')").count();
    log("pause-btn count=" + pauseCount + " Pause buttons=" + pauseText);
    if (pauseCount > 0 || pauseText > 0) throw new Error("Pause control still in DOM");

    await page.waitForSelector("#preview", { timeout: 10000 });
    await page.locator("#gallery").scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const box = await page.locator("#preview-card").boundingBox();
    const canvasBox = await page.locator("#preview").boundingBox();
    log(
      "preview-card box: " +
        JSON.stringify(box) +
        " canvas: " +
        JSON.stringify(canvasBox)
    );
    if (!box || box.width < 400 || box.height < 320) {
      throw new Error(
        "preview card too small: " + JSON.stringify(box)
      );
    }
    if (!canvasBox || canvasBox.width < 380 || canvasBox.height < 300) {
      throw new Error("preview canvas too small: " + JSON.stringify(canvasBox));
    }

    // Gallery panel share
    const galleryBox = await page.locator("#gallery .gallery-inner").boundingBox();
    if (galleryBox && box) {
      const share = (box.width * box.height) / (galleryBox.width * galleryBox.height);
      log("preview area share of gallery panel≈ " + share.toFixed(3));
    }

    const fixedBackdrop = await page.evaluate(() => window.__dotfieldGallery.BACKDROP_MODE);
    const backdropBefore = await page.evaluate(() => window.__dotfieldGallery.getBackdropMode());
    if (backdropBefore !== fixedBackdrop) throw new Error("backdrop not fixed at start");

    const backdropSeam = await page.evaluate(() => {
      const field = window.__dotfieldGallery.backdrop;
      const canvas = document.getElementById("backdrop");
      const positions = field.getPositions();
      const inset = 12;
      const logicalWidth = window.innerWidth;
      const logicalHeight = window.innerHeight;
      const outsideGutter = positions.filter((p) =>
        p.x < -inset || p.x > logicalWidth + inset ||
        p.y < -inset || p.y > logicalHeight + inset
      ).length;
      const band = 24;
      const edgeCounts = { top: 0, bottom: 0, left: 0, right: 0 };
      positions.forEach((p) => {
        if (p.y >= 0 && p.y < band) edgeCounts.top++;
        else if (p.y <= logicalHeight && p.y > logicalHeight - band) edgeCounts.bottom++;
        else if (p.x >= 0 && p.x < band) edgeCounts.left++;
        else if (p.x <= logicalWidth && p.x > logicalWidth - band) edgeCounts.right++;
      });
      return {
        outsideGutter,
        edgeCounts,
        maxEdge: Math.max(...Object.values(edgeCounts)),
        count: positions.length,
        canvasWidth: canvas.width,
      };
    });
    log("backdrop seam=" + JSON.stringify(backdropSeam));
    if (backdropSeam.outsideGutter !== 0) {
      throw new Error("backdrop particle escaped the off-screen wrap gutter");
    }
    if (backdropSeam.maxEdge >= backdropSeam.count * 0.45) {
      throw new Error("backdrop particles clustered along one border");
    }

    const targetMode = await page.evaluate(() => {
      const modes = window.Dotfield.listModes();
      const cur = window.__dotfieldGallery.getPreviewMode();
      return (modes.find((m) => m.id !== cur && m.family === "vortex") || modes[20]).id;
    });
    await page.evaluate((id) => window.__dotfieldGallery.selectMode(id), targetMode);
    await page.waitForTimeout(600);

    const backdropAfter = await page.evaluate(() => window.__dotfieldGallery.getBackdropMode());
    const previewAfter = await page.evaluate(() => window.__dotfieldGallery.getPreviewMode());
    log("after select: backdrop=" + backdropAfter + " preview=" + previewAfter);
    if (backdropAfter !== fixedBackdrop) throw new Error("backdrop changed");
    if (previewAfter !== targetMode) throw new Error("preview not updated");

    await page.waitForTimeout(900);
    const paint = await page.evaluate(() => {
      const canvas = document.getElementById("preview");
      const ctx = canvas.getContext("2d");
      const w = Math.min(canvas.width, 500);
      const h = Math.min(canvas.height, 400);
      if (w < 10 || h < 10) return { painted: 0, total: 1, fraction: 0, cw: canvas.width, ch: canvas.height };
      const data = ctx.getImageData(0, 0, w, h).data;
      let painted = 0;
      const total = w * h;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a < 10) continue;
        if (Math.abs(r - 244) + Math.abs(g - 239) + Math.abs(b - 230) > 18) painted++;
      }
      return { painted, total, fraction: painted / total, cw: canvas.width, ch: canvas.height };
    });
    log(
      "preview paint painted=" +
        paint.painted +
        " fraction=" +
        paint.fraction.toFixed(4) +
        " " +
        paint.cw +
        "x" +
        paint.ch
    );
    if (paint.painted < 500 || paint.fraction < 0.002) {
      throw new Error("preview not substantially painted");
    }

    await page.screenshot({ path: galleryShot, fullPage: false });
    log("screenshot gallery: " + galleryShot);

    if (consoleErrors.length) {
      throw new Error("home console errors: " + consoleErrors.join(" | "));
    }
    log("home console errors: none");

    // —— Docs page ——
    const docsErrors = [];
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.on("console", (msg) => {
      if (msg.type() === "error") docsErrors.push(msg.text());
    });
    page.on("pageerror", (err) => docsErrors.push(String(err)));

    await page.goto(base + "/docs/", { waitUntil: "networkidle", timeout: 30000 });
    log("docs loaded");

    const sectionCount = await page.locator(".doc-section").count();
    const hasInstall = await page.locator("#install").count();
    const hasApi = await page.locator("#api").count();
    const hasModes = await page.locator("#modes").count();
    const hasExamples = await page.locator("#examples").count();
    const hasCustom = await page.locator("#customization").count();
    const bodyText = await page.locator(".docs-main").innerText();
    log(
      "docs sections=" +
        sectionCount +
        " install=" +
        hasInstall +
        " api=" +
        hasApi +
        " modes=" +
        hasModes +
        " examples=" +
        hasExamples +
        " custom=" +
        hasCustom +
        " textLen=" +
        bodyText.length
    );
    if (sectionCount < 5) throw new Error("too few doc sections");
    if (!hasInstall || !hasApi || !hasModes || !hasExamples || !hasCustom) {
      throw new Error("missing required doc anchors");
    }
    if (bodyText.length < 2000) throw new Error("docs text too short");

    await page.screenshot({ path: docsShot, fullPage: false });
    log("screenshot docs: " + docsShot);

    if (docsErrors.length) {
      throw new Error("docs console errors: " + docsErrors.join(" | "));
    }
    log("docs console errors: none");
    log("PROBE_OK");
  } finally {
    if (browser) await browser.close();
    server.close();
  }

  writeFileSync(logPath, logLines.join("\n") + "\n");
  console.log("wrote " + logPath);
}

main().catch((err) => {
  log("PROBE_FAIL: " + err);
  try {
    writeFileSync(logPath, logLines.join("\n") + "\n" + String(err) + "\n");
  } catch (_) {}
  console.error(err);
  process.exit(1);
});
