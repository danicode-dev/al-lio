import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const errors = [];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [target] : [];
  });
}

function projectPath(file) {
  return relative(root, file).split(sep).join("/");
}

for (const forbidden of ["src/components/guest-app.tsx", "src/components/stored-guest-app.tsx", "src/components/guest-store.tsx"]) {
  if (existsSync(join(root, forbidden))) errors.push(`${forbidden} must not exist`);
}

for (const file of sourceFiles(sourceRoot)) {
  const name = projectPath(file);
  const source = readFileSync(file, "utf8");
  const imports = [...source.matchAll(/from\s+["'](@\/[^"']+)["']/g)].map((match) => match[1]);

  if (/^src\/app\/\(dashboard\)\/.+\/page\.tsx$/.test(name)) {
    for (const dependency of imports) {
      if (/^@\/features\/[^/]+\//.test(dependency)) {
        errors.push(`${name} must import a feature public entry point, not ${dependency}`);
      }
    }
  }

  const owner = name.match(/^src\/features\/([^/]+)\//)?.[1];
  if (owner) {
    for (const dependency of imports) {
      const target = dependency.match(/^@\/features\/([^/]+)(\/.*)?$/);
      if (target && target[1] !== owner && target[2]) {
        errors.push(`${name} reaches into ${target[1]} internals through ${dependency}`);
      }
    }

    const lineCount = source.split(/\r?\n/).length;
    if (lineCount > 1200) errors.push(`${name} has ${lineCount} lines; split feature modules before 1200`);
  }

  if (name.startsWith("src/shared/")) {
    for (const dependency of imports) {
      if (dependency.startsWith("@/features/") || dependency.startsWith("@/app/")) {
        errors.push(`${name} must not depend on application or feature code through ${dependency}`);
      }
    }
  }
}

const requiredBlocModules = [
  "bloc-editor-helpers.ts",
  "bloc-editor-toolbar.tsx",
  "bloc-export.ts",
  "bloc-note-list.tsx",
  "bloc-note-menus.tsx",
  "bloc-notepad.tsx",
  "bloc-persistence.ts",
  "bloc-types.ts",
];
for (const moduleName of requiredBlocModules) {
  const target = join(root, "src/features/bloc/client", moduleName);
  if (!existsSync(target)) errors.push(`Bloc responsibility module is missing: ${projectPath(target)}`);
}

if (errors.length > 0) {
  console.error("Feature boundary check failed:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("Feature boundaries are valid.");
