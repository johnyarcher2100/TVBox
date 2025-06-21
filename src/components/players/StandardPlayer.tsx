'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Channel, PlayerState } from '@/types';

interface StandardPlayerProps {
  channel: Channel;
  onPlayerStateChange: (state: Partial<PlayerState>) => void;
}

export const StandardPlayer: React.FC<StandardPlayerProps> = ({
  channel,
  onPlayerStateChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (channel && videoRef.current) {
      initializePlayer();
    }
    
    return () => {
      cleanup();
    };
  }, [channel]);

  // 確保音量設為最大
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 1.0;
      videoRef.current.muted = false;
    }
  });

  const cleanup = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const initializePlayer = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = channel.url;
      
      // 檢查是否為 HLS 串流
      if (url.includes('.m3u8') || url.includes('hls')) {
        await initHLSPlayer(url);
      } else {
        // 使用原生播放器
        await initNativePlayer(url);
      }
    } catch (err) {
      setError('播放失敗: ' + (err as Error).message);
      onPlayerStateChange({ playbackError: error || undefined });
    } finally {
      setIsLoading(false);
    }
  };

  const initHLSPlayer = async (url: string) => {
    const Hls = (await import('hls.js')).default;
    
    if (Hls.isSupported() && videoRef.current) {
      cleanup();
      
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setError(null); // 清除錯誤狀態
        if (videoRef.current) {
          videoRef.current.volume = 1.0; // 設定音量為最大
        }
        videoRef.current?.play();
        onPlayerStateChange({ isPlaying: true, playbackError: undefined, volume: 100 });
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS 錯誤:', data);
        setError('HLS 播放錯誤');
      });
    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari 原生 HLS 支援
      initNativePlayer(url);
    }
  };

  const initNativePlayer = async (url: string) => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.src = url;
      video.load();
      
      video.addEventListener('loadeddata', () => {
        setError(null); // 清除錯誤狀態
        video.volume = 1.0; // 設定音量為最大
        video.play();
        onPlayerStateChange({ isPlaying: true, playbackError: undefined, volume: 100 });
      });
      
      video.addEventListener('error', () => {
        setError('影片載入失敗');
      });
    }
  };

  const handleRetry = () => {
    setError(null); // 清除錯誤狀態
    initializePlayer();
  };

  const handleOpenInVLC = () => {
    const vlcUrl = `vlc://${channel.url}`;
    window.open(vlcUrl, '_blank');
  };

  return (
    <div className="w-full h-full bg-black relative player-container">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <div className="text-lg font-medium">載入中...</div>
            <div className="text-sm text-white/60 mt-2">
              正在使用標準播放器
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
          <div className="text-center text-white max-w-md mx-4">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <div className="text-xl font-medium mb-4">播放失敗</div>
            <div className="text-sm text-white/80 mb-6 leading-relaxed">
              {error}
            </div>
            
            <button
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium mb-3 mr-3 transition-colors"
            >
              重試
            </button>
            
            <button
              onClick={handleOpenInVLC}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              在 VLC 中打開
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        autoPlay
        muted={false}
        onLoadStart={() => {
          setIsLoading(true);
        }}
        onLoadedData={() => {
          setIsLoading(false);
          setError(null); // 清除錯誤狀態
          if (videoRef.current) {
            videoRef.current.volume = 1.0;
          }
          onPlayerStateChange({ isPlaying: true, playbackError: undefined });
        }}
        onPlay={() => {
          setError(null); // 清除錯誤狀態
          if (videoRef.current) {
            videoRef.current.volume = 1.0;
          }
          onPlayerStateChange({ isPlaying: true, playbackError: undefined });
        }}
        onPause={() => onPlayerStateChange({ isPlaying: false })}
        onError={(e) => {
          console.error('標準播放器錯誤:', e);
          setError('視頻播放錯誤');
          setIsLoading(false);
          onPlayerStateChange({ playbackError: '視頻播放錯誤' });
        }}
      />
    </div>
  );
};

export default StandardPlayer;