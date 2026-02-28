# ErrorPare 项目结构

```
ErrorPare/
├── 📄 package.json              # 项目配置
├── 📄 tsconfig.json            # TypeScript配置
├── 📄 jest.config.js           # Jest测试配置
├── 📄 README.md                 # 主文档
├── 📄 CONTRIBUTING.md           # 贡献指南
├── 📄 LICENSE                   # MIT许可证
├── 📄 CHANGELOG.md             # 更新日志
│
├── 📂 src/                      # 核心源代码
│   ├── 📄 index.ts              # 入口文件
│   │
│   ├── 📂 cli/                  # CLI工具
│   │   ├── 📄 index.ts          # CLI入口
│   │   ├── 📄 commands.ts       # 命令定义
│   │   └── 📄 options.ts        # 命令行选项
│   │
│   ├── 📂 core/                 # 核心算法
│   │   ├── 📄 deduplicator.ts   # 错误去重算法
│   │   ├── 📄 compressor.ts     # 压缩引擎
│   │   ├── 📄 analyzer.ts       # 分析器
│   │   └── 📄 templates.ts      # 错误模板
│   │
│   ├── 📂 languages/            # 语言支持
│   │   ├── 📄 types.ts          # 通用类型
│   │   ├── 📄 typescript.ts     # TypeScript支持
│   │   ├── 📄 python.ts          # Python支持
│   │   ├── 📄 go.ts             # Go支持
│   │   ├── 📄 java.ts           # Java支持
│   │   └── 📄 rust.ts           # Rust支持
│   │
│   ├── 📂 utils/                # 工具函数
│   │   ├── 📄 logger.ts         # 日志
│   │   ├── 📄 cache.ts          # 缓存
│   │   ├── 📄 helpers.ts        # 辅助函数
│   │   └── 📄 constants.ts      # 常量
│   │
│   └── 📂 tests/                # 测试文件
│       ├── 📄 deduplicator.test.ts
│       ├── 📄 compressor.test.ts
│       └── 📄 languages.test.ts
│
├── 📂 skills/                    # OpenClaw Skills
│   ├── 📄 SKILL.md              # Skills文档
│   ├── 📄 package.json
│   ├── 📄 src/
│   │   └── 📄 index.ts          # Skills入口
│   └── 📂 examples/
│       └── 📄 usage.ts
│
├── 📂 website/                   # SaaS网站
│   ├── 📄 package.json
│   ├── 📂 pages/                # Next.js页面
│   │   ├── 📄 index.tsx         # 首页
│   │   ├── 📄 pricing.tsx       # 定价页
│   │   ├── 📄 dashboard/        # 用户面板
│   │   └── 📄 api/              # API路由
│   ├── 📂 components/           # React组件
│   ├── 📂 styles/               # 样式
│   └── 📂 utils/                # 工具
│
├── 📂 docs/                     # 文档
│   ├── 📄 INSTALL.md            # 安装指南
│   ├── 📄 EXAMPLES.md           # 使用示例
│   ├── 📄 API.md                # API文档
│   ├── 📄 CLI.md                # CLI命令
│   └── 📄 logo.svg              # Logo
│
├── 📂 scripts/                  # 构建脚本
│   ├── 📄 build.sh
│   ├── 📄 test.sh
│   └── 📄 release.sh
│
├── 📂 examples/                  # 示例
│   ├── 📄 simple.ts
│   └── 📄 advanced.ts
│
└── 📂 .github/                  # GitHub配置
    ├── 📄 ISSUE_TEMPLATE.md
    └── 📄 PULL_REQUEST_TEMPLATE.md
```

## 核心模块说明

### src/core/ - 核心算法

#### deduplicator.ts
错误去重引擎，使用改进的Drain3算法：
- 错误模板提取
- 相似度计算
- 变量遮蔽
- 出现次数统计

#### compressor.ts
压缩主引擎：
- 输入解析
- 多语言支持
- 输出格式化
- 性能优化

#### analyzer.ts
分析器（Pro功能）：
- 根因分析
- 修复建议
- 趋势追踪

### src/languages/ - 语言支持

每个语言文件包含：
- 错误模式正则
- Stack Trace解析
- 变量提取规则
- 语言特定配置

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm test

# lint
npm run lint

# 发布
npm publish
```
