import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { extractChangelogEntry, readChangelog } from './lib/changelog.mjs';

const root = process.cwd();

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath), 'utf8');
}

function fail(message) {
  console.error(`[release:check] ${message}`);
  process.exitCode = 1;
}

function assertExists(filePath) {
  if (!fs.existsSync(path.join(root, filePath))) {
    fail(`Missing required file: ${filePath}`);
  }
}

function extractVersion(filePath, pattern) {
  const content = read(filePath);
  const match = content.match(pattern);
  if (!match) {
    fail(`Could not extract version from ${filePath}`);
    return null;
  }

  return match[1];
}

const pkg = JSON.parse(read('package.json'));
const packageVersion = pkg.version;
const changelogEntry = extractChangelogEntry(readChangelog(root), packageVersion);

if (!/^\d+\.\d+\.\d+(-[\w.-]+)?$/.test(packageVersion)) {
  fail(`Invalid package version: ${packageVersion}`);
}

if (!changelogEntry) {
  fail(`CHANGELOG.md is missing an entry for version ${packageVersion}`);
}

const constantsVersion = extractVersion(
  'src/utils/constants.ts',
  /ERRORPARE_VERSION = '([^']+)'/
);

const configVersion = extractVersion(
  'src/core/config/config-manager.ts',
  /const ERRORPARE_VERSION = '([^']+)'/
);

for (const [label, version] of [
  ['src/utils/constants.ts', constantsVersion],
  ['src/core/config/config-manager.ts', configVersion],
]) {
  if (version && version !== packageVersion) {
    fail(`${label} version ${version} does not match package.json version ${packageVersion}`);
  }
}

for (const filePath of [
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  '.github/release-drafter.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/release-drafter.yml',
  '.github/workflows/release.yml',
  'scripts/extract-changelog-entry.mjs',
]) {
  assertExists(filePath);
}

const tagName = process.env.GITHUB_REF_NAME;
if (tagName && tagName.startsWith('v')) {
  const tagVersion = tagName.slice(1);
  if (tagVersion !== packageVersion) {
    fail(`Tag version ${tagVersion} does not match package.json version ${packageVersion}`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`[release:check] OK for version ${packageVersion}`);
