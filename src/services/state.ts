import fs from "fs";
import path from "path";
import { loadSeqmigConfig } from "../utils/load-seqmig";
import { DatabaseSchema } from "./schema-types";

export function getSnapshotPaths() {
  const cfg = loadSeqmigConfig();

  const snapshotDir = cfg.snapshotDir || ".seqmig/snapshots";
  const migrationDir = cfg.migrationDir || "migrations";

  const SNAPSHOT_FILE = path.join(
    process.cwd(),
    snapshotDir,
    "schema-snapshot.json"
  );
  const SNAPSHOT_BACKUP_DIR = path.join(process.cwd(), snapshotDir, "backups");

  return { SNAPSHOT_FILE, SNAPSHOT_BACKUP_DIR, migrationDir, snapshotDir };
}

export function loadSnapshot(): DatabaseSchema {
  const { SNAPSHOT_FILE } = getSnapshotPaths();

  if (!fs.existsSync(SNAPSHOT_FILE)) {
    return { tables: [] };
  }

  const raw = fs.readFileSync(SNAPSHOT_FILE, "utf8");
  return JSON.parse(raw) as DatabaseSchema;
}

export function saveSnapshot(schema: DatabaseSchema) {
  const { SNAPSHOT_FILE, SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();
  const dir = path.dirname(SNAPSHOT_FILE);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SNAPSHOT_BACKUP_DIR))
    fs.mkdirSync(SNAPSHOT_BACKUP_DIR, { recursive: true });

  if (fs.existsSync(SNAPSHOT_FILE)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(
      SNAPSHOT_BACKUP_DIR,
      `snapshot-${timestamp}.json`
    );
    fs.copyFileSync(SNAPSHOT_FILE, backupFile);
    cleanOldBackups(SNAPSHOT_BACKUP_DIR, 20);
  }

  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(schema, null, 2));
}

function cleanOldBackups(backupDir: string, keepCount: number) {
  const backups = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("snapshot-"))
    .sort()
    .reverse();

  backups.slice(keepCount).forEach((file) => {
    fs.unlinkSync(path.join(backupDir, file));
  });
}

export function listBackups(): string[] {
  const { SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();
  if (!fs.existsSync(SNAPSHOT_BACKUP_DIR)) return [];
  return fs
    .readdirSync(SNAPSHOT_BACKUP_DIR)
    .filter((f) => f.startsWith("snapshot-"))
    .sort()
    .reverse();
}

export function restoreBackup(backupFile: string) {
  const { SNAPSHOT_FILE, SNAPSHOT_BACKUP_DIR } = getSnapshotPaths();

  const backupPath = path.join(SNAPSHOT_BACKUP_DIR, backupFile);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  fs.copyFileSync(backupPath, SNAPSHOT_FILE);
  console.log(`Restored snapshot from ${backupFile}`);
}
