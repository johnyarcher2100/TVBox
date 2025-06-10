import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelStore } from '@/stores/channelStore'
import { useUserStore } from '@/stores/userStore'
import { ArrowLeft, ThumbsUp, ThumbsDown, List, Star } from 'lucide-react'

const PlayerPage: React.FC = () => {
  const navigate = useNavigate()
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const playerInstanceRef = useRef<any>(null)
  const { currentChannel, channels, rateChannel } = useChannelStore()
  useUserStore()

  const [showChannelList, setShowChannelList] = useState(false)
  const [showNotification] = useState(true)
  const [isTransparent, setIsTransparent] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRating, setIsRating] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!currentChannel) {
      navigate('/')
    }
  }, [currentChannel, navigate])

  // 等待 EasyPlayerPro 載入
  useEffect(() => {
    const checkEasyPlayerPro = () => {
      if (typeof (window as any).EasyPlayerPro !== 'undefined') {
        console.log('EasyPlayerPro 已載入')
        setPlayerReady(true)
        return true
      }
      return false
    }

    if (!checkEasyPlayerPro()) {
      console.log('等待 EasyPlayerPro 載入...')
      const interval = setInterval(() => {
        if (checkEasyPlayerPro()) {
          clearInterval(interval)
        }
      }, 100)

      // 10秒超時
      const timeout = setTimeout(() => {
        clearInterval(interval)
        setError('EasyPlayerPro 載入超時')
        console.error('EasyPlayerPro 載入超時')
      }, 10000)

      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [])

  // 初始化播放器
  useEffect(() => {
    if (!playerReady || !currentChannel || !playerContainerRef.current) return

    const initializePlayer = async () => {
      try {
        // 清理之前的播放器實例
        if (playerInstanceRef.current) {
          console.log('清理之前的播放器實例')
          playerInstanceRef.current.destroy()
          playerInstanceRef.current = null
        }

        // 檢測媒體格式和協議
        const mediaInfo = detectMediaFormat(currentChannel.url)
        console.log('檢測到的媒體格式:', mediaInfo)

        // 如果 URL 沒有明確的格式指示，並且是 HTTP URL，優先嘗試原生播放器
        if (shouldUseNativePlayer(currentChannel.url)) {
          console.log('URL 格式不明確，使用原生播放器')
          tryNativeVideoFallback(currentChannel.url)
          return
        }

        const config = {
          isLive: mediaInfo.isLive,
          hasAudio: true,
          isMute: false,
          stretch: false, // 保持原始比例
          bufferTime: mediaInfo.isLive ? 0.3 : 2.0,
          loadTimeOut: 10, // 減少超時時間
          loadTimeReplay: 2, // 減少重試次數
          MSE: true,
          WCS: false,
          WASM: true,
          WASMSIMD: true,
          gpuDecoder: false,
          webGPU: false,
          canvasRender: false,
          debug: true,
          // 播放配置
          autoplay: true,
          controls: true, // 顯示控制列
          poster: '', // 海報圖
          // 格式特定配置
          ...(mediaInfo.demuxType ? { demuxType: mediaInfo.demuxType } : {}),
          ...(mediaInfo.playType ? { playType: mediaInfo.playType } : {}),
          // 網路設定
          timeout: 15000, // 減少超時時間
          retryTimes: 1, // 減少重試次數
          // 視頻設定
          volume: 1.0,
          playbackRate: 1.0
        }

        console.log('初始化 EasyPlayerPro 實例...', config)
        // @ts-ignore
        playerInstanceRef.current = new window.EasyPlayerPro(playerContainerRef.current, config)

        // 設置事件監聽
        playerInstanceRef.current.on('error', (error: any) => {
          console.error('播放錯誤:', error)
          const errorMessage = error.message || error.toString()
          
          // 檢查是否為協議錯誤
          if (errorMessage.includes('protocol') || errorMessage.includes('mp4') || errorMessage.includes('m3u8')) {
            console.log('檢測到協議錯誤，嘗試原生播放器')
            tryNativeVideoFallback(currentChannel.url)
            return
          }
          
          setError(`播放錯誤: ${errorMessage}`)
          
          // 短暫延遲後嘗試原生播放器
          setTimeout(() => {
            console.log('EasyPlayerPro 失敗，嘗試原生播放器')
            tryNativeVideoFallback(currentChannel.url)
          }, 2000)
        })

        playerInstanceRef.current.on('loadstart', () => {
          console.log('開始載入視頻...')
          setError(null)
        })

        playerInstanceRef.current.on('canplay', () => {
          console.log('視頻可以播放')
          setError(null)
        })

        playerInstanceRef.current.on('playing', () => {
          console.log('視頻正在播放')
          setError(null)
        })

        playerInstanceRef.current.on('pause', () => {
          console.log('視頻暫停')
        })

        playerInstanceRef.current.on('ended', () => {
          console.log('視頻播放結束')
        })

        playerInstanceRef.current.on('waiting', () => {
          console.log('視頻緩衝中...')
        })

        playerInstanceRef.current.on('stalled', () => {
          console.log('視頻停滯')
        })

        // 等待一下再播放
        setTimeout(() => {
          if (playerInstanceRef.current && currentChannel.url) {
            console.log('播放頻道:', currentChannel.name, currentChannel.url)
            playerInstanceRef.current.play(currentChannel.url).catch((playError: any) => {
              console.error('播放失敗:', playError)
              const errorMessage = playError.message || playError.toString()
              
              // 檢查是否為協議錯誤
              if (errorMessage.includes('protocol') || errorMessage.includes('mp4') || errorMessage.includes('m3u8')) {
                console.log('檢測到協議錯誤，立即嘗試原生播放器')
                tryNativeVideoFallback(currentChannel.url)
                return
              }
              
              setError(`播放失敗: ${errorMessage}`)
              
              // 延遲後嘗試原生播放器
              setTimeout(() => {
                console.log('EasyPlayerPro 播放失敗，嘗試原生播放器')
                tryNativeVideoFallback(currentChannel.url)
              }, 1000)
            })
          }
        }, 500) // 減少等待時間

      } catch (initError) {
        console.error('播放器初始化失敗:', initError)
        setError(`初始化失敗: ${initError}`)
        // 立即嘗試原生播放器後備方案
        tryNativeVideoFallback(currentChannel.url)
      }
    }

    initializePlayer()
  }, [playerReady, currentChannel])

  // 判斷是否應該使用原生播放器
  const shouldUseNativePlayer = (url: string): boolean => {
    const urlLower = url.toLowerCase()
    
    // 如果 URL 沒有明確的媒體格式副檔名，並且是 HTTP URL
    if (url.startsWith('http') && 
        !urlLower.includes('.mp4') && 
        !urlLower.includes('.m3u8') && 
        !urlLower.includes('.flv') && 
        !urlLower.includes('.webm') && 
        !urlLower.includes('.ts') && 
        !urlLower.includes('.mpd')) {
      return true
    }
    
    return false
  }

  // 原生 video 後備方案
  const tryNativeVideoFallback = (url: string) => {
    console.log('嘗試原生 video 後備方案...')
    if (playerContainerRef.current) {
      // 清空容器
      playerContainerRef.current.innerHTML = ''
      
      // 創建原生 video 元素
      const video = document.createElement('video')
      video.controls = true
      video.autoplay = true
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.backgroundColor = 'black'
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      
      let hasTriedHLS = false
      
      video.addEventListener('error', (e) => {
        console.error('原生 video 播放錯誤:', e)
        
        // 如果是 HLS 格式但原生播放器不支持，嘗試使用 hls.js
        if (!hasTriedHLS && (url.includes('.m3u8') || url.includes('playlist'))) {
          hasTriedHLS = true
          tryHLSFallback(url, video)
          return
        }
        
        setError('無法播放此媒體格式。可能原因：\n1. 媒體服務器不可用\n2. 網路連接問題\n3. 不支援的媒體格式\n請嘗試其他頻道或稍後重試。')
      })
      
      video.addEventListener('loadstart', () => {
        console.log('原生 video 開始載入...')
        setError(null)
      })
      
      video.addEventListener('canplay', () => {
        console.log('原生 video 可以播放')
        setError(null)
      })
      
      video.addEventListener('loadedmetadata', () => {
        console.log('原生 video 載入元數據完成')
        setError(null)
      })
      
      video.addEventListener('playing', () => {
        console.log('原生 video 正在播放')
        setError(null)
      })
      
      // 設置超時處理
      const loadTimeout = setTimeout(() => {
        if (video.readyState === 0) {
          console.error('原生 video 載入超時')
          setError('媒體載入超時，請檢查網路連接或嘗試其他頻道')
        }
      }, 15000)
      
      video.addEventListener('loadeddata', () => {
        clearTimeout(loadTimeout)
      })
      
      // 嘗試播放
      video.src = url
      playerContainerRef.current.appendChild(video)
      
      // 強制播放
      video.play().catch((playError) => {
        console.error('原生 video 自動播放失敗:', playError)
        // 這通常是由於瀏覽器的自動播放政策，用戶需要手動點擊播放
      })
    }
  }

  // HLS 後備方案
  const tryHLSFallback = (url: string, videoElement: HTMLVideoElement) => {
    console.log('嘗試 HLS.js 後備方案...')
    
    // 檢查是否支援 HLS.js
    if (typeof (window as any).Hls !== 'undefined') {
      const hls = new (window as any).Hls()
      
      hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest 解析完成')
        setError(null)
        videoElement.play().catch((error) => {
          console.error('HLS 自動播放失敗:', error)
        })
      })
      
      hls.on((window as any).Hls.Events.ERROR, (event: any, data: any) => {
        console.error('HLS 播放錯誤:', data)
        if (data.fatal) {
          setError('HLS 串流播放失敗，請嘗試其他頻道')
        }
      })
      
      hls.loadSource(url)
      hls.attachMedia(videoElement)
    } else {
      // 如果沒有 HLS.js，回到普通的錯誤處理
      setError('此瀏覽器不支援 HLS 格式，請使用 Safari 或安裝支援 HLS 的瀏覽器擴展')
    }
  }

  // 檢測媒體格式函數
  const detectMediaFormat = (url: string) => {
    const urlLower = url.toLowerCase()
    
    // HLS 格式 (HTTP Live Streaming)
    if (urlLower.includes('.m3u8') || urlLower.includes('/playlist.m3u8') || urlLower.includes('master.m3u8')) {
      return {
        isLive: true,
        demuxType: null, // 讓 EasyPlayer 自動檢測
        playType: null
      }
    }
    
    // DASH 格式 (Dynamic Adaptive Streaming)
    if (urlLower.includes('.mpd') || urlLower.includes('manifest.mpd')) {
      return {
        isLive: true,
        demuxType: null,
        playType: null
      }
    }
    
    // RTMP 格式
    if (url.startsWith('rtmp://') || url.startsWith('rtmps://')) {
      return {
        isLive: true,
        demuxType: null,
        playType: null
      }
    }
    
    // HTTP-FLV 格式
    if (urlLower.includes('.flv') || urlLower.includes('/live/')) {
      return {
        isLive: true,
        demuxType: null,
        playType: null
      }
    }
    
    // MP4 格式 (點播)
    if (urlLower.includes('.mp4')) {
      return {
        isLive: false,
        demuxType: null, // 讓播放器自動檢測
        playType: null
      }
    }
    
    // WebM 格式
    if (urlLower.includes('.webm')) {
      return {
        isLive: false,
        demuxType: null,
        playType: null
      }
    }
    
    // MOV 格式
    if (urlLower.includes('.mov')) {
      return {
        isLive: false,
        demuxType: null,
        playType: null
      }
    }
    
    // AVI 格式
    if (urlLower.includes('.avi')) {
      return {
        isLive: false,
        demuxType: null,
        playType: null
      }
    }
    
    // MKV 格式
    if (urlLower.includes('.mkv')) {
      return {
        isLive: false,
        demuxType: null,
        playType: null
      }
    }
    
    // TS 格式
    if (urlLower.includes('.ts')) {
      return {
        isLive: true,
        demuxType: null,
        playType: null
      }
    }
    
    // 預設配置 - 讓播放器自動檢測
    return {
      isLive: false, // 預設為點播
      demuxType: null,
      playType: null
    }
  }

  // 處理頻道切換
  useEffect(() => {
    if (!playerInstanceRef.current || !currentChannel?.url || !playerReady) return

    console.log('切換到頻道:', currentChannel.name, currentChannel.url)
    playerInstanceRef.current.play(currentChannel.url).catch((error: any) => {
      console.error('頻道切換失敗:', error)
      setError(`頻道切換失敗: ${error.message || error}`)
    })
  }, [currentChannel?.url, playerReady])

  // 清理播放器實例
  useEffect(() => {
    return () => {
      if (playerInstanceRef.current) {
        console.log('銷毀播放器實例')
        try {
          playerInstanceRef.current.destroy()
        } catch (e) {
          console.error('銷毀播放器時出錯:', e)
        }
        playerInstanceRef.current = null
      }
    }
  }, [])

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
      
      // 獲取當前評分以便顯示變化
      const oldRating = currentChannel.rating
      
      await rateChannel(currentChannel.id, isLike)
      
      // 顯示評分成功訊息
      const newRating = isLike ? oldRating + 5 : oldRating - 19
      setRatingMessage(`評分成功！${ratingType} (${ratingChange}分) 新評分：${Math.max(0, Math.min(9999, newRating))}分`)
      
      // 3秒後清除訊息
      setTimeout(() => {
        setRatingMessage(null)
      }, 3000)
      
    } catch (error) {
      console.error('評分失敗:', error)
      setRatingMessage(`評分失敗：${(error as Error).message}`)
      
      // 5秒後清除錯誤訊息
      setTimeout(() => {
        setRatingMessage(null)
      }, 5000)
    } finally {
      setIsRating(false)
    }
  }

  if (!currentChannel) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-white text-xl">載入中...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex bg-black relative overflow-hidden">
      {/* 主播放區域 */}
      <div className="flex-1 relative">
        {/* 播放器容器 */}
        <div ref={playerContainerRef} className="w-full h-full easy-player-container" />
        
        {/* 錯誤顯示 */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-30">
            <div className="bg-red-600 text-white p-6 rounded-lg max-w-md text-center mx-4">
              <h3 className="font-bold mb-3 text-lg">播放錯誤</h3>
              <p className="text-sm mb-4 whitespace-pre-line leading-relaxed">{error}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 bg-white text-red-600 rounded hover:bg-gray-100 transition-colors"
                >
                  關閉
                </button>
                {currentChannel && (
                  <button
                    onClick={() => {
                      setError(null)
                      // 重新嘗試播放
                      if (playerInstanceRef.current) {
                        playerInstanceRef.current.play(currentChannel.url).catch(() => {
                          tryNativeVideoFallback(currentChannel.url)
                        })
                      } else {
                        tryNativeVideoFallback(currentChannel.url)
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    重試
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 載入中顯示 */}
        {!playerReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-20">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>播放器載入中...</p>
            </div>
          </div>
        )}
        
        {/* 推播圖示 */}
        {showNotification && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20">
            <div className="bg-blue-600 p-3 rounded-full shadow-lg animate-pulse">
              <Star className="text-white" size={24} />
            </div>
          </div>
        )}

        {/* 頂部推播訊息跑馬燈 */}
        {showNotification && (
          <div className="absolute top-4 right-4 left-4 z-20">
            <div className="bg-blue-600 bg-opacity-90 rounded-full px-4 py-2 overflow-hidden">
              <div className="marquee text-white text-sm">
                歡迎使用 Abuji IPTV 播放器！享受高品質的串流體驗。
              </div>
            </div>
          </div>
        )}

        {/* 返回按鈕 */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-30 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-lg transition-all"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* 左側控制面板 */}
      <div className={`overlay-controls ${isTransparent ? 'transparent' : ''} w-80 bg-gray-900 bg-opacity-95 flex flex-col`}>
        {/* 透明度控制 */}
        <div className="p-4 border-b border-gray-700">
          <label className="flex items-center text-white text-sm">
            <input
              type="checkbox"
              checked={isTransparent}
              onChange={(e) => setIsTransparent(e.target.checked)}
              className="mr-2"
            />
            透明模式
          </label>
        </div>

        {/* 頻道資訊 */}
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-medium text-lg mb-2">
            {currentChannel.name}
          </h2>
          {currentChannel.category && (
            <p className="text-gray-400 text-sm mb-2">{currentChannel.category}</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">評分:</span>
            <span className={`font-medium px-2 py-1 rounded text-xs ${
              currentChannel.rating >= 80 ? 'bg-green-600 text-white' :
              currentChannel.rating >= 60 ? 'bg-yellow-600 text-white' :
              currentChannel.rating >= 40 ? 'bg-orange-600 text-white' :
              'bg-red-600 text-white'
            }`}>
              {currentChannel.rating}分
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <span className="text-gray-400">狀態:</span>
            <span className={`font-medium ${error ? 'text-red-400' : playerReady ? 'text-green-400' : 'text-yellow-400'}`}>
              {error ? '錯誤' : playerReady ? '就緒' : '載入中'}
            </span>
          </div>
        </div>

        {/* 評分按鈕 */}
        <div className="p-4 border-b border-gray-700">
          {/* 評分訊息顯示 */}
          {ratingMessage && (
            <div className={`mb-3 p-2 rounded text-sm text-center ${
              ratingMessage.includes('成功') 
                ? 'bg-green-600 bg-opacity-20 text-green-300 border border-green-600' 
                : ratingMessage.includes('失敗')
                ? 'bg-red-600 bg-opacity-20 text-red-300 border border-red-600'
                : 'bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-600'
            }`}>
              {ratingMessage}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => handleRating(true)}
              disabled={isRating}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                isRating 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105'
              }`}
            >
              <ThumbsUp size={16} />
              讚 (+5分)
              {isRating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-1"></div>}
            </button>
            <button
              onClick={() => handleRating(false)}
              disabled={isRating}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all ${
                isRating 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105'
              }`}
            >
              <ThumbsDown size={16} />
              爛 (-19分)
              {isRating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-1"></div>}
            </button>
          </div>
          
          {/* 投票統計 */}
          {currentChannel.votes && (
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>👍 {currentChannel.votes.likes}</span>
              <span>👎 {currentChannel.votes.dislikes}</span>
            </div>
          )}
          
          {/* 詳細統計 */}
          {currentChannel.votes && (currentChannel.votes.likes > 0 || currentChannel.votes.dislikes > 0) && (
            <div className="mt-2 text-xs text-gray-400">
              <div className="flex justify-between mb-1">
                <span>總投票數</span>
                <span>{currentChannel.votes.likes + currentChannel.votes.dislikes}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className="bg-green-500 h-1 rounded-full"
                  style={{
                    width: `${currentChannel.votes.likes + currentChannel.votes.dislikes > 0 
                      ? (currentChannel.votes.likes / (currentChannel.votes.likes + currentChannel.votes.dislikes)) * 100
                      : 0}%`
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-green-400">
                  {currentChannel.votes.likes + currentChannel.votes.dislikes > 0 
                    ? Math.round((currentChannel.votes.likes / (currentChannel.votes.likes + currentChannel.votes.dislikes)) * 100)
                    : 0}% 好評
                </span>
                <span className="text-red-400">
                  {currentChannel.votes.likes + currentChannel.votes.dislikes > 0 
                    ? Math.round((currentChannel.votes.dislikes / (currentChannel.votes.likes + currentChannel.votes.dislikes)) * 100)
                    : 0}% 差評
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 頻道列表 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => setShowChannelList(!showChannelList)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <List size={16} />
              頻道列表 ({channels.length})
            </button>
          </div>

          {showChannelList && (
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-1">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      channel.id === currentChannel.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {channel.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {channel.rating}分
                      </span>
                    </div>
                    {channel.category && (
                      <div className="text-xs text-gray-500 mt-1">
                        {channel.category}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerPage 