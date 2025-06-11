import React, { useEffect, useRef, useState, useCallback } from 'react'
import type { Channel } from '@/types'

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

  // libvlc.js 播放器初始化
  const initLibVLCPlayer = async (url: string) => {
    console.log('初始化 libvlc.js 播放器')
    
    try {
      if (!playerContainerRef.current) throw new Error('播放器容器未準備好')
      
      // 清理之前的實例
      if (vlcInstanceRef.current) {
        vlcInstanceRef.current.stop()
        vlcInstanceRef.current = null
      }

      // 創建 libvlc 實例
      const vlc = new (window as any).libvlc()
      
      // 設置視頻輸出到容器
      vlc.setVideoOutput(playerContainerRef.current)
      
      // 配置播放器選項
      const options = [
        '--no-audio', // 如果不需要音頻
        '--intf', 'dummy',
        '--extraintf', '',
        '--verbose', '2'
      ]

      if (defaultConfig.hasAudio) {
        options.splice(0, 1) // 移除 --no-audio
      }

      vlc.setOptions(options)
      
      // 設置事件監聽
      vlc.onPlaying = () => {
        console.log('libvlc 開始播放')
        setCurrentDecoder('libvlc')
        setIsLoading(false)
        setError(null)
        onPlayerReady?.()
      }
      
      vlc.onError = (error: any) => {
        console.error('libvlc 播放錯誤:', error)
        setError(`libvlc 播放失敗: ${error}`)
        // 嘗試下一個解碼器
        tryNextDecoder(url)
      }
      
      vlc.onEnded = () => {
        console.log('libvlc 播放結束')
      }

      // 播放媒體
      vlc.play(url)
      vlcInstanceRef.current = vlc
      
    } catch (error) {
      console.error('libvlc 初始化失敗:', error)
      setError(`libvlc 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // WebCodec 播放器初始化
  const initWebCodecPlayer = async (url: string) => {
    console.log('初始化 WebCodec 播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
      
      // 創建 MediaSource
      if ('MediaSource' in window) {
        const mediaSource = new MediaSource()
        video.src = URL.createObjectURL(mediaSource)
        
        mediaSource.addEventListener('sourceopen', async () => {
          try {
            // 創建 SourceBuffer
            const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E"')
            
            // 獲取媒體數據
            const response = await fetch(url)
            const buffer = await response.arrayBuffer()
            
            sourceBuffer.addEventListener('updateend', () => {
              if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
                mediaSource.endOfStream()
                video.play().then(() => {
                  setCurrentDecoder('webcodec')
                  setIsLoading(false)
                  setError(null)
                  onPlayerReady?.()
                }).catch((error) => {
                  console.error('WebCodec 播放失敗:', error)
                  tryNextDecoder(url)
                })
              }
            })
            
            sourceBuffer.appendBuffer(buffer)
            
          } catch (error) {
            console.error('WebCodec SourceBuffer 錯誤:', error)
            tryNextDecoder(url)
          }
        })
        
        mediaSource.addEventListener('error', (error) => {
          console.error('WebCodec MediaSource 錯誤:', error)
          tryNextDecoder(url)
        })
        
      } else {
        throw new Error('MediaSource API 不支援')
      }
      
    } catch (error) {
      console.error('WebCodec 初始化失敗:', error)
      setError(`WebCodec 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // EasyPlayer Pro 播放器初始化
  const initEasyPlayer = async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('初始化 EasyPlayer Pro')
      
      try {
        // 檢查 EasyPlayerPro 是否存在
        if (!(window as any).EasyPlayerPro) {
          const error = 'EasyPlayerPro 播放器未載入'
          console.error(error)
          setError(error)
          reject(new Error(error))
          return
        }

        if (!playerContainerRef.current) {
          const error = '播放器容器未準備好'
          console.error(error)
          setError(error)
          reject(new Error(error))
          return
        }
        
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

        // 清空並重新設置容器
        const container = playerContainerRef.current
        container.innerHTML = ''
        
        // 設置容器樣式
        container.style.width = '100%'
        container.style.height = '100%'
        container.style.position = 'relative'

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
            // @ts-ignore
            const player = new window.EasyPlayerPro(container, config)
            
            if (!player) {
              const error = '播放器創建失敗'
              setError(error)
              reject(new Error(error))
              return
            }

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

  // HLS.js 播放器初始化
  const initHLSPlayer = async (url: string) => {
    console.log('初始化 HLS.js 播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
      
      // 清理之前的 HLS 實例
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy()
        hlsInstanceRef.current = null
      }

      if ((window as any).Hls.isSupported()) {
        const hls = new (window as any).Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5
        })
        
        hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest 解析完成，開始自動播放')
          setCurrentDecoder('hls')
          setIsLoading(false)
          setError(null)
          onPlayerReady?.()
          
          // 設置音量
          video.volume = 1.0
          video.muted = false
          
          // 自動播放
          video.play().catch((error) => {
            console.warn('HLS 自動播放失敗，可能需要用戶互動:', error)
            // 即使自動播放失敗，播放器也已經準備好
          })
        })
        
        hls.on((window as any).Hls.Events.ERROR, (_event: any, data: any) => {
          console.error('HLS 錯誤:', data)
          if (data.fatal) {
            setError(`HLS 播放失敗: ${data.details}`)
            tryNextDecoder(url)
          }
        })
        
        hls.loadSource(url)
        hls.attachMedia(video)
        hlsInstanceRef.current = hls
        
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 原生 HLS 支援
        video.src = url
        video.addEventListener('loadedmetadata', () => {
          console.log('Safari HLS metadata 載入完成，開始自動播放')
          setCurrentDecoder('hls-native')
          setIsLoading(false)
          setError(null)
          onPlayerReady?.()
          
          // 設置音量
          video.volume = 1.0
          video.muted = false
          
          // 自動播放
          video.play().catch((error) => {
            console.warn('Safari HLS 自動播放失敗，可能需要用戶互動:', error)
          })
        })
        video.addEventListener('error', () => {
          tryNextDecoder(url)
        })
        video.load()
      } else {
        throw new Error('HLS 不支援')
      }
      
    } catch (error) {
      console.error('HLS 初始化失敗:', error)
      setError(`HLS 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // 原生播放器初始化
  const initNativePlayer = async (url: string) => {
    console.log('初始化原生播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
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
      
      video.addEventListener('error', (e) => {
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

  // Video.js 播放器初始化
  const initVideoJS = async (url: string) => {
    console.log('初始化 Video.js 播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
      
      // 配置 Video.js
      const player = (window as any).videojs(video, {
        controls: true,
        fluid: true,
        responsive: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        plugins: {
          videoJsResolutionSwitcher: {
            default: 'high',
            dynamicLabel: true
          }
        },
        html5: {
          enableSourceset: true,
          overrideNative: true,
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        }
      })
      
      player.ready(() => {
        player.src({
          src: url,
          type: 'video/mp4' // 會自動檢測
        })
        
        player.on('loadedmetadata', () => {
          setCurrentDecoder('videojs')
          setIsLoading(false)
          setError(null)
          onPlayerReady?.()
        })
        
        player.on('error', (error: any) => {
          console.error('Video.js 播放錯誤:', error)
          setError(`Video.js 播放失敗: ${error}`)
          tryNextDecoder(url)
        })
      })
      
    } catch (error) {
      console.error('Video.js 初始化失敗:', error)
      setError(`Video.js 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // DPlayer 播放器初始化
  const initDPlayer = async (url: string) => {
    console.log('初始化 DPlayer 播放器')
    
    try {
      if (!playerContainerRef.current) throw new Error('播放器容器未準備好')
      
      const player = new (window as any).DPlayer({
        container: playerContainerRef.current,
        video: {
          url: url,
          type: 'auto'
        },
        autoplay: true,
        theme: '#0078ff',
        lang: 'zh-tw',
        hotkey: true,
        preload: 'metadata',
        volume: 1.0,
        mutex: true,
        preventClickToggle: false
      })
      
      player.on('loadedmetadata', () => {
        setCurrentDecoder('dplayer')
        setIsLoading(false)
        setError(null)
        onPlayerReady?.()
      })
      
      player.on('error', (error: any) => {
        console.error('DPlayer 播放錯誤:', error)
        setError(`DPlayer 播放失敗: ${error}`)
        tryNextDecoder(url)
      })
      
    } catch (error) {
      console.error('DPlayer 初始化失敗:', error)
      setError(`DPlayer 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // FLV.js 播放器初始化
  const initFLVJS = async (url: string) => {
    console.log('初始化 FLV.js 播放器')
    
    try {
      if (!videoElementRef.current) throw new Error('視頻元素未準備好')
      
      const video = videoElementRef.current
      
      if ((window as any).flvjs.isSupported()) {
        const player = (window as any).flvjs.createPlayer({
          type: 'flv',
          url: url,
          isLive: true,
          cors: true,
          withCredentials: false,
          hasAudio: true,
          hasVideo: true
        })
        
        player.attachMediaElement(video)
        player.load()
        
        player.on((window as any).flvjs.Events.METADATA_ARRIVED, () => {
          setCurrentDecoder('flvjs')
          setIsLoading(false)
          setError(null)
          onPlayerReady?.()
        })
        
        player.on((window as any).flvjs.Events.ERROR, (errorType: any, errorDetail: any) => {
          console.error('FLV.js 播放錯誤:', errorType, errorDetail)
          setError(`FLV.js 播放失敗: ${errorDetail}`)
          tryNextDecoder(url)
        })
        
        player.play()
        
      } else {
        throw new Error('FLV.js 不支援')
      }
      
    } catch (error) {
      console.error('FLV.js 初始化失敗:', error)
      setError(`FLV.js 初始化失敗: ${error}`)
      tryNextDecoder(url)
    }
  }

  // 嘗試下一個解碼器的函數聲明
  const tryNextDecoder = useCallback((url: string): void => {
    // 防止在載入期間重複調用
    if (isLoading) {
      console.log('播放器正在載入中，跳過下一個解碼器嘗試')
      return
    }

    const mediaInfo = detectMediaInfo(url)
    const decoders = [...supportedDecoders]
    
    // 根據媒體格式排序解碼器優先級
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
    
    // 過濾出支援的解碼器
    const availableDecoders = sortedDecoders.filter(decoder => decoders.includes(decoder))
    
    // 找到當前解碼器的下一個
    const currentIndex = availableDecoders.indexOf(currentDecoder)
    const nextDecoder = availableDecoders[currentIndex + 1]
    
    if (nextDecoder) {
      console.log(`嘗試下一個解碼器: ${nextDecoder}`)
      // 設置新的解碼器（initPlayer 會在 useEffect 中被調用）
      setTimeout(() => {
        console.log(`準備使用 ${nextDecoder} 解碼器`)
        // 這裡我們需要觸發重新初始化，但避免循環引用
      }, 500)
    } else {
      console.error('所有解碼器都嘗試失敗')
      setError('所有播放器都無法播放此媒體')
      setIsLoading(false)
      onError?.(`所有播放器都無法播放此媒體: ${url}`)
    }
  }, [supportedDecoders, currentDecoder, onError, isLoading])

  // 初始化播放器
  const initPlayer = useCallback(async (url: string, preferredDecoder?: string): Promise<void> => {
    if (!url) return
    
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
            await initEasyPlayer(url).catch((error) => handleError(error, 'EasyPlayer'))
          } else {
            handleError(new Error('不支援'), 'EasyPlayer')
          }
          break
          
        case 'native':
        default:
          await initNativePlayer(url).catch((error) => {
            console.error('Native 播放器初始化失敗:', error)
            setError('所有播放器都無法播放此媒體')
            setIsLoading(false)
          })
          break
      }
    } catch (error) {
      console.error(`${decoder} 播放器意外錯誤:`, error)
      setError(`播放器錯誤: ${error}`)
      setIsLoading(false)
    }
  }, [supportedDecoders, onError])

  // 初始化支援的解碼器
  useEffect(() => {
    detectSupportedDecoders()
  }, [detectSupportedDecoders])

  // 當頻道改變時初始化播放器
  useEffect(() => {
    if (channel?.url && supportedDecoders.length > 0) {
      initPlayer(channel.url)
    }
  }, [channel?.url, supportedDecoders, initPlayer])

  // 清理資源
  useEffect(() => {
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy()
        } catch (e) {
          console.error('銷毀 EasyPlayer 時出錯:', e)
        }
      }
      
      if (hlsInstanceRef.current) {
        try {
          hlsInstanceRef.current.destroy()
        } catch (e) {
          console.error('銷毀 HLS 時出錯:', e)
        }
      }
      
      if (vlcInstanceRef.current) {
        try {
          vlcInstanceRef.current.stop()
        } catch (e) {
          console.error('銷毀 libvlc 時出錯:', e)
        }
      }
    }
  }, [])

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