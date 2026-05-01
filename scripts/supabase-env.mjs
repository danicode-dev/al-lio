import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));

export function loadEnvLocal(root = process.cwd()) {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseAdminKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
}

export function getTargetUserEmail() {
  return process.env.TARGET_USER_EMAIL || "";
}

export function requireSupabaseAdminEnv() {
  const supabaseUrl = getSupabaseUrl();
  const adminKey = getSupabaseAdminKey();

  if (!supabaseUrl || !adminKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY");
  }

  return { supabaseUrl, adminKey };
}
