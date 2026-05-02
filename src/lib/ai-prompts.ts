export const SYSTEM_PROMPT = `你是一位专业的影视创作AI助手，名为"创作助手"，擅长剧本创作、分镜设计、故事分析等影视相关工作。

## 核心能力

你拥有以下工具可以调用：

### 工具调用格式
当需要读取项目内容时，必须使用以下JSON格式指令：

\`\`\`json
[TOOL_CALL]
{
  "tool": "read_script",
  "params": {}
}
[/TOOL_CALL]
\`\`\`

### 可用工具

1. **read_script** - 读取当前剧本内容
   - 返回剧本标题、编剧、场景、台词等信息

2. **read_storyboard** - 读取当前故事板内容
   - 返回故事板中的所有分镜、角色、场景等信息

3. **read_proposal** - 读取当前策划案内容
   - 返回策划案的主题、类型、目标受众等信息

4. **add_scene** - 添加新场景
   - 参数：{ "scene": "场景内容描述" }

5. **add_shot** - 添加新分镜
   - 参数：{ "shot": "分镜内容" }

6. **add_dialogue** - 添加新台词
   - 参数：{ "dialogue": "台词内容", "character": "角色名" }

7. **update_element** - 更新项目元素
   - 参数：{ "type": "scene|character|location", "id": "元素ID", "updates": {} }

8. **suggest_next** - 建议下一个创作内容
   - 基于当前内容，推荐下一个应该创作的部分

9. **web_search** - 网络搜索功能
   - 参数：{ "query": "搜索查询关键词" }
   - 返回相关网页的标题、链接和内容摘要
   - 用于获取最新的行业信息、参考资料、技术细节等
   - 当需要了解最新动态、查询事实信息或获取灵感时使用

## 工作原则

1. **理解上下文**：在回答前，先读取相关项目内容，了解当前创作状态
2. **专业建议**：提供专业的影视创作建议，包括叙事、镜头语言、角色塑造等
3. **实用导向**：优先提供可直接使用的台词、场景描述、分镜内容
4. **结构化输出**：对于复杂任务，使用清晰的结构化格式

## 特殊指令

用户可能使用以下快捷指令：
- "帮我写场景" → 使用 add_scene 工具
- "添加分镜" → 使用 add_shot 工具
- "写台词" → 使用 add_dialogue 工具
- "继续写" → 基于当前内容，调用 read_* 工具后继续创作
- "分析一下" → 读取相关项目内容，进行分析
- "建议" → 读取内容后提供创作建议

## 输出格式

1. **普通对话**：直接回复用户问题
2. **工具调用**：必须使用 [TOOL_CALL]...[/TOOL_CALL] 格式
3. **内容创作**：提供具体、可直接使用的内容
4. **建议分析**：结构化呈现分析结果

## 注意事项

- 始终使用中文回复
- 工具调用必须是有效的JSON格式
- 不要调用不存在的工具
- 内容创作要符合影视行业规范
- 保持创意和实用性的平衡`

export const TOOL_DESCRIPTIONS = {
  read_script: {
    name: 'read_script',
    description: '读取当前打开的剧本内容，包括标题、场景、台词等',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  read_storyboard: {
    name: 'read_storyboard',
    description: '读取当前打开的故事板内容，包括所有分镜、角色、场景等',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  read_proposal: {
    name: 'read_proposal',
    description: '读取当前打开的策划案内容，包括主题、类型、目标受众等',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  add_scene: {
    name: 'add_scene',
    description: '添加新的场景到当前项目',
    parameters: {
      type: 'object',
      properties: {
        scene: {
          type: 'string',
          description: '场景的详细描述，包括时间、地点、人物、动作等',
        },
      },
      required: ['scene'],
    },
  },
  add_shot: {
    name: 'add_shot',
    description: '添加新的分镜到当前故事板',
    parameters: {
      type: 'object',
      properties: {
        shot: {
          type: 'string',
          description: '分镜的详细描述，包括景别、角度、画面内容等',
        },
        sceneId: {
          type: 'string',
          description: '分镜所属的场景ID（可选）',
        },
      },
      required: ['shot'],
    },
  },
  add_dialogue: {
    name: 'add_dialogue',
    description: '添加新的台词到当前剧本',
    parameters: {
      type: 'object',
      properties: {
        dialogue: {
          type: 'string',
          description: '角色的台词内容',
        },
        character: {
          type: 'string',
          description: '角色名称',
        },
        sceneId: {
          type: 'string',
          description: '台词所属的场景ID（可选）',
        },
      },
      required: ['dialogue', 'character'],
    },
  },
  update_element: {
    name: 'update_element',
    description: '更新项目中的元素（场景、角色、道具等）',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['scene', 'character', 'location'],
          description: '元素类型',
        },
        id: {
          type: 'string',
          description: '元素ID',
        },
        updates: {
          type: 'object',
          description: '需要更新的字段和值',
        },
      },
      required: ['type', 'id', 'updates'],
    },
  },
  suggest_next: {
    name: 'suggest_next',
    description: '基于当前项目内容，推荐下一个应该创作的部分',
    parameters: {
      type: 'object',
      properties: {
        focus: {
          type: 'string',
          enum: ['scene', 'dialogue', 'shot', 'character'],
          description: '创作重点（可选）',
        },
      },
      required: [],
    },
  },
  web_search: {
    name: 'web_search',
    description: '通过网络搜索获取最新信息、参考资料和事实数据，用于创作灵感和背景调研',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索查询关键词，用简洁的语言描述需要搜索的内容',
        },
      },
      required: ['query'],
    },
  },
}

export function formatToolCall(tool: string, params: Record<string, any>): string {
  return `[TOOL_CALL]\n{\n  "tool": "${tool}",\n  "params": ${JSON.stringify(params, null, 2)}\n}\n[/TOOL_CALL]`
}

export function parseToolCalls(text: string): Array<{ tool: string; params: Record<string, any> }> {
  const regex = /\[TOOL_CALL\]\s*\{[\s\S]*?"tool":\s*"([^"]+)"[\s\S]*?"params":\s*(\{[\s\S]*?\})[\s\S]*?\}\s*\[\/TOOL_CALL\]/g
  const calls: Array<{ tool: string; params: Record<string, any> }> = []
  let match

  while ((match = regex.exec(text)) !== null) {
    try {
      const params = JSON.parse(match[2])
      calls.push({ tool: match[1], params })
    } catch (e) {
      console.error('Failed to parse tool call:', e)
    }
  }

  return calls
}
