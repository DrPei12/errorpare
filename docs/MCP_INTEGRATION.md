# ErrorPare MCP 集成指南

ErrorPare 可以作为一个本地 MCP Server 暴露给 Claude Desktop、Cursor 和其他支持 Model Context Protocol 的客户端。这样 AI 不需要手动复制长报错，而是可以直接调用 ErrorPare 的压缩、分析和命令执行能力。

## 提供的能力

- `run_command`: 执行命令并返回压缩后的错误输出
- `compress_errors`: 压缩已有报错文本
- `analyze_errors`: 基于本地规则引擎做诊断，并可附带压缩结果
- `resources/list` / `resources/read`: 暴露 MCP 集成文档资源

## 启动方式

```bash
npx errorpare-mcp
```

如果你是从源码运行：

```bash
npm install
npm run build
node dist/bin/mcp.js
```

## 推荐工作流

1. 在 MCP 客户端中注册 `errorpare-mcp`
2. 让 AI 优先调用 `run_command` 而不是直接执行构建命令
3. 当你已经有现成报错文本时，调用 `compress_errors`
4. 当你希望本地先给出原因分类和建议时，调用 `analyze_errors`

## 参数建议

- `projectRoot`: 传当前仓库根目录，能提升 Git-aware 过滤和 source map 还原准确率
- `contextLines`: 建议 `1-3`
- `sourceMaps`: JS/TS 项目保持默认 `true`
- `gitAware`: 默认 `true`，非 JS/TS 场景也建议开启

## 常见返回字段

- `compression.originalLines`: 原始报错行数
- `compression.compressedLines`: 压缩后错误条目数
- `compression.sourceMappedFrames`: 被 source map 还原的帧数
- `errors[].location`: 还原后的源码位置
- `errors[].originalLocation`: 构建产物中的原始位置

## 故障排查

- `Tool not found`: 客户端缓存了旧的 tool 列表，重启 MCP 客户端
- `Failed to read resource`: 当前安装包未包含 `docs/`，请升级到包含文档资源的版本
- source map 未命中：确认构建产物包含 `sourceMappingURL` 注释或同名 `.map` 文件

## 相关文档

- [Claude Desktop 配置](./MCP_CLAUDE_DESKTOP.md)
- [Cursor 配置](./MCP_CURSOR.md)
