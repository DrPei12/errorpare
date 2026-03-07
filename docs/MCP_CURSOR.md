# Cursor 配置 ErrorPare MCP

## 配置文件

在项目或全局的 Cursor MCP 配置中加入 `errorpare`。

常见位置：

- 项目级：`.cursor/mcp.json`
- 全局：Cursor 设置中的 MCP 配置面板

## 项目级示例

```json
{
  "mcpServers": {
    "errorpare": {
      "command": "npx",
      "args": ["errorpare-mcp"]
    }
  }
}
```

如果你是本地开发 ErrorPare：

```json
{
  "mcpServers": {
    "errorpare": {
      "command": "node",
      "args": ["./dist/bin/mcp.js"]
    }
  }
}
```

## 推荐用法

- 让 Cursor 在执行测试、构建、lint 失败时优先调用 `run_command`
- 粘贴已有错误日志时，调用 `compress_errors`
- 需要快速归因时，调用 `analyze_errors`

## 推荐规则

```text
When a shell command fails, prefer the ErrorPare MCP server.
Always pass projectRoot for repositories with source maps.
Use analyze_errors before asking for manual diagnosis.
```

## 排查建议

- Cursor 显示连接失败：先在终端确认 `npx errorpare-mcp` 可启动
- 工具列表缺失：刷新 MCP 配置或重启 Cursor
- 结果里没有源码位置：确认 `sourceMaps` 未被关闭，且 `.map` 文件存在
