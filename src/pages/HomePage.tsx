import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { dbHelpers } from '@/lib/supabase'
import { Plus, Settings, LogOut, Trash2 } from 'lucide-react'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { channels, loading, loadChannels, addPlaylist, deleteChannelsBelowRating, setCurrentChannel } = useChannelStore()
  const { user, logout } = useUserStore()
  
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [showAddPlaylist, setShowAddPlaylist] = useState(false)

  const [addPlaylistLoading, setAddPlaylistLoading] = useState(false)
  const [addPlaylistError, setAddPlaylistError] = useState('')
  const [addPlaylistStatus, setAddPlaylistStatus] = useState('')
  const [testStatus, setTestStatus] = useState('')

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const handleChannelClick = (channel: any) => {
    setCurrentChannel(channel)
    navigate('/player')
  }

  const handleAddPlaylist = async () => {
    if (!playlistUrl.trim()) return
    
    setAddPlaylistLoading(true)
    setAddPlaylistError('')
    setAddPlaylistStatus('')
    
    try {
      setAddPlaylistStatus('正在載入播放清單...')
      console.log('開始添加播放清單:', playlistUrl)
      
      // 測試 URL 是否可訪問
      setAddPlaylistStatus('檢查連接...')
      
      await addPlaylist(playlistUrl)
      
      setAddPlaylistStatus('解析完成，頁面更新中...')
      
      // 短暫延遲以讓用戶看到狀態更新
      setTimeout(() => {
        setPlaylistUrl('')
        setShowAddPlaylist(false)
        setAddPlaylistStatus('')
        console.log('播放清單添加完成，頁面已更新')
      }, 1000)
      
    } catch (error) {
      const errorMessage = (error as Error).message
      console.error('添加播放清單失敗:', errorMessage)
      
      // 提供更友好的錯誤訊息
      let displayError = errorMessage
      if (errorMessage.includes('CORS') || errorMessage.includes('Network')) {
        displayError = '無法載入播放清單：網路連接問題或跨域限制。請嘗試使用不同的 URL 或稍後重試。'
      } else if (errorMessage.includes('HTTP 4')) {
        displayError = '播放清單不存在或無法訪問，請檢查 URL 是否正確。'
      } else if (errorMessage.includes('parse') || errorMessage.includes('format')) {
        displayError = '播放清單格式不正確，請確認文件格式為 M3U/M3U8/JSON/TXT。'
      }
      
      setAddPlaylistError(displayError)
      setAddPlaylistStatus('')
    } finally {
      setAddPlaylistLoading(false)
    }
  }

  const handleCleanup = async () => {
    if (confirm('確定要刪除評分低於 51 分的頻道嗎？')) {
      await deleteChannelsBelowRating(51)
    }
  }

  const handleTestSupabase = async () => {
    setTestStatus('正在測試 Supabase 連線...')
    try {
      const result = await dbHelpers.testConnection()
      if (result.success) {
        setTestStatus('✅ Supabase 連線測試成功！')
      } else {
        setTestStatus(`❌ 測試失敗: ${result.message}`)
      }
    } catch (error) {
      setTestStatus(`❌ 測試錯誤: ${(error as Error).message}`)
    }
    
    // 5秒後清除狀態
    setTimeout(() => setTestStatus(''), 5000)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-xl">載入中...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 頂部導航 */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Abuji IPTV</h1>
            <p className="text-sm text-gray-400">
              用戶等級: {user?.user_level === 3 ? '管理者' : user?.user_level === 2 ? '一般' : '免費'}
              {user?.user_level && user.user_level > 1 && (
                <span className="ml-2 text-green-400">
                  ({channels.length}/500 頻道)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddPlaylist(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              添加播放清單
            </button>
            
            {user?.user_level === 3 && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Settings size={16} />
                管理
              </button>
            )}
            
            <button
              onClick={handleCleanup}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
              清理
            </button>
            
            <button
              onClick={handleTestSupabase}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔗 測試DB
            </button>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </div>
        
        {/* 測試狀態顯示 */}
        {testStatus && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {testStatus}
          </div>
        )}
      </header>

      {/* 主要內容 */}
      <main className="flex-1 overflow-auto">
        {channels.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-xl font-semibold mb-2">尚無頻道</h2>
              <p className="text-gray-400 mb-4">請添加播放清單來載入頻道</p>
              <button
                onClick={() => setShowAddPlaylist(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
              >
                添加播放清單
              </button>
            </div>
          </div>
        ) : (
          <div className="channel-grid">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-colors group"
              >
                <div className="aspect-video bg-gray-700 flex items-center justify-center relative">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  ) : (
                    <div className="text-4xl text-gray-500 font-bold">
                      {channel.name.charAt(0)}
                    </div>
                  )}
                  
                  {/* 評分顯示 */}
                  <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded ${
                    channel.rating >= 80 ? 'bg-green-600 bg-opacity-90' :
                    channel.rating >= 60 ? 'bg-yellow-600 bg-opacity-90' :
                    channel.rating >= 40 ? 'bg-orange-600 bg-opacity-90' :
                    'bg-red-600 bg-opacity-90'
                  }`}>
                    {channel.rating}分
                  </div>
                  
                  {/* 投票統計 */}
                  {channel.votes && (channel.votes.likes > 0 || channel.votes.dislikes > 0) && (
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded flex gap-2">
                      {channel.votes.likes > 0 && <span>👍 {channel.votes.likes}</span>}
                      {channel.votes.dislikes > 0 && <span>👎 {channel.votes.dislikes}</span>}
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-blue-400 transition-colors">
                    {channel.name}
                  </h3>
                  {channel.category && (
                    <p className="text-gray-400 text-xs mt-1">{channel.category}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 添加播放清單對話框 */}
      {showAddPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">添加播放清單</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  播放清單 URL
                </label>
                <input
                  type="url"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              
              <div>
                <p className="text-sm text-gray-600">
                  格式將自動辨識（支援 M3U、M3U8、JSON、TXT）
                </p>
              </div>

              {/* 狀態顯示 */}
              {addPlaylistStatus && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                    <p className="text-blue-700 text-sm">{addPlaylistStatus}</p>
                  </div>
                </div>
              )}
              
              {/* 錯誤顯示 */}
              {addPlaylistError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm mb-2">{addPlaylistError}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddPlaylistError('')}
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                    >
                      關閉
                    </button>
                    <button
                      onClick={handleAddPlaylist}
                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                      disabled={addPlaylistLoading}
                    >
                      重試
                    </button>
                  </div>
                </div>
              )}
              
              {/* 使用說明 */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>支援格式：</strong>M3U、M3U8、JSON、TXT
                </p>
                <p className="text-xs text-gray-500">
                  如果遇到載入失敗，可能是 CORS 限制。系統會自動嘗試多種代理方式載入。
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPlaylistUrl('/test-playlist.m3u')
                  }}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded"
                >
                  使用測試檔案
                </button>
                <button
                  onClick={() => {
                    setPlaylistUrl('https://files.catbox.moe/zyat7k.m3u')
                  }}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                >
                  使用範例URL
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddPlaylist(false)
                  setAddPlaylistError('')
                  setAddPlaylistStatus('')
                }}
                disabled={addPlaylistLoading}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddPlaylist}
                disabled={!playlistUrl.trim() || addPlaylistLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
              >
                {addPlaylistLoading ? '解析中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomePage 