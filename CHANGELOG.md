# Changelog

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
