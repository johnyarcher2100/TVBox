import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Settings, Users } from 'lucide-react'
import { useUserStore } from '@/stores/userStore'

const AdminPage = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()

  const handleLogout = () => {
    useUserStore.getState().logout()
    navigate('/')
  }

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">系統管理</h1>
        </div>
        
                 <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">
            歡迎，用戶 #{user?.id.slice(-6)} (管理員)
          </span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
          >
            登出
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            <button 
              onClick={() => navigate('/broadcast')}
              className="w-full text-left px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              推播管理
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <Users className="w-4 h-4" />
              用戶管理
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" />
              系統設定
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">系統管理中心</h2>
            <button 
              onClick={() => navigate('/broadcast')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              進入推播管理
            </button>
          </div>

          {/* Management Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 推播管理卡片 */}
            <div 
              onClick={() => navigate('/broadcast')}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer border border-gray-600"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold">推播管理</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                管理系統推播訊息，支援文字跑馬燈和圖示推播，可針對不同用戶等級進行推播
              </p>
              <div className="flex items-center text-blue-400 text-sm">
                <span>進入管理</span>
                <ArrowLeft className="w-4 h-4 ml-1 rotate-180" />
              </div>
            </div>

            {/* 用戶管理卡片 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 opacity-75">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold">用戶管理</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                管理用戶帳號、等級權限和啟動碼分配
              </p>
              <div className="text-gray-500 text-sm">
                即將推出
              </div>
            </div>

            {/* 系統設定卡片 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-600 opacity-75">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold">系統設定</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                系統參數配置和全域設定管理
              </p>
              <div className="text-gray-500 text-sm">
                即將推出
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage 