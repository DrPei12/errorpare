import fs from 'node:fs';
import path from 'node:path';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readChangelog(root) {
  return fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
}

export function extractChangelogEntry(changelog, version) {
  const headingPattern = new RegExp(
    `^## \\[${escapeRegExp(version)}\\](?:\\s*-\\s*.+)?$`,
    'm'
  );
  const headingMatch = headingPattern.exec(changelog);
  if (!headingMatch) {
    return null;
  }

  const start = headingMatch.index;
  const nextHeadingPattern = /\n## \[/g;
  nextHeadingPattern.lastIndex = start + headingMatch[0].length;
  const nextHeadingMatch = nextHeadingPattern.exec(changelog);
  const end = nextHeadingMatch ? nextHeadingMatch.index : changelog.length;

  return changelog.slice(start, end).trim() + '\n';
}
