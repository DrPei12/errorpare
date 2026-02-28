# Changelog

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
- OpenClaw Skill封装
