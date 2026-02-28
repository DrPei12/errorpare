# ErrorPare

<div align="center">

![ErrorPare Logo](docs/logo.svg)

**LLM Error Compression Tool | Reduce Token Usage | Debug Faster**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)

[English](README_EN.md) | [中文](README.md)

</div>

---

## ✨ Features

- 🚀 **Smart Deduplication** - Auto-detect and compress duplicate errors, 60-90% compression
- 📊 **Token Optimization** - Designed for LLMs, reduce context consumption
- 🌍 **Multi-language** - TypeScript, Python, Go, Java, Rust and more
- 🔧 **Multiple Usage** - CLI tool, SaaS website, OpenClaw Skills
- 📈 **Root Cause Analysis** - Pro version with intelligent error analysis
- 🔒 **Secure** - Local processing, no data leak

---

## 🚀 Quick Start

### Install

```bash
# npm
npm install -g errorpare

# pnpm
pnpm add -g errorpare

# yarn
yarn global add errorpare
```

### Usage

```bash
# Compress error file
errorpare compress errors.txt -o result.json

# Analyze logs
errorpare analyze compile.log

# Show help
errorpare --help
```

### Online Demo

Visit [errorpare.app](https://errorpare.app) for the web version.

---

## 📊 Demo

### Before & After

| Metric | Before | After |
|-------|--------|-------|
| Error Count | 100 | 12 |
| Token Usage | 15,000 | 1,800 |
| Compression | - | **88%** |

### Input Example

```
Error: TypeError: Cannot read property 'x' of undefined
    at foo.js:10:5
    at bar.js:20:10
    at baz.js:30:15
Error: TypeError: Cannot read property 'x' of undefined
    at foo.js:10:5
    at bar.js:20:10
    at baz.js:30:15
Error: TypeError: Cannot read property 'x' of undefined
    at foo.js:10:5
    at bar.js:20:10
    at baz.js:30:15
... (97 more similar errors)
```

### Output

```
=== Error Compression Report ===

Original Errors: 100
Unique Errors: 1
Compression: 99%

Unique Error:
1. [100x] TypeError: Cannot read property 'x' of undefined
   Location: foo.js:10:5
   Suggestion: Check if variable is defined
```

---

## 📦 Installation

### CLI Tool

```bash
npm install -g errorpare
errorpare --help
```

### Node.js Library

```bash
npm install errorpare
```

```typescript
import { compress, analyze } from 'errorpare';

// Compress errors
const result = compress(errors);
console.log(result.formatted);

// Deep analysis
const analysis = await analyze(errors);
console.log(analysis.rootCause);
```

### OpenClaw Skills

Use directly in OpenClaw:

```typescript
// When user sends error info
await skills.errorpare.compress({
  errors: userProvidedErrors,
  language: 'typescript',
  options: {
    deduplicate: true,
    analyzeRootCause: true
  }
});
```

### SaaS API

```bash
curl -X POST https://api.errorpare.app/compress \
  -H "Content-Type: application/json" \
  -d '{"errors": ["error1", "error2"], "plan": "pro"}'
```

---

## 🛠️ Supported Languages

| Language | Status | Error Format | Stack Trace |
|---------|--------|-------------|-------------|
| TypeScript/JavaScript | ✅ Stable | ts-node, Vite, esbuild | ✅ |
| Python | ✅ Stable | pip, pytest, mypy | ✅ |
| Go | ✅ Stable | go build, go test | ✅ |
| Java | ✅ Stable | javac, maven, gradle | ✅ |
| Rust | ✅ Stable | cargo | ✅ |
| C/C++ | 🔨 WIP | gcc, clang | 🔨 |
| Ruby | 🔨 WIP | ruby, rails | 🔨 |
| PHP | 🔨 WIP | php, composer | 🔨 |

---

## 📖 Documentation

- [Installation Guide](docs/INSTALL.md)
- [Examples](docs/EXAMPLES.md)
- [API Documentation](docs/API.md)
- [CLI Commands](docs/CLI.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

---

## 💰 Pricing

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Compressions/month | 100 | Unlimited | Unlimited |
| CLI Tool | ✅ | ✅ | ✅ |
| Basic Deduplication | ✅ | ✅ | ✅ |
| LLM Root Cause | ❌ | ✅ | ✅ |
| Fix Suggestions | ❌ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ |
| Team Collaboration | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |
| Price | $0 | $9/mo | $29/mo |

[Upgrade →](https://errorpare.app/pricing)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

### How to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- 💰 Sponsor the project

---

## 📜 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 📬 Contact

- 💬 [Discord](https://discord.gg/errorpare)
- 🐦 [Twitter/X](https://twitter.com/errorpare)
- 📧 [Email](mailto:hello@errorpare.app)
- 🐙 [GitHub Issues](https://github.com/errorpare/errorpare/issues)

---

<div align="center">

**Clearer Errors for Better AI Development ❤️**

Made with ❤️ by the ErrorPare Team

</div>
