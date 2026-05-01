import { spawn } from "node:child_process";
import net from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";

const startPort = Number(process.env.PORT || 3000);
const buildIdPath = join(process.cwd(), ".next", "BUILD_ID");

if (!existsSync(buildIdPath)) {
  console.error("ERROR: no hay build de produccion en .next.");
  console.error("Ejecuta npm run build:clean antes de npm run prod:local.");
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

const port = await findPort();
console.log(`Arrancando produccion local en http://localhost:${port}`);

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
  stdio: "inherit",
});

server.on("exit", (code) => process.exit(code ?? 0));
