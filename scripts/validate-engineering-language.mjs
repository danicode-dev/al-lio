import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const repositoryRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".mjs", ".js", ".css"]);
const spanishEngineeringPattern = /[áéíóúñ¿¡]|\b(?:pero|porque|cuando|aunque|despues|antes|desde|hasta|usuario|usuarios|ciclo|ciclos|habilidad|habilidades|noticia|noticias|tarea|tareas|migracion|contrasena|conexion|validar|verificar|guardar|cargar|aplicar|ninguna|todavia|tambien|siempre|nunca)\b/i;
const spanishHeadingPattern = /\b(?:resumen|objetivo|arquitectura|instalacion|comandos|variables|limites|integracion|gobierno|despliegue|preparacion|estructura|creditos|estado|producto|licencia)\b/i;
const forbiddenInternalSymbols = [
  "NoticiasView",
  "NoticiasPage",
  "RutaPathNote",
  "RutaPathStep",
  "RutaPathView",
  "RutaPathSkillInput",
  "RutaItem",
  "RutaNote",
  "RutaView",
  "RutaPage",
];

function collectFiles(path) {
  const files = [];
  for (const entry of readdirSync(path)) {
    const absolutePath = join(path, entry);
    const metadata = statSync(absolutePath);
    if (metadata.isDirectory()) files.push(...collectFiles(absolutePath));
    else files.push(absolutePath);
  }
  return files;
}

const issues = [];

for (const root of [join(repositoryRoot, "src"), join(repositoryRoot, "scripts")]) {
  for (const file of collectFiles(root)) {
    if (!sourceExtensions.has(extname(file))) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    const validatesInternalSymbols = file !== join(repositoryRoot, "scripts", "validate-engineering-language.mjs");

    for (const [index, line] of lines.entries()) {
      const trimmed = line.trimStart();
      const isComment = trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
      if (isComment && spanishEngineeringPattern.test(trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) {
        issues.push(`${relative(repositoryRoot, file)}:${index + 1}: engineering comment must be in English`);
      }

      for (const symbol of validatesInternalSymbols ? forbiddenInternalSymbols : []) {
        if (new RegExp(`\\b${symbol}\\b`).test(line)) {
          issues.push(`${relative(repositoryRoot, file)}:${index + 1}: internal symbol ${symbol} must use its English replacement`);
        }
      }
    }
  }
}

const markdownFiles = [join(repositoryRoot, "README.md"), ...collectFiles(join(repositoryRoot, "docs")).filter((file) => extname(file) === ".md")];
for (const file of markdownFiles) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (!line.startsWith("#")) continue;
    const normalized = line.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (spanishHeadingPattern.test(normalized)) {
      issues.push(`${relative(repositoryRoot, file)}:${index + 1}: technical heading must be in English`);
    }
  }
}

if (issues.length > 0) {
  console.error("Engineering-language validation failed:");
  for (const issue of issues) console.error(`  - ${issue}`);
  process.exit(1);
}

console.log("Engineering-language validation passed.");
