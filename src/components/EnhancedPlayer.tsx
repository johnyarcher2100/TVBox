import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Channel } from '@/types'

declare global {
  interface Window {
    Hls?: any;
  }
}

interface PlayerConfig {
  isLive: boolean
  hasAudio: boolean
  isMute: boolean
  stretch: boolean
  poster?: string
  bufferTime: number
  loadTimeOut: number
  loadTimeReplay: number
  MSE: boolean
  WCS: boolean
  WASM: boolean
  WASMSIMD: boolean
  gpuDecoder: boolean
  webGPU: boolean
  canvasRender: boolean
  debug: boolean
  preferredDecoder?: 'libvlc' | 'easyplayer' | 'webcodec' | 'wasm' | 'native' | 'hls' | 'videojs' | 'dplayer' | 'flvjs' | 'mpegts' | 'dash'
}

interface EnhancedPlayerProps {
  channel: Channel | null
  config?: Partial<PlayerConfig>
  onError?: (error: string) => void
  onPlayerReady?: () => void
}

export const EnhancedPlayer: React.FC<EnhancedPlayerProps> = ({ 
  channel, 
  config = {},
  onError,
  onPlayerReady
}) => {
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const playerInstanceRef = useRef<any>(null)
  const hlsInstanceRef = useRef<any>(null)
  const vlcInstanceRef = useRef<any>(null)
  
  const [currentDecoder, setCurrentDecoder] = useState<string>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supportedDecoders, setSupportedDecoders] = useState<string[]>([])

  // 默認配置
  const defaultConfig: PlayerConfig = {
    isLive: false,
    hasAudio: true,
    isMute: false, // 不靜音，用戶點選頻道後自動播放有聲音
    stretch: false,
    bufferTime: 2.0,
    loadTimeOut: 15,
    loadTimeReplay: 2,
    MSE: true,
    WCS: false,
    WASM: true,
    WASMSIMD: true,
    gpuDecoder: true,
    webGPU: false,
    canvasRender: false,
    debug: true,
    preferredDecoder: 'easyplayer',
    ...config
  }

  // 動態載入 Hls.js
  const loadHlsJsScript = async (): Promise<void> => {
    if (typeof window.Hls !== 'undefined') return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js';
      script.async = true;
      script.onload = () => {
        if (typeof window.Hls !== 'undefined') {
          console.log('Hls.js 載入成功');
          resolve();
        } else {
          reject(new Error('Hls.js 載入失敗'));
        }
      };
      script.onerror = () => reject(new Error('Hls.js 載入失敗'));
      document.head.appendChild(script);
    });
  };

  // 檢測支援的解碼器
  const detectSupportedDecoders = useCallback(async () => {
    const decoders: string[] = []
    
    // 檢測全域播放器能力
    const capabilities = (window as any).playerCapabilities || {}
    
    // 檢測 libvlc.js
    if (capabilities.libvlc || typeof (window as any).VLC !== 'undefined' || typeof (window as any).vlc !== 'undefined') {
      decoders.push('libvlc')
    }
    
    // 檢測 EasyPlayer Pro
    if (capabilities.easyplayer || typeof (window as any).EasyPlayerPro === 'function') {
      console.log('EasyPlayer Pro 可用')
      decoders.push('easyplayer')
    } else {
      console.warn('EasyPlayer Pro 不可用或未正確載入')
    }
    
    // 檢測 Video.js
    if (capabilities.videojs || typeof (window as any).videojs !== 'undefined') {
      decoders.push('videojs')
    }
    
    // 檢測 DPlayer
    if (capabilities.dplayer || typeof (window as any).DPlayer !== 'undefined') {
      decoders.push('dplayer')
    }
    
    // 檢測 FLV.js
    if (typeof (window as any).flvjs !== 'undefined') {
      decoders.push('flvjs')
    }
    
    // 檢測 mpegts.js
    if (typeof (window as any).mpegts !== 'undefined') {
      decoders.push('mpegts')
    }
    
    // 檢測 dash.js
    if (typeof (window as any).dashjs !== 'undefined') {
      decoders.push('dash')
    }
    
    // 檢測 WebCodec API
    if (capabilities.webcodec || ('VideoDecoder' in window && 'VideoEncoder' in window)) {
      try {
        const isSupported = await VideoDecoder.isConfigSupported({
          codec: 'avc1.42E01E', // H.264 baseline
        })
        if (isSupported.supported) {
          decoders.push('webcodec')
        }
      } catch (e) {
        console.warn('WebCodec 檢測失敗:', e)
      }
    }
    
    // 檢測 WASM
    if (typeof WebAssembly !== 'undefined') {
      decoders.push('wasm')
    }
    
    // 檢測 HLS.js
    if (capabilities.hls || typeof (window as any).Hls !== 'undefined') {
      decoders.push('hls')
    } else {
      // 動態載入 Hls.js
      try {
        await loadHlsJsScript();
        if (typeof (window as any).Hls !== 'undefined') {
          decoders.push('hls');
        }
      } catch (e) {
        console.warn('Hls.js 動態載入失敗:', e);
      }
    }
    
    // 原生播放器總是可用
    decoders.push('native')
    
    console.log('檢測到的解碼器:', decoders)
    setSupportedDecoders(decoders)
    return decoders
  }, [])

  // 檢測媒體格式和編碼
  const detectMediaInfo = (url: string) => {
    const urlLower = url.toLowerCase()
    
    const info = {
      format: 'unknown',
      protocol: 'http',
      isLive: false,
      isHLS: false,
      isFLV: false,
      isMP4: false,
      isWebRTC: false,
      supportedCodecs: ['h264'], // 默認支援 H.264
      preferredDecoder: defaultConfig.preferredDecoder
    }

    // 協議檢測
    if (url.startsWith('rtmp://') || url.startsWith('rtmps://')) {
      info.protocol = 'rtmp'
      info.isLive = true
    } else if (url.startsWith('ws://') || url.startsWith('wss://')) {
      info.protocol = 'websocket'
      info.isLive = true
    } else if (url.startsWith('webrtc://') || urlLower.includes('webrtc')) {
      info.protocol = 'webrtc'
      info.isLive = true
      info.isWebRTC = true
    }

    // 格式檢測
    if (urlLower.includes('.m3u8') || urlLower.includes('playlist.m3u8')) {
      info.format = 'hls'
      info.isHLS = true
      info.isLive = true
      info.supportedCodecs = ['h264', 'h265', 'aac']
    } else if (urlLower.includes('.flv')) {
      info.format = 'flv'
      info.isFLV = true
      info.isLive = true
      info.supportedCodecs = ['h264', 'h265', 'aac', 'mp3']
    } else if (urlLower.includes('.mp4')) {
      info.format = 'mp4'
      info.isMP4 = true
      info.supportedCodecs = ['h264', 'h265', 'aac', 'mp3']
    } else if (urlLower.includes('.webm')) {
      info.format = 'webm'
      info.supportedCodecs = ['vp8', 'vp9', 'av1', 'opus']
    } else if (urlLower.includes('.mkv')) {
      info.format = 'mkv'
      info.supportedCodecs = ['h264', 'h265', 'vp8', 'vp9', 'aac', 'mp3', 'opus']
    } else if (urlLower.includes('.ts')) {
      info.format = 'ts'
      info.isLive = true
      info.supportedCodecs = ['h264', 'h265', 'aac', 'mp3']
    }

    // 根據格式選擇最佳解碼器 - 優先使用已知可靠的 EasyPlayer
    if (info.isWebRTC) {
      info.preferredDecoder = 'native' // WebRTC 使用原生支援
    } else {
      info.preferredDecoder = 'easyplayer' // 默認使用 EasyPlayer，因為它原本可以正常工作
    }

    return info
  }





  // EasyPlayer Pro 播放器初始化
  const initEasyPlayer = async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('初始化 EasyPlayer Pro')
      
      try {
        // 檢查 EasyPlayerPro 是否存在
        if (!(window as any).EasyPlayerPro) {
          console.warn('EasyPlayerPro 播放器未載入，嘗試載入...')
          // 嘗試動態載入或等待載入
          setTimeout(() => {
            if (!(window as any).EasyPlayerPro) {
              const error = 'EasyPlayerPro 播放器未載入'
              console.error(error)
              setError(error)
              reject(new Error(error))
            } else {
              // 如果載入成功，重新嘗試初始化
              initEasyPlayer(url).then(resolve).catch(reject)
            }
          }, 1000)
          return
        }
        
        console.log('EasyPlayerPro 檢查通過:', typeof (window as any).EasyPlayerPro)

        if (!playerContainerRef.current) {
          const error = '播放器容器未準備好'
          console.error(error)
          setError(error)
          reject(new Error(error))
          return
        }
        
        console.log('播放器容器檢查通過:', playerContainerRef.current)
        
        // 清理之前的實例
        if (playerInstanceRef.current) {
          try {
            if (typeof playerInstanceRef.current.destroy === 'function') {
              playerInstanceRef.current.destroy()
            }
          } catch (e) {
            console.warn('清理舊播放器時出錯:', e)
          }
          playerInstanceRef.current = null
        }

        // 設置容器（不清空，避免破壞DOM結構）
        const container = playerContainerRef.current
        
        // 設置容器樣式
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.position = 'relative'
        container.style.display = 'block'
        
        console.log('EasyPlayer 容器已準備，尺寸:', container.offsetWidth, 'x', container.offsetHeight)

        // 創建新的播放器實例
        const config = {
          isLive: true,
          hasAudio: true,
          isMute: false,
          stretch: false,
          bufferTime: 0.5,
          loadTimeOut: 10,
          loadTimeReplay: 3,
          MSE: true,
          WCS: false,
          WASM: true,
          WASMSIMD: true,
          gpuDecoder: false,
          webGPU: false,
          canvasRender: false,
          debug: false,
          autoplay: true,
          volume: 1.0 // 設置音量為最大
        }

        console.log('創建 EasyPlayer，配置:', config)

        // 延遲創建播放器實例，確保 DOM 準備好
        setTimeout(() => {
          try {
            // 再次檢查容器是否存在
            if (!container || !container.parentNode) {
              const error = '播放器容器已被移除'
              console.error(error)
              setError(error)
              reject(new Error(error))
              return
            }

            // @ts-ignore
            const player = new window.EasyPlayerPro(container, config)
            
            if (!player) {
              const error = '播放器創建失敗 - 實例為空'
              console.error(error)
              setError(error)
              reject(new Error(error))
              return
            }
            
            console.log('EasyPlayer 實例創建成功:', player)

            playerInstanceRef.current = player
            let hasResolved = false
            
            // 設置事件監聽器
            const handleSuccess = () => {
              if (!hasResolved) {
                hasResolved = true
                console.log('EasyPlayer 初始化成功')
                setCurrentDecoder('easyplayer')
                setIsLoading(false)
                setError(null)
                onPlayerReady?.()
                resolve()
              }
            }

            const handleError = (error: any) => {
              if (!hasResolved) {
                hasResolved = true
                console.error('EasyPlayer 播放錯誤:', error)
                const errorMessage = `播放錯誤: ${error}`
                setError(errorMessage)
                reject(new Error(errorMessage))
              }
            }

            player.on('loadstart', () => {
              console.log('EasyPlayer 開始載入')
              setError(null)
            })

            player.on('canplay', handleSuccess)
            player.on('playing', handleSuccess)
            player.on('error', handleError)

            // 設置超時處理
            const timeout = setTimeout(() => {
              if (!hasResolved) {
                hasResolved = true
                const error = 'EasyPlayer 初始化超時'
                setError(error)
                reject(new Error(error))
              }
            }, 15000) // 15秒超時

            // 開始播放
            setTimeout(() => {
              if (player && url && !hasResolved) {
                console.log('開始播放視頻:', url)
                Promise.resolve(player.play(url))
                  .catch((playError: any) => {
                    if (!hasResolved) {
                      clearTimeout(timeout)
                      console.error('播放失敗:', playError)
                      handleError(playError)
                    }
                  })
              }
            }, 100)

          } catch (initError) {
            console.error('EasyPlayer 實例創建失敗:', initError)
            const errorMessage = `播放器創建失敗: ${initError}`
            setError(errorMessage)
            reject(new Error(errorMessage))
          }
        }, 200)
        
      } catch (error) {
        console.error('EasyPlayer 初始化失敗:', error)
        const errorMessage = `EasyPlayer 初始化失敗: ${error}`
        setError(errorMessage)
        reject(new Error(errorMessage))
      }
    })
  }



  // 原生播放器初始化
  const initNativePlayer = async (url: string) => {
    console.log('初始化原生播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
      
      // 確保先清理之前的播放
      video.pause()
      video.currentTime = 0
      video.src = ''
      video.load()
      
      // 設置新的源
      video.src = url
      
      video.addEventListener('loadedmetadata', () => {
        console.log('原生播放器 metadata 載入完成，開始自動播放')
        setCurrentDecoder('native')
        setIsLoading(false)
        setError(null)
        onPlayerReady?.()
        
        // 設置音量
        video.volume = 1.0
        video.muted = false
        
        // 自動播放
        video.play().catch((playError) => {
          console.warn('自動播放失敗，可能需要用戶互動:', playError)
          // 即使自動播放失敗，播放器也已經準備好，用戶可以手動點擊播放
        })
      })
      
      video.addEventListener('error', () => {
        const error = video.error
        console.error('原生播放器錯誤:', error)
        setError(`原生播放器播放失敗: ${error?.message || '未知錯誤'}`)
        onError?.(`所有播放器都無法播放此媒體: ${url}`)
      })
      
      video.load()
      
    } catch (error) {
      console.error('原生播放器初始化失敗:', error)
      setError(`原生播放器初始化失敗: ${error}`)
      onError?.(`所有播放器都無法播放此媒體: ${url}`)
    }
  }



  // 清理當前播放器的函數
  const cleanupCurrentPlayer = useCallback(() => {
    console.log('清理當前播放器...')
    
    // 停止並清理 EasyPlayer
    if (playerInstanceRef.current) {
      try {
        if (typeof playerInstanceRef.current.stop === 'function') {
          playerInstanceRef.current.stop()
        }
        if (typeof playerInstanceRef.current.destroy === 'function') {
          playerInstanceRef.current.destroy()
        }
        playerInstanceRef.current = null
        console.log('EasyPlayer 已清理')
      } catch (e) {
        console.error('清理 EasyPlayer 時出錯:', e)
      }
    }
    
    // 停止並清理 HLS
    if (hlsInstanceRef.current) {
      try {
        hlsInstanceRef.current.destroy()
        hlsInstanceRef.current = null
        console.log('HLS 播放器已清理')
      } catch (e) {
        console.error('清理 HLS 時出錯:', e)
      }
    }
    
    // 停止並清理 libVLC
    if (vlcInstanceRef.current) {
      try {
        vlcInstanceRef.current.stop()
        vlcInstanceRef.current = null
        console.log('libVLC 播放器已清理')
      } catch (e) {
        console.error('清理 libVLC 時出錯:', e)
      }
    }
    
    // 停止原生 video 元素
    if (videoElementRef.current) {
      try {
        const video = videoElementRef.current
        video.pause()
        video.currentTime = 0
        video.src = ''
        video.load() // 重置 video 元素
        console.log('原生 video 元素已重置')
      } catch (e) {
        console.error('重置 video 元素時出錯:', e)
      }
    }
    
    // 清理播放器容器內容（但保留容器本身）
    if (playerContainerRef.current) {
      try {
        const container = playerContainerRef.current
        // 只清理非必要的子元素，保留容器結構
        const children = Array.from(container.children)
        children.forEach(child => {
          // 如果是播放器相關的元素，清理它
          if (child.className && (
            child.className.includes('easy-player') || 
            child.className.includes('video-js') ||
            child.className.includes('dplayer')
          )) {
            try {
              container.removeChild(child)
            } catch (e) {
              console.warn('清理子元素時出錯:', e)
            }
          }
        })
        
        // 重新設置基本樣式
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.position = 'relative'
        container.style.display = 'block'
        console.log('播放器容器內容已清理')
      } catch (e) {
        console.error('清理播放器容器時出錯:', e)
      }
    }
    
    // 重置狀態
    setCurrentDecoder('none')
    setIsLoading(false)
    setError(null)
  }, [])

  // 初始化播放器
  const initPlayer = useCallback(async (url: string, preferredDecoder?: string): Promise<void> => {
    if (!url) return
    
    // 先清理前一個播放器
    cleanupCurrentPlayer()
    
    setIsLoading(true)
    setError(null)
    
    const mediaInfo = detectMediaInfo(url)
    const decoder = preferredDecoder || mediaInfo.preferredDecoder || 'easyplayer'
    
    console.log(`使用 ${decoder} 播放器播放:`, url)
    console.log('媒體信息:', mediaInfo)
    
    const handleError = (error: any, decoderName: string) => {
      console.error(`${decoderName} 初始化失敗:`, error)
      setTimeout(() => {
        const mediaInfo = detectMediaInfo(url)
        const decoders = [...supportedDecoders]
        
        let sortedDecoders: string[] = []
        if (mediaInfo.isHLS) {
          sortedDecoders = ['easyplayer', 'hls', 'videojs', 'dplayer', 'libvlc', 'webcodec', 'native']
        } else if (mediaInfo.isFLV) {
          sortedDecoders = ['easyplayer', 'flvjs', 'libvlc', 'dplayer', 'webcodec', 'wasm', 'native']
        } else if (mediaInfo.isWebRTC) {
          sortedDecoders = ['native', 'easyplayer', 'libvlc', 'videojs']
        } else if (mediaInfo.isMP4) {
          sortedDecoders = ['easyplayer', 'videojs', 'dplayer', 'libvlc', 'webcodec', 'native']
        } else {
          sortedDecoders = ['easyplayer', 'webcodec', 'libvlc', 'videojs', 'dplayer', 'hls', 'native']
        }
        
        const availableDecoders = sortedDecoders.filter(d => decoders.includes(d))
        const currentIndex = availableDecoders.indexOf(decoder)
        const nextDecoder = availableDecoders[currentIndex + 1]
        
        if (nextDecoder) {
          console.log(`嘗試下一個解碼器: ${nextDecoder}`)
          initPlayer(url, nextDecoder).catch((nextError) => {
            console.error(`${nextDecoder} 也失敗:`, nextError)
          })
        } else {
          console.error('所有解碼器都嘗試失敗')
          setError('所有播放器都無法播放此媒體')
          setIsLoading(false)
          onError?.(`所有播放器都無法播放此媒體: ${url}`)
        }
      }, 500)
    }
    
    try {
      switch (decoder) {
        case 'easyplayer':
          if (supportedDecoders.includes('easyplayer')) {
            await initEasyPlayer(url).catch((error) => {
              console.error('EasyPlayer 初始化失敗，嘗試下一個解碼器:', error)
              handleError(error, 'EasyPlayer')
            })
          } else {
            console.log('EasyPlayer 不在支援列表中，嘗試原生播放器')
            await initNativePlayer(url).catch((error) => {
              console.error('原生播放器也失敗:', error)
              handleError(error, 'Native')
            })
          }
          break
          
        case 'native':
        default:
          await initNativePlayer(url).catch((error) => {
            console.error('Native 播放器初始化失敗:', error)
            handleError(error, 'Native')
          })
          break
      }
    } catch (error) {
      console.error(`${decoder} 播放器意外錯誤:`, error)
      setError(`播放器錯誤: ${error}`)
      setIsLoading(false)
    }
  }, [supportedDecoders, onError, cleanupCurrentPlayer])

  // 初始化支援的解碼器
  useEffect(() => {
    detectSupportedDecoders()
  }, [detectSupportedDecoders])

  // 當頻道改變時清理前一個播放器並初始化新播放器
  useEffect(() => {
    if (channel?.url && supportedDecoders.length > 0) {
      console.log('頻道變更，準備切換播放器:', channel.name, channel.url)
      initPlayer(channel.url)
    } else if (!channel?.url) {
      // 如果沒有頻道，清理所有播放器
      console.log('無頻道，清理所有播放器')
      cleanupCurrentPlayer()
    }
  }, [channel?.url, supportedDecoders, initPlayer, cleanupCurrentPlayer, channel?.name])

  // 清理資源
  useEffect(() => {
    return () => {
      console.log('組件卸載，清理所有播放器')
      cleanupCurrentPlayer()
    }
  }, [cleanupCurrentPlayer])

  return (
    <div className="relative w-full h-full bg-black">
      {/* 播放器容器 */}
      <div 
        ref={playerContainerRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: currentDecoder === 'libvlc' || currentDecoder === 'easyplayer' ? 'block' : 'none' }}
      />
      
      {/* 視頻元素 */}
      <video
        ref={videoElementRef}
        className="absolute inset-0 w-full h-full object-contain"
        style={{ display: ['native', 'hls', 'hls-native', 'webcodec'].includes(currentDecoder) ? 'block' : 'none' }}
        controls
        autoPlay
        playsInline
        muted={defaultConfig.isMute}
      />
      
      {/* 載入指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>正在載入播放器...</p>
            <p className="text-sm text-gray-300 mt-2">當前解碼器: {currentDecoder}</p>
          </div>
        </div>
      )}
      
      {/* 錯誤顯示 */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-lg max-w-xs">
          <p className="text-sm">{error}</p>
        </div>
      )}
      

    </div>
  )
}