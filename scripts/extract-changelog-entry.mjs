import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { extractChangelogEntry, readChangelog } from './lib/changelog.mjs';

const root = process.cwd();
const args = process.argv.slice(2);

let requestedVersion = null;
let outputPath = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];

  if (arg === '--write') {
    outputPath = args[index + 1];
    index += 1;

    if (!outputPath) {
      console.error('[release:notes] Missing output path after --write');
      process.exit(1);
    }

    continue;
  }

  if (arg.startsWith('--')) {
    console.error(`[release:notes] Unknown option: ${arg}`);
    process.exit(1);
  }

  if (requestedVersion) {
    console.error('[release:notes] Only one version argument is supported');
    process.exit(1);
  }

  requestedVersion = arg;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = requestedVersion ?? pkg.version;
const entry = extractChangelogEntry(readChangelog(root), version);

if (!entry) {
  console.error(`[release:notes] Could not find CHANGELOG entry for version ${version}`);
  process.exit(1);
}

if (outputPath) {
  fs.writeFileSync(path.resolve(root, outputPath), entry);
} else {
  process.stdout.write(entry);
}
