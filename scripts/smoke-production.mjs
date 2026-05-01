import { spawn } from "node:child_process";
import net from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";

const startPort = Number(process.env.SMOKE_PORT || 3100);
const buildIdPath = join(process.cwd(), ".next", "BUILD_ID");

if (!existsSync(buildIdPath)) {
  console.error("ERROR: no hay build de produccion. Ejecuta primero npm run build.");
  process.exit(1);
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findPort() {
  for (let port = startPort; port < startPort + 50; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No hay puerto libre entre ${startPort} y ${startPort + 49}.`);
}

async function waitForHealth(port, child) {
  const url = `http://localhost:${port}/api/health`;
  for (let i = 0; i < 45; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`next start no respondio en ${url}.`);
}

async function runSmoke(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke-local.mjs"], {
      stdio: "inherit",
      env: { ...process.env, SMOKE_BASE_URL: baseUrl },
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`smoke-local fallo con codigo ${code}.`));
    });
  });
}

const port = await findPort();
const baseUrl = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => process.stdout.write(chunk));
server.stderr.on("data", (chunk) => process.stderr.write(chunk));

try {
  await waitForHealth(port, server);
  await runSmoke(baseUrl);
  console.log(`OK: smoke de produccion completado en ${baseUrl}`);
} finally {
  if (server.exitCode === null) server.kill("SIGTERM");
}
