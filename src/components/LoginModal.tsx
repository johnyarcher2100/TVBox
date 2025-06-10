import React, { useState } from 'react'
import { useUserStore } from '@/stores/userStore'

interface LoginModalProps {
  onClose?: () => void
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose }) => {
  const [activationCode, setActivationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login(activationCode || undefined)
      onClose?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFreeLogin = async () => {
    setIsLoading(true)
    setError('')

    try {
      await login()
      onClose?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Abuji IPTV 播放器
          </h1>
          <p className="text-gray-600">
            歡迎使用 Abuji IPTV 播放器
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="activationCode" className="block text-sm font-medium text-gray-700 mb-1">
              啟動碼（選填）
            </label>
            <input
              type="text"
              id="activationCode"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              placeholder="輸入 8 位英數字啟動碼"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              maxLength={8}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              輸入啟動碼可獲得進階功能，留空則以免費用戶登入
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '登入中...' : activationCode ? '使用啟動碼登入' : '輸入啟動碼'}
            </button>

            <button
              type="button"
              onClick={handleFreeLogin}
              disabled={isLoading}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '登入中...' : '免費用戶登入'}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>用戶等級說明：</p>
            <p>• 管理者 (啟動碼 1-10)：完整功能 + 管理權限</p>
            <p>• 一般用戶 (啟動碼 11-500)：進階功能</p>
            <p>• 免費用戶：基本播放功能</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal 