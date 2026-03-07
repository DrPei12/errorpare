# Changelog

## [2.1.0] - 2026-03-07

### Added
- **Phase 2.5: Context Appending** - Automatically attach code context around error locations
  - `--context-lines` flag to control context size (default: 5, max: 20)
  - Syntax-highlighted code snippets in CLI output
  - Full context in JSON output (`errors[].context`)

- **Phase 2.5: Source Map Support** - Restore stack frames to original source locations
  - VLQ encoding/decoding for source map parsing
  - Inline data URL source map support
  - External `.map` file auto-discovery
  - Multi-chain restoration (ts→js→min.js)
  - LRU caching for performance
  - `--source-maps` flag (enabled by default)

- **New Type Fields**:
  - `ErrorPareOptions.sourceMaps?: boolean`
  - `ErrorPareOptions.contextLines?: number`
  - `CompressionResult.sourceMappedFrames?: number`
  - `CompressedError.originalLocation?: string`
  - `CompressedError.context?: CodeContext`
  - `StackFrame.originalFile/Line/Column?: number`

- **New Modules**:
  - `src/core/source-maps/source-map-resolver.ts` (430 lines)
  - `src/core/context/context-reader.ts` (refactored)

- **Test Coverage**:
  - 37 test cases (100% pass)
  - Source map restoration tests
  - Context reader security tests

### Changed
- **Security Fix**: Path validation now uses `path.relative()` instead of `startsWith()` to prevent sibling path bypass
- **Context Binding**: Fixed merge index mismatch using `mergeKey->frame` map
- **CLI Output**: Enhanced with syntax-highlighted code snippets

### Technical
- New module: `src/core/source-maps/source-map-resolver.ts`
- New module: `src/core/context/context-reader.ts`
- Refactored: `src/core/compressor.ts` (context binding logic)
- Refactored: `src/cli/commands/run.ts` (JSON output)
- Tests: 37 passed (4 test files)

### Verification
- `npm test`: 37/37 tests passed ✅
- `npm run build`: DTS build success (46s) ✅
- `git commit`: e0628a6 ✅

---

## [2.0.6] - 2026-03-04

### Changed
- **README** - Improved structure with GitHub admonitions and cleaner formatting
- **Documentation** - Added FAQ section and LLM configuration quick reference
- **Emoji Usage** - Reduced for more professional appearance

### Added
- **npm downloads badge** - Display weekly download statistics
- **Security notes** - Added safety information for LLM analysis

### Technical
- README.md: 150 lines added, 185 lines removed (net -35 lines)

---

## [2.0.5] - 2026-03-04

### Fixed
- **npm Logo** - Use absolute GitHub URL for logo display on npmjs.com

---

## [2.0.0] - 2026-03-03

### Added
- **Phase 2: Configuration System** - Interactive config wizard with `errorpare init`
- **Configuration Manager** - `~/.errorpare/config.json` for persistent settings
- **Config CLI Command** - `errorpare config` to view/edit configuration
- **LLM Analysis Mode** - Optional root cause analysis with user's LLM API key
- **Rule Engine** - 50+ error pattern rules for TypeScript, Python, Java, Go, Rust, C++, and general errors
- **Multi-Provider LLM Support** - OpenAI, Anthropic, Bailian (Qwen), Moonshot (Kimi), DeepSeek
- **Quick Analysis** - Local rule-based analysis without API calls
- **JSON Output** - `--json` flag for machine-readable output

### Changed
- **Run Command Enhanced** - `errorpare run` now supports `--analyze` flag for LLM-powered analysis
- **Init Command** - Now an interactive wizard instead of just creating integration files
- **Version** - Bumped to 2.0.0 for Phase 2 release

### Technical
- New module: `src/core/config/config-manager.ts`
- New module: `src/core/rules/rule-engine.ts`
- New module: `src/core/analysis/llm/llm-analyzer.ts`
- New command: `src/cli/commands/config.ts`

---

## [1.0.1] - 2026-02-28

### Fixed
- **Python Stack Trace**: Multi-line traceback now properly grouped as single unit
- **Variable Deduplication**: Same error with different variable values now correctly merged
- **Java/Go Stack Trace**: Fixed over-splitting issue - each stack trace now processed as atomic unit

### Added
- `splitPythonTracebacks()` - Split multiple Python tracebacks for proper deduplication
- `mergeErrors()` - Aggregate errors with same template

---

## [1.0.0] - 2026-02-19

### Added
- Initial release
- CLI tools (run, compress, init, help)
- Error deduplication with variable masking (IP, UUID, HEX)
- Multi-language support: TypeScript, Python, Go, Java, Rust
- MCP server integration
- OpenClaw Skill 封装
