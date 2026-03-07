import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { ParsedStackTrace, StackFrame } from '../parsers/stack-trace.js';

interface RawSourceMap {
  version: number;
  file?: string;
  sourceRoot?: string;
  sources: string[];
  sourcesContent?: Array<string | null>;
  names?: string[];
  mappings: string;
}

interface MappingSegment {
  generatedColumn: number;
  sourceIndex: number;
  originalLine: number;
  originalColumn: number;
  nameIndex?: number;
}

interface ParsedSourceMap {
  mapPath: string;
  generatedFile: string;
  raw: RawSourceMap;
  mappingsByLine: MappingSegment[][];
}

interface SourceMapReference {
  kind: 'inline' | 'external';
  mapPath: string;
  payload: string;
}

export interface SourceMapResolverOptions {
  projectRoot?: string;
  maxChainDepth?: number;
}

export interface RestoreSourceMapResult {
  restoredFrames: number;
}

const BASE64_VLQ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VLQ_MAP = new Map(BASE64_VLQ_CHARS.split('').map((char, index) => [char, index]));
const SOURCE_MAP_COMMENT_REGEX = /(?:\/\/[@#]\s*sourceMappingURL=([^\s'"]+)|\/\*#\s*sourceMappingURL=([^*\s]+)\s*\*\/)/g;

function decodeVlq(segment: string): number[] {
  const values: number[] = [];
  let index = 0;

  while (index < segment.length) {
    let result = 0;
    let shift = 0;
    let continuation = true;

    while (continuation) {
      const char = segment[index++];
      const digit = BASE64_VLQ_MAP.get(char);
      if (digit === undefined) {
        throw new Error(`Invalid VLQ character: ${char}`);
      }

      continuation = (digit & 32) !== 0;
      result += (digit & 31) << shift;
      shift += 5;
    }

    const isNegative = (result & 1) === 1;
    const value = result >> 1;
    values.push(isNegative ? -value : value);
  }

  return values;
}

function parseMappings(mappings: string): MappingSegment[][] {
  const lines = mappings.split(';');
  const parsedLines: MappingSegment[][] = [];
  let previousSource = 0;
  let previousOriginalLine = 0;
  let previousOriginalColumn = 0;
  let previousName = 0;

  for (const line of lines) {
    let generatedColumn = 0;
    const segments: MappingSegment[] = [];

    if (!line) {
      parsedLines.push(segments);
      continue;
    }

    for (const segment of line.split(',')) {
      if (!segment) {
        continue;
      }

      const decoded = decodeVlq(segment);
      generatedColumn += decoded[0] ?? 0;

      if (decoded.length < 4) {
        continue;
      }

      previousSource += decoded[1];
      previousOriginalLine += decoded[2];
      previousOriginalColumn += decoded[3];

      const mapping: MappingSegment = {
        generatedColumn,
        sourceIndex: previousSource,
        originalLine: previousOriginalLine,
        originalColumn: previousOriginalColumn,
      };

      if (decoded.length >= 5) {
        previousName += decoded[4];
        mapping.nameIndex = previousName;
      }

      segments.push(mapping);
    }

    parsedLines.push(segments);
  }

  return parsedLines;
}

function parseJsonSourceMap(payload: string): RawSourceMap {
  const parsed = JSON.parse(payload) as RawSourceMap;
  if (
    parsed.version !== 3 ||
    !Array.isArray(parsed.sources) ||
    typeof parsed.mappings !== 'string'
  ) {
    throw new Error('Unsupported source map payload');
  }

  return parsed;
}

function cleanFilePath(filePath: string): string {
  const trimmed = filePath.trim();
  const withoutQuery = trimmed.split('?')[0]?.split('#')[0] ?? trimmed;

  if (withoutQuery.startsWith('file://')) {
    return fileURLToPath(withoutQuery);
  }

  return withoutQuery;
}

function extractSourceMapReference(content: string, generatedFile: string): SourceMapReference | null {
  const matches = [...content.matchAll(SOURCE_MAP_COMMENT_REGEX)];
  const lastMatch = matches.at(-1);
  const reference = lastMatch?.[1] ?? lastMatch?.[2];

  if (!reference) {
    return null;
  }

  if (reference.startsWith('data:')) {
    const [, metadata = '', encodedPayload = ''] = reference.match(/^data:([^,]*),(.*)$/) ?? [];
    const isBase64 = metadata.includes(';base64');
    const payload = isBase64
      ? Buffer.from(encodedPayload, 'base64').toString('utf-8')
      : decodeURIComponent(encodedPayload);

    return {
      kind: 'inline',
      mapPath: `${generatedFile}#inline-source-map`,
      payload,
    };
  }

  return {
    kind: 'external',
    mapPath: path.resolve(path.dirname(generatedFile), reference),
    payload: '',
  };
}

function resolveSourcePath(rawSource: string, map: ParsedSourceMap, projectRoot: string): string {
  const usesProjectRoot =
    /^webpack:\/\//.test(rawSource) ||
    /^vite:\/\//.test(rawSource) ||
    /^esbuild:\/\//.test(rawSource);

  let source = rawSource.replace(/^webpack:\/\/\/?/, '');
  source = source.replace(/^vite:\/\/\/?/, '');
  source = source.replace(/^esbuild:\/\//, '');

  if (source.startsWith('file://')) {
    return cleanFilePath(source);
  }

  if (source.startsWith('./')) {
    source = source.slice(2);
  }

  if (usesProjectRoot) {
    return path.resolve(projectRoot, source);
  }

  if (source.startsWith('/')) {
    const rootResolved = path.resolve(projectRoot, `.${source}`);
    return rootResolved;
  }

  const sourceRoot = map.raw.sourceRoot?.replace(/^file:\/\//, '') ?? '';
  const baseDir = sourceRoot
    ? path.resolve(path.dirname(map.mapPath), sourceRoot)
    : path.dirname(map.mapPath);

  return path.resolve(baseDir, source);
}

function formatLocation(filePath: string, line: number, column?: number): string {
  return column !== undefined ? `${filePath}:${line}:${column}` : `${filePath}:${line}`;
}

export class SourceMapResolver {
  private readonly options: Required<SourceMapResolverOptions>;
  private readonly generatedFileCache = new Map<string, Promise<string | null>>();
  private readonly parsedMapCache = new Map<string, Promise<ParsedSourceMap | null>>();

  constructor(options: SourceMapResolverOptions = {}) {
    this.options = {
      projectRoot: options.projectRoot ?? process.cwd(),
      maxChainDepth: options.maxChainDepth ?? 3,
    };
  }

  async restoreParsedStackTrace(parsed: ParsedStackTrace): Promise<RestoreSourceMapResult> {
    const frames = await Promise.all(parsed.frames.map(frame => this.restoreFrame(frame)));
    parsed.frames = frames;

    return {
      restoredFrames: frames.filter(frame => frame.originalFile).length,
    };
  }

  async restoreFrame(frame: StackFrame): Promise<StackFrame> {
    let currentFrame = { ...frame, file: cleanFilePath(frame.file) };
    let chainDepth = 0;
    let generatedSnapshot: Pick<StackFrame, 'file' | 'line' | 'column'> | null = null;

    while (chainDepth < this.options.maxChainDepth) {
      const sourceMap = await this.loadSourceMapForGeneratedFile(currentFrame.file);
      if (!sourceMap) {
        break;
      }

      const mapping = this.originalPositionFor(
        sourceMap,
        currentFrame.line,
        currentFrame.column ?? 0
      );

      if (!mapping) {
        break;
      }

      if (!generatedSnapshot) {
        generatedSnapshot = {
          file: currentFrame.file,
          line: currentFrame.line,
          column: currentFrame.column,
        };
      }

      currentFrame = {
        ...currentFrame,
        file: mapping.file,
        line: mapping.line,
        column: mapping.column,
        isThirdParty: isThirdPartyPath(mapping.file),
        sourceContent: mapping.sourceContent ?? currentFrame.sourceContent,
        sourceMapPath: sourceMap.mapPath,
        sourceMapName: mapping.name,
        sourceMapChainDepth: chainDepth + 1,
        originalFile: generatedSnapshot.file,
        originalLine: generatedSnapshot.line,
        originalColumn: generatedSnapshot.column,
      };

      chainDepth += 1;
    }

    return currentFrame;
  }

  private async loadSourceMapForGeneratedFile(generatedFile: string): Promise<ParsedSourceMap | null> {
    const cleanedFile = cleanFilePath(generatedFile);
    const content = await this.readGeneratedFile(cleanedFile);
    if (content === null) {
      return null;
    }

    const discovered = extractSourceMapReference(content, cleanedFile)
      ?? (await this.findExternalMapFallback(cleanedFile));

    if (!discovered) {
      return null;
    }

    if (!this.parsedMapCache.has(discovered.mapPath)) {
      this.parsedMapCache.set(
        discovered.mapPath,
        this.parseDiscoveredMap(discovered, cleanedFile)
      );
    }

    return this.parsedMapCache.get(discovered.mapPath) ?? null;
  }

  private async parseDiscoveredMap(
    reference: SourceMapReference,
    generatedFile: string
  ): Promise<ParsedSourceMap | null> {
    try {
      const payload = reference.kind === 'inline'
        ? reference.payload
        : await fs.readFile(reference.mapPath, 'utf-8');

      const raw = parseJsonSourceMap(payload);

      return {
        mapPath: reference.mapPath,
        generatedFile,
        raw,
        mappingsByLine: parseMappings(raw.mappings),
      };
    } catch {
      return null;
    }
  }

  private async readGeneratedFile(filePath: string): Promise<string | null> {
    if (!this.generatedFileCache.has(filePath)) {
      this.generatedFileCache.set(
        filePath,
        fs.readFile(filePath, 'utf-8').catch(() => null)
      );
    }

    return this.generatedFileCache.get(filePath) ?? null;
  }

  private async findExternalMapFallback(generatedFile: string): Promise<SourceMapReference | null> {
    const fallbackPath = `${generatedFile}.map`;

    try {
      await fs.access(fallbackPath);
      return {
        kind: 'external',
        mapPath: fallbackPath,
        payload: '',
      };
    } catch {
      return null;
    }
  }

  private originalPositionFor(
    sourceMap: ParsedSourceMap,
    generatedLine: number,
    generatedColumn: number
  ): {
    file: string;
    line: number;
    column: number;
    name?: string;
    sourceContent?: string | null;
  } | null {
    const segments = sourceMap.mappingsByLine[generatedLine - 1];
    if (!segments || segments.length === 0) {
      return null;
    }

    let matched: MappingSegment | null = null;
    for (const segment of segments) {
      if (segment.generatedColumn > generatedColumn) {
        break;
      }
      matched = segment;
    }

    if (!matched) {
      matched = segments[0];
    }

    const rawSource = sourceMap.raw.sources[matched.sourceIndex];
    if (!rawSource) {
      return null;
    }

    const sourceContent = sourceMap.raw.sourcesContent?.[matched.sourceIndex] ?? null;
    const file = resolveSourcePath(rawSource, sourceMap, this.options.projectRoot);

    return {
      file,
      line: matched.originalLine + 1,
      column: matched.originalColumn,
      name: matched.nameIndex !== undefined ? sourceMap.raw.names?.[matched.nameIndex] : undefined,
      sourceContent,
    };
  }
}

export function isThirdPartyPath(filePath: string): boolean {
  const patterns = [
    'node_modules',
    'site-packages',
    '.cargo/registry',
    '.cache',
    'vendor/bundle',
    '/usr/lib',
    '/System/Library',
  ];

  return patterns.some(pattern => filePath.includes(pattern));
}

export function getFrameDisplayLocation(frame: StackFrame): string {
  return formatLocation(frame.file, frame.line, frame.column);
}

export function getFrameGeneratedLocation(frame: StackFrame): string | undefined {
  if (!frame.originalFile || !frame.originalLine) {
    return undefined;
  }

  return formatLocation(frame.originalFile, frame.originalLine, frame.originalColumn);
}
