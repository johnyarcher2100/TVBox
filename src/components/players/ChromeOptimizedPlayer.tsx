'use client';

import React, { useRef, useEffect, useState } from 'react';
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
  
  const [currentMethod, setCurrentMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<string[]>([]);

  useEffect(() => {
    if (channel && videoRef.current) {
      initializeChromePlayer();
    }
    
    return () => {
      cleanup();
    };
  }, [channel]);

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (flvRef.current) {
      flvRef.current.destroy();
      flvRef.current = null;
    }
  };

  const initializeChromePlayer = async () => {
    setIsLoading(true);
    setError(null);
    setAttempts([]);
    
    try {
      // 1. URL 可達性測試
      const accessTest = await CORSHandler.testUrlAccessibility(channel.url);
      
      if (accessTest.accessible) {
        const success = await tryPlayWithUrl(accessTest.finalUrl, accessTest.method);
        if (success) return;
      }
      
      // 2. 嘗試所有方法
      await tryAllMethods();
      
    } catch (err) {
      setError('無法播放此頻道：' + (err as Error).message);
      onPlayerStateChange({ playbackError: error || undefined });
    } finally {
      setIsLoading(false);
    }
  };  const tryPlayWithUrl = async (url: string, method: string): Promise<boolean> => {
    setCurrentMethod(method);
    setAttempts(prev => [...prev, method]);
    
    // 嘗試 HLS.js
    if (url.includes('.m3u8') || url.includes('hls')) {
      return await tryHLSPlayer(url);
    }
    
    // 嘗試 FLV.js
    if (url.includes('.flv') || url.includes('flv')) {
      return await tryFLVPlayer(url);
    }
    
    // 嘗試原生播放器
    return await tryNativePlayer(url);
  };

  const tryHLSPlayer = async (url: string): Promise<boolean> => {
    try {
      const Hls = (await import('hls.js')).default;
      
      if (Hls.isSupported() && videoRef.current) {
        cleanup();
        
        const hls = new Hls({
          enableWorker: false,
          progressive: true,
          xhrSetup: function(xhr: XMLHttpRequest) {
            CORSHandler.configureXHR(xhr);
          },
          fetchSetup: function(context: any, initParams: any) {
            initParams.mode = 'cors';
            initParams.credentials = 'omit';
            return new Request(context.url, initParams);
          }
        });
        
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
        
        return new Promise((resolve) => {
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoRef.current?.play();
            onPlayerStateChange({ isPlaying: true, playbackError: undefined });
            resolve(true);
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS 錯誤:', data);
            resolve(false);
          });
        });
      }
    } catch (error) {
      console.error('HLS 播放器初始化失敗:', error);
    }
    return false;
  };  const tryFLVPlayer = async (url: string): Promise<boolean> => {
    try {
      const flvjs = (await import('flv.js')).default;
      
      if (flvjs.isSupported() && videoRef.current) {
        cleanup();
        
        const flvPlayer = flvjs.createPlayer({
          type: 'flv',
          url: url,
          isLive: true,
          cors: true,
          withCredentials: false
        });
        
        flvRef.current = flvPlayer;
        flvPlayer.attachMediaElement(videoRef.current);
        flvPlayer.load();
        
        return new Promise((resolve) => {
          flvPlayer.on('metadata_arrived', () => {
            flvPlayer.play();
            onPlayerStateChange({ isPlaying: true, playbackError: undefined });
            resolve(true);
          });
          
          flvPlayer.on('error', (errorType: any, errorDetail: any) => {
            console.error('FLV 錯誤:', errorType, errorDetail);
            resolve(false);
          });
        });
      }
    } catch (error) {
      console.error('FLV 播放器初始化失敗:', error);
    }
    return false;
  };

  const tryNativePlayer = async (url: string): Promise<boolean> => {
    try {
      if (videoRef.current) {
        cleanup();
        
        const video = videoRef.current;
        video.crossOrigin = 'anonymous';
        video.preload = 'none';
        video.src = url;
        
        return new Promise((resolve) => {
          const handleLoadedData = () => {
            video.play();
            onPlayerStateChange({ isPlaying: true, playbackError: undefined });
            resolve(true);
          };
          
          const handleError = () => {
            console.error('原生播放器錯誤');
            resolve(false);
          };
          
          video.addEventListener('loadeddata', handleLoadedData, { once: true });
          video.addEventListener('error', handleError, { once: true });
          
          video.load();
        });
      }
    } catch (error) {
      console.error('原生播放器初始化失敗:', error);
    }
    return false;
  };  const tryAllMethods = async () => {
    const methods = await CORSHandler.tryAllMethods(channel.url);
    
    for (const method of methods) {
      let testUrl = channel.url;
      
      if (method.startsWith('proxy-')) {
        const proxyIndex = parseInt(method.split('-')[1]);
        testUrl = CORSHandler.generateProxyUrl(channel.url, proxyIndex);
      }
      
      const success = await tryPlayWithUrl(testUrl, method);
      if (success) return;
    }
    
    setError(`無法播放頻道 ${channel.name}。已嘗試 ${attempts.length} 種方法。`);
    onPlayerStateChange({ playbackError: error || undefined });
  };

  const handleRetry = () => {
    initializeChromePlayer();
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
      />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg mb-2">Chrome 專用播放器載入中...</p>
            <p className="text-sm opacity-75">正在繞過 CORS 限制...</p>
            <p className="text-xs opacity-50 mt-2">
              當前方法: {currentMethod || '測試中'}
            </p>
            {attempts.length > 0 && (
              <p className="text-xs opacity-50">
                已嘗試: {attempts.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
          <div className="text-center max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">播放失敗</h3>
            <p className="text-sm mb-4 opacity-75">{error}</p>
            <div className="space-y-2">
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                重試播放
              </button>
              <button
                onClick={() => window.open('https://www.mozilla.org/firefox/', '_blank')}
                className="w-full bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors text-sm"
              >
                下載 Firefox 瀏覽器
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChromeOptimizedPlayer;