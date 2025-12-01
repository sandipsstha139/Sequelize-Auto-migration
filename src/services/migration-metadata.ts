import fs from "fs";
import path from "path";

const METADATA_FILE = path.join(
  process.cwd(),
  "src/migrations/.migration-metadata.json"
);

type MigrationMetadata = {
  version: string;
  timestamp: string;
  snapshotHash: string;
  migrationFile: string;
  actions: any[];
};

type MetadataStore = {
  migrations: MigrationMetadata[];
  lastSnapshot: string | null;
};

function getSnapshotHash(snapshot: any): string {
  return require("crypto")
    .createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex")
    .substring(0, 12);
}

export function loadMetadata(): MetadataStore {
  if (!fs.existsSync(METADATA_FILE)) {
    return { migrations: [], lastSnapshot: null };
  }
  return JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));
}

export function saveMetadata(store: MetadataStore) {
  const dir = path.dirname(METADATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(METADATA_FILE, JSON.stringify(store, null, 2));
}

export function recordMigration(
  migrationFile: string,
  actions: any[],
  snapshot: any
) {
  const metadata = loadMetadata();

  metadata.migrations.push({
    version: path.basename(migrationFile),
    timestamp: new Date().toISOString(),
    snapshotHash: getSnapshotHash(snapshot),
    migrationFile,
    actions,
  });

  metadata.lastSnapshot = getSnapshotHash(snapshot);
  saveMetadata(metadata);
}

export function getMigrationHistory(): MigrationMetadata[] {
  return loadMetadata().migrations;
}

export function detectSnapshotCorruption(currentSnapshot: any): boolean {
  const metadata = loadMetadata();
  if (!metadata.lastSnapshot) return false;

  const currentHash = getSnapshotHash(currentSnapshot);
  return currentHash !== metadata.lastSnapshot;
}
