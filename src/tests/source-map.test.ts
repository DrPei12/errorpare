import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { Compressor } from '../core/compressor.js';
import { readContext } from '../core/context/context-reader.js';
import { SourceMapResolver } from '../core/source-maps/source-map-resolver.js';

const tempDirs: string[] = [];
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function encodeVlqValue(value: number): string {
  let vlq = value < 0 ? ((-value) << 1) + 1 : value << 1;
  let encoded = '';

  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) {
      digit |= 32;
    }
    encoded += BASE64_CHARS[digit];
  } while (vlq > 0);

  return encoded;
}

function createMappings(segmentsByLine: number[][][]): string {
  return segmentsByLine
    .map(line => line.map(segment => segment.map(encodeVlqValue).join('')).join(','))
    .join(';');
}

async function createTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'errorpare-sourcemap-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => fs.rm(dir, { recursive: true, force: true })));
});

describe('SourceMapResolver', () => {
  it('restores external source maps and follows chained mappings', async () => {
    const projectRoot = await createTempDir();
    const srcDir = path.join(projectRoot, 'src');
    const distDir = path.join(projectRoot, 'dist');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });

    const tsFile = path.join(srcDir, 'app.ts');
    const jsFile = path.join(distDir, 'app.js');
    const minFile = path.join(distDir, 'app.min.js');

    await fs.writeFile(
      tsFile,
      ['export function boom() {', '  throw new Error("boom");', '}', ''].join('\n')
    );

    await fs.writeFile(
      jsFile,
      ['function boom(){throw new Error("boom");}', '//# sourceMappingURL=app.js.map', ''].join('\n')
    );

    await fs.writeFile(
      minFile,
      ['function boom(){throw new Error("boom")}boom();', '//# sourceMappingURL=app.min.js.map', ''].join('\n')
    );

    const jsMap = {
      version: 3,
      file: 'app.js',
      sources: ['../src/app.ts'],
      sourcesContent: [await fs.readFile(tsFile, 'utf-8')],
      names: ['boom'],
      mappings: createMappings([
        [[0, 0, 0, 0], [9, 0, 0, 16, 0], [9, 0, 1, -14], [15, 0, 1, 0]],
        [],
        [],
      ]),
    };

    const minMap = {
      version: 3,
      file: 'app.min.js',
      sources: ['./app.js'],
      sourcesContent: [await fs.readFile(jsFile, 'utf-8')],
      names: ['boom'],
      mappings: createMappings([
        [[0, 0, 0, 0], [9, 0, 0, 9, 0], [9, 0, 0, 9], [14, 0, 0, 7]],
        [],
        [],
      ]),
    };

    await fs.writeFile(path.join(distDir, 'app.js.map'), JSON.stringify(jsMap));
    await fs.writeFile(path.join(distDir, 'app.min.js.map'), JSON.stringify(minMap));

    const resolver = new SourceMapResolver({ projectRoot, maxChainDepth: 3 });
    const restored = await resolver.restoreFrame({
      file: minFile,
      line: 1,
      column: 24,
      method: 'boom',
      isThirdParty: false,
    });

    expect(restored.file).toBe(tsFile);
    expect(restored.line).toBe(2);
    expect(restored.originalFile).toBe(minFile);
    expect(restored.originalLine).toBe(1);
    expect(restored.sourceMapChainDepth).toBe(2);
  });

  it('uses inline data URL source maps and sourcesContent for code context', async () => {
    const projectRoot = await createTempDir();
    const distDir = path.join(projectRoot, 'dist');
    await fs.mkdir(distDir, { recursive: true });

    const sourceContent = ['const msg = "boom";', 'throw new Error(msg);', ''].join('\n');
    const inlineMap = {
      version: 3,
      file: 'inline.js',
      sources: ['webpack:///./src/inline.ts'],
      sourcesContent: [sourceContent],
      names: ['msg'],
      mappings: createMappings([
        [[0, 0, 0, 0], [18, 0, 1, 0, 0]],
        [],
        [],
      ]),
    };

    const encodedMap = Buffer.from(JSON.stringify(inlineMap), 'utf-8').toString('base64');
    const generatedFile = path.join(distDir, 'inline.js');
    await fs.writeFile(
      generatedFile,
      `const msg="boom";throw new Error(msg);\n//# sourceMappingURL=data:application/json;base64,${encodedMap}\n`
    );

    const resolver = new SourceMapResolver({ projectRoot });
    const restored = await resolver.restoreFrame({
      file: generatedFile,
      line: 1,
      column: 21,
      method: 'inlineBoom',
      isThirdParty: false,
    });

    const context = await readContext(restored, { contextLines: 0, projectRoot });

    expect(restored.file).toBe(path.join(projectRoot, 'src', 'inline.ts'));
    expect(restored.originalFile).toBe(generatedFile);
    expect(restored.sourceContent).toContain('throw new Error(msg);');
    expect(context?.snippet[0]?.code).toBe('throw new Error(msg);');
  });

  it('keeps parsed maps in cache across repeated restores', async () => {
    const projectRoot = await createTempDir();
    const distDir = path.join(projectRoot, 'dist');
    await fs.mkdir(distDir, { recursive: true });

    const generatedFile = path.join(distDir, 'cached.js');
    const mapPath = `${generatedFile}.map`;
    await fs.writeFile(
      generatedFile,
      ['throw new Error("boom");', '//# sourceMappingURL=cached.js.map', ''].join('\n')
    );

    await fs.writeFile(
      mapPath,
      JSON.stringify({
        version: 3,
        file: 'cached.js',
        sources: ['vite:///src/cached.ts'],
        sourcesContent: ['throw new Error("boom");\n'],
        names: [],
        mappings: createMappings([[[0, 0, 0, 0]]]),
      })
    );

    const resolver = new SourceMapResolver({ projectRoot });
    const first = await resolver.restoreFrame({
      file: generatedFile,
      line: 1,
      column: 5,
      isThirdParty: false,
    });

    await fs.rm(mapPath, { force: true });

    const second = await resolver.restoreFrame({
      file: generatedFile,
      line: 1,
      column: 5,
      isThirdParty: false,
    });

    expect(first.file).toBe(second.file);
    expect(second.file).toBe(path.join(projectRoot, 'src', 'cached.ts'));
  });
});

describe('Compressor source map integration', () => {
  it('restores stack locations before compression and preserves generated location', async () => {
    const projectRoot = await createTempDir();
    const srcDir = path.join(projectRoot, 'src');
    const distDir = path.join(projectRoot, 'dist');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });

    const sourceFile = path.join(srcDir, 'bundle.ts');
    const generatedFile = path.join(distDir, 'bundle.js');
    await fs.writeFile(sourceFile, ['export const fail = () => {', '  throw new Error("boom");', '};', ''].join('\n'));

    await fs.writeFile(
      generatedFile,
      ['const fail=()=>{throw new Error("boom")};fail();', '//# sourceMappingURL=bundle.js.map', ''].join('\n')
    );

    await fs.writeFile(
      `${generatedFile}.map`,
      JSON.stringify({
        version: 3,
        file: 'bundle.js',
        sources: ['esbuild://src/bundle.ts'],
        sourcesContent: [await fs.readFile(sourceFile, 'utf-8')],
        names: ['fail'],
        mappings: createMappings([
          [[0, 0, 0, 0], [6, 0, 0, 13, 0], [10, 0, 1, -11], [14, 0, 1, 0]],
        ]),
      })
    );

    const stack = `TypeError: boom\n    at fail (${generatedFile}:1:18)`;
    const compressor = new Compressor({ projectRoot, contextLines: 0, sourceMaps: true });
    const result = await compressor.compress(stack, 'node dist/bundle.js', 1);

    expect(result.compression.sourceMappedFrames).toBe(1);
    expect(result.errors[0]?.location).toContain(path.join(projectRoot, 'src', 'bundle.ts'));
    expect(result.errors[0]?.originalLocation).toContain(`${generatedFile}:1:18`);
  });
});
