import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const nextDir = join(process.cwd(), ".next");

if (!existsSync(nextDir)) {
  console.log("OK: .next no existe; no hay cache que limpiar.");
  process.exit(0);
}

rmSync(nextDir, { recursive: true, force: true });
console.log("OK: .next eliminado. El siguiente dev/build regenerara los chunks.");
