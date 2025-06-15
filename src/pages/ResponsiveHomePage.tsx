import React, { useState, useEffect } from 'react'
import { Search, Grid3X3, Grid2X2, MoreHorizontal, Play } from 'lucide-react'
import { SuperEnhancedPlayer } from '@/components/SuperEnhancedPlayer'
import { useChannelStore } from '@/stores/channelStore'
import type { Channel } from '@/types'

export const ResponsiveHomePage: React.FC = () => {
  const { channels, loading, loadChannels, setCurrentChannel } = useChannelStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showPlayer, setShowPlayer] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)

  // 載入頻道
  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  // 過濾頻道
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 播放頻道
  const playChannel = (channel: Channel) => {
    setSelectedChannel(channel)
    setCurrentChannel(channel)
    setShowPlayer(true)
    setPlayerError(null)
  }

  // 關閉播放器
  const closePlayer = () => {
    setShowPlayer(false)
    setSelectedChannel(null)
    setPlayerError(null)
  }

  // 處理播放器錯誤
  const handlePlayerError = (error: string) => {
    setPlayerError(error)
    console.error('播放器錯誤:', error)
  }

  // 處理播放器準備就緒
  const handlePlayerReady = () => {
    console.log('播放器準備就緒')
    setPlayerError(null)
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
      {/* 全屏播放器 */}
      {showPlayer && selectedChannel && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* 播放器控制欄 */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={closePlayer}
                  className="text-white hover:text-gray-300 text-xl"
                >
                  ← 返回
                </button>
                <div>
                  <h2 className="text-lg font-semibold">{selectedChannel.name}</h2>
                  {selectedChannel.category && (
                    <p className="text-sm text-gray-300">{selectedChannel.category}</p>
                  )}
                </div>
              </div>
              
              {playerError && (
                <div className="bg-red-900/80 text-white px-3 py-1 rounded text-sm">
                  {playerError}
                </div>
              )}
            </div>
          </div>

          {/* 播放器 */}
          <SuperEnhancedPlayer
            channel={selectedChannel}
            onError={handlePlayerError}
            onPlayerReady={handlePlayerReady}
          />
        </div>
      )}

      {/* 主界面 */}
      <div className="container mx-auto px-4 py-6">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔺 Abuji IPTV 播放器</h1>
          <p className="text-gray-400">支援多種格式的智能播放器</p>
        </div>

        {/* 搜索和控制欄 */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索頻道或分類..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 視圖切換 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 統計信息 */}
        <div className="mb-6 text-sm text-gray-400">
          顯示 {filteredChannels.length} / {channels.length} 個頻道
        </div>

        {/* 頻道列表 */}
        {filteredChannels.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">沒有找到匹配的頻道</p>
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              清除搜索
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          }>
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className={`
                  group relative bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-200 cursor-pointer
                  ${viewMode === 'grid' ? 'aspect-video' : 'flex items-center p-4'}
                `}
                onClick={() => playChannel(channel)}
              >
                {viewMode === 'grid' ? (
                  // 網格視圖
                  <>
                    {/* 縮略圖區域 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/60 group-hover:text-white/80 transition-colors" />
                      </div>
                    </div>
                    
                    {/* 信息覆蓋層 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <h3 className="font-semibold text-sm mb-1 truncate">{channel.name}</h3>
                      {channel.category && (
                        <p className="text-xs text-gray-300 truncate">{channel.category}</p>
                      )}
                    </div>

                    {/* 懸停效果 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // 顯示更多選項
                        }}
                        className="p-1 bg-black/50 rounded-full hover:bg-black/70"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  // 列表視圖
                  <>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Play className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{channel.name}</h3>
                        {channel.category && (
                          <p className="text-sm text-gray-400 truncate">{channel.category}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const target = e.target as HTMLElement
                        const menu = target.nextElementSibling as HTMLElement
                        if (menu) {
                          menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex'
                        }
                      }}
                      className="p-2 hover:bg-gray-600 rounded-lg"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {/* 下拉菜單 */}
                    <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 hidden flex-col min-w-[120px]">
                      <button className="px-3 py-2 text-left hover:bg-gray-700 text-sm">
                        播放
                      </button>
                      <button className="px-3 py-2 text-left hover:bg-gray-700 text-sm">
                        收藏
                      </button>
                      <button className="px-3 py-2 text-left hover:bg-gray-700 text-sm text-red-400">
                        刪除
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 