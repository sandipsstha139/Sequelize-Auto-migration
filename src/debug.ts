import { loadSeqmigConfig } from "./utils/load-seqmig";

export function debugConfig() {
  const seqmig = loadSeqmigConfig();
  console.log("📌 Loaded .seqmig config:", seqmig);

  if (seqmig.config) {
    try {
      const db = require(process.cwd() + "/" + seqmig.config);
      console.log("📌 Loaded DB config:", db);
    } catch (e) {
      console.log("❌ Failed to load DB config:", e);
    }
  } else {
    console.log("❌ No config found in .seqmig");
  }
}
