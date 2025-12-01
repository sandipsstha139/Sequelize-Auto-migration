import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { loadSeqmigConfig } from "./load-seqmig";

/**
 * Loads the user DB config from a JS/TS config file.
 *
 * Supports:
 *  - CommonJS require
 *  - ESM default exports
 *  - TypeScript configs via tsx subprocess
 *  - JSON printed to stdout
 */
export async function loadUserSequelizeConfig(customPath?: string) {
  const seqmig = loadSeqmigConfig();
  const file = customPath || seqmig.config;

  if (!file) {
    throw new Error("❌ No 'config' entry found in .seqmig file");
  }

  const fullPath = path.resolve(process.cwd(), file);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`❌ Config file does not exist: ${fullPath}`);
  }

  // ---------------------------
  // 1️⃣ TS CONFIG (.ts / .mts)
  // ---------------------------
  if (/\.(ts|mts|cts)$/.test(fullPath)) {
    const result = spawnSync("npx", ["tsx", fullPath], {
      cwd: process.cwd(),
      encoding: "utf-8",
    });

    if (result.stderr && result.stderr.trim().length > 0) {
      throw new Error(`❌ Failed to load TS config:\n${result.stderr}`);
    }

    const stdout = result.stdout.trim();

    if (!stdout) {
      throw new Error(
        `❌ TS config printed no JSON. Add:\nconsole.log(JSON.stringify(config));`
      );
    }

    let raw;
    try {
      raw = JSON.parse(stdout);
    } catch (e) {
      console.error("❌ Raw TSX output:", stdout);
      throw new Error(`❌ Invalid JSON output from TS config: ${e}`);
    }

    return selectEnvConfig(raw, seqmig);
  }

  // ---------------------------
  // 2️⃣ JS CONFIG (.js / .cjs)
  // ---------------------------
  if (fullPath.endsWith(".js") || fullPath.endsWith(".cjs")) {
    const mod = require(fullPath);
    const raw = normalizeModule(mod);
    return selectEnvConfig(raw, seqmig);
  }

  // ---------------------------
  // 3️⃣ JSON CONFIG
  // ---------------------------
  if (fullPath.endsWith(".json")) {
    const raw = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    return selectEnvConfig(raw, seqmig);
  }

  throw new Error(`❌ Unsupported config format: ${fullPath}`);
}

/**
 * Extracts default export cleanly.
 */
function normalizeModule(mod: any) {
  if (!mod) return {};
  if (mod.default) return mod.default;
  return mod;
}

/**
 * Picks the correct environment block from the config.
 */
function selectEnvConfig(rawConfig: any, seqmig: any) {
  const env = seqmig.env || "development";

  if (rawConfig[env]) {
    return rawConfig[env];
  }

  return rawConfig;
}
