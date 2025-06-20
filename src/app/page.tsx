'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DatabaseOperations } from '@/utils/database';
import { PlaylistParser } from '@/utils/playlistParser';
import { InitialSetup } from '@/components/InitialSetup';
import { Channel } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { 
    channels, 
    setChannels, 
    setCurrentChannel,
    userSession 
  } = useStore();
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [showActivation, setShowActivation] = useState(!userSession);
  const [showSetup, setShowSetup] = useState(false); // 暫時跳過設定檢查

  useEffect(() => {
    loadAbujiChannels();
  }, []);

  const loadAbujiChannels = async () => {
    try {
      setIsLoading(true);
      const savedChannels = await DatabaseOperations.getChannels();
      
      if (savedChannels.length > 0) {
        setChannels(savedChannels);
      } else {
        // 載入預設頻道清單（如果沒有儲存的頻道）
        setChannels([]);
      }
    } catch (error) {
      console.error('載入頻道失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivationSubmit = async () => {
    try {
      const codeData = await DatabaseOperations.validateActivationCode(activationCode);
      
      if (codeData) {
        const newSession = {
          id: Date.now().toString(),
          activation_code: activationCode,
          user_level: codeData.user_level,
          expires_at: codeData.expires_at
        };
        
        await DatabaseOperations.saveUserSession(newSession);
        await DatabaseOperations.useActivationCode(activationCode, newSession.id);
        
        useStore.getState().setUserSession(newSession);
        setShowActivation(false);
      } else {
        alert('啟動碼無效或已過期');
      }
    } catch (error) {
      console.error('啟動碼驗證失敗:', error);
      alert('啟動碼驗證失敗');
    }
  };

  const handlePlaylistLoad = async () => {
    if (!playlistUrl.trim()) return;
    
    try {
      setIsLoading(true);
      const parsedChannels = await PlaylistParser.parsePlaylist(playlistUrl);
      
      if (parsedChannels.length > 0) {
        // 直接跳轉到播放頁面，播放第一個頻道
        setChannels(parsedChannels);
        setCurrentChannel(parsedChannels[0]);
        router.push('/player');
      } else {
        alert('播放清單解析失敗或無有效頻道');
      }
    } catch (error) {
      console.error('播放清單載入失敗:', error);
      alert('播放清單載入失敗：' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel);
    router.push('/player');
  };

  const renderChannelGrid = () => {
    return (
      <div className="channel-grid">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="channel-card"
            onClick={() => handleChannelSelect(channel)}
          >
            {channel.logo ? (
              <img 
                src={channel.logo} 
                alt={channel.name}
                className="channel-icon"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/default-channel.png';
                }}
              />
            ) : (
              <div className="channel-icon bg-gray-600 flex items-center justify-center text-white text-lg font-bold">
                {channel.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="channel-name">{channel.name}</span>
            <div className="text-xs text-yellow-400 mt-1">
              ⭐ {channel.rating}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 顯示系統初始化檢查
  if (showSetup) {
    return <InitialSetup />;
  }

  if (showActivation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass max-w-md w-full p-8 rounded-2xl">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            Abuji IPTV 播放器
          </h1>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="請輸入啟動碼 (可選)"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20"
            />
            <button
              onClick={handleActivationSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              {activationCode ? '驗證啟動碼' : '以免費用戶身份繼續'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* 標題區域 */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Abuji IPTV</h1>
          <p className="text-white/80">最佳播放清單 • 多平台支援</p>
          {userSession && (
            <div className="mt-2 text-sm text-yellow-400">
              用戶等級: {userSession.user_level} 
              {userSession.user_level === 3 && (
                <button
                  onClick={() => router.push('/management')}
                  className="ml-4 bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-white text-xs"
                >
                  管理頁面
                </button>
              )}
            </div>
          )}
        </header>

        {/* 自定義播放清單輸入 */}
        <div className="glass p-6 rounded-2xl mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">載入自定義播放清單</h2>
          <div className="flex gap-4">
            <input
              type="url"
              placeholder="輸入播放清單 URL (支援 m3u, m3u8, json, txt)"
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20"
            />
            <button
              onClick={handlePlaylistLoad}
              disabled={isLoading || !playlistUrl.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {isLoading ? '載入中...' : '載入播放'}
            </button>
          </div>
        </div>

        {/* Abuji 節目單 */}
        <div className="glass p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Abuji 節目單</h2>
            <button
              onClick={loadAbujiChannels}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              重新載入
            </button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white/80">載入頻道中...</p>
            </div>
          ) : channels.length > 0 ? (
            renderChannelGrid()
          ) : (
            <div className="text-center py-12 text-white/60">
              <p>暫無可用頻道</p>
              <p className="text-sm mt-2">請載入自定義播放清單或稍後重試</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}