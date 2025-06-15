import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { Plus, LogOut, Search, Grid3X3, Grid2X2, MoreHorizontal } from 'lucide-react'

export const NewHomePage: React.FC = () => {
  const navigate = useNavigate()
  const { channels, loading, loadChannels, addPlaylist, setCurrentChannel } = useChannelStore()
  const { user, logout } = useUserStore()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddPlaylist, setShowAddPlaylist] = useState(false)
  const [playlistUrl, setPlaylistUrl] = useState('')
  const [addPlaylistLoading, setAddPlaylistLoading] = useState(false)
  const [addPlaylistError, setAddPlaylistError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  // 過濾頻道
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleChannelClick = (channel: any) => {
    setCurrentChannel(channel)
    navigate('/player')
  }

  const handleAddPlaylist = async () => {
    if (!playlistUrl.trim()) return
    
    setAddPlaylistLoading(true)
    setAddPlaylistError('')
    
    try {
      await addPlaylist(playlistUrl)
      setPlaylistUrl('')
      setShowAddPlaylist(false)
    } catch (error) {
      const errorMessage = (error as Error).message
      setAddPlaylistError(errorMessage.includes('CORS') ? 
        '無法載入播放清單：網路連接問題或跨域限制' : errorMessage)
    } finally {
      setAddPlaylistLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-lg">載入頻道中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 頂部導航 */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Abuji IPTV</h1>
            <p className="text-sm text-gray-400">
              用戶等級: {user?.user_level === 3 ? '管理者' : user?.user_level === 2 ? '一般' : '免費'}
              {user?.user_level && user.user_level > 1 && (
                <span className="ml-2 text-green-400">
                  ({filteredChannels.length}/{channels.length} 頻道)
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddPlaylist(true)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
            >
              <Plus size={14} />
              添加
            </button>
            
            <button
              onClick={logout}
              className="flex items-center gap-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        </div>

        {/* 搜尋欄 */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜尋頻道..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 視圖切換 */}
          <div className="flex border border-gray-600 rounded">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
              title="網格視圖"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
              title="列表視圖"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 主要內容區域 */}
      <main className="flex-1 p-4">
        {filteredChannels.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white">
              <h2 className="text-xl font-semibold mb-2">
                {searchTerm ? '沒有找到匹配的頻道' : '尚無頻道'}
              </h2>
              <p className="text-gray-400 mb-4">
                {searchTerm ? '請嘗試其他搜尋詞' : '請添加播放清單來載入頻道'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowAddPlaylist(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
                >
                  添加播放清單
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
              : 'space-y-2'
          }>
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelClick(channel)}
                className={`
                  bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 group
                  ${viewMode === 'grid' ? 'flex flex-col items-center justify-center p-4' : 'flex items-center p-3'}
                `}
              >
                {viewMode === 'grid' ? (
                  <>
                    <div className="h-16 w-16 mb-2 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full ${channel.logo ? 'hidden' : 'flex'} items-center justify-center text-white font-bold text-xl`}>
                        {channel.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    
                    <h3 className="text-white text-center font-medium text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {channel.name}
                    </h3>
                    
                    {/* 評分顯示 */}
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">
                        ⭐ {channel.rating || 50}
                      </span>
                      {channel.category && (
                        <span className="text-gray-400 text-sm">
                          • {channel.category}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden mr-3">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-full ${channel.logo ? 'hidden' : 'flex'} items-center justify-center text-white font-bold text-sm`}>
                        {channel.name.substring(0, 2).toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-white font-medium group-hover:text-blue-300 transition-colors">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-yellow-400 text-sm">
                          ⭐ {channel.rating || 50}
                        </span>
                        {channel.category && (
                          <span className="text-gray-400 text-sm">
                            {channel.category}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button className="p-2 hover:bg-gray-600 rounded-lg">
                      <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 添加播放清單模態框 */}
      {showAddPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">添加播放清單</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    播放清單 URL (支援 M3U/M3U8/JSON/TXT)
                  </label>
                  <input
                    type="url"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    placeholder="https://example.com/playlist.m3u"
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={addPlaylistLoading}
                  />
                </div>
                
                {addPlaylistError && (
                  <div className="text-red-400 text-sm bg-red-900 bg-opacity-20 p-3 rounded">
                    {addPlaylistError}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddPlaylist}
                  disabled={addPlaylistLoading || !playlistUrl.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                >
                  {addPlaylistLoading ? '載入中...' : '添加'}
                </button>
                <button
                  onClick={() => {
                    setShowAddPlaylist(false)
                    setPlaylistUrl('')
                    setAddPlaylistError('')
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 