import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { EnhancedPlayer } from '@/components/EnhancedPlayer'
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  List, 
  Star, 
  Settings,
  ChevronLeft,
  ChevronRight,
  MoreVertical
} from 'lucide-react'

const PlayerPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentChannel, channels, rateChannel } = useChannelStore()
  const { user } = useUserStore()

  const [showSidebar, setShowSidebar] = useState(true)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showNotification] = useState(true)
  const [isTransparent, setIsTransparent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRating, setIsRating] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!currentChannel) {
      navigate('/')
    }
  }, [currentChannel, navigate])

  const handleChannelSelect = (channel: any) => {
    useChannelStore.getState().setCurrentChannel(channel)
  }

  const handleRating = async (isLike: boolean) => {
    if (!currentChannel || isRating) return
    
    setIsRating(true)
    const ratingType = isLike ? '讚' : '爛'
    const ratingChange = isLike ? '+5' : '-19'
    
    try {
      setRatingMessage(`正在提交${ratingType}評分...`)
      
      const oldRating = currentChannel.rating
      
      await rateChannel(currentChannel.id, isLike)
      
      const newRating = isLike ? oldRating + 5 : oldRating - 19
      setRatingMessage(`評分成功！${ratingType} (${ratingChange}分) 新評分：${Math.max(0, Math.min(9999, newRating))}分`)
      
      setTimeout(() => {
        setRatingMessage(null)
        setShowRatingModal(false)
      }, 2000)
      
    } catch (error) {
      console.error('評分失敗:', error)
      setRatingMessage(`評分失敗：${(error as Error).message}`)
      
      setTimeout(() => {
        setRatingMessage(null)
      }, 3000)
    } finally {
      setIsRating(false)
    }
  }

  const handlePlayerError = (errorMessage: string) => {
    setError(errorMessage)
    console.error('播放器錯誤:', errorMessage)
  }

  const handlePlayerReady = () => {
    console.log('播放器準備就緒')
    setError(null)
  }

  if (!currentChannel) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">未選擇頻道</div>
      </div>
    )
  }

  return (
    <div className="h-screen relative bg-gray-900 text-white overflow-hidden">
      {/* 全畫面播放器 */}
      <div className="absolute inset-0">
        <EnhancedPlayer
          channel={currentChannel}
          onError={handlePlayerError}
          onPlayerReady={handlePlayerReady}
          config={{
            debug: true,
            preferredDecoder: 'easyplayer'
          }}
        />
      </div>

      {/* 左側 Sidebar - 覆蓋在影片上方 */}
      <div 
        className={`absolute left-0 top-0 bottom-0 ${
          showSidebar ? 'w-80' : 'w-0'
        } transition-all duration-300 ${
          isTransparent ? 'bg-gray-800 bg-opacity-75' : 'bg-gray-800 bg-opacity-95'
        } border-r border-gray-700 flex flex-col overflow-hidden z-30 backdrop-blur-sm`}
      >
        {showSidebar && (
          <>
            {/* Sidebar 頂部控制 */}
            <div className="p-4 border-b border-gray-700 border-opacity-50">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 bg-gray-700 bg-opacity-80 hover:bg-opacity-100 px-3 py-2 rounded-lg transition-all text-sm"
                >
                  <ArrowLeft size={16} />
                  返回首頁
                </button>
                
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-700 hover:bg-opacity-50 rounded-lg transition-all"
                  title="隱藏側邊欄"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              {/* 當前頻道資訊 */}
              <div className="bg-gray-700 bg-opacity-80 rounded-lg p-3 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                  {currentChannel.logo && (
                    <img
                      src={currentChannel.logo}
                      alt={currentChannel.name}
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate text-white">{currentChannel.name}</h2>
                    <p className="text-xs text-gray-300">
                      評分: <span className="text-orange-400 font-medium">{currentChannel.rating}</span>/9999
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 bg-opacity-90 hover:bg-opacity-100 px-3 py-2 rounded-lg transition-all text-sm"
                >
                  <Star size={16} />
                  為此頻道評分
                </button>
              </div>

              {/* 透明度控制 */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={isTransparent}
                    onChange={(e) => setIsTransparent(e.target.checked)}
                    className="rounded"
                  />
                  側邊欄透明模式
                </label>
              </div>
            </div>

            {/* 頻道列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">頻道列表</h3>
                <span className="text-xs text-gray-300">{channels.length} 個頻道</span>
              </div>
              
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`p-3 rounded-lg cursor-pointer transition-all backdrop-blur-sm ${
                      currentChannel?.id === channel.id
                        ? 'bg-blue-600 bg-opacity-90 ring-2 ring-blue-400 ring-opacity-50'
                        : 'bg-gray-700 bg-opacity-60 hover:bg-opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {channel.logo && (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-8 h-8 rounded object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-white">{channel.name}</p>
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <span>評分: {channel.rating}</span>
                          <span>{channel.category || '未分類'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 側邊欄切換按鈕（當隱藏時） */}
      {!showSidebar && (
        <button
          onClick={() => setShowSidebar(true)}
          className="absolute top-4 left-4 bg-black bg-opacity-70 hover:bg-opacity-90 p-3 rounded-lg transition-all z-40 backdrop-blur-sm"
          title="顯示側邊欄"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* 推播訊息跑馬燈 */}
      {showNotification && user && user.user_level >= 1 && (
        <div className="absolute top-4 right-4 bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-lg max-w-md z-30 backdrop-blur-sm">
          <div className="animate-pulse">
            <p className="text-sm">🎬 歡迎使用 Abuji IPTV 播放器</p>
          </div>
        </div>
      )}

      {/* 快速評分按鈕 */}
      <div className="absolute bottom-6 right-6 z-30">
        <button
          onClick={() => setShowRatingModal(true)}
          className="bg-black bg-opacity-70 hover:bg-opacity-90 p-3 rounded-full transition-all shadow-lg backdrop-blur-sm"
          title="快速評分"
        >
          <MoreVertical size={20} />
        </button>
      </div>

      {/* 錯誤顯示 */}
      {error && (
        <div className="absolute top-20 right-4 bg-red-600 bg-opacity-95 text-white p-3 rounded-lg max-w-xs z-40 backdrop-blur-sm">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs underline"
          >
            關閉
          </button>
        </div>
      )}

      {/* 評分浮動框架 */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div 
            className={`bg-gray-800 ${
              isTransparent ? 'bg-opacity-90' : 'bg-opacity-95'
            } rounded-lg p-6 max-w-md w-full mx-4 transform transition-all backdrop-blur-sm`}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2 text-white">為頻道評分</h3>
              <p className="text-gray-300 text-sm">{currentChannel.name}</p>
              <p className="text-sm text-gray-300 mt-1">
                目前評分: <span className="text-orange-400 font-medium">{currentChannel.rating}</span>/9999
              </p>
            </div>

            {/* 評分按鈕 */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => handleRating(true)}
                disabled={isRating}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 bg-opacity-90 hover:bg-opacity-100 disabled:bg-gray-600 disabled:bg-opacity-50 px-4 py-3 rounded-lg transition-all"
              >
                <ThumbsUp size={20} />
                <div className="text-center">
                  <div className="text-white">讚</div>
                  <div className="text-xs text-green-200">+5分</div>
                </div>
              </button>
              <button
                onClick={() => handleRating(false)}
                disabled={isRating}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 bg-opacity-90 hover:bg-opacity-100 disabled:bg-gray-600 disabled:bg-opacity-50 px-4 py-3 rounded-lg transition-all"
              >
                <ThumbsDown size={20} />
                <div className="text-center">
                  <div className="text-white">爛</div>
                  <div className="text-xs text-red-200">-19分</div>
                </div>
              </button>
            </div>

            {/* 評分訊息 */}
            {ratingMessage && (
              <div className="mb-4 p-3 bg-blue-600 bg-opacity-90 rounded-lg text-sm text-center text-white">
                {ratingMessage}
              </div>
            )}

            {/* 關閉按鈕 */}
            <button
              onClick={() => setShowRatingModal(false)}
              disabled={isRating}
              className="w-full bg-gray-700 bg-opacity-80 hover:bg-opacity-100 text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerPage 