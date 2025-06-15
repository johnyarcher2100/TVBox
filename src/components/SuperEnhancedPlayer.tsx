import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Channel } from '@/types'

declare global {
  interface Window {
    Hls?: any;
    flvjs?: any;
    mpegts?: any;
    dashjs?: any;
    EasyPlayerPro?: any;
  }
}

interface SuperPlayerProps {
  channel: Channel | null
  onError?: (error: string) => void
  onPlayerReady?: () => void
}

export const SuperEnhancedPlayer: React.FC<SuperPlayerProps> = ({ 
  channel, 
  onError,
  onPlayerReady
}) => {
  const videoElementRef = useRef<HTMLVideoElement>(null)
  const playerInstanceRef = useRef<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  
  const [currentDecoder, setCurrentDecoder] = useState<string>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supportedDecoders, setSupportedDecoders] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [isYouTubeVideo, setIsYouTubeVideo] = useState(false)
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)

  // 安全的狀態更新函數
  const safeSetState = useCallback((updateFn: () => void) => {
    if (isMountedRef.current) {
      updateFn()
    }
  }, [])

  // 動態載入播放器腳本
  const loadPlayerScripts = useCallback(async () => {
    const scripts = [
      { 
        name: 'hls.js', 
        url: 'https://cdn.jsdelivr.net/npm/hls.js@1.4.12/dist/hls.min.js',
        check: () => typeof window.Hls !== 'undefined'
      },
      { 
        name: 'flv.js', 
        url: 'https://cdn.jsdelivr.net/npm/flv.js@1.6.2/dist/flv.min.js',
        check: () => typeof window.flvjs !== 'undefined'
      },
      { 
        name: 'mpegts.js', 
        url: 'https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.js',
        check: () => typeof window.mpegts !== 'undefined'
      }
    ]

    for (const script of scripts) {
      if (!isMountedRef.current) return // 檢查組件是否還掛載
      if (script.check()) continue
      
      try {
        await new Promise<void>((resolve, reject) => {
          if (!isMountedRef.current) {
            reject(new Error('Component unmounted'))
            return
          }

          const scriptElement = document.createElement('script')
          scriptElement.src = script.url
          scriptElement.async = true
          
          const handleLoad = () => {
            cleanup()
            if (isMountedRef.current) {
              resolve()
            }
          }
          
          const handleError = () => {
            cleanup()
            reject(new Error(`Failed to load ${script.name}`))
          }
          
          const cleanup = () => {
            scriptElement.removeEventListener('load', handleLoad)
            scriptElement.removeEventListener('error', handleError)
          }
          
          scriptElement.addEventListener('load', handleLoad)
          scriptElement.addEventListener('error', handleError)
          
          document.head.appendChild(scriptElement)
        })
        
        if (isMountedRef.current) {
          console.log(`✅ ${script.name} 載入成功`)
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.warn(`⚠️ ${script.name} 載入失敗:`, error)
        }
      }
    }
  }, [])

  // 檢測支援的解碼器
  const detectSupportedDecoders = useCallback(async () => {
    try {
      await loadPlayerScripts()
      
      if (!isMountedRef.current) return []
      
      const decoders: string[] = []
      
      if (typeof window.Hls !== 'undefined') decoders.push('hls')
      if (typeof window.flvjs !== 'undefined') decoders.push('flvjs')
      if (typeof window.mpegts !== 'undefined') decoders.push('mpegts')
      if (typeof window.EasyPlayerPro === 'function') decoders.push('easyplayer')
      
      // WebCodec 檢測
      if ('VideoDecoder' in window && 'VideoEncoder' in window) {
        try {
          const config = { codec: 'avc1.42E01E' }
          const support = await VideoDecoder.isConfigSupported(config)
          if (support.supported && isMountedRef.current) {
            decoders.push('webcodec')
          }
        } catch (e) {
          console.warn('WebCodec 檢測失敗:', e)
        }
      }
      
      // WASM 檢測
      if (typeof WebAssembly !== 'undefined') decoders.push('wasm')
      
      // MSE 檢測
      if ('MediaSource' in window) decoders.push('mse')
      
      decoders.push('native')
      
      if (isMountedRef.current) {
        console.log('🎯 檢測到的解碼器:', decoders)
        setSupportedDecoders(decoders)
      }
      
      return decoders
    } catch (error) {
      if (isMountedRef.current) {
        console.error('檢測解碼器失敗:', error)
        setSupportedDecoders(['native']) // 至少保證原生播放器可用
      }
      return ['native']
    }
  }, [loadPlayerScripts])

  // 檢測 YouTube 視頻
  const detectYouTubeVideo = (url: string): { isYouTube: boolean; videoId: string | null } => {
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/live\/([^&\n?#]+)/,
      /youtube\.com\/@([^\/]+)\/streams\/(\d+)/,
      /m\.youtube\.com\/@([^\/]+)\/streams\/(\d+)/,
    ]
    
    for (const pattern of youtubePatterns) {
      const match = url.match(pattern)
      if (match) {
        if (pattern.source.includes('@') && pattern.source.includes('streams')) {
          const channelName = match[1]
          return { isYouTube: true, videoId: `@${channelName}/live` }
        }
        return { isYouTube: true, videoId: match[1] }
      }
    }
    return { isYouTube: false, videoId: null }
  }

  // 構建 YouTube 嵌入 URL
  const buildYouTubeEmbedUrl = (videoId: string): string => {
    if (videoId.startsWith('@')) {
      const channelName = videoId.replace('@', '').replace('/live', '')
      return `https://www.youtube.com/embed/live_stream?channel=${channelName}&autoplay=1&mute=0`
    }
    
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '0',
      controls: '1',
      rel: '0',
      modestbranding: '1',
      playsinline: '1',
      enablejsapi: '1'
    })
    
    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }

  // 檢測媒體格式
  const detectMediaInfo = (url: string) => {
    const urlLower = url.toLowerCase()
    
    // YouTube 檢測
    const youtubeInfo = detectYouTubeVideo(url)
    if (youtubeInfo.isYouTube) {
      safeSetState(() => {
        setIsYouTubeVideo(true)
        setYoutubeVideoId(youtubeInfo.videoId)
      })
      return { format: 'youtube', preferredDecoders: ['youtube'] }
    }

    safeSetState(() => {
      setIsYouTubeVideo(false)
      setYoutubeVideoId(null)
    })
    
    // 格式檢測與最佳解碼器匹配
    if (urlLower.includes('.m3u8')) {
      return { format: 'hls', preferredDecoders: ['hls', 'native'] }
    } else if (urlLower.includes('.flv')) {
      return { format: 'flv', preferredDecoders: ['flvjs', 'native'] }
    } else if (urlLower.includes('.mp4')) {
      return { format: 'mp4', preferredDecoders: ['native', 'webcodec'] }
    } else if (urlLower.includes('.ts')) {
      return { format: 'ts', preferredDecoders: ['mpegts', 'hls'] }
    } else if (url.startsWith('rtmp://')) {
      return { format: 'rtmp', preferredDecoders: ['easyplayer', 'native'] }
    } else if (url.startsWith('ws://') || url.startsWith('wss://')) {
      return { format: 'websocket', preferredDecoders: ['flvjs', 'mpegts'] }
    }

    return { format: 'unknown', preferredDecoders: ['native'] }
  }

  // HLS 播放器初始化
  const initHLS = async (url: string): Promise<void> => {
    if (!window.Hls) throw new Error('HLS.js 不可用')
    
    return new Promise((resolve, reject) => {
      if (!isMountedRef.current) {
        reject(new Error('Component unmounted'))
        return
      }

      const video = videoElementRef.current
      if (!video) {
        reject(new Error('視頻元素不可用'))
        return
      }
      
      if (window.Hls.isSupported()) {
        const hls = new window.Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        })
        
        hls.loadSource(url)
        hls.attachMedia(video)
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          if (!isMountedRef.current) return
          
          safeSetState(() => {
            setCurrentDecoder('hls')
            setConnectionStatus('connected')
            setIsLoading(false)
          })
          
          video.play().then(() => {
            if (isMountedRef.current) {
              resolve()
              onPlayerReady?.()
            }
          }).catch(reject)
        })
        
        hls.on(window.Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal && isMountedRef.current) {
            safeSetState(() => setConnectionStatus('disconnected'))
            reject(new Error(`HLS 錯誤: ${data.details}`))
          }
        })
        
        playerInstanceRef.current = hls
        
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        video.play().then(() => {
          if (isMountedRef.current) {
            safeSetState(() => {
              setCurrentDecoder('hls-native')
              setConnectionStatus('connected')
              setIsLoading(false)
            })
            resolve()
            onPlayerReady?.()
          }
        }).catch(reject)
      } else {
        reject(new Error('HLS 不被支援'))
      }
    })
  }

  // 原生播放器初始化
  const initNative = async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isMountedRef.current) {
        reject(new Error('Component unmounted'))
        return
      }

      const video = videoElementRef.current
      if (!video) {
        reject(new Error('視頻元素不可用'))
        return
      }
      
      video.src = url
      video.autoplay = true
      video.playsInline = true
      video.muted = false
      
      const handleCanPlay = () => {
        if (!isMountedRef.current) return
        
        cleanup()
        safeSetState(() => {
          setCurrentDecoder('native')
          setConnectionStatus('connected')
          setIsLoading(false)
        })
        resolve()
        onPlayerReady?.()
      }
      
      const handleError = (e: any) => {
        if (!isMountedRef.current) return
        
        cleanup()
        safeSetState(() => setConnectionStatus('disconnected'))
        reject(new Error(`原生播放器錯誤: ${e.message || '未知錯誤'}`))
      }
      
      const cleanup = () => {
        video.removeEventListener('canplay', handleCanPlay)
        video.removeEventListener('error', handleError)
      }
      
      video.addEventListener('canplay', handleCanPlay)
      video.addEventListener('error', handleError)
      video.load()
    })
  }

  // 清理播放器
  const cleanupPlayers = useCallback(() => {
    // 中止當前的異步操作
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    if (playerInstanceRef.current) {
      try {
        if (playerInstanceRef.current.destroy) {
          playerInstanceRef.current.destroy()
        }
        playerInstanceRef.current = null
      } catch (e) {
        console.warn('清理播放器時出錯:', e)
      }
    }
    
    if (videoElementRef.current) {
      const video = videoElementRef.current
      video.pause()
      video.src = ''
      video.load()
    }
    
    if (isMountedRef.current) {
      setCurrentDecoder('none')
      setConnectionStatus('disconnected')
      setError(null)
    }
  }, [])

  // 主播放函數
  const playMedia = useCallback(async (url: string) => {
    if (!url || !isMountedRef.current) return
    
    // 創建新的 AbortController
    abortControllerRef.current = new AbortController()
    
    safeSetState(() => {
      setIsLoading(true)
      setError(null)
      setConnectionStatus('connecting')
    })
    
    cleanupPlayers()
    
    try {
      const mediaInfo = detectMediaInfo(url)
      
      // YouTube 特殊處理
      if (mediaInfo.format === 'youtube') {
        safeSetState(() => {
          setCurrentDecoder('youtube')
          setIsLoading(false)
        })
        onPlayerReady?.()
        return
      }
      
      // 獲取適用的解碼器
      const applicableDecoders = mediaInfo.preferredDecoders.filter(decoder => 
        supportedDecoders.includes(decoder)
      )
      
      console.log('🎯 嘗試解碼器順序:', applicableDecoders)
      
      // 逐個嘗試解碼器
      for (const decoder of applicableDecoders) {
        if (!isMountedRef.current || abortControllerRef.current?.signal.aborted) {
          return
        }

        try {
          console.log(`🚀 嘗試使用 ${decoder} 播放:`, url)
          
          switch (decoder) {
            case 'hls':
              await initHLS(url)
              return
            case 'native':
              await initNative(url)
              return
          }
          
        } catch (error) {
          console.warn(`❌ ${decoder} 播放失敗:`, error)
          continue
        }
      }
      
      // 所有解碼器都失敗
      if (isMountedRef.current) {
        safeSetState(() => {
          setError('所有播放器都無法播放此媒體')
          setIsLoading(false)
          setConnectionStatus('disconnected')
        })
        onError?.('所有播放器都無法播放此媒體')
      }
      
    } catch (error) {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        console.error('播放媒體時發生錯誤:', error)
        safeSetState(() => {
          setError('播放器初始化失敗')
          setIsLoading(false)
          setConnectionStatus('disconnected')
        })
        onError?.('播放器初始化失敗')
      }
    }
    
  }, [supportedDecoders, cleanupPlayers, onPlayerReady, onError, safeSetState])

  // 初始化
  useEffect(() => {
    isMountedRef.current = true
    detectSupportedDecoders()
    
    return () => {
      isMountedRef.current = false
    }
  }, [detectSupportedDecoders])

  // 播放頻道
  useEffect(() => {
    if (channel?.url && supportedDecoders.length > 0 && isMountedRef.current) {
      playMedia(channel.url)
    }
  }, [channel?.url, supportedDecoders, playMedia])

  // 清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      cleanupPlayers()
    }
  }, [cleanupPlayers])

  return (
    <div className="relative w-full h-full bg-black">
      {/* YouTube 播放器 */}
      {isYouTubeVideo && youtubeVideoId && (
        <iframe
          src={buildYouTubeEmbedUrl(youtubeVideoId)}
          title="YouTube Player"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      )}

      {/* 標準播放器 */}
      {!isYouTubeVideo && (
        <video
          ref={videoElementRef}
          className="absolute inset-0 w-full h-full object-contain"
          controls
          autoPlay
          playsInline
        />
      )}
      
      {/* 載入指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4 mx-auto"></div>
            <p className="text-lg mb-2">正在載入播放器...</p>
            <p className="text-sm text-gray-300">解碼器: {currentDecoder}</p>
            <p className="text-xs text-gray-400 mt-1">狀態: {connectionStatus}</p>
          </div>
        </div>
      )}
      
      {/* 錯誤顯示 */}
      {error && (
        <div className="absolute top-4 right-4 max-w-md bg-red-900 bg-opacity-90 text-white p-4 rounded-lg z-20">
          <h3 className="font-semibold mb-2">播放錯誤</h3>
          <p className="text-sm mb-3">{error}</p>
          <button
            onClick={() => channel?.url && playMedia(channel.url)}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm mr-2"
          >
            重試
          </button>
          <button
            onClick={() => safeSetState(() => setError(null))}
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
          >
            關閉
          </button>
        </div>
      )}
      
      {/* 控制面板 */}
      {!isLoading && !error && currentDecoder !== 'none' && (
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white p-2 rounded-lg text-xs z-10">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></span>
          </div>
        </div>
      )}
    </div>
  )
} 