'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CORSHandler } from '@/utils/corsHandler';
import { Channel, PlayerState } from '@/types';

interface ChromeOptimizedPlayerProps {
  channel: Channel;
  onPlayerStateChange: (state: Partial<PlayerState>) => void;
}

export const ChromeOptimizedPlayer: React.FC<ChromeOptimizedPlayerProps> = ({
  channel,
  onPlayerStateChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const flvRef = useRef<any>(null);
  const dashRef = useRef<any>(null);
  
  const [currentMethod, setCurrentMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [playbackInfo, setPlaybackInfo] = useState<{
    method: string;
    responseTime?: number;
    proxyUsed?: boolean;
  } | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (channel && videoRef.current) {
      initializeChromePlayer();
    }
    
    return () => {
      cleanup();
    };
  }, [channel]);

  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.debug('HLS cleanup error:', e);
      }
      hlsRef.current = null;
    }
    if (flvRef.current) {
      try {
        flvRef.current.destroy();
      } catch (e) {
        console.debug('FLV cleanup error:', e);
      }
      flvRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
      } catch (e) {
        console.debug('DASH cleanup error:', e);
      }
      dashRef.current = null;
    }
  }, []);

  const initializeChromePlayer = async () => {
    setIsLoading(true);
    setError(null);
    setAttempts([]);
    setPlaybackInfo(null);
    
    try {
      console.log('開始 Chrome 播放器初始化:', channel.name, channel.url);
      
      // 1. 智能 URL 分析
      const urlAnalysis = analyzeUrl(channel.url);
      console.log('URL 分析結果:', urlAnalysis);
      
      // 2. 嘗試最適合的播放方法
      if (urlAnalysis.isOptimal) {
        const success = await tryOptimalMethod(channel.url, urlAnalysis);
        if (success) {
          setIsLoading(false);
          return;
        }
      }
      
      // 3. URL 可達性測試
      console.log('進行 URL 可達性測試...');
      const accessTest = await CORSHandler.testUrlAccessibility(channel.url);
      console.log('可達性測試結果:', accessTest);
      
      if (accessTest.accessible) {
        const success = await tryPlayWithUrl(accessTest.finalUrl, accessTest.method);
        if (success) {
          setPlaybackInfo({
            method: accessTest.method,
            responseTime: accessTest.responseTime,
            proxyUsed: accessTest.method.includes('proxy')
          });
          setIsLoading(false);
          return;
        }
      }
      
      // 4. 智能代理選擇
      console.log('嘗試智能代理選擇...');
      const bestProxy = await CORSHandler.findBestProxy(channel.url);
      if (bestProxy) {
        const success = await tryPlayWithUrl(bestProxy.proxyUrl, `proxy-${bestProxy.index}`);
        if (success) {
          setPlaybackInfo({
            method: `proxy-${bestProxy.index}`,
            responseTime: bestProxy.responseTime,
            proxyUsed: true
          });
          setIsLoading(false);
          return;
        }
      }
      
      // 5. 嘗試所有方法
      console.log('嘗試所有可用方法...');
      await tryAllMethods();
      
    } catch (err) {
      console.error('Chrome 播放器初始化錯誤:', err);
      setError('Chrome 播放器初始化失敗：' + (err as Error).message);
      onPlayerStateChange({ playbackError: error || undefined });
    } finally {
      setIsLoading(false);
    }
  };

  // URL 分析功能
  const analyzeUrl = (url: string) => {
    const analysis = {
      isHLS: url.includes('.m3u8') || url.includes('/hls/') || url.includes('m3u8'),
      isFLV: url.includes('.flv') || url.includes('/flv/') || url.includes('flv'),
      isDASH: url.includes('.mpd') || url.includes('/dash/') || url.includes('mpd'),
      isMP4: url.includes('.mp4') || url.includes('/mp4/'),
      isRTMP: url.startsWith('rtmp://') || url.startsWith('rtmps://'),
      isWebRTC: url.includes('webrtc') || url.includes('.sdp'),
      protocol: url.split('://')[0],
      isOptimal: false
    };
    
    // 判斷是否有最佳方法
    analysis.isOptimal = analysis.isHLS || analysis.isFLV || analysis.isDASH || analysis.isMP4;
    
    return analysis;
  };

  // 最佳方法嘗試
  const tryOptimalMethod = async (url: string, analysis: any): Promise<boolean> => {
    console.log('嘗試最佳播放方法...');
    
    if (analysis.isHLS) {
      console.log('檢測到 HLS 格式，優先使用 HLS.js');
      return await tryHLSPlayer(url);
    }
    
    if (analysis.isFLV) {
      console.log('檢測到 FLV 格式，優先使用 FLV.js');
      return await tryFLVPlayer(url);
    }
    
    if (analysis.isDASH) {
      console.log('檢測到 DASH 格式，優先使用 DASH.js');
      return await tryDASHPlayer(url);
    }
    
    if (analysis.isMP4) {
      console.log('檢測到 MP4 格式，優先使用原生播放器');
      return await tryNativePlayer(url);
    }
    
    return false;
  };

  const tryPlayWithUrl = async (url: string, method: string): Promise<boolean> => {
    setCurrentMethod(method);
    setAttempts(prev => [...prev, method]);
    
    console.log(`嘗試播放方法: ${method}, URL: ${url}`);
    
    const urlAnalysis = analyzeUrl(url);
    
    // 根據 URL 類型選擇播放器
    if (urlAnalysis.isHLS) {
      return await tryHLSPlayer(url);
    } else if (urlAnalysis.isFLV) {
      return await tryFLVPlayer(url);
    } else if (urlAnalysis.isDASH) {
      return await tryDASHPlayer(url);
    } else {
      // 對於其他格式，依序嘗試所有播放器
      const players = [tryNativePlayer, tryHLSPlayer, tryFLVPlayer];
      for (const player of players) {
        try {
          const success = await player(url);
          if (success) return true;
        } catch (e) {
          console.debug('播放器嘗試失敗:', e);
        }
      }
    }
    
    return false;
  };

  const tryHLSPlayer = async (url: string): Promise<boolean> => {
    try {
      console.log('初始化 HLS.js 播放器...');
      const Hls = (await import('hls.js')).default;
      
      if (Hls.isSupported() && videoRef.current) {
        cleanup();
        
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: Infinity,
          liveDurationInfinity: false,
          liveBackBufferLength: Infinity,
          maxLiveSyncPlaybackRate: 1,
          progressive: true,
          xhrSetup: function(xhr: XMLHttpRequest, url: string) {
            CORSHandler.configureXHR(xhr);
            console.log('HLS XHR 設置:', url);
          },
          fetchSetup: function(context: any, initParams: any) {
            initParams.mode = 'cors';
            initParams.credentials = 'omit';
            initParams.cache = 'no-store';
            return new Request(context.url, initParams);
          }
        });
        
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
        
        // 配置視頻元素
        CORSHandler.configureVideoElement(videoRef.current);
        
        return new Promise((resolve) => {
          let resolved = false;
          
          const resolveOnce = (success: boolean) => {
            if (!resolved) {
              resolved = true;
              resolve(success);
            }
          };
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest 解析成功');
            videoRef.current?.play().then(() => {
              console.log('HLS 播放開始');
              onPlayerStateChange({ isPlaying: true, playbackError: undefined });
              resolveOnce(true);
            }).catch(e => {
              console.error('HLS 播放失敗:', e);
              resolveOnce(false);
            });
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS 錯誤:', data);
            if (data.fatal) {
              resolveOnce(false);
            }
          });
          
          // 超時處理
          setTimeout(() => resolveOnce(false), 15000);
        });
      }
    } catch (error) {
      console.error('HLS 播放器初始化失敗:', error);
    }
    return false;
  };

  const tryFLVPlayer = async (url: string): Promise<boolean> => {
    try {
      console.log('初始化 FLV.js 播放器...');
      const flvjs = (await import('flv.js')).default;
      
      if (flvjs.isSupported() && videoRef.current) {
        cleanup();
        
        const flvPlayer = flvjs.createPlayer({
          type: 'flv',
          url: url,
          isLive: true,
          cors: true,
          withCredentials: false,
          hasAudio: true,
          hasVideo: true,
          duration: 0,
          filesize: 0
        });
        
        flvRef.current = flvPlayer;
        flvPlayer.attachMediaElement(videoRef.current);
        
        // 配置視頻元素
        CORSHandler.configureVideoElement(videoRef.current);
        
        flvPlayer.load();
        
        return new Promise((resolve) => {
          let resolved = false;
          
          const resolveOnce = (success: boolean) => {
            if (!resolved) {
              resolved = true;
              resolve(success);
            }
          };
          
          flvPlayer.on('metadata_arrived', () => {
            console.log('FLV metadata 到達');
            flvPlayer.play();
            onPlayerStateChange({ isPlaying: true, playbackError: undefined });
            resolveOnce(true);
          });
          
          flvPlayer.on('error', (errorType: any, errorDetail: any) => {
            console.error('FLV 錯誤:', errorType, errorDetail);
            resolveOnce(false);
          });
          
          // 超時處理
          setTimeout(() => resolveOnce(false), 15000);
        });
      }
    } catch (error) {
      console.error('FLV 播放器初始化失敗:', error);
    }
    return false;
  };

  const tryDASHPlayer = async (url: string): Promise<boolean> => {
    try {
      console.log('初始化 DASH.js 播放器...');
      const dashjs = (await import('dashjs')) as any;
      
      if (videoRef.current) {
        cleanup();
        
        const player = dashjs.MediaPlayer().create();
        dashRef.current = player;
        
        // 配置視頻元素
        CORSHandler.configureVideoElement(videoRef.current);
        
        player.initialize(videoRef.current, url, true);
        
        return new Promise((resolve) => {
          let resolved = false;
          
          const resolveOnce = (success: boolean) => {
            if (!resolved) {
              resolved = true;
              resolve(success);
            }
          };
          
          player.on('streamInitialized', () => {
            console.log('DASH stream 初始化成功');
            onPlayerStateChange({ isPlaying: true, playbackError: undefined });
            resolveOnce(true);
          });
          
          player.on('error', (e: any) => {
            console.error('DASH 錯誤:', e);
            resolveOnce(false);
          });
          
          // 超時處理
          setTimeout(() => resolveOnce(false), 15000);
        });
      }
    } catch (error) {
      console.error('DASH 播放器初始化失敗:', error);
    }
    return false;
  };

  const tryNativePlayer = async (url: string): Promise<boolean> => {
    try {
      console.log('初始化原生播放器...');
      if (videoRef.current) {
        cleanup();
        
        const video = videoRef.current;
        
        // 配置視頻元素
        CORSHandler.configureVideoElement(video);
        video.src = url;
        
        return new Promise((resolve) => {
          let resolved = false;
          
          const resolveOnce = (success: boolean) => {
            if (!resolved) {
              resolved = true;
              resolve(success);
            }
          };
          
          const handleLoadedData = () => {
            console.log('原生播放器數據載入完成');
            video.play().then(() => {
              console.log('原生播放器播放開始');
              onPlayerStateChange({ isPlaying: true, playbackError: undefined });
              resolveOnce(true);
            }).catch(e => {
              console.error('原生播放器播放失敗:', e);
              resolveOnce(false);
            });
          };
          
          const handleError = (e: Event) => {
            console.error('原生播放器錯誤:', e);
            resolveOnce(false);
          };
          
          video.addEventListener('loadeddata', handleLoadedData, { once: true });
          video.addEventListener('error', handleError, { once: true });
          
          video.load();
          
          // 超時處理
          setTimeout(() => resolveOnce(false), 15000);
        });
      }
    } catch (error) {
      console.error('原生播放器初始化失敗:', error);
    }
    return false;
  };

  const tryAllMethods = async () => {
    console.log('開始嘗試所有播放方法...');
    const methods = await CORSHandler.tryAllMethods(channel.url);
    
    for (const method of methods) {
      console.log(`嘗試方法: ${method}`);
      let testUrl = channel.url;
      
      if (method.startsWith('proxy-')) {
        const proxyIndex = parseInt(method.split('-')[1]);
        testUrl = CORSHandler.generateProxyUrl(channel.url, proxyIndex);
      }
      
      const success = await tryPlayWithUrl(testUrl, method);
      if (success) {
        console.log(`成功使用方法: ${method}`);
        return;
      }
    }
    
    const errorMsg = `無法播放頻道 ${channel.name}。已嘗試 ${attempts.length} 種方法。`;
    console.error(errorMsg);
    setError(errorMsg);
    onPlayerStateChange({ playbackError: errorMsg });
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      console.log(`重試播放 (第 ${retryCount + 1} 次)`);
      initializeChromePlayer();
    } else {
      setError('已達到最大重試次數，請檢查網路連接或嘗試其他頻道。');
    }
  };

  const handleOpenInVLC = () => {
    const vlcUrl = `vlc://${channel.url}`;
    window.open(vlcUrl, '_blank');
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        autoPlay
        muted
        playsInline
        onPlay={() => onPlayerStateChange({ isPlaying: true })}
        onPause={() => onPlayerStateChange({ isPlaying: false })}
        onVolumeChange={(e) => {
          const video = e.target as HTMLVideoElement;
          onPlayerStateChange({ 
            volume: video.volume * 100,
            isMuted: video.muted 
          });
        }}
        onError={(e) => {
          console.error('視頻元素錯誤:', e);
          setError('視頻播放錯誤');
        }}
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white">
          <div className="text-center max-w-md">
            <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Chrome 專用播放器</h3>
            <p className="text-sm mb-2 opacity-75">正在智能分析播放方式...</p>
            <div className="text-xs opacity-50 space-y-1">
              <p>當前方法: {currentMethod || '分析中'}</p>
              {attempts.length > 0 && (
                <p>已嘗試: {attempts.slice(-3).join(', ')}</p>
              )}
              {retryCount > 0 && (
                <p>第 {retryCount + 1} 次嘗試</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white">
          <div className="text-center max-w-md p-6">
            <div className="text-red-400 text-4xl mb-4">⚠</div>
            <h3 className="text-lg font-bold mb-4">播放失敗</h3>
            <p className="text-sm mb-4 opacity-75">{error}</p>
            
            {playbackInfo && (
              <div className="text-xs opacity-50 mb-4 p-2 bg-white/10 rounded">
                <p>播放信息:</p>
                <p>方法: {playbackInfo.method}</p>
                {playbackInfo.responseTime && (
                  <p>響應時間: {playbackInfo.responseTime}ms</p>
                )}
                <p>代理: {playbackInfo.proxyUsed ? '是' : '否'}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                disabled={retryCount >= maxRetries}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                {retryCount >= maxRetries ? '已達最大重試次數' : `重試播放 (${retryCount}/${maxRetries})`}
              </button>
              
              <button
                onClick={handleOpenInVLC}
                className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                用 VLC 播放器開啟
              </button>
              
              <button
                onClick={() => window.open('https://www.mozilla.org/firefox/', '_blank')}
                className="w-full bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                下載 Firefox 瀏覽器
              </button>
            </div>
            
            <div className="mt-4 text-xs opacity-50">
              <p>建議: 使用 Firefox 瀏覽器或 VLC 播放器以獲得最佳播放體驗</p>
            </div>
          </div>
        </div>
      )}
      
      {/* 播放信息顯示 */}
      {playbackInfo && !isLoading && !error && (
        <div className="absolute top-4 right-4 bg-black/70 text-white text-xs p-2 rounded">
          <p>方法: {playbackInfo.method}</p>
          {playbackInfo.responseTime && (
            <p>延遲: {playbackInfo.responseTime}ms</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChromeOptimizedPlayer;