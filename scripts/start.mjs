import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { get } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const portText = portIndex < 0 ? (process.env.PORT ?? "3000") : args[portIndex + 1];
const port = Number(portText);
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error("Symbio needs Node.js 20.9 or newer. Install a supported Node LTS release.");
  process.exit(1);
}
if (!/^\d+$/.test(portText ?? "") || !Number.isInteger(port) || port < 1024 || port > 65535 ||
  args.some((arg, index) => arg !== "--no-open" && arg !== "--port" && (portIndex < 0 || index !== portIndex + 1))) {
  console.error("Usage: start.sh / start.bat [--port 3000] [--no-open]. Port must be 1024–65535.");
  process.exit(1);
}
const next = resolve(root, "node_modules/next/dist/bin/next");
if (!existsSync(next)) {
  // All command names/arguments here are fixed; never interpolate user input into a shell.
  const options = { cwd: root, shell: process.platform === "win32", stdio: "ignore" };
  const hasPnpm = spawnSync("pnpm", ["--version"], options).status === 0;
  const command = hasPnpm ? "pnpm" : "corepack";
  const prefix = hasPnpm ? [] : ["pnpm"];
  if (!hasPnpm && spawnSync("corepack", ["pnpm", "--version"], options).status !== 0) {
    console.error("pnpm is required for the first install. Install pnpm, then run this script again.");
    process.exit(1);
  }
  console.log("Installing dependencies from pnpm-lock.yaml…");
  const install = spawnSync(command, [...prefix, "install", "--frozen-lockfile"], { ...options, stdio: "inherit" });
  if (install.status !== 0) process.exit(install.status ?? 1);
}

// Next.js 16 records this project's running dev server in its lock file.
// Reuse it with the launcher's consistent localhost origin for browser storage.
try {
  const lock = JSON.parse(readFileSync(resolve(root, ".next/dev/lock"), "utf8"));
  const existing = new URL(lock.appUrl);
  if (existing.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(existing.hostname)) {
    existing.hostname = "localhost";
    const ready = await new Promise((accept) => {
      const request = get(existing, { timeout: 10_000 }, (response) => {
        let body = "";
        response.on("data", (chunk) => { if (body.length < 1_000_000) body += chunk; });
        response.on("end", () => accept(response.statusCode === 200 && body.includes("Symbio")));
        response.on("error", () => accept(false));
      });
      request.on("timeout", () => request.destroy());
      request.on("error", () => accept(false));
    });
    if (ready) {
      console.log(`Symbio is already running at ${existing.origin}. Reusing it; stop it from its original terminal.`);
      await openBrowser(existing.origin);
      process.exit(0);
    }
  }
} catch { /* Missing or stale lock; attempt a normal start. */ }

try {
  await new Promise((accept, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", () => probe.close(accept));
  });
} catch {
  console.error(`Port ${port} is unavailable. Stop its server or run with --port ${port === 65535 ? 3000 : port + 1}.`);
  process.exit(1);
}

const url = `http://localhost:${port}`;
console.log(`Starting Symbio at ${url}. Keep this terminal open; press Ctrl+C to stop.`);
const server = spawn(process.execPath, [next, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root, stdio: "inherit", detached: process.platform !== "win32",
});
let stopping = false;
let readyTimer;
let pollTimer;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  clearTimeout(readyTimer);
  clearTimeout(pollTimer);
  if (server.pid) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else { try { process.kill(-server.pid, "SIGTERM"); } catch { /* Already stopped. */ } }
  }
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
server.on("error", (error) => { console.error(error.message); stop(1); });
server.on("exit", (code) => {
  clearTimeout(readyTimer);
  clearTimeout(pollTimer);
  if (!stopping) { console.error("Symbio server stopped."); process.exitCode = code ?? 1; }
  stopping = true;
});

async function openBrowser(targetUrl) {
  if (args.includes("--no-open")) return;
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "rundll32.exe" : "xdg-open";
  const openArgs = process.platform === "win32" ? ["url.dll,FileProtocolHandler", targetUrl] : [targetUrl];
  const browser = spawn(command, openArgs, { stdio: "ignore" });
  await new Promise((done) => {
    browser.once("spawn", done);
    browser.once("error", () => { console.log(`Open ${targetUrl} in your browser.`); done(); });
  });
  browser.on("exit", (code) => { if (code) console.log(`Open ${targetUrl} in your browser.`); });
}
readyTimer = setTimeout(() => { console.error("App did not become ready within 120 seconds. Check the errors above and retry."); stop(1); }, 120_000);
function poll() {
  if (stopping) return;
  const request = get(url, { timeout: 5000 }, (response) => {
    response.resume();
    if (stopping) return;
    if (response.statusCode === 200) {
      clearTimeout(readyTimer);
      console.log(`Symbio is ready: ${url}`);
      openBrowser(url);
    } else pollTimer = setTimeout(poll, 500);
  });
  request.on("timeout", () => request.destroy());
  request.on("error", () => { if (!stopping) pollTimer = setTimeout(poll, 500); });
}
poll();
