import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const requiredFiles = [
  "app/page.tsx",
  "app/layout.tsx",
  "app/globals.css",
  "components/guest-app.tsx",
  "public/data/empresas_tech_granada.md",
  "docs/proyecto escalada.md",
  "docs/pasos seguidos el dia 2504.md",
  "README.md",
];

const requiredGitignoreEntries = [
  ".next",
  "node_modules",
  ".env",
  ".env*.local",
  ".playwright-mcp",
  "dev-server*.log",
];

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    fail(`Falta el archivo requerido: ${file}`);
  }
}

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const script of ["lint", "typecheck", "check:project", "smoke", "test", "ci"]) {
  if (!packageJson.scripts?.[script]) {
    fail(`Falta el script npm: ${script}`);
  }
}

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
for (const entry of requiredGitignoreEntries) {
  if (!gitignore.includes(entry)) {
    fail(`.gitignore no contiene: ${entry}`);
  }
}

const readme = readFileSync(join(root, "README.md"), "utf8");
for (const text of ["D1OS", "npm run ci", "docs/"]) {
  if (!readme.includes(text)) {
    fail(`README.md deberia mencionar: ${text}`);
  }
}

const guestApp = readFileSync(join(root, "components/guest-app.tsx"), "utf8");
for (const text of ["techlife.store.D1OS.v2", "Manana misma hora", "progress_notes"]) {
  if (!guestApp.includes(text)) {
    fail(`components/guest-app.tsx deberia contener: ${text}`);
  }
}

const companiesMd = readFileSync(join(root, "public/data/empresas_tech_granada.md"), "utf8");
const jsonMatch = companiesMd.match(/```json\s*([\s\S]*?)```/);
if (!jsonMatch) {
  fail("No se ha encontrado bloque JSON en public/data/empresas_tech_granada.md");
} else {
  try {
    const companies = JSON.parse(jsonMatch[1]);
    if (!Array.isArray(companies) || companies.length < 60) {
      fail("El seed de empresas deberia contener al menos 60 empresas");
    }
  } catch (error) {
    fail(`El JSON de empresas no es valido: ${error.message}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log("OK: chequeo de estructura del proyecto completado.");
