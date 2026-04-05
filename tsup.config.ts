import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
    'bin/mcp': 'src/bin/mcp.ts',
  },
  format: ['cjs'],
  target: 'es2022',
  dts: true,
  sourcemap: false,
  clean: true,
  splitting: false,
  treeshake: true,
});
