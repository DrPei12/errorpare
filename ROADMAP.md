# ErrorPare Roadmap

This roadmap reflects the near-term direction for the open source project. It is intentionally short and execution-focused.

## Current focus

### 1. Reliable machine-readable debugging payloads

- keep `run --json --analyze` stable for downstream agents
- improve noise filtering for mixed stderr and structured logs
- continue tightening source map restoration and code context quality

### 2. Stronger CLI and MCP ergonomics

- expand docs for Claude Desktop and Cursor workflows
- improve config management and provider discovery
- add more examples for CI and automation use cases

### 3. OSS and release quality

- keep CI and release workflows healthy
- reduce npm package bloat and build noise
- improve dependency hygiene and version consistency checks

## Next milestones

### Short term

- release automation with tag validation
- dependency audit cleanup
- Chinese and English docs parity
- better contributor onboarding

### Medium term

- GitHub Action for CI failure summarization
- reusable PR comment output format
- richer MCP resource docs

### Longer term

- plugin-style rules or framework packs
- self-hosted or private-team workflows
- historical failure clustering and trend reporting
