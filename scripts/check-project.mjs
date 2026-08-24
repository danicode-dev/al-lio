import { existsSync, readFileSync } from "fs";
import { join } from "path";

const root = process.cwd();
const requiredFiles = [
  "src/app/page.tsx",
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/components/guest-app.tsx",
  "src/components/calendar/app-calendar.tsx",
  "src/components/quick-add.tsx",
  "public/data/empresas_tech_granada.md",
  "csv/oportunidades_tech_combinado.csv",
  "scripts/import-tech-opportunities.mjs",
  "scripts/audit-schema-code.mjs",
  "docs/README.md",
  "docs/01_PRODUCT_SPEC.md",
  "docs/02_ARCHITECTURE_AND_STACK.md",
  "docs/03_INTEGRATIONS_AND_DEEPLINKS.md",
  "docs/04_SEED_HACKATHONS.md",
  "docs/DEPLOY_VPS.md",
  "docs/PROJECT_STRUCTURE.md",
  "README.md",
];

const requiredGitignoreEntries = [
  ".next",
  "node_modules",
  ".env",
  ".env*.local",
  ".playwright-mcp",
  "dev-server*.log",
  "_dev_out.txt",
  "_pr_body.md",
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
for (const script of ["lint", "typecheck", "check:project", "audit:schema", "smoke", "verify:startup", "verify:cheap", "verify:prod", "test", "ci"]) {
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
for (const text of ["AL-LÍO", "npm run verify:startup", "docs/README.md"]) {
  if (!readme.includes(text)) {
    fail(`README.md deberia mencionar: ${text}`);
  }
}

const guestApp = readFileSync(join(root, "src/components/guest-app.tsx"), "utf8");
for (const text of ["techlife.bloc.D1OS.v1", "techlife.app.settings.D1OS.v1", "techOpportunities"]) {
  if (!guestApp.includes(text)) {
    fail(`components/guest-app.tsx deberia contener: ${text}`);
  }
}

const guestStore = readFileSync(join(root, "src/components/guest-store.tsx"), "utf8");
for (const text of ["progress_notes", "export function StoreProvider", "export function useStore"]) {
  if (!guestStore.includes(text)) {
    fail(`components/guest-store.tsx deberia contener: ${text}`);
  }
}

if (packageJson.scripts?.dev !== "next dev -p 3000") {
  fail('El script dev debe fijar el puerto 3000 para impedir dos instancias Next sobre la misma carpeta .next');
}

const quickAdd = readFileSync(join(root, "src/components/quick-add.tsx"), "utf8");
for (const text of ["Podrás planificarla con fecha", "Tarea", "Curso", "Reto"]) {
  if (!quickAdd.includes(text)) {
    fail(`components/quick-add.tsx deberia contener: ${text}`);
  }
}

const appCalendar = readFileSync(join(root, "src/components/calendar/app-calendar.tsx"), "utf8");
for (const text of ["CalendarHeader", "CalendarMonthGrid", "TaskCalendar", "CalendarView"]) {
  if (!appCalendar.includes(text)) {
    fail(`components/calendar/app-calendar.tsx deberia contener: ${text}`);
  }
}

const actions = readFileSync(join(root, "src/lib/actions.ts"), "utf8");
if (actions.includes('revalidatePath("/dashboard")')) {
  fail('src/lib/actions.ts no debe revalidar "/dashboard"; rompe foco y refresca el layout completo');
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
