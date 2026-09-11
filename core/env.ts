// Minimal .env loader — no dependency, no magic. Values already present in
// process.env always win (so a deployment's real env overrides the file).
import * as fs from "node:fs";
import * as path from "node:path";

let loaded = false;

export function loadEnv(file = path.resolve(process.cwd(), ".env")): void {
  if (loaded) return;
  loaded = true;
  let text = "";
  try {
    text = fs.readFileSync(file, "utf-8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function env(key: string, fallback = ""): string {
  loadEnv();
  return process.env[key] ?? fallback;
}

export function requireEnv(key: string): string {
  const v = env(key);
  if (!v) throw new Error(`missing required env var ${key} (see .env)`);
  return v;
}
