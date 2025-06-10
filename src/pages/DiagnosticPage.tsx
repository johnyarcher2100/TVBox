import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface DiagnosticResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'pending'
  message: string
  details?: string
}

const DiagnosticPage = () => {
  const navigate = useNavigate()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    
    const diagnostics: DiagnosticResult[] = []

    // 檢查基本環境
    diagnostics.push({
      name: 'React 應用程式',
      status: 'success',
      message: 'React 應用程式正常載入',
    })

    // 檢查路由
    try {
      const currentPath = window.location.pathname
      diagnostics.push({
        name: '路由系統',
        status: 'success',
        message: `路由正常，當前路徑: ${currentPath}`,
      })
    } catch (error) {
      diagnostics.push({
        name: '路由系統',
        status: 'error',
        message: '路由系統異常',
        details: String(error)
      })
    }

    // 檢查 HLS.js
    if (typeof (window as any).Hls !== 'undefined') {
      diagnostics.push({
        name: 'HLS.js 函式庫',
        status: 'success',
        message: `HLS.js 載入成功 (版本: ${(window as any).Hls.version || '未知'})`,
      })
    } else {
      diagnostics.push({
        name: 'HLS.js 函式庫',
        status: 'error',
        message: 'HLS.js 載入失敗',
        details: '可能影響 HLS 串流播放'
      })
    }

    // 檢查 EasyPlayer Pro
    if (typeof (window as any).EasyPlayerPro !== 'undefined') {
      diagnostics.push({
        name: 'EasyPlayer Pro',
        status: 'success',
        message: 'EasyPlayer Pro 載入成功',
      })
    } else {
      diagnostics.push({
        name: 'EasyPlayer Pro',
        status: 'warning',
        message: 'EasyPlayer Pro 載入失敗',
        details: '將使用原生播放器或 HLS.js 作為後備'
      })
    }

    // 檢查 Local Storage
    try {
      localStorage.setItem('test', 'test')
      localStorage.removeItem('test')
      diagnostics.push({
        name: 'Local Storage',
        status: 'success',
        message: 'Local Storage 可用',
      })
    } catch (error) {
      diagnostics.push({
        name: 'Local Storage',
        status: 'error',
        message: 'Local Storage 不可用',
        details: '用戶設定無法保存'
      })
    }

    // 檢查網路連線（簡單測試）
    try {
      const response = await fetch('https://httpbin.org/json', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      if (response.ok) {
        diagnostics.push({
          name: '網路連線',
          status: 'success',
          message: '網路連線正常',
        })
      } else {
        diagnostics.push({
          name: '網路連線',
          status: 'warning',
          message: '網路連線異常',
          details: `HTTP ${response.status}`
        })
      }
    } catch (error) {
      diagnostics.push({
        name: '網路連線',
        status: 'error',
        message: '網路連線測試失敗',
        details: String(error)
      })
    }

    // 檢查瀏覽器相容性
    const hasModernAPIs = typeof window.fetch === 'function' && 
                         typeof window.Promise === 'function' && 
                         typeof window.Symbol === 'function'
    diagnostics.push({
      name: '瀏覽器相容性',
      status: hasModernAPIs ? 'success' : 'error',
      message: hasModernAPIs ? '瀏覽器支援現代 JavaScript' : '瀏覽器過舊，不支援某些功能',
      details: `用戶代理: ${navigator.userAgent}`
    })

    setResults(diagnostics)
    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      default:
        return <div className="w-5 h-5 animate-spin border-2 border-blue-500 border-t-transparent rounded-full" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold">系統診斷</h1>
        </div>

        <div className="mb-6">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            {isRunning ? '診斷中...' : '重新診斷'}
          </button>
        </div>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(result.status)}
                <h3 className="text-lg font-semibold">{result.name}</h3>
              </div>
              <p className="text-gray-300 mb-2">{result.message}</p>
              {result.details && (
                <details className="text-sm text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-300">詳細資訊</summary>
                  <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-auto">
                    {result.details}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && !isRunning && (
          <div className="text-center text-gray-400 py-8">
            點擊「重新診斷」開始系統檢查
          </div>
        )}
      </div>
    </div>
  )
}

export default DiagnosticPage 