# ErrorPare

<div align="center">

![ErrorPare logo](https://raw.githubusercontent.com/DrPei12/errorpare/main/docs/logo.png)

**把嘈杂的 stderr 清洗成更适合 AI 编码代理消费的调试载荷**

[English](README.md) | [中文](README.zh-CN.md)

</div>

ErrorPare 是一个面向 AI 调试工作流的 CLI 和 MCP Server。

它位于“失败命令”和“模型”之间，把原始 stderr 压缩成更小、更可行动的结果，重点包括：

- 合并重复错误
- 折叠第三方堆栈帧
- 通过 source map 还原 JavaScript / TypeScript 原始源码位置
- 自动附加报错附近的代码上下文
- 输出稳定的 JSON，方便下游代理和自动化工具消费
- 可选使用轻量 LLM 做根因分析

## 为什么做这个

现在的编码代理并不缺推理能力，缺的是干净输入。

真实项目里的报错经常混杂：

- 重复堆栈
- 打包后的 `dist/*.js` 位置
- 第三方依赖帧
- 业务日志噪音

ErrorPare 的目标就是把这些噪音先处理掉，再把更高质量的调试信息交给 Claude、Cursor、Codex、MCP 客户端或 CI 机器人。

## 功能概览

- 智能去重和出现次数统计
- TypeScript / JavaScript source map 还原
- 可选代码上下文片段
- 纯 JSON 输出模式
- 可选 LLM 根因分析
- MCP Server 集成

## 安装

要求：

- Node.js 18 或更高版本

全局安装：

```bash
npm install -g errorpare
```

或直接用 `npx`：

```bash
npx errorpare --help
```

## 快速开始

压缩失败命令的输出：

```bash
errorpare run "npm run build"
```

输出纯 JSON：

```bash
errorpare run "npm run build" --json
```

附加代码上下文并启用分析：

```bash
errorpare run "npm run build" --json --analyze --context-lines 5
```

压缩现有日志文件：

```bash
errorpare compress errors.log --json
```

从 stdin 读取：

```bash
cat errors.log | errorpare compress - --json
```

## JSON 输出包含什么

当前 JSON 输出主要包含：

- 执行元数据
- 压缩统计信息
- 合并后的错误列表
- source map 还原后的位置
- 可选代码上下文
- 可选 `llmAnalysis`
- 显式的分析状态字段

## LLM 分析配置

可以交互式初始化：

```bash
errorpare init --analyze
```

也可以直接配置环境变量：

- `ERRORPARE_OPENAI_API_KEY`
- `ERRORPARE_ANTHROPIC_API_KEY`
- `ERRORPARE_DEEPSEEK_API_KEY`
- `ERRORPARE_MOONSHOT_API_KEY`
- `ERRORPARE_BAILIAN_API_KEY`
- `ERRORPARE_GROQ_API_KEY`
- `ERRORPARE_GEMINI_API_KEY`

## MCP Server

启动 MCP Server：

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

## 开发

安装依赖：

```bash
npm install
```

运行检查：

```bash
npm run check
```

构建：

```bash
npm run build
```

## 参与贡献

- [贡献指南](CONTRIBUTING.md)
- [行为准则](CODE_OF_CONDUCT.md)
- [安全策略](SECURITY.md)
- [公开路线图](ROADMAP.md)
- [适合新贡献者的任务](GOOD_FIRST_ISSUES.md)

## 许可证

MIT，详见 [LICENSE](LICENSE)。
