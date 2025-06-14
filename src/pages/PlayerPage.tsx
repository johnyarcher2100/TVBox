import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { EnhancedPlayer } from '@/components/EnhancedPlayer'
import MarqueeDisplay from '@/components/MarqueeDisplay'
import ImageNotification from '@/components/ImageNotification'
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
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

  const [sidebarOpacity, setSidebarOpacity] = useState(10) // 透明度 0-100
  const [sidebarWidth, setSidebarWidth] = useState(200) // 寬度 200-500px
  const [error, setError] = useState<string | null>(null)
  const [isRating, setIsRating] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<string | null>(null)
  
  // 添加自動收起相關狀態
  const [autoHideTimeout, setAutoHideTimeout] = useState<NodeJS.Timeout | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const channelListRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null)
  
  // 添加滑鼠選擇相關狀態
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(-1)
  const [isMouseSelecting, setIsMouseSelecting] = useState(false)
  
  // 添加滑鼠位置狀態
  const [isMouseInSidebar, setIsMouseInSidebar] = useState(false)
  // 添加移動設備檢測
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  // 新增互動狀態
  const [isInteracting, setIsInteracting] = useState(false)


  // 檢測是否為移動設備
  useEffect(() => {
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      setIsMobileDevice(isMobile || isTouchDevice)
    }
    
    checkMobileDevice()
    window.addEventListener('resize', checkMobileDevice)
    return () => window.removeEventListener('resize', checkMobileDevice)
  }, [])

  // 自動收起功能 - 先定義
  const resetAutoHideTimer = useCallback(() => {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
    }
    // 僅當未互動時才自動收起
    if (!isInteracting && !isMouseInSidebar && !isScrolling) {
      const hideDelay = isMobileDevice ? 10000 : 7000
      const newTimeout = setTimeout(() => {
        setShowSidebar(false)
      }, hideDelay)
      setAutoHideTimeout(newTimeout)
    }
  }, [autoHideTimeout, isInteracting, isMouseInSidebar, isScrolling, isMobileDevice])

  // 處理滑鼠進入側邊欄
  const handleMouseEnterSidebar = useCallback(() => {
    setIsMouseInSidebar(true)
    setIsInteracting(true)
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
      setAutoHideTimeout(null)
    }
  }, [autoHideTimeout])

  // 處理滑鼠離開側邊欄
  const handleMouseLeaveSidebar = useCallback(() => {
    setIsMouseInSidebar(false)
    setIsInteracting(false)
    if (showSidebar) {
      resetAutoHideTimer()
    }
  }, [showSidebar, resetAutoHideTimer])

  // 處理點擊側邊欄
  const handleSidebarClick = useCallback(() => {
    setIsInteracting(true)
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
      setAutoHideTimeout(null)
    }
  }, [autoHideTimeout])

  // 處理觸控側邊欄
  const handleSidebarTouch = useCallback(() => {
    setIsInteracting(true)
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout)
      setAutoHideTimeout(null)
    }
  }, [autoHideTimeout])

  // 處理觸控結束
  const handleSidebarTouchEnd = useCallback(() => {
    setIsInteracting(false)
    resetAutoHideTimer()
  }, [resetAutoHideTimer])

  // 處理頻道列表滾動
  const handleChannelListScroll = useCallback(() => {
    setIsScrolling(true)
    setIsInteracting(true)
    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }
    const newScrollTimeout = setTimeout(() => {
      setIsScrolling(false)
      setIsInteracting(false)
      if (showSidebar && !isMouseInSidebar) {
        resetAutoHideTimer()
      }
    }, 300)
    setScrollTimeout(newScrollTimeout)
  }, [scrollTimeout, showSidebar, isMouseInSidebar, resetAutoHideTimer])

  // 當側邊欄顯示狀態改變時的處理
  useEffect(() => {
    if (showSidebar) {
      // 側邊欄顯示時，如果滑鼠不在側邊欄內才開始計時
      if (!isMouseInSidebar) {
        resetAutoHideTimer()
      }
    } else {
      // 隱藏時清除所有計時器
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout)
        setAutoHideTimeout(null)
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
        setScrollTimeout(null)
      }
      setIsMouseInSidebar(false)
    }
    
    // 清理函數
    return () => {
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout)
      }
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [showSidebar, isMouseInSidebar, resetAutoHideTimer])



  // 處理全域用戶活動
  const handleUserActivity = useCallback(() => {
    if (showSidebar) {
      resetAutoHideTimer()
    }
  }, [showSidebar, resetAutoHideTimer])

  // 添加全域事件監聽器來檢測用戶活動
  useEffect(() => {
    const events = [
      'click',
      'touchstart',
      'touchend',
      'touchmove',
      'mousedown',
      'mousemove',
      'keydown',
      'scroll'
    ]
    
    const handleActivity = (e: Event) => {
      // 如果是手機設備，只關注點擊和觸摸事件
      if (isMobileDevice) {
        if (['click', 'touchstart', 'touchend'].includes(e.type)) {
          handleUserActivity()
        }
      } else {
        // 桌面設備關注所有活動
        handleUserActivity()
      }
    }
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [handleUserActivity, isMobileDevice])

  useEffect(() => {
    if (!currentChannel) {
      navigate('/')
    }
  }, [currentChannel, navigate])

  // 尋找當前播放頻道的索引
  useEffect(() => {
    if (currentChannel && channels.length > 0) {
      const currentIndex = channels.findIndex(channel => channel.id === currentChannel.id)
      if (currentIndex !== -1) {
        setSelectedChannelIndex(currentIndex)
      }
    }
  }, [currentChannel, channels])

  // 處理滑鼠滾輪選擇
  const handleWheelSelect = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (channels.length === 0) return
    
    setIsMouseSelecting(true)
    
    const delta = e.deltaY > 0 ? 1 : -1
    setSelectedChannelIndex(prevIndex => {
      let newIndex = prevIndex + delta
      
      // 循環選擇
      if (newIndex >= channels.length) {
        newIndex = 0
      } else if (newIndex < 0) {
        newIndex = channels.length - 1
      }
      
      return newIndex
    })
    
    // 300ms後清除滑鼠選擇狀態
    setTimeout(() => {
      setIsMouseSelecting(false)
    }, 300)
  }, [channels.length])

  // 滾動到選中的頻道
  useEffect(() => {
    if (selectedChannelIndex >= 0 && channelListRef.current && isMouseSelecting) {
      const channelElements = channelListRef.current.querySelectorAll('[data-channel-index]')
      const selectedElement = channelElements[selectedChannelIndex] as HTMLElement
      
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [selectedChannelIndex, isMouseSelecting])

  // 處理頻道選擇點擊
  const handleChannelSelect = useCallback((channel: any, index: number) => {
    setSelectedChannelIndex(index)
    useChannelStore.getState().setCurrentChannel(channel)
  }, [])

  // 處理鍵盤確認選擇
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSidebar && selectedChannelIndex >= 0 && channels.length > 0) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          const selectedChannel = channels[selectedChannelIndex]
          if (selectedChannel) {
            handleChannelSelect(selectedChannel, selectedChannelIndex)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showSidebar, selectedChannelIndex, channels, handleChannelSelect])

  const handleRating = useCallback(async (isLike: boolean) => {
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
  }, [currentChannel, isRating, rateChannel])

  const handlePlayerError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    console.error('播放器錯誤:', errorMessage)
  }, [])

  const handlePlayerReady = useCallback(() => {
    console.log('播放器準備就緒')
    setError(null)
  }, [])

  // 使用 useMemo 穩定 config 對象，避免播放器不必要的重新初始化
  const playerConfig = useMemo(() => ({
    debug: true,
    preferredDecoder: 'easyplayer' as const
  }), [])

  // 使用 useMemo 穩定側邊欄樣式對象
  const sidebarStyle = useMemo(() => ({
    width: showSidebar ? `${sidebarWidth}px` : '0px',
    backgroundColor: `rgba(31, 41, 55, ${sidebarOpacity / 100})`
  }), [showSidebar, sidebarWidth, sidebarOpacity])

  // 使用 useMemo 穩定評分模態框樣式對象
  const ratingModalStyle = useMemo(() => ({
    backgroundColor: `rgba(31, 41, 55, ${sidebarOpacity / 100})`
  }), [sidebarOpacity])

  // 使用 useMemo 穩定滑動條樣式對象
  const opacitySliderStyle = useMemo(() => ({
    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${sidebarOpacity}%, #4b5563 ${sidebarOpacity}%, #4b5563 100%)`
  }), [sidebarOpacity])

  const widthSliderStyle = useMemo(() => {
    const percentage = ((sidebarWidth - 200) / 300) * 100
    return {
      background: `linear-gradient(to right, #10b981 0%, #10b981 ${percentage}%, #4b5563 ${percentage}%, #4b5563 100%)`
    }
  }, [sidebarWidth])

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
          config={playerConfig}
        />
      </div>

      {/* 左側 Sidebar - 覆蓋在影片上方 */}
      <div 
        ref={sidebarRef}
        className={`absolute left-0 top-0 bottom-0 ${
          showSidebar ? '' : 'w-0'
        } transition-all duration-300 border-r border-gray-700 flex flex-col overflow-hidden z-30 backdrop-blur-sm`}
        style={sidebarStyle}
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        onClick={handleSidebarClick}
        onTouchStart={handleSidebarTouch}
        onTouchMove={handleSidebarTouch}
        onTouchEnd={handleSidebarTouchEnd}
      >
        {showSidebar && (
          <>
            {/* 頂部返回按鈕 - 移到最上方 */}
            <div className="flex-shrink-0 p-3 border-b border-gray-700 border-opacity-50">
              <div className="flex items-center justify-between">
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
            </div>

            {/* 頻道列表 - 加長高度 */}
            <div className="flex-[2] overflow-hidden border-b border-gray-700 border-opacity-50">
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">頻道列表</h3>
                  <span className="text-xs text-gray-300">{channels.length} 個頻道</span>
                </div>
              </div>
              
              <div 
                ref={channelListRef}
                className="flex-1 overflow-y-auto px-4 pb-4"
                onScroll={handleChannelListScroll}
                onWheel={handleWheelSelect}
                onTouchStart={handleUserActivity}
                onTouchMove={handleUserActivity}
                onTouchEnd={handleUserActivity}
              >
                <div className="space-y-2">
                  {channels.map((channel, index) => (
                    <div
                      key={channel.id}
                      data-channel-index={index}
                      onClick={() => handleChannelSelect(channel, index)}
                      className={`p-3 rounded-lg cursor-pointer transition-all backdrop-blur-sm ${
                        currentChannel?.id === channel.id
                          ? 'bg-blue-600 bg-opacity-90 ring-2 ring-blue-400 ring-opacity-50'
                          : selectedChannelIndex === index && isMouseSelecting
                          ? 'bg-yellow-600 bg-opacity-80 ring-2 ring-yellow-400 ring-opacity-50'
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
                        
                        {/* 選擇指示器 */}
                        {selectedChannelIndex === index && isMouseSelecting && (
                          <div className="text-yellow-400">
                            ▶
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 滑鼠選擇提示 */}
                {isMouseSelecting && (
                  <div className="sticky bottom-0 mt-2 p-2 bg-gray-800 bg-opacity-90 rounded text-xs text-center text-yellow-400 backdrop-blur-sm">
                    🖱️ 滾輪選擇 | 點擊或按 Enter 確認
                  </div>
                )}
              </div>
            </div>

            {/* 控制面板 - 縮減高度 */}
            <div className="flex-[0.6] flex-shrink-0 p-4 overflow-y-auto">
              {/* 當前頻道資訊 - 簡化 */}
              <div className="bg-gray-700 bg-opacity-80 rounded-lg p-3 backdrop-blur-sm mb-3">
                <div className="flex items-center gap-3 mb-2">
                  {currentChannel.logo && (
                    <img
                      src={currentChannel.logo}
                      alt={currentChannel.name}
                      className="w-6 h-6 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-medium truncate text-white text-sm">{currentChannel.name}</h2>
                    <p className="text-xs text-gray-300">
                      評分: <span className="text-orange-400 font-medium">{currentChannel.rating}</span>/9999
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 bg-opacity-90 hover:bg-opacity-100 px-3 py-1.5 rounded-lg transition-all text-xs"
                >
                  <Star size={14} />
                  評分
                </button>
              </div>

              {/* 設定面板 - 簡化 */}
              <div className="space-y-2">
                {/* 透明度控制 */}
                <div>
                  <label className="block text-xs text-gray-200 mb-1">
                    透明度: {sidebarOpacity}%
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={sidebarOpacity}
                    onChange={(e) => setSidebarOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    style={opacitySliderStyle}
                  />
                </div>
                
                {/* 寬度滑動條 */}
                <div>
                  <label className="block text-xs text-gray-200 mb-1">
                    寬度: {sidebarWidth}px
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="500"
                    value={sidebarWidth}
                    onChange={(e) => setSidebarWidth(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    style={widthSliderStyle}
                  />
                </div>
                
                {/* 重置按鈕 */}
                <button
                  onClick={() => {
                    setSidebarOpacity(10)
                    setSidebarWidth(200)
                  }}
                  className="w-full bg-gray-600 bg-opacity-80 hover:bg-opacity-100 px-3 py-1 rounded text-xs transition-all"
                >
                  重置預設
                </button>

                {/* 自動收起提示 */}
                <div className="text-xs text-gray-400 text-center bg-gray-800 bg-opacity-50 rounded p-1.5">
                  {isMobileDevice ? (
                    <>📱 10秒無點擊自動收起</>
                  ) : isMouseInSidebar ? (
                    <>💡 滑鼠在側邊欄，不會自動收起</>
                  ) : (
                    <>💡 7秒無操作自動收起</>
                  )}
                  {isScrolling && <div className="text-green-400 mt-1">🎯 滑動中...</div>}
                </div>
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
      {user && user.user_level >= 1 && (
        <MarqueeDisplay 
          userLevel={user.user_level}
          className="absolute top-0 left-0 right-0 z-30"
        />
      )}

      {/* 圖示推播 */}
      {user && user.user_level >= 1 && (
        <ImageNotification 
          userLevel={user.user_level}
        />
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
            className="rounded-lg p-6 max-w-md w-full mx-4 transform transition-all backdrop-blur-sm"
            style={ratingModalStyle}
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