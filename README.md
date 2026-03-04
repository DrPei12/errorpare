# ErrorPare

<div align="center">

![ErrorPare Logo](https://raw.githubusercontent.com/DrPei12/errorpare/main/docs/logo.png)

**LLM 报错信息压缩工具 | 减少 Token 消耗 | 提升调试效率**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://typescriptlang.org)
[![npm](https://img.shields.io/npm/v/errorpare.svg)](https://www.npmjs.com/package/errorpare)

[English](README_EN.md) | [中文](README.md)

</div>

---

## 📖 目录

- [简介](#-简介)
- [核心功能](#-核心功能)
- [技术架构](#-技术架构)
- [快速开始](#-快速开始)
- [使用示例](#-使用示例)
- [API 文档](#-api-文档)
- [支持的语言](#-支持的语言)
- [贡献指南](#-贡献指南)
- [开发计划](#-开发计划)

---

## 📌 简介

ErrorPare 是一款专为 AI 开发者设计的报错信息压缩工具。在使用 Claude Code、Gemini CLI 等 AI 编程助手时，冗长的错误堆栈会占用大量 Token，增加成本并降低响应速度。

**ErrorPare 通过智能去重和压缩，可以减少 60-90% 的 Token 消耗**，让 AI 更专注于解决问题而非阅读冗余信息。

### 核心价值

| 维度 | 问题 | ErrorPare 解决方案 |
|------|------|------------------|
| **Token 成本** | 冗长报错占用大量 Token | 智能去重，压缩率 60-90% |
| **调试效率** | AI 需要阅读大量冗余信息 | 突出关键错误，折叠第三方库 |
| **开发体验** | 手动复制粘贴效率低 | CLI 一键压缩，无缝集成 |

---

## ✨ 核心功能

### 1. 智能去重

自动检测并合并重复的错误堆栈，使用改进的 Drain3 算法进行模板匹配。

```bash
# 输入：100 条重复错误
# 输出：1 条唯一错误 + 出现次数统计

[100x] TypeError: Cannot read property 'id' of undefined
  at UserController.js:22
  variables: prop=id
```

### 2. Git 感知过滤

自动识别并折叠第三方库的堆栈帧，突出显示你的业务代码。

```bash
# 原始堆栈：120 行（80 行来自 node_modules）
# 过滤后：15 行（仅显示业务代码）

[80 frames collapsed: node_modules, site-packages, etc.]
```

### 3. 变量遮蔽

自动替换敏感值和变化值，提高去重率。

| 类型 | 示例 | 遮蔽后 |
|------|------|--------|
| IP 地址 | `192.168.1.100` | `<IP>` |
| UUID | `550e8400-e29b-...` | `<UUID>` |
| 文件路径 | `/home/user/project` | `<PATH>` |
| 十六进制 | `0x7fff5fbff6c0` | `<HEX>` |

### 4. 多语言支持

支持主流编程语言和框架的错误格式解析。

### 5. 根因分析（Phase 2）

- **本地规则引擎**：50+ 常见错误模式匹配
- **LLM 深度分析**：可选配置自选模型

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        ErrorPare CLI                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Command Executor                         │ │
│  │         (执行用户命令，捕获 stdout/stderr)                   │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Pre-Filter Layer                          │ │
│  │         (行数限制 / 重复检测 / 语言识别)                      │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Compression Layer                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │ │
│  │  │ Git 感知过滤  │  │ Drain3 去重   │  │ 变量遮蔽     │      │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                           │                                      │
│                           ▼                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Analysis Layer (可选)                     │ │
│  │         (本地规则引擎 / LLM 根因分析)                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 核心模块

| 模块 | 文件 | 功能 |
|------|------|------|
| **压缩引擎** | `src/core/compressor.ts` | 主压缩逻辑，语言检测 |
| **去重过滤器** | `src/core/filters/deduplicator.ts` | Drain3 算法实现 |
| **Git 感知过滤** | `src/core/filters/git-aware.ts` | 第三方库折叠 |
| **堆栈解析器** | `src/core/parsers/stack-trace.ts` | 多语言 stack trace 解析 |
| **CLI 命令** | `src/cli/commands/*.ts` | run/compress/init 命令 |

---

## 🚀 快速开始

### 安装

```bash
# npm (推荐)
npm install -g errorpare

# pnpm
pnpm add -g errorpare

# yarn
yarn global add errorpare
```

### 基础使用

```bash
# 执行命令并自动压缩错误
errorpare run "npm run build"

# 压缩错误文件
errorpare compress errors.txt -o result.json

# 从 stdin 读取
echo "TypeError: x is undefined" | errorpare compress -

# 查看帮助
errorpare --help
```

---

## 📝 使用示例

### 示例 1：压缩 TypeScript 构建错误

```bash
$ errorpare run "tsc --noEmit"

[ErrorPare] tsc --noEmit failed (exit code 2)
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

### 示例 2：压缩 Python Traceback

```bash
$ errorpare run "pytest tests/"

[ErrorPare] pytest tests/ failed (exit code 1)

═══════════════════════════════════════════════════════════════

[12x] traceback:
  File "app.py", line 42, in process
    result = handler(data)
  File "handlers.py", line 18, in handle
    return data['value']
KeyError: 'value'

Location: handlers.py:18
Suggestion: Check if 'value' key exists before accessing

═══════════════════════════════════════════════════════════════
```

### 示例 3：JSON 输出（集成 AI 工具）

```bash
$ errorpare compress errors.txt --json

{
  "originalLines": 120,
  "compressedLines": 15,
  "compressionRate": 0.875,
  "errors": [
    {
      "count": 45,
      "type": "TypeError",
      "message": "Cannot read property 'id' of undefined",
      "location": "UserController.js:22",
      "variables": ["prop=id"]
    }
  ]
}
```

---

## 🔌 API 文档

### Node.js 库使用

```typescript
import { compress, analyze } from 'errorpare';

// 压缩错误
const result = compress(errors, {
  language: 'typescript',
  maxLines: 1000,
  gitAware: true,
});

console.log(result.formatted);
console.log(`Compression rate: ${result.compressionRate}`);

// 深度分析（需要配置 LLM）
const analysis = await analyze(errors, {
  language: 'typescript',
  llmModel: 'kimi-k2.5',
});

console.log(analysis.rootCause);
console.log(analysis.suggestion);
```

### 配置选项

```typescript
interface ErrorPareOptions {
  language?: 'typescript' | 'python' | 'go' | 'java' | 'rust' | 'cpp';
  maxLines?: number;           // 最大行数（默认：1000）
  gitAware?: boolean;          // Git 感知过滤（默认：true）
  projectRoot?: string;        // 项目根目录
  analyze?: boolean;           // 启用 LLM 分析（默认：false）
  llmModel?: string;           // LLM 模型（需要配置）
}
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

## 🤝 贡献指南

欢迎贡献代码！请阅读 [贡献指南](CONTRIBUTING.md)。

### 添加新语言支持

1. 在 `src/languages/` 创建新语言文件
2. 实现错误模式正则和 stack trace 解析
3. 在 `src/core/compressor.ts` 注册语言检测
4. 添加测试用例

### 提交 PR 流程

```bash
# Fork 项目
git clone https://github.com/DrPei12/errorpare.git

# 创建分支
git checkout -b feature/add-ruby-support

# 开发并提交
git add .
git commit -m "feat: Add Ruby language support"

# 推送并创建 PR
git push origin feature/add-ruby-support
```

---

## 📅 开发计划

### Phase 2 (进行中)

| 功能 | 状态 | 预计完成 |
|------|------|----------|
| 配置系统（交互式向导） | 🟡 进行中 | 2026-03-16 |
| 本地规则引擎（50+ 规则） | 🟡 进行中 | 2026-03-16 |
| LLM 根因分析 | ⚪ 计划中 | 2026-03-23 |
| C/C++ 支持 | ⚪ 计划中 | 2026-03-23 |
| Ruby/PHP 支持 | ⚪ 计划中 | 2026-03-30 |

详细计划请查看：[Phase 2 开发计划](docs/PHASE2_PLAN.md)

---

## 📜 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件。

---

## 📬 联系

- 🐙 [GitHub Issues](https://github.com/DrPei12/errorpare/issues)
- 📧 [Email](mailto:hello@errorpare.app)
- 📦 [npm](https://www.npmjs.com/package/errorpare)

---

<div align="center">

**用 ErrorPare，让报错更清晰 ❤️**

Made with ❤️ by the ErrorPare Team

</div>
