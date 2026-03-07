# ErrorPare 详细开发路线图

**版本**: v2.1.0 - v3.0.0
**创建日期**: 2026-03-05
**作者**: Evan (CAOO)
**状态**: 🟡 规划中

---

## 战略概览

### 核心转型
从「CLI 压缩工具」进化为「AI 调试基础设施」

### 关键里程碑
| 阶段 | 目标 | 预计时间 |
|------|------|----------|
| Phase 2.5 | 体验升级 - Context Appending + Source Map | 1周 |
| Phase 3.0 | 生态爆发 - GitHub Action + MCP 完善 | 2周 |
| Phase 3.1 | 商业化探索 - PR Bot + Dashboard | 2周 |
| Phase 3.2 | 深度集成 - IDE 插件 + Build Tool 插件 | 2周 |

---

## Phase 2.5: 体验升级 (当前阶段)

### 任务 2.5.1: Context Appending (智能源码拼接) ⭐ 最高优先级

**目标**: 让 LLM 不仅知道错误是什么，还能看到出错的代码长什么样

#### 子任务清单

- [ ] **2.5.1.1** 解析堆栈帧提取文件路径和行号
  - 支持格式: `at functionName (file.ts:42:15)`
  - 支持格式: `File "/path/to/file.py", line 42`
  - 支持格式: `src/main.rs:42:15`
  - 预估: 4小时

- [ ] **2.5.1.2** 实现文件读取模块
  - 安全读取本地文件（限制在项目目录内）
  - 处理文件不存在、权限不足等边界情况
  - 预估: 3小时

- [ ] **2.5.1.3** 实现上下文提取逻辑
  - 默认读取报错行 ±5 行（共 11 行）
  - 可配置上下文行数（--context-lines）
  - 预估: 3小时

- [ ] **2.5.1.4** 更新 JSON 输出格式
  ```json
  {
    "errors": [{
      "type": "TypeError",
      "message": "Cannot read property 'id' of undefined",
      "location": "UserController.ts:22",
      "context": {
        "file": "src/controllers/UserController.ts",
        "line": 22,
        "column": 15,
        "snippet": [
          { "line": 17, "code": "  async getUser(req: Request, res: Response) {", "highlight": false },
          { "line": 18, "code": "    const { userId } = req.params;", "highlight": false },
          { "line": 19, "code": "    ", "highlight": false },
          { "line": 20, "code": "    // Fetch user from database", "highlight": false },
          { "line": 21, "code": "    const user = await this.userService.findById(userId);", "highlight": false },
          { "line": 22, "code": "    return res.json({ id: user.id, name: user.name });", "highlight": true },
          { "line": 23, "code": "  }", "highlight": false }
        ]
      }
    }]
  }
  ```
  - 预估: 4小时

- [ ] **2.5.1.5** 更新 CLI 界面展示
  - 文本模式下显示代码片段
  - 语法高亮（使用 chalk）
  - 预估: 3小时

- [ ] **2.5.1.6** 编写单元测试
  - 测试各种堆栈格式解析
  - 测试文件读取边界情况
  - 测试 JSON 输出格式
  - 预估: 4小时

- [ ] **2.5.1.7** 更新文档
  - README 添加 Context Appending 说明
  - 添加使用示例
  - 预估: 2小时

**总预估**: 23小时 (~3天)
**验收标准**:
- ✅ 能正确解析 TypeScript/Python/Go/Rust 的堆栈格式
- ✅ 成功提取并展示报错位置的代码上下文
- ✅ JSON 输出包含完整的 context 字段
- ✅ 所有测试通过

---

### 任务 2.5.2: Source Map 支持 (堆栈还原)

**目标**: 将压缩/编译后的代码堆栈还原为原始源码位置

#### 子任务清单

- [x] **2.5.2.1** 调研 source-map-support 库
  - 评估 mozilla/source-map vs vlq-source-map
  - 确定最佳集成方案
  - 预估: 2小时

- [x] **2.5.2.2** 实现 SourceMap 解析器
  - 读取 .map 文件
  - 解析 VLQ 编码
  - 建立映射关系
  - 预估: 6小时

- [x] **2.5.2.3** 实现堆栈还原逻辑
  - 输入: 压缩后的堆栈位置
  - 输出: 原始源码位置和代码
  - 处理多个 source map 链（如 ts→js→min.js）
  - 预估: 6小时

- [x] **2.5.2.4** 支持常见构建工具
  - Vite (rollup 生成的 source map)
  - Webpack
  - esbuild
  - tsc
  - 预估: 4小时

- [x] **2.5.2.5** 自动发现 source map
  - 根据堆栈文件路径自动查找 .map 文件
  - 支持内联 source map (data URL)
  - 预估: 3小时

- [x] **2.5.2.6** 更新压缩器核心
  - 在压缩前尝试还原堆栈
  - 保留原始和还原后的双份信息
  - 预估: 4小时

- [x] **2.5.2.7** 编写测试用例
  - 创建测试项目（Vite/Webpack/tsc）
  - 验证堆栈还原准确性
  - 预估: 4小时

- [x] **2.5.2.8** 性能优化
  - Source map 缓存
  - 异步解析避免阻塞
  - 预估: 3小时

**总预估**: 32小时 (~4天)
**验收标准**:
- ✅ TypeScript/Vite 项目的报错能还原到 .ts 文件
- ✅ 支持内联和外联 source map
- ✅ 还原准确率 >95%
- ✅ 性能开销 <100ms

---

### 任务 2.5.3: MCP Server 文档化与完善

**目标**: 让 Claude/Cursor 用户能零配置使用 ErrorPare

#### 子任务清单

- [x] **2.5.3.1** 完善 MCP Server 功能
  - 补充缺失的工具方法
  - 添加错误分析工具
  - 预估: 4小时

- [x] **2.5.3.2** 创建 Claude Desktop 配置指南
  - claude_desktop_config.json 示例
  - 截图演示配置步骤
  - 常见问题排查
  - 预估: 3小时

- [x] **2.5.3.3** 创建 Cursor 配置指南
  - .cursor/mcp.json 配置
  - Cursor 特定功能适配
  - 预估: 3小时

- [x] **2.5.3.4** 编写 MCP 集成教程
  - 什么是 MCP
  - 为什么 ErrorPare + MCP = 完美组合
  - 实际使用场景演示
  - 预估: 4小时

- [x] **2.5.3.5** 发布 MCP 相关文档
  - 更新 README 添加 MCP 章节
  - 创建 docs/MCP_INTEGRATION.md
  - 预估: 2小时

**总预估**: 16小时 (~2天)
**验收标准**:
- ✅ 用户能在 5 分钟内完成 Claude Desktop 配置
- ✅ 用户能在 5 分钟内完成 Cursor 配置
- ✅ MCP 工具能正常调用 ErrorPare 功能

---

## Phase 3.0: 生态爆发

### 任务 3.0.1: GitHub Action v1.0

**目标**: 让 CI/CD 中的报错自动被压缩和分析

#### 子任务清单

- [ ] **3.0.1.1** 创建 Action 仓库结构
  - action.yml 元数据
  - Dockerfile / composite action
  - 预估: 2小时

- [ ] **3.0.1.2** 实现核心 Action 逻辑
  - 捕获命令输出
  - 调用 ErrorPare 压缩
  - 生成分析报告
  - 预估: 6小时

- [ ] **3.0.1.3** 支持多种触发场景
  - npm test 失败
  - build 失败
  - lint 失败
  - 预估: 3小时

- [ ] **3.0.1.4** 实现 PR Comment 功能
  - 使用 GitHub API 发表评论
  - 格式化压缩结果
  - 折叠详情保持简洁
  - 预估: 4小时

- [ ] **3.0.1.5** 添加配置选项
  - errorpare-version: 指定 ErrorPare 版本
  - analyze: 是否启用 LLM 分析
  - provider/model: LLM 配置
  - max-lines: 最大行数限制
  - 预估: 3小时

- [ ] **3.0.1.6** 编写完整文档
  - 使用示例工作流
  - 所有配置参数说明
  - 故障排查指南
  - 预估: 3小时

- [ ] **3.0.1.7** 发布到 GitHub Marketplace
  - 准备品牌素材
  - 提交审核
  - 预估: 2小时

**总预估**: 23小时 (~3天)
**验收标准**:
- ✅ Action 可在 GitHub Marketplace 找到
- ✅ 能在 PR 中自动评论压缩后的报错
- ✅ 支持主流技术栈 (Node.js/Python/Go)

---

### 任务 3.0.2: VS Code Extension (基础版)

**目标**: 终端报错自动捕获，悬浮窗展示

#### 子任务清单

- [ ] **3.0.2.1** 初始化扩展项目
  - yo code 生成模板
  - 配置 TypeScript + webpack
  - 预估: 2小时

- [ ] **3.0.2.2** 实现终端监控
  - 监听 Terminal.onDidWriteData
  - 识别错误输出模式
  - 预估: 6小时

- [ ] **3.0.2.3** 实现悬浮窗 UI
  - WebviewPanel 展示压缩结果
  - 美观的错误展示界面
  - 预估: 6小时

- [ ] **3.0.2.4** 集成 ErrorPare Core
  - 打包 compressor 为独立模块
  - 在扩展中调用
  - 预估: 4小时

- [ ] **3.0.2.5** 实现一键修复
  - 调用 LLM 获取修复建议
  - 应用修复到编辑器
  - 预估: 4小时

- [ ] **3.0.2.6** 配置项设置
  - 启用/禁用自动捕获
  - 自定义错误匹配规则
  - LLM 配置
  - 预估: 3小时

- [ ] **3.0.2.7** 打包和发布准备
  - 图标、截图、README
  - vsce package 测试
  - 预估: 3小时

**总预估**: 28小时 (~4天)
**验收标准**:
- ✅ 终端报错时自动弹出悬浮窗
- ✅ 展示压缩后的关键错误
- ✅ 提供一键修复按钮

---

## Phase 3.1: 商业化探索

### 任务 3.1.1: PR Comment Bot (进阶版)

**目标**: 智能分析 CI 失败原因，给出具体修复建议

#### 子任务清单

- [ ] **3.1.1.1** 设计 Bot 架构
  - GitHub App vs Action
  - 数据库选型 (SQLite/PostgreSQL)
  - 预估: 4小时

- [ ] **3.1.1.2** 实现错误趋势分析
  - 统计常见错误类型
  - 识别 flaky tests
  - 预估: 6小时

- [ ] **3.1.1.3** 实现智能修复建议
  - 基于历史数据的推荐
  - 相似错误的解决方案复用
  - 预估: 8小时

- [ ] **3.1.1.4** 构建 Web Dashboard
  - 错误统计可视化
  - 团队错误热力图
  - 预估: 12小时

- [ ] **3.1.1.5** 实现 Team/Enterprise 计划
  - 多团队管理
  - 权限控制
  - 计费系统
  - 预估: 16小时

**总预估**: 46小时 (~6天)
**验收标准**:
- ✅ 能提供准确的修复建议 (>70% 准确率)
- ✅ Dashboard 展示有价值的洞察
- ✅ 支持团队级付费订阅

---

## Phase 3.2: 深度集成

### 任务 3.2.1: Build Tool 插件

**目标**: Vite/Webpack/Rollup 原生集成

#### 子任务清单

- [ ] **3.2.1.1** Vite Plugin
  - 拦截 build error
  - 自动压缩并展示
  - 预估: 6小时

- [ ] **3.2.1.2** Webpack Plugin
  - error-overlay-webpack-plugin 替代
  - 压缩后展示
  - 预估: 6小时

- [ ] **3.2.1.3** Rollup Plugin
  - onwarn/onerror 拦截
  - 预估: 4小时

- [ ] **3.2.1.4** Jest/Vitest Reporter
  - 自定义 test reporter
  - 压缩测试失败输出
  - 预估: 6小时

**总预估**: 22小时 (~3天)

---

### 任务 3.2.2: JetBrains 插件

**目标**: IntelliJ IDEA / WebStorm / PyCharm 支持

#### 子任务清单

- [ ] **3.2.2.1** 学习 IntelliJ Platform SDK
  - Kotlin 基础
  - Plugin 开发流程
  - 预估: 8小时

- [ ] **3.2.2.2** 实现终端监听
  - 类似 VS Code 的实现
  - 预估: 8小时

- [ ] **3.2.2.3** 实现 UI 面板
  - Tool Window 展示
  - 预估: 8小时

**总预估**: 24小时 (~3天)

---

## 依赖关系图

```
Phase 2.5
├── 2.5.1 Context Appending (无依赖，可立即开始)
├── 2.5.2 Source Map (依赖 2.5.1 的文件读取能力)
└── 2.5.3 MCP Docs (依赖现有 MCP 实现)

Phase 3.0
├── 3.0.1 GitHub Action (依赖 2.5.1 的稳定输出)
└── 3.0.2 VS Code Ext (依赖 2.5.1 + 2.5.2)

Phase 3.1
└── 3.1.1 PR Bot (依赖 3.0.1 的经验)

Phase 3.2
├── 3.2.1 Build Plugins (依赖 2.5.2 Source Map)
└── 3.2.2 JetBrains (依赖 3.0.2 经验)
```

---

## 资源需求

### 人力估算
| 阶段 | 工作量 | 建议人员 |
|------|--------|----------|
| Phase 2.5 | 71小时 (~9天) | 1人全职 |
| Phase 3.0 | 51小时 (~7天) | 1人全职 |
| Phase 3.1 | 46小时 (~6天) | 1人全职 |
| Phase 3.2 | 46小时 (~6天) | 1人全职 |
| **总计** | **214小时 (~28天)** | **1人 1个月** |

### 外部依赖
- GitHub Marketplace 审核 (3-5天)
- VS Code Marketplace 审核 (1-2天)
- JetBrains Marketplace 审核 (5-7天)

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Source Map 解析复杂 | 高 | 先用成熟库，逐步优化 |
| VS Code API 限制 | 中 | 提前做 PoC 验证可行性 |
| GitHub Action 审核不通过 | 中 | 准备充分文档，预留修改时间 |
| JetBrains 插件开发门槛 | 中 | 考虑外包或延后 |

---

## 下一步行动

请确认：
1. **是否批准 Phase 2.5 开发？**
2. **优先启动哪个任务？** (建议: 2.5.1 Context Appending)
3. **是否需要调整时间估算？**
4. **是否需要分配额外资源？**

一旦确认，我将立即使用 Gemini CLI 开始开发。
