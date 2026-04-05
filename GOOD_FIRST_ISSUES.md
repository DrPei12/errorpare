# Good First Issues

If you want to contribute to ErrorPare but do not want to start with a large refactor, these are good entry points.

## Documentation

- add more end-to-end examples for `run --json --analyze`
- expand MCP setup screenshots and troubleshooting notes
- improve provider-specific configuration examples

## Tests

- add more real-world stderr fixtures with noisy structured logs
- extend source map coverage for nested build chains
- add regression tests for JSON schema stability

## Error quality

- improve filtering for framework-specific warning noise
- add more rule-based suggestions for common runtime failures
- improve generic parser handling for non-stacktrace CLI tools

## Developer experience

- tighten the build so test files are not emitted into `dist/`
- improve lint coverage and add autofix-safe rules
- simplify release notes and changelog maintenance

Before you start, please read [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue if the change is non-trivial.
