// ErrorPare - Git Utilities

import * as fs from 'fs';
import * as path from 'path';

let cachedProjectRoot: string | null = null;

/**
 * Find project root by looking for project markers
 * Cached after first call to avoid repeated filesystem access
 */
export function findProjectRoot(startDir?: string): string {
  if (cachedProjectRoot) {
    return cachedProjectRoot;
  }
  
  const root = path.parse(startDir || process.cwd()).root;
  let current = startDir || process.cwd();
  
  const markers = [
    'package.json',
    'Cargo.toml',
    'go.mod',
    'pom.xml',
    'build.gradle',
    'go.sum',
    'pyproject.toml',
    'requirements.txt',
    '.git',
    'pnpm-workspace.yaml',
    'lerna.json',
  ];
  
  while (current !== root) {
    for (const marker of markers) {
      try {
        if (fs.existsSync(path.join(current, marker))) {
          cachedProjectRoot = current;
          return current;
        }
      } catch {
        // Ignore errors
      }
    }
    current = path.dirname(current);
  }
  
  // Fallback to current directory
  cachedProjectRoot = process.cwd();
  return cachedProjectRoot;
}

/**
 * Get relative path from project root
 */
export function getRelativePath(filePath: string, projectRoot: string): string {
  if (filePath.startsWith(projectRoot)) {
    return filePath.slice(projectRoot.length);
  }
  return filePath;
}

/**
 * Check if path is inside project
 */
export function isInProject(filePath: string, projectRoot: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedRoot = projectRoot.replace(/\\/g, '/');
  return normalizedPath.startsWith(normalizedRoot);
}

/**
 * Clear cached project root (useful for testing)
 */
export function clearProjectRootCache(): void {
  cachedProjectRoot = null;
}
