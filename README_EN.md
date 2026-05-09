# ErrorPare

<div align="center">

![ErrorPare logo](https://raw.githubusercontent.com/DrPei12/errorpare/main/docs/logo.png)

**Turn noisy stderr into compact, model-friendly debugging payloads**

[![npm version](https://img.shields.io/npm/v/errorpare.svg)](https://www.npmjs.com/package/errorpare)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

[English](README_EN.md) | [简体中文](README_CN.md)

</div>

ErrorPare is a CLI and MCP server for AI-assisted debugging workflows.

It sits between a failing command and the model, then turns raw stderr into a smaller and more actionable payload by:

- merging repeated errors
- collapsing third-party frames
- restoring JavaScript and TypeScript stack traces through source maps
- attaching nearby code context
- returning stable JSON for downstream agents and tools
- optionally adding lightweight LLM analysis

## Why it exists

Modern coding agents are good at reasoning once they see the right signal, but most real-world stderr is full of duplicate traces, bundled file locations, and application log noise.

ErrorPare is designed to improve the quality of what you send into Claude, Cursor, Codex, MCP clients, CI bots, and other debugging pipelines.

## Features

- Smart error deduplication with occurrence counts
- JavaScript and TypeScript source map restoration
- Optional code context snippets around failing lines
- Stable JSON mode for downstream automation
- Optional LLM-based root cause analysis
- MCP server for Claude Desktop, Cursor, and other MCP-compatible clients
- First-party GitHub Action for CI failure compression

## Install

Prerequisites:

- Node.js 18 or newer

Install globally:

```bash
npm install -g errorpare
```

Or run with `npx`:

```bash
npx errorpare --help
```

## Quick Start

Compress the output of a failing command:

```bash
errorpare run "npm run build"
```

Return pure JSON for downstream agents:

```bash
errorpare run "npm run build" --json
```

Attach code context and request analysis:

```bash
errorpare run "npm run build" --json --analyze --context-lines 5
```

Compress an existing log file:

```bash
errorpare compress errors.log --json
```

Read error text from stdin:

```bash
cat errors.log | errorpare compress - --json
```

## What the JSON Includes

The JSON interface is intended for machine consumption and currently includes:

- execution metadata
- compression statistics
- merged error entries
- source-mapped locations when available
- optional code context
- optional `llmAnalysis`
- explicit analysis status metadata

Example shape:

```json
{
  "mode": "analyze",
  "success": false,
  "exitCode": 1,
  "compression": {
    "originalLines": 26,
    "compressedLines": 1,
    "rate": 0.6667,
    "uniqueErrors": 1,
    "sourceMappedFrames": 4
  },
  "errors": [
    {
      "count": 3,
      "type": "Error",
      "message": "CRM payload contract violated: billing contact must expose at least one deliverable email after enrichment",
      "location": "src/services/invoice-recipient.ts:13:10",
      "originalLocation": "dist/nightly-invoice-sync.js:13:11"
    }
  ],
  "analysis": {
    "requested": true,
    "configured": true,
    "attempted": true,
    "succeeded": true,
    "provider": "deepseek",
    "model": "deepseek-chat",
    "error": null
  }
}
```

## LLM Analysis

Configure analysis interactively:

```bash
errorpare init --analyze
```

In an interactive terminal, `errorpare init --analyze` launches the embedded `model-catlog-builder` onboarding flow for the providers ErrorPare can execute today. The selected provider, model, and validated API key are written back into ErrorPare's config automatically.

Generated onboarding state is stored under:

```text
~/.errorpare/model-catalog/
```

That runtime directory includes:

- a seeded catalog snapshot for ErrorPare
- a tenant-scoped routing config
- encrypted provider credentials
- `user-model-profile.json` for app-side inspection

If you pass a provider that ErrorPare supports but the embedded onboarding does not yet cover, ErrorPare falls back to the legacy environment-variable setup path.

You can also set provider-specific environment variables directly:

- `ERRORPARE_OPENAI_API_KEY`
- `ERRORPARE_ANTHROPIC_API_KEY`
- `ERRORPARE_DEEPSEEK_API_KEY`
- `ERRORPARE_MOONSHOT_API_KEY`
- `ERRORPARE_BAILIAN_API_KEY`
- `ERRORPARE_GROQ_API_KEY`
- `ERRORPARE_GEMINI_API_KEY`

## MCP Server

ErrorPare ships with an MCP server entrypoint:

```bash
errorpare-mcp
```

Available tools:

- `run_command`
- `compress_errors`
- `analyze_errors`

MCP documentation:

- [MCP integration overview](docs/MCP_INTEGRATION.md)
- [Claude Desktop setup](docs/MCP_CLAUDE_DESKTOP.md)
- [Cursor setup](docs/MCP_CURSOR.md)

## GitHub Action

ErrorPare also ships with a first-party GitHub Action for CI use cases:

```yaml
- name: Run build through ErrorPare
  id: errorpare
  uses: DrPei12/errorpare@v2.1.0
  with:
    command: npm run build
    context-lines: "5"
```

Action outputs include:

- `json-path`
- `success`
- `exit-code`
- `error-count`
- `analysis-succeeded`

See [GitHub Action docs](docs/GITHUB_ACTION.md) for a full workflow example and LLM analysis setup in CI.

## Supported Languages

Current parser support is strongest for:

- TypeScript and JavaScript
- Python
- Go
- Java
- Rust

Other languages may still compress well as generic errors, but parser quality is not yet at the same level.

## Project Status

ErrorPare is actively maintained and already useful for:

- local AI debugging workflows
- machine-readable JSON pipelines
- CI failure summarization
- MCP-based tooling

The project is still evolving in a few areas:

- noise filtering heuristics
- provider and model management
- deeper CI and PR integrations

## Development

Install dependencies:

```bash
npm install
```

Run checks:

```bash
npm run check
```

Build the project:

```bash
npm run build
```

## Contributing

Issues and pull requests are welcome.

- Read the [contributing guide](CONTRIBUTING.md)
- Review the [code of conduct](CODE_OF_CONDUCT.md)
- Report vulnerabilities through the [security policy](SECURITY.md)
- Check the [roadmap](ROADMAP.md)
- Pick a task from [good first issues](GOOD_FIRST_ISSUES.md)

## Documentation

- [API reference](docs/API.md)
- [GitHub Action docs](docs/GITHUB_ACTION.md)
- [Model catalog integration notes](docs/MODEL_CATALOG_INTEGRATION.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
