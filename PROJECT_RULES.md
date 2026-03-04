# PROJECT_RULES.md — 项目宪法

**最后更新**: 2026-03-03  
**维护者**: AI PM & Architect

---

## 🤖 AI PM 工作模式

### 默认模式
- 正常对话、问答、简单任务 → 直接回复
- 不调用 Gemini CLI
- 不遵循 PDRM 工作流

### AI PM 模式 (仅当用户明确指定时)

**触发词:** "用 Gemini CLI 开发" / "用你的编程手" / 类似明确指令

**核心原则:**
- ❌ 不亲自输出代码
- ✅ 使用 Gemini CLI 作为执行引擎
- ✅ 遵循 PDRM 工作流：Plan → Delegate → Review → Memorize
- ✅ 熔断机制：3 次失败后向人类求助

---

---

## 📋 目录

1. [架构规范](#架构规范)
2. [技术栈](#技术栈)
3. [编码规范](#编码规范)
4. [避坑指南](#避坑指南)
5. [依赖管理](#依赖管理)

---

## 架构规范

### 项目结构
- 所有项目位于 `D:/Desktop/`
- 工作区：`/home/lenovo/.openclaw/workspace`

### 已知项目
| 项目名 | 路径 | 技术栈 | 状态 |
|--------|------|--------|------|
| **ErrorPare** | `D:/Desktop/errorpare` | TypeScript + Node.js | ✅ v2.0.4 已发布 |
| **Cananban** | `D:/Desktop/Cananban` | Node.js + Express + Vanilla JS | ✅ 运行中 |
| **Evan's Website** | `D:/Desktop/Evan's Website` | Next.js 14 + TypeScript | ✅ 运行中 |
| **SecondBrain** | `D:/Desktop/SecondBrain` | Next.js + FastAPI + LightRAG | ✅ 运行中 |

---

## 技术栈

### 前端
- React / Next.js 14+
- TypeScript (strict mode)
- Tailwind CSS

### 后端
- Node.js (Express/Fastify)
- Python (FastAPI)
- PostgreSQL / SQLite

### AI/ML
- Google Gemini (gemini-3.1-pro)
- 阿里云百炼 (qwen3.5-plus)

---

## 编码规范

### TypeScript
- 启用严格模式
- 使用 ES Module (`"type": "module"`)
- 错误处理：try/catch + 自定义 Error 类

### Python
- Python 3.11+
- 使用 asyncio 处理并发
- 类型注解：必需

### 错误处理
- 统一的错误响应格式
- 错误日志必须包含：时间戳、错误类型、堆栈、上下文

---

## 避坑指南

### ErrorPare 项目经验
- ✅ npm 包必须包含 `dist/cli/index.js` 作为 bin 入口
- ✅ 使用 `tsup` 构建，确保 CJS + DTS 输出
- ⚠️ 配置文件路径不要使用中文（WSL 兼容性问题）

### Gemini CLI 配置
- ✅ API Key 通过环境变量 `GEMINI_API_KEY` 传递
- ✅ 模型指定：`-m gemini-3.1-pro`
- ⚠️ 认证问题：删除旧配置 `~/.gemini` 后重新设置

### OpenClaw 配置
- ⚠️ 不要修改 `openclaw.json` 核心配置
- ✅ Gateway Token 存储在 `~/.openclaw/openclaw.json` 的 `gateway.auth.token`

---

## 依赖管理

### 全局工具
```bash
npm install -g errorpare      # 报错压缩工具
npm install -g @google/gemini-cli  # 编程助手
```

### 项目依赖
- 使用 `package-lock.json` 锁定版本
- 定期运行 `npm audit fix`

---

## PDRM 工作流记录

### 2026-03-03: Gemini CLI 配置完成
- **任务**: 配置 Gemini CLI 作为编程执行引擎
- **结果**: ✅ 成功
- **API Key**: 已配置 (环境变量)
- **模型**: gemini-3.1-pro
- **测试**: 通过

### 2026-03-03: ErrorPare Phase 2.1 完成
- **任务**: 配置系统 + 规则引擎 + LLM 分析器
- **结果**: ✅ 成功
- **npm 版本**: v2.0.4
- **功能**: 交互式配置向导、50+ 规则引擎、6 家 LLM 供应商支持

---

## 待办事项

- [ ] ErrorPare Phase 2.2 (语言扩展 - C/C++/Ruby/PHP)
- [ ] ErrorPare Phase 2.3 (AI 工具集成规范)

---

*本文件由 AI PM 维护。每次任务完成后视情况更新。*
