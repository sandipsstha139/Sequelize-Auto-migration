#!/usr/bin/env node
declare function debugConfig(): void;

declare function runCli(): Promise<void>;

export { debugConfig, runCli };
