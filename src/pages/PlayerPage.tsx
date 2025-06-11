import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { EnhancedPlayer } from '@/components/EnhancedPlayer'
import { ArrowLeft, ThumbsUp, ThumbsDown, List, Star } from 'lucide-react'

const PlayerPage: React.FC = () => {
  const navigate = useNavigate()
  const { currentChannel, channels, rateChannel } = useChannelStore()
  const { user } = useUserStore()

  const [showChannelList, setShowChannelList] = useState(false)
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
    setShowChannelList(false)
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
      }, 3000)
      
    } catch (error) {
      console.error('評分失敗:', error)
      setRatingMessage(`評分失敗：${(error as Error).message}`)
      
      setTimeout(() => {
        setRatingMessage(null)
      }, 5000)
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
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* 頂部控制欄 */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            返回
          </button>
          
          <div>
            <h1 className="text-lg font-semibold">{currentChannel.name}</h1>
            <p className="text-sm text-gray-400">評分: {currentChannel.rating}/9999</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowChannelList(!showChannelList)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
          >
            <List size={20} />
            頻道列表
          </button>
        </div>
      </header>

      {/* 主要播放區域 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 播放器 */}
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

        {/* 推播訊息跑馬燈 */}
        {showNotification && user && user.user_level >= 1 && (
          <div className="absolute top-4 right-4 bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-lg max-w-md">
            <div className="animate-pulse">
              <p className="text-sm">🎬 歡迎使用 Abuji IPTV 播放器</p>
            </div>
          </div>
        )}

        {/* 推播圖示 */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="bg-black bg-opacity-50 p-2 rounded-full">
            <Star className="text-yellow-400" size={24} />
          </div>
        </div>

        {/* 左側控制面板 */}
        <div 
          className={`absolute left-0 top-0 bottom-0 w-80 bg-gray-900 transform transition-transform duration-300 z-10 ${
            isTransparent ? 'bg-opacity-70' : 'bg-opacity-95'
          }`}
          style={{ 
            transform: showChannelList ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="p-4 h-full flex flex-col">
            {/* 透明度控制 */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isTransparent}
                  onChange={(e) => setIsTransparent(e.target.checked)}
                  className="rounded"
                />
                透明模式
              </label>
            </div>

            {/* 評分按鈕 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleRating(true)}
                disabled={isRating}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
              >
                <ThumbsUp size={16} />
                讚 (+5)
              </button>
              <button
                onClick={() => handleRating(false)}
                disabled={isRating}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-3 py-2 rounded-lg transition-colors"
              >
                <ThumbsDown size={16} />
                爛 (-19)
              </button>
            </div>

            {/* 評分訊息 */}
            {ratingMessage && (
              <div className="mb-4 p-3 bg-blue-600 rounded-lg text-sm">
                {ratingMessage}
              </div>
            )}

            {/* 頻道列表 */}
            <div className="flex-1 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-3">頻道列表</h3>
              <div className="space-y-2">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentChannel?.id === channel.id
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
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
                        <p className="font-medium truncate">{channel.name}</p>
                        <p className="text-xs text-gray-400">
                          評分: {channel.rating} | {channel.category || '未分類'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="absolute top-20 right-4 bg-red-600 text-white p-3 rounded-lg max-w-xs z-30">
            <p className="text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs underline"
            >
              關閉
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerPage 