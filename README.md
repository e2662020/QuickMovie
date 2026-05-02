# 项目管理与协作平台

一个基于 Next.js 16、Tailwind CSS 和 shadcn/ui 构建的现代化项目管理与协作平台，支持团队协作、文档管理和创意工作流。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI组件**: shadcn/ui
- **数据库**: Prisma + SQLite
- **状态管理**: Zustand
- **表单**: React Hook Form + Zod
- **数据查询**: TanStack React Query
- **拖拽**: @dnd-kit
- **富文本编辑**: @mdxeditor
- **动画**: Framer Motion

## 功能特性

### 用户系统
- 用户注册和登录
- 会话管理
- 用户个人资料管理

### 团队系统
- 创建和管理团队
- 团队成员管理
- 邀请码系统
- 团队权限设置

### 项目看板
- 多项目看板管理
- 文件树结构（文件夹、文档、笔记等）
- 资源库
- 故事板元素管理

### 文档类型
- 规划文档
- 故事板
- 脚本
- 笔记
- 文件夹组织

## 快速开始

### 安装依赖

```bash
npm install
```

### 数据库设置

```bash
# 同步数据库 schema
npm run db:push

# 生成 Prisma Client
npm run db:generate
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

### 生产构建

```bash
# 构建应用
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
/workspace
├── src/
│   ├── app/
│   │   ├── api/              # API 路由
│   │   │   ├── auth/         # 认证 API
│   │   │   ├── boards/       # 看板 API
│   │   │   ├── teams/        # 团队 API
│   │   │   └── upload/       # 上传 API
│   │   ├── globals.css       # 全局样式
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 首页
│   ├── components/
│   │   ├── editors/          # 编辑器组件
│   │   ├── ui/               # UI 组件库
│   │   ├── views/            # 页面视图
│   │   └── ...
│   ├── hooks/                # 自定义 Hooks
│   └── lib/                  # 工具库
│       ├── auth.ts           # 认证相关
│       ├── db.ts             # 数据库连接
│       ├── store.ts          # 状态管理
│       └── utils.ts          # 工具函数
├── prisma/
│   ├── schema.prisma         # 数据库 Schema
│   └── seed.ts               # 数据库种子
├── public/                   # 静态资源
├── db/                       # SQLite 数据库文件
└── ...
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (端口 3000) |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run db:push` | 同步 Prisma Schema 到数据库 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:migrate` | 创建并应用数据库迁移 |
| `npm run db:reset` | 重置数据库 |
| `npm run db:seed` | 运行数据库种子 |

## 数据库模型

主要数据模型包括：

- **User**: 用户账户信息
- **Team**: 团队信息
- **TeamMember**: 团队成员关系
- **DirectorBoard**: 项目看板
- **BoardFile**: 看板文件（支持层级结构）
- **Resource**: 资源库
- **StoryElement**: 故事元素
- **Comment**: 评论
- **UserSession**: 用户会话

详见 [prisma/schema.prisma](file:///workspace/prisma/schema.prisma)

## 配置

环境变量通过 [.env](file:///workspace/.env) 文件配置：

```env
DATABASE_URL=file:./db/custom.db
```

## 开发说明

- 使用 Turbopack 进行快速开发
- 支持独立部署 (`output: "standalone"`)
- 类型安全的 API 路由

## License

Private
