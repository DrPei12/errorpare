# ErrorPare

<div align="center">

![ErrorPare Logo](docs/logo.svg)

**LLM报错信息压缩工具 | 减少Token消耗 | 提升调试效率**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)

[English](README_EN.md) | [中文](README.md)

</div>

---

## ✨ 特性

- 🚀 **智能去重** - 自动检测并压缩重复报错，60-90%压缩率
- 📊 **Token优化** - 专为LLM设计，减少上下文消耗
- 🌍 **多语言支持** - TypeScript、Python、Go、Java、Rust等
- 🔧 **多种使用方式** - CLI工具、SaaS网站、OpenClaw Skills
- 📈 **根因分析** - Pro版本提供智能错误分析
- 🔒 **安全可靠** - 本地处理，数据不外传

---

## 🚀 快速开始

### 安装

```bash
# npm
npm install -g errorpare

# pnpm
pnpm add -g errorpare

# yarn
yarn global add errorpare
```

### 使用

```bash
# 压缩错误文件
errorpare compress errors.txt -o result.json

# 分析日志
errorpare analyze compile.log

# 查看帮助
errorpare --help
```

### 在线体验

访问 [errorpare.app](https://errorpare.app) 在线使用。

---

## 📊 效果演示

### 压缩前后对比

| 指标 | 压缩前 | 压缩后 |
|-----|--------|--------|
| 错误数量 | 100条 | 12条 |
| Token消耗 | 15,000 | 1,800 |
| 压缩率 | - | **88%** |

### 示例输入

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

### 输出结果

```
=== 错误压缩报告 ===

原始错误: 100条
去重后: 1条唯一错误
压缩率: 99%

唯一错误:
1. [100x] TypeError: Cannot read property 'x' of undefined
   位置: foo.js:10:5
   建议: 检查变量是否已定义
```

---

## 📦 安装方式

### CLI工具

```bash
npm install -g errorpare
errorpare --help
```

### Node.js库

```bash
npm install errorpare
```

```typescript
import { compress, analyze } from 'errorpare';

// 压缩错误
const result = compress(errors);
console.log(result.formatted);

// 深度分析
const analysis = await analyze(errors);
console.log(analysis.rootCause);
```

### OpenClaw Skills

在OpenClaw中直接使用：

```typescript
// 当用户发送报错信息时
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

## 🛠️ 支持的语言

| 语言 | 状态 | 错误格式 | Stack Trace |
|-----|------|---------|-------------|
| TypeScript/JavaScript | ✅ 稳定 | ts-node, Vite, esbuild | ✅ |
| Python | ✅ 稳定 | pip, pytest, mypy | ✅ |
| Go | ✅ 稳定 | go build, go test | ✅ |
| Java | ✅ 稳定 | javac, maven, gradle | ✅ |
| Rust | ✅ 稳定 | cargo | ✅ |
| C/C++ | 🔨 开发中 | gcc, clang | 🔨 |
| Ruby | 🔨 开发中 | ruby, rails | 🔨 |
| PHP | 🔨 开发中 | php, composer | 🔨 |

---

## 📖 文档

- [安装指南](docs/INSTALL.md)
- [使用示例](docs/EXAMPLES.md)
- [API文档](docs/API.md)
- [CLI命令](docs/CLI.md)
- [贡献指南](CONTRIBUTING.md)
- [更新日志](CHANGELOG.md)

---

## 💰 定价

| 功能 | 免费版 | Pro版 | Team版 |
|-----|--------|-------|--------|
| 压缩次数/月 | 100 | 无限 | 无限 |
| CLI工具 | ✅ | ✅ | ✅ |
| 基础去重 | ✅ | ✅ | ✅ |
| LLM根因分析 | ❌ | ✅ | ✅ |
| 修复建议 | ❌ | ✅ | ✅ |
| API访问 | ❌ | ✅ | ✅ |
| 团队协作 | ❌ | ❌ | ✅ |
| 优先支持 | ❌ | ❌ | ✅ |
| 价格 | $0 | $9/月 | $29/月 |

[立即升级 →](https://errorpare.app/pricing)

---

## 🤝 贡献

欢迎贡献代码！请阅读 [贡献指南](CONTRIBUTING.md)。

### 贡献方式

- 🐛 报告Bug
- 💡 提出新功能
- 📝 完善文档
- 🔧 提交Pull Request
- 💰 赞助项目

### 赞助商

---

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件。

---

## 📬 联系

- 💬 [Discord社区](https://discord.gg/errorpare)
- 🐦 [Twitter/X](https://twitter.com/errorpare)
- 📧 [Email](mailto:hello@errorpare.app)
- 🐙 [GitHub Issues](https://github.com/errorpare/errorpare/issues)

---

<div align="center">

**用ErrorPare，让报错更清晰 ❤️**

Made with ❤️ by the ErrorPare Team

</div>
