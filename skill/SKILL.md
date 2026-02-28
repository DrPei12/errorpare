---
name: errorpare
description: AI error compression tool - reduce token usage by 60-90% for Claude/Gemini
metadata:
  {
    "openclaw":
      {
        "emoji": "🔧",
        "requires": { "bins": ["errorpare"] },
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "label": "Install ErrorPare",
              "command": "npm install -g errorpare",
            },
          ],
      },
  }
---

# ErrorPare

AI-powered error message compression tool that reduces token usage by 60-90% for AI development tools like Claude Code and Gemini CLI.

## Install

```bash
npm install -g errorpare
```

## Quick Start

```bash
# Execute command with error compression
errorpare run "npm run build"

# Compress error file
errorpare compress errors.txt

# Compress from stdin
echo "TypeError: x is undefined" | errorpare compress -
```

## Commands

### run

Execute a command and automatically compress any errors.

```bash
errorpare run "npm run build"
errorpare run "npm run build" --lang ts
errorpare run "npm run build" --json
```

Options:
- `--lang` - Specify language (typescript, javascript, python, go, java, rust, cpp)
- `--local` - Local compression only (no LLM API)
- `--analyze` - Enable LLM analysis
- `--json` - JSON output format
- `--max-lines` - Maximum lines to keep (default: 1000)

### compress

Compress error messages from file or stdin.

```bash
errorpare compress errors.txt
echo "TypeError: x is undefined" | errorpare compress -
errorpare compress errors.txt --json
```

### init

Initialize ErrorPare integration files for AI tools.

```bash
errorpare init
```

This creates:
- `.errorparerc` - ErrorPare config
- `.cursorrules` - Cursor AI integration
- `.claude.md` - Claude Code integration

## Features

### Git-Aware Stack Trimming

Automatically collapses third-party framework stack frames (node_modules, site-packages, etc.):

```
Before: 120 lines (80 from node_modules)
After:  15 lines
```

### Variable Masking

Replaces sensitive values with placeholders:
- IP addresses → `<IP>`
- UUIDs → `<UUID>`
- Hex values → `<HEX>`
- Paths → `<PATH>`

### Multi-Language Support

- TypeScript/JavaScript
- Python
- Go
- Java
- Rust
- C/C++

### MCP Server

ErrorPare can be used as a Model Context Protocol server:

```bash
errorpare-mcp
```

## Integration

### Claude Code

Add to your `.claude.md`:

```
When running build/test commands, use errorpare:

GOOD: errorpare run "npm run build"
BAD:  npm run build
```

### Cursor

Add to your `.cursorrules`:

```
- When running build/test commands, ALWAYS use errorpare run "..." instead of direct commands
```

## Example

```bash
$ errorpare run "npm run build"
[ErrorPare] npm run build failed (exit code 1)
[ErrorPare] Git-aware trimming: 45 third-party frames collapsed
[ErrorPare] Compression: 78% (120 → 15 lines)

═══════════════════════════════════════════════════════════════

[45x] TypeError: Cannot read property 'id' of undefined
  at UserController.js:22
  variables: prop=id

[23x] Error: Cannot find module 'lodash'
  → suggestion: npm install lodash

═══════════════════════════════════════════════════════════════

Summary: 5 unique errors from 120 occurrences.
```

## Use Cases

1. **AI Development**: Reduce token usage when debugging with Claude/Gemini
2. **CI/CD**: Compress build errors in logs
3. **Log Analysis**: Deduplicate similar errors in large log files
