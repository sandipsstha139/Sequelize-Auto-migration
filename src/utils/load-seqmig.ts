import fs from "fs";
import path from "path";
import YAML from "yaml";

export interface SeqmigConfig {
  config?: string;
  migrationDir?: string;
  snapshotDir?: string;
  dialect?: string;
  useSequelizeCli?: boolean;
}

const possibleFiles = [
  ".seqmig",
  ".seqmig.json",
  ".seqmig.yaml",
  ".seqmig.yml",
  ".seqmig.js",
  ".seqmig.cjs",
];

export function loadSeqmigConfig(): SeqmigConfig {
  const cwd = process.cwd();

  for (const fileName of possibleFiles) {
    const fullPath = path.join(cwd, fileName);

    if (fs.existsSync(fullPath)) {
      return parseSeqmigConfig(fullPath, cwd);
    }
  }

  return {};
}

function parseSeqmigConfig(fullPath: string, cwd: string): SeqmigConfig {
  const raw = fs.readFileSync(fullPath, "utf8").trim();

  if (!raw) return {};

  // JS / CJS configs
  if (fullPath.endsWith(".js") || fullPath.endsWith(".cjs")) {
    const mod = require(fullPath);
    return mod.default || mod;
  }

  // YAML configs
  if (fullPath.endsWith(".yaml") || fullPath.endsWith(".yml")) {
    return YAML.parse(raw);
  }

  // JSON configs OR extensionless .seqmig file
  const isExtensionless = fullPath === path.join(cwd, ".seqmig");

  if (isExtensionless || fullPath.endsWith(".json")) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Failed to parse JSON from: ${fullPath}`);
      throw err;
    }
  }

  return {};
}
