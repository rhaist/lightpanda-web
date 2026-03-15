#!/usr/bin/env node
/**
 * Downloads the Lightpanda binary for the current platform into bin/lightpanda.
 * Runs automatically via the "postinstall" npm hook.
 */
import { createWriteStream, existsSync, chmodSync, mkdirSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binDir = join(__dirname, "..", "bin");
const binPath = join(binDir, process.platform === "win32" ? "lightpanda.exe" : "lightpanda");

const OS_MAP = { linux: "linux", darwin: "macos" };
const ARCH_MAP = { x64: "x86_64", arm64: "aarch64" };

const os = OS_MAP[process.platform];
const arch = ARCH_MAP[process.arch];

if (!os || !arch) {
  console.warn(
    `[lightpanda] Unsupported platform ${process.platform}/${process.arch} — ` +
      "skipping binary download. Start Lightpanda manually."
  );
  process.exit(0);
}

if (existsSync(binPath)) {
  console.log("[lightpanda] Binary already present, skipping download.");
  process.exit(0);
}

const url = `https://github.com/lightpanda-io/browser/releases/download/nightly/lightpanda-${arch}-${os}`;
console.log(`[lightpanda] Downloading ${arch}-${os} binary…`);

mkdirSync(binDir, { recursive: true });

let response;
try {
  response = await fetch(url, { redirect: "follow" });
} catch (err) {
  console.warn(`[lightpanda] Download failed (${err.message}). Run npm install to retry.`);
  process.exit(0);
}

if (!response.ok) {
  console.warn(`[lightpanda] Download failed (HTTP ${response.status}). Run npm install to retry.`);
  process.exit(0);
}

const total = Number(response.headers.get("content-length") ?? 0);
const tmp = binPath + ".tmp";

try {
  const file = createWriteStream(tmp);
  let received = 0;
  let lastPct = -1;

  for await (const chunk of response.body) {
    file.write(chunk);
    received += chunk.length;
    if (total > 0) {
      const pct = Math.floor((received / total) * 100);
      if (pct !== lastPct && pct % 10 === 0) {
        process.stdout.write(`\r[lightpanda] ${pct}% (${(received / 1e6).toFixed(1)} / ${(total / 1e6).toFixed(1)} MB)`);
        lastPct = pct;
      }
    }
  }

  await new Promise((resolve, reject) => file.end((err) => err ? reject(err) : resolve()));
  process.stdout.write("\n");

  const { renameSync } = await import("fs");
  renameSync(tmp, binPath);
  chmodSync(binPath, 0o755);
  console.log(`[lightpanda] Binary ready at ${binPath}`);
} catch (err) {
  if (existsSync(tmp)) unlinkSync(tmp);
  console.warn(`[lightpanda] Failed to save binary (${err.message}). Run npm install to retry.`);
  process.exit(0);
}
