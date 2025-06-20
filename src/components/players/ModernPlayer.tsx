'use client';

import React, { useState, useEffect } from 'react';
import ChromeOptimizedPlayer from './ChromeOptimizedPlayer';
import StandardPlayer from './StandardPlayer';
import SimpleTestPlayer from './SimpleTestPlayer';
import { Channel, PlayerState } from '@/types';

interface ModernPlayerProps {
  channel: Channel;
  onPlayerStateChange?: (state: Partial<PlayerState>) => void;
}

export const ModernPlayer: React.FC<ModernPlayerProps> = ({
  channel,
  onPlayerStateChange = () => {}
}) => {
  const [browserType, setBrowserType] = useState<string>('');
  const [testMode, setTestMode] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentChannel: channel,
    volume: 100,
    isMuted: false,
    isFullscreen: false,
    quality: 'auto'
  });

  useEffect(() => {
    detectBrowser();
  }, []);

  useEffect(() => {
    setPlayerState(prev => ({ ...prev, currentChannel: channel }));
  }, [channel]);

  // 瀏覽器檢測邏輯
  const detectBrowser = () => {
    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor;
    
    if (/Chrome/.test(userAgent) && /Google Inc/.test(vendor)) {
      setBrowserType('chrome');
    } else if (/Firefox/.test(userAgent)) {
      setBrowserType('firefox');
    } else if (/Safari/.test(userAgent) && /Apple Computer/.test(vendor)) {
      setBrowserType('safari');
    } else if (/Edge/.test(userAgent)) {
      setBrowserType('edge');
    } else {
      setBrowserType('other');
    }
  };

  const handlePlayerStateChange = (newState: Partial<PlayerState>) => {
    setPlayerState(prev => ({ ...prev, ...newState }));
    onPlayerStateChange(newState);
  };

  // 根據瀏覽器類型選擇播放器
  const renderPlayer = () => {
    if (testMode) {
      return (
        <SimpleTestPlayer
          channel={channel}
          onPlayerStateChange={handlePlayerStateChange}
        />
      );
    }

    switch (browserType) {
      case 'chrome':
        return (
          <ChromeOptimizedPlayer
            channel={channel}
            onPlayerStateChange={handlePlayerStateChange}
          />
        );
      
      case 'firefox':
      case 'safari':
      case 'edge':
      default:
        // 標準播放器（適用於其他瀏覽器）
        return <StandardPlayer 
          channel={channel} 
          onPlayerStateChange={handlePlayerStateChange} 
        />;
    }
  };

  return (
    <div className="w-full h-full relative">
      {renderPlayer()}
      
      {/* 播放器狀態指示器 - 僅在出錯時顯示 */}
      {playerState.playbackError && (
        <div className="absolute top-4 left-4 glass px-3 py-1 rounded-lg text-white text-sm">
          <span className="opacity-75">
            {testMode ? '測試模式' : (browserType === 'chrome' ? 'Chrome專用' : '標準')} 播放器
          </span>
          <span className="text-red-400 ml-2">⚠</span>
        </div>
      )}
      
      {/* 測試模式切換按鈕 - 僅在出錯時顯示 */}
      {playerState.playbackError && (
        <div className="absolute top-4 right-4 space-x-2">
          <button
            onClick={() => setTestMode(!testMode)}
            className="glass px-3 py-1 rounded-lg text-white text-sm hover:bg-white/20 transition-colors"
          >
            {testMode ? '退出測試' : '診斷模式'}
          </button>
        </div>
      )}
    </div>
  );
};