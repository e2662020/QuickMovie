# QuickMovie

一个专注于影视剧本创作与项目协作的在线平台，支持剧本编写、分镜规划、故事板管理和团队协作。

## 技术栈

- **框架**: Vite + React 19
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **UI组件**: shadcn/ui + Radix UI
- **状态管理**: Zustand
- **表单验证**: React Hook Form + Zod
- **富文本编辑**: @mdxeditor
- **动画**: Framer Motion
- **拖拽排序**: @dnd-kit

## 功能特性

### 用户系统
- 用户注册和登录
- 会话管理

### 团队系统
- 创建和管理团队
- 团队成员管理
- 邀请码系统

### 项目看板
- 多项目看板管理
- 文件树结构（文件夹、文档、笔记等）
- 资源库管理

### 文档类型
- **规划文档** - 项目策划和规划
- **故事板** - 角色、场景和故事线管理
- **分镜** - 分镜头脚本设计
- **剧本** - 专业剧本编写工具
- **笔记** - Markdown 富文本笔记

### API 功能
- API Key 管理
- RESTful API 接口
- 外部客户端集成支持

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 生产构建

```bash
npm run build
npm run preview
```

## 项目结构

```
src/
├── components/
│   ├── editors/          # 各类编辑器组件
│   │   ├── note-editor.tsx       # 笔记编辑器
│   │   ├── planning-editor.tsx   # 规划编辑器
│   │   ├── script-editor.tsx      # 剧本编辑器
│   │   ├── shot-editor.tsx       # 分镜编辑器
│   │   └── storyboard-editor.tsx # 故事板编辑器
│   ├── ui/               # UI 组件库
│   └── views/             # 页面视图
├── hooks/                 # 自定义 Hooks
└── lib/                   # 工具库
    ├── store.ts           # 状态管理 (Zustand)
    └── utils.ts           # 工具函数
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行 ESLint 检查 |

## 许可证

本项目基于 Apache License 2.0 开源。
