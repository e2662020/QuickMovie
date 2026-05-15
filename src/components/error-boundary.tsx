import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔥 ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    
    if (typeof window !== 'undefined') {
      (window as any).__LAST_ERROR__ = { error, errorInfo, timestamp: new Date().toISOString() }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleCopyError = async () => {
    const { error, errorInfo } = this.state
    const text = [
      `Time: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `Error: ${error?.message || 'Unknown'}`,
      `Stack:\n${error?.stack || 'No stack trace'}`,
      `Component Stack:\n${errorInfo?.componentStack || 'No component stack'}`,
      '',
      '--- User Info ---',
      `User Agent: ${navigator.userAgent}`,
      `Screen: ${screen.width}x${screen.height}`,
    ].join('\n\n')
    
    try {
      await navigator.clipboard.writeText(text)
      alert('错误信息已复制到剪贴板')
    } catch {
      console.log(text)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{
          padding: '40px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: '100vh',
          background: '#1e1e2e',
          color: '#cdd6f4',
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#f38ba8' }}>
              ⚠️ 页面出现异常
            </h1>
            
            <p style={{ marginBottom: '24px', opacity: 0.8 }}>
              系统遇到了一个未预期的错误。你可以尝试以下操作：
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  background: '#89b4fa',
                  color: '#1e1e2e',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 重试加载
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#89b4fa',
                  border: '1px solid #89b4fa',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                🔃 刷新页面
              </button>
              
              <button
                onClick={this.handleCopyError}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#a6e3a1',
                  border: '1px solid #a6e3a1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                📋 复制错误信息
              </button>
            </div>

            <details open style={{
              background: '#181825',
              border: '1px solid #313244',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              <summary style={{
                padding: '16px',
                cursor: 'pointer',
                fontWeight: 600,
                userSelect: 'none',
              }}>
                🐛 错误详情（点击展开/收起）
              </summary>
              
              <div style={{ 
                padding: '0 16px 16px', 
                maxHeight: '400px', 
                overflow: 'auto',
                fontFamily: '"Fira Code", "Cascadia Code", monospace',
                fontSize: '13px',
                lineHeight: 1.6,
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`错误信息:
${this.state.error?.message || 'Unknown'}

堆栈跟踪:
${this.state.error?.stack || 'No stack available'}

组件堆栈:
${this.state.errorInfo?.componentStack || 'No component stack available'}
`}
                </pre>
              </div>
            </details>

            <div style={{
              marginTop: '24px',
              padding: '16px',
              background: '#313244',
              borderRadius: '8px',
              fontSize: '14px',
              opacity: 0.7,
            }}>
              <strong>💡 调试提示:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>打开浏览器控制台（F12）查看完整日志</li>
                <li>在控制台输入 <code style={{background:'#45475a',padding:'2px 6px',borderRadius:'4px'}}>window.__LAST_ERROR__</code> 查看最近错误</li>
                <li>复制错误信息后可提交给开发者进行排查</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}