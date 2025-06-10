import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
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
            <button className="w-full text-left px-4 py-2 bg-blue-600 rounded-lg">
              通知管理
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-lg">
              用戶管理
            </button>
            <button className="w-full text-left px-4 py-2 hover:bg-gray-700 rounded-lg">
              系統設定
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">通知管理</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              新增通知
            </button>
          </div>

          {/* Notifications List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center text-gray-400 py-8">
              暫無通知記錄
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage 