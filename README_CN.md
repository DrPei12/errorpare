# ErrorPare

<div align="center">

![ErrorPare logo](https://raw.githubusercontent.com/DrPei12/errorpare/main/docs/logo.png)

**把嘈杂的 stderr 压缩成适合模型阅读的调试载荷**

[![npm version](https://img.shields.io/npm/v/errorpare.svg)](https://www.npmjs.com/package/errorpare)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)

[English](README_EN.md) | [简体中文](README_CN.md)

</div>

ErrorPare 是一个面向 AI 辅助调试工作流的 CLI 和 MCP Server。

它位于“失败命令”和“模型”之间，把原始 stderr 压缩成更小、更可行动的结果，重点包括：

- 合并重复错误
- 折叠第三方堆栈帧
- 通过 source map 还原 JavaScript / TypeScript 原始源码位置
- 自动附加报错附近的代码上下文
- 输出稳定 JSON，方便下游代理和自动化工具消费
- 可选使用轻量 LLM 做根因分析

## 为什么做这个

现代编码代理并不缺推理能力，缺的是干净输入。真实项目里的 stderr 经常混着重复堆栈、打包后文件位置、第三方依赖帧和业务日志噪音。

ErrorPare 的目标是先把这些噪音处理掉，再把更高质量的调试信息交给 Claude、Cursor、Codex、MCP 客户端、CI 机器人或其他调试流水线。

## 功能概览

- 智能错误去重和出现次数统计
- JavaScript / TypeScript source map 还原
- 可选附加报错附近代码上下文
- 面向自动化的稳定 JSON 输出
- 可选 LLM 根因分析
- 面向 Claude Desktop、Cursor 和其他 MCP 客户端的 MCP Server
- 面向 CI 失败压缩的一方 GitHub Action

## 安装

要求：

- Node.js 18 或更高版本

全局安装：

```bash
npm install -g errorpare
```

或直接使用 `npx`：

```bash
npx errorpare --help
```

## 快速开始

压缩失败命令的输出：

```bash
errorpare run "npm run build"
```

输出纯 JSON，供下游代理消费：

```bash
errorpare run "npm run build" --json
```

附加代码上下文并启用分析：

```bash
errorpare run "npm run build" --json --analyze --context-lines 5
```

压缩已有日志文件：

```bash
errorpare compress errors.log --json
```

从 stdin 读取错误文本：

```bash
cat errors.log | errorpare compress - --json
```

## JSON 输出包含什么

JSON 接口面向机器消费，当前主要包含：

- 执行元数据
- 压缩统计
- 合并后的错误条目
- source map 还原后的位置
- 可选代码上下文
- 可选 `llmAnalysis`
- 显式分析状态元数据

示例结构：

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

## LLM 分析

可以交互式初始化分析配置：

```bash
errorpare init --analyze
```

在交互式终端中，`errorpare init --analyze` 会启动内置的 `model-catlog-builder` 引导流程，覆盖 ErrorPare 当前可以执行的 Provider。选中的 Provider、模型和验证后的 API Key 会自动写回 ErrorPare 自己的配置。

生成的引导状态保存在：

```text
~/.errorpare/model-catalog/
```

该运行时目录包含：

- ErrorPare 使用的种子模型目录快照
- 租户级 routing config
- 加密后的 Provider 凭据
- 供应用侧读取的 `user-model-profile.json`

如果某个 Provider 已被 ErrorPare 支持，但内置引导流程尚未覆盖，ErrorPare 会回退到传统环境变量配置方式。

也可以直接设置 Provider 对应环境变量：

- `ERRORPARE_OPENAI_API_KEY`
- `ERRORPARE_ANTHROPIC_API_KEY`
- `ERRORPARE_DEEPSEEK_API_KEY`
- `ERRORPARE_MOONSHOT_API_KEY`
- `ERRORPARE_BAILIAN_API_KEY`
- `ERRORPARE_GROQ_API_KEY`
- `ERRORPARE_GEMINI_API_KEY`

## MCP Server

ErrorPare 自带 MCP Server 入口：

```bash
errorpare-mcp
```

可用工具：

- `run_command`
- `compress_errors`
- `analyze_errors`

相关文档：

- [MCP 集成总览](docs/MCP_INTEGRATION.md)
- [Claude Desktop 配置](docs/MCP_CLAUDE_DESKTOP.md)
- [Cursor 配置](docs/MCP_CURSOR.md)

## GitHub Action

ErrorPare 也提供面向 CI 的一方 GitHub Action：

```yaml
- name: Run build through ErrorPare
  id: errorpare
  uses: DrPei12/errorpare@v2.1.0
  with:
    command: npm run build
    context-lines: "5"
```

Action 输出包括：

- `json-path`
- `success`
- `exit-code`
- `error-count`
- `analysis-succeeded`

完整工作流示例和 CI 内 LLM 分析配置见 [GitHub Action 文档](docs/GITHUB_ACTION.md)。

## 支持语言

当前解析效果最强的语言：

- TypeScript 和 JavaScript
- Python
- Go
- Java
- Rust

其他语言仍可按通用错误压缩处理，但解析质量还不一定达到同等水平。

## 项目状态

ErrorPare 正在持续维护，已经适用于：

- 本地 AI 调试工作流
- 机器可读 JSON 流水线
- CI 失败摘要
- MCP 工具集成

项目仍在继续演进：

- 噪音过滤启发式规则
- Provider 与模型管理
- 更深入的 CI 和 PR 集成

## 开发

安装依赖：

```bash
npm install
```

运行检查：

```bash
npm run check
```

构建项目：

```bash
npm run build
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。

- 阅读 [贡献指南](CONTRIBUTING.md)
- 查看 [行为准则](CODE_OF_CONDUCT.md)
- 通过 [安全策略](SECURITY.md) 报告漏洞
- 查看 [路线图](ROADMAP.md)
- 从 [good first issues](GOOD_FIRST_ISSUES.md) 选择任务

## 文档

- [API 参考](docs/API.md)
- [GitHub Action 文档](docs/GITHUB_ACTION.md)
- [模型目录集成说明](docs/MODEL_CATALOG_INTEGRATION.md)
- [更新日志](CHANGELOG.md)

## 许可证

MIT。详见 [LICENSE](LICENSE)。

