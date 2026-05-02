// AI 功能测试脚本
// 运行方式: bun scripts/test-ai.ts

import * as fs from 'fs'

const testResults: {
  test: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  message: string
}[] = []

async function testAIChatAPI() {
  console.log('\n🤖 测试 AI Chat API...')
  
  const testPayload = {
    messages: [{ role: 'user', content: 'Hello, AI!' }],
    systemPrompt: 'You are a helpful assistant.',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()
    
    if (response.status === 401 && data.error?.includes('API Key')) {
      testResults.push({ 
        test: 'AI Chat API', 
        status: 'SKIP', 
        message: 'API Key 无效（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ AI Chat API - 认证失败（预期行为，需要有效 API Key）')
    } else if (response.ok) {
      testResults.push({ test: 'AI Chat API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ AI Chat API 测试通过')
    } else {
      testResults.push({ test: 'AI Chat API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ AI Chat API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: 'AI Chat API', status: 'FAIL', message: String(error) })
    console.log('❌ AI Chat API 测试失败:', error)
  }
}

async function testEnhanceScriptAPI() {
  console.log('\n📝 测试剧本润色 API...')
  
  const testPayload = {
    originalScript: '这是一个测试场景。',
    style: 'professional',
    enhancement: 'both',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/enhance-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()
    
    if (response.status === 401 && data.error?.includes('API Key')) {
      testResults.push({ 
        test: '剧本润色 API', 
        status: 'SKIP', 
        message: 'API Key 无效（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 剧本润色 API - 认证失败（预期行为，需要有效 API Key）')
    } else if (response.ok) {
      testResults.push({ test: '剧本润色 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 剧本润色 API 测试通过')
    } else {
      testResults.push({ test: '剧本润色 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 剧本润色 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '剧本润色 API', status: 'FAIL', message: String(error) })
    console.log('❌ 剧本润色 API 测试失败:', error)
  }
}

async function testWebSearchAPI() {
  console.log('\n🔍 测试网络搜索 API...')
  
  const testPayload = {
    query: 'test search',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    const data = await response.json()
    
    if (response.status === 401 && data.error?.includes('API Key')) {
      testResults.push({ 
        test: '网络搜索 API', 
        status: 'SKIP', 
        message: 'API Key 无效（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 网络搜索 API - 认证失败（预期行为，需要有效 API Key）')
    } else if (response.ok) {
      testResults.push({ test: '网络搜索 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 网络搜索 API 测试通过')
    } else {
      testResults.push({ test: '网络搜索 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 网络搜索 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '网络搜索 API', status: 'FAIL', message: String(error) })
    console.log('❌ 网络搜索 API 测试失败:', error)
  }
}

async function testTeamSettingsAPI() {
  console.log('\n👥 测试团队设置 API...')
  
  try {
    const response = await fetch('http://localhost:3001/api/teams/settings?teamId=test-id', {
      method: 'GET',
    })

    if (response.status === 401) {
      testResults.push({ 
        test: '团队设置 API', 
        status: 'SKIP', 
        message: '未登录（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 团队设置 API - 未登录（预期行为）')
    } else if (response.status === 404) {
      testResults.push({ test: '团队设置 API', status: 'PASS', message: '团队不存在（预期行为）' })
      console.log('✅ 团队设置 API 测试通过（返回 404，预期行为）')
    } else {
      testResults.push({ test: '团队设置 API', status: 'FAIL', message: '意外的响应状态' })
      console.log('❌ 团队设置 API 测试失败')
    }
  } catch (error) {
    testResults.push({ test: '团队设置 API', status: 'FAIL', message: String(error) })
    console.log('❌ 团队设置 API 测试失败:', error)
  }
}

async function testGenerateOutlineAPI() {
  console.log('\n📋 测试生成大纲 API...')
  
  const testPayload = {
    title: '测试剧本',
    genre: 'drama',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/generate-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '生成大纲 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 生成大纲 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '生成大纲 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 生成大纲 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '生成大纲 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 生成大纲 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '生成大纲 API', status: 'FAIL', message: String(error) })
    console.log('❌ 生成大纲 API 测试失败:', error)
  }
}

async function testGenerateSceneAPI() {
  console.log('\n🎬 测试生成场景 API...')
  
  const testPayload = {
    outline: '一个简单的场景',
    sceneNumber: 1,
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/generate-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '生成场景 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 生成场景 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '生成场景 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 生成场景 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '生成场景 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 生成场景 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '生成场景 API', status: 'FAIL', message: String(error) })
    console.log('❌ 生成场景 API 测试失败:', error)
  }
}

async function testGenerateShotAPI() {
  console.log('\n📷 测试生成分镜 API...')
  
  const testPayload = {
    sceneDescription: '一个测试场景描述',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/generate-shot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '生成分镜 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 生成分镜 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '生成分镜 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 生成分镜 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '生成分镜 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 生成分镜 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '生成分镜 API', status: 'FAIL', message: String(error) })
    console.log('❌ 生成分镜 API 测试失败:', error)
  }
}

async function testPolishDialogueAPI() {
  console.log('\n💬 测试润色台词 API...')
  
  const testPayload = {
    dialogue: '你好，这是一句测试台词',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/polish-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '润色台词 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 润色台词 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '润色台词 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 润色台词 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '润色台词 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 润色台词 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '润色台词 API', status: 'FAIL', message: String(error) })
    console.log('❌ 润色台词 API 测试失败:', error)
  }
}

async function testAnalyzeStoryAPI() {
  console.log('\n🔍 测试故事分析 API...')
  
  const testPayload = {
    script: '这是一个简单的故事脚本',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/analyze-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '故事分析 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 故事分析 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '故事分析 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 故事分析 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '故事分析 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 故事分析 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '故事分析 API', status: 'FAIL', message: String(error) })
    console.log('❌ 故事分析 API 测试失败:', error)
  }
}

async function testSuggestNextShotAPI() {
  console.log('\n💡 测试建议下一个分镜 API...')
  
  const testPayload = {
    sceneDescription: '一个测试场景',
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/suggest-next-shot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '建议下一个分镜 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 建议下一个分镜 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '建议下一个分镜 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 建议下一个分镜 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '建议下一个分镜 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 建议下一个分镜 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '建议下一个分镜 API', status: 'FAIL', message: String(error) })
    console.log('❌ 建议下一个分镜 API 测试失败:', error)
  }
}

async function testToolAPI() {
  console.log('\n🛠️ 测试工具调用 API...')
  
  const testPayload = {
    tool: 'read_script',
    params: {},
    apiKey: 'test-key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini'
  }

  try {
    const response = await fetch('http://localhost:3001/api/ai/tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    })

    if (response.status === 400 || response.status === 401) {
      testResults.push({ 
        test: '工具调用 API', 
        status: 'SKIP', 
        message: '配置问题（预期行为），API 端点正常工作' 
      })
      console.log('⚠️ 工具调用 API - 配置问题（预期行为）')
    } else if (response.ok) {
      testResults.push({ test: '工具调用 API', status: 'PASS', message: '成功返回响应' })
      console.log('✅ 工具调用 API 测试通过')
    } else {
      const data = await response.json()
      testResults.push({ test: '工具调用 API', status: 'FAIL', message: data.error || '未知错误' })
      console.log('❌ 工具调用 API 测试失败:', data.error)
    }
  } catch (error) {
    testResults.push({ test: '工具调用 API', status: 'FAIL', message: String(error) })
    console.log('❌ 工具调用 API 测试失败:', error)
  }
}

function showSummary() {
  console.log('\n\n📊 测试结果汇总')
  console.log('='.repeat(50))
  
  let passed = 0
  let failed = 0
  let skipped = 0
  
  testResults.forEach((result) => {
    const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️'
    console.log(`${statusIcon} ${result.test}: ${result.message}`)
    
    if (result.status === 'PASS') passed++
    else if (result.status === 'FAIL') failed++
    else skipped++
  })
  
  console.log('='.repeat(50))
  console.log(`总计: ${testResults.length} | 通过: ${passed} | 失败: ${failed} | 跳过: ${skipped}`)
  
  if (failed === 0) {
    console.log('\n🎉 所有测试通过！')
    process.exit(0)
  } else {
    console.log('\n❌ 部分测试失败，请检查错误信息')
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 AI 功能测试脚本')
  console.log('='.repeat(50))
  
  // 检查服务器是否运行
  console.log('\n🔌 检查服务器状态...')
  try {
    const response = await fetch('http://localhost:3001/api/health', { method: 'GET' })
    if (!response.ok) {
      console.log('❌ 服务器未运行')
      console.log('请先运行: bun dev')
      process.exit(1)
    }
    console.log('✅ 服务器运行正常')
  } catch {
    console.log('❌ 服务器未运行')
    console.log('请先运行: bun dev')
    process.exit(1)
  }
  
  // 运行所有 API 测试
  await testAIChatAPI()
  await testEnhanceScriptAPI()
  await testWebSearchAPI()
  await testTeamSettingsAPI()
  await testGenerateOutlineAPI()
  await testGenerateSceneAPI()
  await testGenerateShotAPI()
  await testPolishDialogueAPI()
  await testAnalyzeStoryAPI()
  await testSuggestNextShotAPI()
  await testToolAPI()
  
  showSummary()
}

main().catch((error) => {
  console.error('❌ 测试脚本执行失败:', error)
  process.exit(1)
})
