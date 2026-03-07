# Claude Desktop 配置 ErrorPare MCP

## 前提

- 已安装 Node.js 18+
- 能在终端运行 `npx errorpare-mcp`

## 配置文件位置

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

## 示例配置

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

如果你希望固定版本或本地源码路径：

```json
{
  "mcpServers": {
    "errorpare": {
      "command": "node",
      "args": ["D:/projects/ErrorPare/dist/bin/mcp.js"]
    }
  }
}
```

## 验证步骤

1. 重启 Claude Desktop
2. 在工具列表中确认 `errorpare` 已出现
3. 让 Claude 调用 `compress_errors`，输入一段 TypeScript 报错
4. 再调用 `run_command`，例如 `npm run build`

## 推荐提示词

```text
当需要查看构建或测试错误时，优先调用 ErrorPare 的 MCP 工具。
如果已经有报错文本，使用 compress_errors 或 analyze_errors。
如果需要执行命令并收集错误，使用 run_command，并传入 projectRoot。
```

## 常见问题

### Claude 看不到工具

- 检查 JSON 是否合法
- 先在终端执行一次 `npx errorpare-mcp`
- 确认 Claude Desktop 已完全退出后重新打开

### 命令执行目录不对

在工具调用里传入 `cwd` 和 `projectRoot`，不要依赖 Claude 猜测当前仓库目录。

### source map 没有还原

给 `run_command` / `compress_errors` 传 `projectRoot`，并确认构建产物旁边存在 `.map` 文件。
