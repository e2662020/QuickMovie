# 任务列表：故事版思维导图节点功能重做

## 核心任务

- [x] Task 1: 创建现代化思维导图组件 - 设计并实现全新的 MindMapCanvas 组件，包含画布渲染、节点管理、连接线绘制
  - [x] SubTask 1.1: 实现画布基础渲染（SVG/Canvas）
  - [x] SubTask 1.2: 实现节点渲染和样式系统
  - [x] SubTask 1.3: 实现连接线绘制逻辑
  - [x] SubTask 1.4: 实现节点拖拽交互

- [x] Task 2: 实现画布导航功能 - 支持缩放、平移、重置视图
  - [x] SubTask 2.1: 实现鼠标滚轮缩放
  - [x] SubTask 2.2: 实现画布拖拽平移
  - [x] SubTask 2.3: 添加缩放控件和重置按钮

- [x] Task 3: 实现节点操作功能 - 添加、编辑、删除节点
  - [x] SubTask 3.1: 添加节点按钮和创建逻辑
  - [x] SubTask 3.2: 双击编辑节点标题
  - [x] SubTask 3.3: 删除节点确认对话框
  - [x] SubTask 3.4: 节点颜色选择器

- [x] Task 4: 实现连接线功能 - 创建和删除节点连接
  - [x] SubTask 4.1: 实现连接线拖拽创建
  - [x] SubTask 4.2: 实现连接线点击删除
  - [x] SubTask 4.3: 优化连接线路径绘制

- [x] Task 5: 集成到故事板编辑器 - 将新组件替换现有实现
  - [x] SubTask 5.1: 替换现有的思维导图视图
  - [x] SubTask 5.2: 保持数据持久化逻辑
  - [x] SubTask 5.3: 适配现有API接口

- [x] Task 6: 优化性能和动画 - 确保流畅的用户体验
  - [x] SubTask 6.1: 实现节点动画过渡
  - [x] SubTask 6.2: 优化大量节点的渲染性能
  - [x] SubTask 6.3: 添加加载状态指示器

## 任务依赖

- Task 2 依赖 Task 1（需要基础画布）
- Task 3 依赖 Task 1（需要节点渲染）
- Task 4 依赖 Task 1（需要连接线绘制基础）
- Task 5 依赖 Task 1-4（需要完整功能）
- Task 6 可与 Task 5 并行
