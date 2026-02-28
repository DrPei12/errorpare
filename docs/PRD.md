# ErrorPare PRD - 企业级 AI 报错压缩工具

**版本:** 1.0.1  
**状态:** 🟢 正式版  
**作者:** ErrorPare Team  
**日期:** 2026-02-24

---

## 文档修订历史

| 版本 | 日期 | 修改人 | 变更说明 |
|------|------|--------|----------|
| 1.0.0 | 2026-02-24 | Evan | 初始版本 - 终极方案架构 |
| 1.0.1 | 2026-02-24 | Evan | 补充 Git 感知过滤、TTY 透传、AI 集成、MCP 优先级调整 |

---

## 1. 产品愿景

### 1.1 核心价值主张

**让 AI 开发工具更快、更省、更隐形**

| 维度 | 痛点 | 解决方案 |
|------|------|----------|
| **速度** | 高级模型处理冗余报错浪费时间 | 本地脚本毫秒级预压缩 |
| **成本** | 冗余报错占用大量 Token | 智能去重，压缩率 60-90% |
| **体验** | 文件操作污染项目目录 | 内存管道，零文件落盘 |
| **集成** | 手动复制粘贴效率低 | MCP 协议，无缝嵌入 Claude/Gemini |

### 1.2 产品定位

```
┌─────────────────────────────────────────────────────────────────┐
│                         AI 开发工具链                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   高级模型 (Claude/Gemini)  ←── 零延迟 ──→  ErrorPare           │
│        ↑                                              ↓          │
│        │                                    ┌──────────────────┐│
│        │                                    │ 本地压缩 (Drain3)││
│        │                                    │ 廉价模型 (可选)  ││
│        │                                    └──────────────────┘│
│        │                                              ↓          │
│        └────────────── 压缩后报错 ←─────────────────┘           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**ErrorPare = AI 开发者的"报错减速带"**  
在冗余信息进入高级模型之前完成过滤，让模型专注于解决问题而非阅读垃圾。

---

## 2. 技术架构

### 2.1 系统架构图

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              用户终端                                        │
│                                                                            │
│   $ errorpare run "npm run build"                                          │
└────────────────────────────────┬───────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                           ErrorPare Engine                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Command Executor                              │  │
│  │         (child_process.spawn / subprocess.Popen)                    │  │
│  │                                                                       │  │
│  │   • 执行用户命令                                                      │  │
│  │   • 捕获 stdout / stderr                                             │  │
│  │   • 流式管道传递                                                     │  │
│  └────────────────────────────┬────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        Pre-Filter Layer                               │  │
│  │              (本地脚本预过滤 - 毫秒级)                                 │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │   │ 行数限制器  │  │ 重复检测   │  │ 语言检测   │                   │  │
│  │   │ (1000行)   │  │ (HashSet)  │  │ (正则)     │                   │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                   │  │
│  │                                                                       │  │
│  │   输出: 10000 Token → 1000 Token (10ms)                              │  │
│  └────────────────────────────┬────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Compression Layer                                 │  │
│  │               (核心压缩引擎 - 毫秒级)                                   │  │
│  │                                                                       │  │
│  │   ┌─────────────────────────────────────────────────────────────┐    │  │
│  │   │                    Drain3 Algorithm                          │    │  │
│  │   │  ┌───────────┐  ┌───────────┐  ┌───────────┐                │    │  │
│  │   │  │ 模板挖掘  │  │ 变量遮蔽  │  │ 相似度匹配│                │    │  │
│  │   │  │ Template  │  │ Masking   │  │ Similarity│                │    │  │
│  │   │  └───────────┘  └───────────┘  └───────────┘                │    │  │
│  │   └─────────────────────────────────────────────────────────────┘    │  │
│  │                                                                       │  │
│  │   支持语言: TS/JS, Python, Go, Java, Rust, C/C++, Ruby, PHP, C#       │  │
│  └────────────────────────────┬────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     Analysis Layer (可选)                              │  │
│  │               (LLM 分析层 - 秒级)                                      │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │  │
│  │   │  Groq API  │  │DeepSeek API│  │ OpenAI API │                  │  │
│  │   │ (极速)     │  │ (低成本)   │  │ (通用)     │                  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                  │  │
│  │                                                                       │  │
│  │   输出: 根因分析 + 修复建议 (JSON)                                     │  │
│  └────────────────────────────┬────────────────────────────────────────┘  │
│                               │                                             │
│                               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         Output Layer                                   │  │
│  │                                                                       │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │  │
│  │   │  stdout    │  │   JSON      │  │   MCP      │                  │  │
│  │   │  流式输出  │  │  结构化     │  │   协议     │                  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘                  │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块说明

| 模块 | 职责 | 技术选型 | 性能目标 |
|------|------|----------|----------|
| **CommandExecutor** | 执行命令，捕获输出 | Node.js: `spawn` / Python: `subprocess` | < 10ms |
| **PreFilter** | 本地预过滤，行数限制 | TypeScript: 内置方法 | < 10ms |
| **Drain3Engine** | 模板挖掘，变量遮蔽 | 移植 IBM Drain3 | < 100ms |
| **LanguageParser** | 多语言栈解析 | stacktracey + 正则 | < 50ms |
| **LLMAnalyzer** | 根因分析 (可选) | Groq/DeepSeek API | 500ms-2s |
| **OutputFormatter** | 格式化输出 | 内置 | < 5ms |

### 2.3 数据流

```
用户命令
    │
    ▼
┌─────────────┐
│ Command     │
│ Executor    │
└──────┬──────┘
       │ stdout / stderr
       ▼
┌─────────────┐     ┌─────────────┐
│ Pre-Filter  │────▶│ Drain3      │
│ (行数/去重) │     │ Compression │
└─────────────┘     └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ LLM Analysis│ (可选)
                    │ (可选)      │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ Output      │
                    │ (stdout/JSON│
                    └─────────────┘
```

---

## 3. 功能规格

### 3.1 核心功能

#### 3.1.1 命令拦截模式 (Core)

```bash
# 基本用法
errorpare run "npm run build"

# 指定语言
errorpare run "npm run build" --lang python

# 仅本地压缩 (不使用 LLM)
errorpare run "npm run build" --local

# 带 LLM 分析
errorpare run "npm run build" --analyze

# 调试模式
errorpare run "npm run build" --debug
```

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 命令执行 | 执行任意 shell 命令 | P0 |
| stdout 透传 | 正常输出直接打印到终端 | P0 |
| stderr 拦截 | 捕获错误输出到内存 | P0 |
| 退出码透传 | 命令成功/失败状态码传递 | P0 |

#### 3.1.2 本地压缩引擎 (Core)

│  3. 1. 2.  本地压缩引擎 (Core)

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 模板挖掘 | 基于 Drain3 算法提取错误模板 | P0 |
| 变量遮蔽 | 自动替换 IP/路径/UUID/Hex 为占位符 | P0 |
| 重复检测 | HashSet 快速去重 | P0 |
| 行数限制 | 最大保留最近 N 行 (默认 1000) | P0 |
| 语言识别 | 自动检测错误语言类型 | P1 |
| **Git 感知堆栈折叠** | 折叠第三方框架堆栈 (node_modules/site-packages) | P0 |

#### 3.1.3 LLM 分析层 (Optional)

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 根因分析 | 分析错误链，给出可能原因 | P2 |
| 修复建议 | 基于错误类型给出解决方案 | P2 |
| 代码片段 | 提供可能的修复代码 | P2 |

#### 3.1.4 输出格式

**stdout 文本输出:**
```
[ErrorPare] Command executed: npm run build
[ErrorPare] Exit code: 1
[ErrorPare] Compressing 847 lines...
[ErrorPare] Compression: 78% (847 → 186 lines)
[ErrorPare] Deduplicated: 12 unique errors
─────────────────────────────────────────────────

[45x] TypeError: Cannot read property '{prop}' of undefined
  at /app/controllers/user.js:22:35
  variables: prop=id

[23x] Error: Cannot find module '{module}'
  at /app/routes/index.js:5:12
  variables: module=lodash

[12x] SyntaxError: Unexpected token '{token}'
  at /app/utils/helpers.js:10:8
  variables: token=}
```

**JSON 结构化输出:**
```json
{
  "success": false,
  "exitCode": 1,
  "command": "npm run build",
  "timing": {
    "total": 145,
    "compression": 23,
    "analysis": 120
  },
  "compression": {
    "originalLines": 847,
    "compressedLines": 186,
    "rate": 0.78,
    "uniqueErrors": 12
  },
  "errors": [
    {
      "count": 45,
      "template": "TypeError: Cannot read property '{prop}' of undefined",
      "location": "/app/controllers/user.js:22:35",
      "variables": [
        { "name": "prop", "value": "id", "type": "identifier" }
      ],
      "analysis": {
        "rootCause": "Accessing property of undefined object",
        "suggestion": "Add null check before accessing object property"
      }
    }
  ],
  "summary": "Found 12 unique errors from 847 lines. Most common: TypeError (45x)"
}
```

### 3.2 支持的语言

| 语言 | Stack Trace | 变量遮蔽 | 模板识别 |
|------|-------------|----------|----------|
| TypeScript/JavaScript | ✅ | ✅ | ✅ |
| Python | ✅ | ✅ | ✅ |
| Go | ✅ | ✅ | ✅ |
| Java | ✅ | ✅ | ✅ |
| Rust | ✅ | ✅ | ✅ |
| C/C++ | ✅ | ✅ | ✅ |
| Ruby | ✅ | ✅ | ✅ |
| PHP | ✅ | ✅ | ✅ |
| C#/.NET | ✅ | ✅ | ✅ |

### 3.3 集成方式

#### 3.3.1 CLI 接口

```bash
# 安装
npm install -g errorpare

# 基本命令
errorpare run "npm run build"
errorpare run "python main.py"
errorpare run "cargo build"

# 选项
errorpare run "npm run build" --lang ts      # 指定语言
errorpare run "npm run build" --local         # 仅本地压缩
errorpare run "npm run build" --analyze       # 启用 LLM 分析
errorpare run "npm run build" --json          # JSON 输出
errorpare run "npm run build" --max-lines 500 # 最大行数

# 管道模式
npm run build 2>&1 | errorpare compress
```

#### 3.3.2 MCP Server

```json
{
  "name": "errorpare",
  "version": "1.0.0",
  "description": "AI-powered error compression tool",
  "tools": [
    {
      "name": "run_command",
      "description": "Execute a command with error compression",
      "inputSchema": {
        "type": "object",
        "properties": {
          "command": { "type": "string" },
          "language": { "type": "string", "enum": ["ts", "python", "go", "java", "rust", "cpp"] },
          "analyze": { "type": "boolean" },
          "maxLines": { "type": "number" }
        },
        "required": ["command"]
      }
    },
    {
      "name": "compress_errors",
      "description": "Compress existing error text",
      "inputSchema": {
        "type": "object",
        "properties": {
          "errors": { "type": "string" },
          "language": { "type": "string" },
          "analyze": { "type": "boolean" }
        },
        "required": ["errors"]
      }
    }
  ]
}
```

#### 3.3.3 OpenClaw Skill

```typescript
// skill.json
{
  "name": "errorpare",
  "description": "Compress and analyze error messages",
  "commands": [
    {
      "name": "run",
      "description": "Execute command with error compression",
      "parameters": {
        "command": "string",
        "language": "string?",
        "analyze": "boolean?",
        "maxLines": "number?"
      }
    },
    {
      "name": "compress",
      "description": "Compress error text",
      "parameters": {
        "errors": "string",
        "language": "string?",
        "analyze": "boolean?"
      }
    }
  ]
}
```

---

## 4. 非功能性需求

### 4.1 性能要求

│  4. 1.  性能要求

| 指标 | 要求 | 说明 |
|------|------|------|
| **启动时间** | < 100ms | CLI 冷启动 |
| **本地压缩** | < 50ms | 1000 行错误 |
| **LLM 分析** | < 2s | 网络延迟 |
| **内存占用** | < 100MB | 正常操作 |
| **最大处理** | 10MB / 10000 行 | 超出后截断 |

### 4.2 Git 感知堆栈折叠 (Git-Aware Stack Trimming)

**这是省 Token 最有效的"一刀"**

#### 4.2.1 核心痛点

Drain3 只能压缩相似结构，但如果报错里有 50 行是 `node_modules/express/...` 的调用栈，Drain3 不会压缩它（因为它们是唯一的）。

#### 4.2.2 解决方案

在 Pre-Filter Layer 加入**本地项目目录感知**：

```
┌─────────────────────────────────────────────────────────────┐
│                   Git 感知过滤器                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 检测项目根目录 (git ls-files 或 .git 存在)               │
│                                                              │
│  2. 定义第三方路径前缀:                                       │
│     - node_modules/                                          │
│     - site-packages/                                         │
│     - ~/.cargo/registry/                                     │
│     - /root/.cache/                                          │
│     - vendor/bundle/                                         │
│                                                              │
│  3. 折叠规则:                                               │
│     如果堆栈帧路径不包含业务代码 → 折叠为单行                 │
│                                                              │
│  4. 折叠标记:                                               │
│     <node_modules/express/lib/router/index.js:284:7>        │
│     ↓                                                        │
│     <Third-party: 47 hidden frames from express>           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.3 实现示例

```typescript
interface StackFrame {
  file: string;
  line: number;
  column: number;
}

function isThirdPartyPath(path: string, projectRoot: string): boolean {
  const thirdPartyPatterns = [
    'node_modules',
    'site-packages',
    '.cargo/registry',
    '.cache',
    'vendor/bundle',
    '.npm',
    '.pnpm',
  ];
  
  // 绝对路径: 检查是否在项目目录外
  if (path.startsWith(projectRoot)) {
    const relativePath = path.slice(projectRoot.length);
    return thirdPartyPatterns.some(pattern => relativePath.includes(pattern));
  }
  
  // 第三方路径检测
  return thirdPartyPatterns.some(pattern => path.includes(pattern));
}

function collapseThirdPartyFrames(frames: StackFrame[]): string[] {
  const result: string[] = [];
  let hiddenCount = 0;
  let lastThirdParty = '';
  
  for (const frame of frames) {
    if (isThirdPartyPath(frame.file, projectRoot)) {
      hiddenCount++;
      lastThirdParty = extractFrameworkName(frame.file);
    } else {
      if (hiddenCount > 0) {
        result.push(`<Third-party: ${hiddenCount} hidden frames from ${lastThirdParty}>`);
        hiddenCount = 0;
      }
      result.push(`${frame.file}:${frame.line}:${frame.column}`);
    }
  }
  
  return result;
}
```

#### 4.2.4 效果对比

| 场景 | 压缩前 | 压缩后 |
|------|--------|--------|
| React 构建报错 | 120 行 (含 80 行 node_modules) | 15 行 |
| Python 错误 | 60 行 (含 40 行 site-packages) | 12 行 |
| Rust 编译 | 50 行 (含 30 行 cargo registry) | 10 行 |

---

### 4.3 TTY 与 ANSI 颜色保护

**核心痛点**：当用 `spawn` 拦截 stdout 时，原生命令（如 vite、webpack）会认为没有运行在真实 TTY 中，从而关闭彩色高亮和进度条。

#### 4.3.1 解决方案

| 层级 | 方案 |
|------|------|
| **推荐** | 使用 `node-pty` 创建伪终端 (PTY) |
| **备选** | 设置环境变量 `FORCE_COLOR=1` 强制保留颜色 |

#### 4.3.2 实现要求

```typescript
import * as pty from 'node-pty';

function createPtyCommand(command: string, cwd: string) {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  
  const ptyProcess = pty.spawn(shell, ['-c', command], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: cwd,
    env: {
      ...process.env,
      FORCE_COLOR: '1',  // 强制开启颜色
      TERM: 'xterm-256color',
    } as { [key: string]: string },
  });
  
  // stdout 透传 (保留颜色)
  ptyProcess.onData((data) => {
    process.stdout.write(data);
  });
  
  // stderr 拦截 (用于压缩)
  ptyProcess.onExit(({ exitCode }) => {
    // 处理退出码
  });
  
  return ptyProcess;
}
```

#### 4.3.3 非功能要求

| 指标 | 要求 |
|------|------|
| 颜色保留 | 必须保留 ANSI 颜色代码 |
| 进度条 | 必须保留实时进度条 |
| 交互 | 支持用户输入 (stdin) 透传 |

---

### 4.4 输出模式：流式 vs JSON

| 指标 | 要求 |
|------|------|
| **CLI 可用性** | 99.9% |
| **错误恢复** | 优雅降级，报错原始输出 |
| **跨平台** | macOS / Linux / Windows |

### 4.3 安全性要求

| 要求 | 说明 |
|------|------|
| **零数据外传** | 本地压缩模式不调用任何 API |
| **临时文件清理** | 使用系统临时目录，系统自动清理 |
| **敏感信息遮蔽** | 自动遮蔽路径中的用户名等 |

| 进度条 | 支持用户输入 (stdin) 透传 |

---

### 4.4 输出模式：流式 vs JSON

**核心冲突**：JSON 必须等最后一个 `}` 闭合才能解析，无法流式。

#### 4.4.1 输出模式选择

| 场景 | 模式 | 格式 | 原因 |
|------|------|------|------|
| **终端交互** (默认) | 流式 | Markdown/纯文本 | 打字机效果，AI 代理即时阅读 |
| **--json 显式** | 完整 | JSON | 结构化数据，需要完整解析 |
| **MCP Server** | 完整 | JSON | 协议要求 |
| **--analyze** (LLM) | 流式 | Markdown | 边生成边展示，无需等待 |

#### 4.4.2 流式输出示例

```
[ErrorPare] npm run build failed (exit code 1)
[ErrorPare] Compressing 847 lines...
[ErrorPare] Git-aware trimming: 320 third-party frames collapsed
[ErrorPare] Local compression: 78% (847 → 186 lines)

═══════════════════════════════════════════════════════════════

[45x] TypeError: Cannot read property 'id' of undefined
  at UserController.js:22
  → suggestion: Check if user object is defined before access

[23x] Error: Cannot find module 'lodash'
  → suggestion: Run: npm install lodash

═══════════════════════════════════════════════════════════════

[LLM Analysis] (streaming...)
→ Root cause: Asynchronous data loading not awaited
→ Fix: Add await before UserService.getUser() call
```

#### 4.4.3 JSON 输出示例

```json
{
  "success": false,
  "exitCode": 1,
  "mode": "json",
  "compression": {
    "original": 847,
    "compressed": 186,
    "rate": 0.78,
    "thirdPartyCollapsed": 320
  },
  "errors": [
    {
      "count": 45,
      "type": "TypeError",
      "message": "Cannot read property '{prop}' of undefined",
      "location": "UserController.js:22",
      "suggestion": "Check if user object is defined"
    }
  ],
  "llmAnalysis": {
    "rootCause": "Asynchronous data loading not awaited",
    "fix": "Add await before UserService.getUser() call"
  }
}
```

---

## 5. AI 主动调用集成 (AI Prompt Integration)

**核心问题**：Claude Code / Cursor 不会凭空知道要用 ErrorPare。

### 5.1 解决方案

提供 `errorpare init` 命令，自动生成配置文件，注入系统提示词。

### 5.2 实现

```bash
# 在项目根目录执行
$ errorpare init

✅ Created .errorparerc
✅ Created .cursorrules (for Cursor)
✅ Created .claude.md (for Claude Code)

Next steps:
1. Restart your AI assistant
2. ErrorPare will now automatically compress errors before analysis
```

### 5.3 配置文件内容

#### .cursorrules (Cursor)

```
# ErrorPare Integration

## Rules
- When running build/test commands, ALWAYS use `errorpare run "..."` instead of direct commands
- Example: Use `errorpare run "npm run build"` instead of `npm run build`
- This provides compressed error context, reducing token usage by 60-90%

## Commands
- errorpare run "<command>" - Execute with error compression
- errorpare run "<command>" --analyze - Execute with LLM analysis
- errorpare run "<command>" --local - Local compression only (no API)
```

#### .claude.md (Claude Code)

```markdown
# ErrorPare Integration

When you need to run build or test commands, use ErrorPare to compress errors:

GOOD: errorpare run "npm run build"
BAD:  npm run build

ErrorPare automatically:
1. Collapses third-party stack frames (node_modules, etc.)
2. Deduplicates similar errors
3. Masks variables (IPs, paths, UUIDs)
4. Optionally runs LLM analysis

This reduces token usage by 60-90% and gives you cleaner error context.
```

### 5.4 自动检测

当 AI 工具启动时，检测是否存在配置文件：

```typescript
function detectAIConfig(): string[] {
  const configFiles = [
    '.cursorrules',
    '.claude.md', 
    '.claudeCODE',
    '.aider.conf',
    '.github/copilot-instructions.md',
  ];
  
  return configFiles.filter(f => existsSync(f));
}
```

---

## 6. 错误处理

### 5.1 降级策略

| 场景 | 处理方式 |
|------|----------|
| 命令执行失败 | 透传原始 stderr + 退出码 |
| LLM API 超时 | 仅返回本地压缩结果 |
| 内存超限 | 截断到最近 1000 行 |
| 语言检测失败 | 默认使用通用解析器 |

### 5.2 错误码

| 码 | 含义 |
|----|------|
| 0 | 命令成功执行 |
| 1 | 命令执行失败 |
| 2 | 参数错误 |
| 3 | 内部错误 |

---

## 6. 开发计划

### Phase 1: MVP (Week 1-2) - 🚀 最高优先级

> **战略调整**：将 MCP Server 提前到 Phase 1，因为 Anthropic/Cursor 对 MCP 的推崇已达顶峰。Phase 1 通过"Git 感知过滤 + 简单正则"快速跑通，本地 Drain3 可放 Phase 2。

| 任务 | 状态 | 优先级 |
|------|------|--------|
| 项目重构 | ⬜ | P0 |
| CommandExecutor 实现 (含 PTY) | ⬜ | P0 |
| **MCP Server 实现** | ⬜ | P0 |
| **Git 感知堆栈折叠** | ⬜ | P0 |
| **TTY/ANSI 颜色保护** | ⬜ | P0 |
| **errorpare init 集成** | ⬜ | P0 |
| 基础 CLI 接口 | ⬜ | P1 |
| 本地简单压缩 (正则去重) | ⬜ | P1 |

**Phase 1 目标**：
- 可作为 MCP Server 被 Claude/Cursor 调用 ✅
- `errorpare run "npm run build"` 正常工作 ✅
- 折叠第三方框架堆栈 ✅

### Phase 2: 核心压缩 (Week 3-4)

| 任务 | 状态 | 优先级 |
|------|------|--------|
| Drain3 核心算法移植 | ⬜ | P0 |
| 多语言支持完善 | ⬜ | P1 |
| 变量遮蔽增强 | ⬜ | P1 |
| OpenClaw Skill | ⬜ | P2 |

### Phase 3: LLM 集成 (Week 5-6)

| 任务 | 状态 | 优先级 |
|------|------|--------|
| Groq/DeepSeek API 集成 | ⬜ | P0 |
| 流式输出支持 | ⬜ | P0 |
| 根因分析功能 | ⬜ | P1 |
| Pro/Team 版本 | ⬜ | P2 |

### Phase 4: 商业化 (Week 7-8)

| 任务 | 状态 | 优先级 |
|------|------|--------|
| API 服务 | ⬜ | P0 |
| 用户系统 | ⬜ | P1 |
| 支付集成 | ⬜ | P1 |
| 文档完善 | ⬜ | P2 |

---

## 7. 验收标准

### 7.1 功能验收

- [ ] `errorpare run "ls"` 正常执行
- [ ] `errorpare run "npm run build"` 捕获报错
- [ ] 压缩率 ≥ 60% (重复错误)
- [ ] 变量遮蔽生效
- [ ] JSON 输出格式正确
- [ ] 退出码正确传递

### 7.2 性能验收

- [ ] 本地压缩 < 50ms
- [ ] CLI 启动 < 100ms
- [ ] 内存占用 < 100MB

### 7.3 集成验收

- [ ] 可被 Claude Code 调用
- [ ] 可被 Gemini CLI 调用
- [ ] MCP Server 响应正常

---

## 8. 附录

### 8.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | 18+ |
| 语言 | TypeScript | 5.3+ |
| 构建 | tsup | 8.x |
| 测试 | Vitest | 2.x |
| CLI | Commander.js | 12.x |
| LLM API | Groq SDK | 1.x |

### 8.2 参考项目

| 项目 | 用途 |
|------|------|
| [IBM/Drain3](https://github.com/logpai/Drain3) | 日志模板挖掘算法 |
| [xpl/stacktracey](https://github.com/xpl/stacktracey) | Stack Trace 解析 |
| [Groq API](https://console.groq.com/) | 极速 LLM 推理 |
| [Model Context Protocol](https://modelcontextprotocol.io/) | MCP 标准协议 |

### 8.3 术语表

| 术语 | 定义 |
|------|------|
| **stdout** | 标准输出通道，程序正常输出 |
| **stderr** | 标准错误通道，程序报错输出 |
| **管道 (Piping)** | 将一个程序的输出传递给另一个程序 |
| **变量遮蔽** | 将具体值替换为占位符 (如 192.168.1.1 → <IP>) |
| **模板挖掘** | 从日志中提取通用错误模式 |
| **MCP** | Model Context Protocol，AI 工具集成协议 |
| **PTY** | 伪终端 (Pseudo Terminal)，模拟真实终端环境 |
| **TTY** | 终端 (Teletype)，程序运行的实际终端设备 |
| **Git 感知过滤** | 识别项目代码 vs 第三方框架代码，折叠后者 |
| **流式输出 (Streaming)** | 边生成边输出，无需等待完整结果 |
| **ANSI 颜色** | 终端文本颜色和样式的标准控制码 |

---

## 9. 版权与许可

**ErrorPare** © 2026 ErrorPare Team

本项目采用 MIT 许可证 - 详见 [LICENSE](../LICENSE)

---

*本文档最后更新于 2026-02-24 v1.0.1*
