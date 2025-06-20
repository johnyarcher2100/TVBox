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
        video.volume = 1.0; // 設定音量為最大
        video.play();
        onPlayerStateChange({ isPlaying: true, playbackError: undefined, volume: 100 });
      });
      
      video.addEventListener('error', () => {
        setError('影片載入失敗');
      });
    }
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
            <p>載入播放器中...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg max-w-xs z-10">
          <div className="flex items-center space-x-2 mb-2">
            <div className="text-red-400 text-sm">⚠</div>
            <span className="text-xs">播放錯誤</span>
          </div>
          <button
            onClick={initializePlayer}
            className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs transition-colors"
          >
            重試
          </button>
        </div>
      )}
    </div>
  );
};

export default StandardPlayer;