'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DatabaseOperations } from '@/utils/database';
import { PlaylistParser } from '@/utils/playlistParser';
import { InitialSetup } from '@/components/InitialSetup';
import { ModernPlayer } from '@/components/players/ModernPlayer';
import { RatingSystem } from '@/utils/ratingSystem';
import { Channel, PlayerState, BroadcastMessage } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { 
    channels, 
    setChannels, 
    currentChannel,
    setCurrentChannel,
    userSession,
    broadcastMessages,
    setBroadcastMessages
  } = useStore();
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [showActivation, setShowActivation] = useState(!userSession);
  const [showSetup, setShowSetup] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTransparency, setSidebarTransparency] = useState(80);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentChannel: null,
    volume: 100,
    isMuted: false,
    isFullscreen: false,
    quality: 'auto'
  });
  const [currentBroadcast, setCurrentBroadcast] = useState<BroadcastMessage | null>(null);
  const [userRatingLoading, setUserRatingLoading] = useState(false);

  useEffect(() => {
    loadAbujiChannels();
    if (userSession) {
      loadBroadcastMessages();
      const interval = setInterval(loadBroadcastMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [userSession]);

  const loadAbujiChannels = async () => {
    try {
      setIsLoading(true);
      const savedChannels = await DatabaseOperations.getChannels();
      
      if (savedChannels.length > 0) {
        setChannels(savedChannels);
      } else {
        setChannels([]);
      }
    } catch (error) {
      console.error('載入頻道失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBroadcastMessages = async () => {
    if (!userSession) return;
    
    try {
      const messages = await DatabaseOperations.getBroadcastMessages(userSession.user_level);
      setBroadcastMessages(messages);
      
      const activeMessage = messages.find(msg => msg.is_active);
      setCurrentBroadcast(activeMessage || null);
    } catch (error) {
      console.error('載入推播訊息失敗:', error);
    }
  };

  const handleActivationSubmit = async () => {
    try {
      // 如果沒有輸入啟動碼，直接以免費用戶身份進入
      if (!activationCode) {
        const newSession = {
          id: Date.now().toString(),
          activation_code: '',
          user_level: 1 as const, // 免費用戶等級
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 一年後過期
          created_at: new Date().toISOString()
        };
        
        await DatabaseOperations.saveUserSession(newSession);
        useStore.getState().setUserSession(newSession);
        setShowActivation(false);
        return;
      }

      // 如果有輸入啟動碼，進行驗證
      const codeData = await DatabaseOperations.validateActivationCode(activationCode);
      
      if (codeData) {
        const newSession = {
          id: Date.now().toString(),
          activation_code: activationCode,
          user_level: codeData.user_level,
          expires_at: codeData.expires_at,
          created_at: new Date().toISOString()
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
        // 本地狀態更新
        setChannels(parsedChannels);
        
        // 存儲到資料庫以供下次使用
        try {
          await DatabaseOperations.saveChannels(parsedChannels);
          console.log(`成功存儲 ${parsedChannels.length} 個頻道到資料庫`);
        } catch (dbError) {
          console.error('存儲頻道到資料庫失敗:', dbError);
          // 不影響主要功能，只記錄錯誤
        }
        
        alert(`成功載入 ${parsedChannels.length} 個頻道！頻道已保存，下次可直接使用。`);
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
    setPlayerState(prev => ({ ...prev, currentChannel: channel, volume: 100 }));
    setShowSidebar(false); // 選擇頻道後自動收起側邊欄
  };

  const handleRating = async (ratingType: 'like' | 'dislike') => {
    if (!currentChannel || !userSession) return;
    
    try {
      setUserRatingLoading(true);
      const newRating = await RatingSystem.handleUserRating(
        currentChannel.id,
        userSession.id,
        ratingType
      );
      
      useStore.getState().updateChannelRating(currentChannel.id, newRating);
      
      if (newRating === 0) {
        alert('頻道評分過低已被自動刪除');
        setCurrentChannel(null);
      } else {
        alert(`評分成功！新評分: ${newRating}`);
      }
    } catch (error) {
      alert('評分失敗: ' + (error as Error).message);
    } finally {
      setUserRatingLoading(false);
    }
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

  const renderSidebar = () => {
    return (
      <div className={`
        fixed left-0 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        backdrop-blur-sm border-r border-white/20
      `} 
      style={{ backgroundColor: `rgba(0, 0, 0, ${sidebarTransparency / 100})` }}>
        <div className="h-full overflow-y-auto">
          <div className="p-4 border-b border-white/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-semibold">頻道列表</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={sidebarTransparency}
              onChange={(e) => setSidebarTransparency(Number(e.target.value))}
              className="w-full mb-2"
            />
            <span className="text-xs text-white/60">透明度: {sidebarTransparency}%</span>
          </div>
          
          <div className="p-2 space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelSelect(channel)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  currentChannel?.id === channel.id
                    ? 'bg-blue-600/80'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-white text-xs">
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">
                      {channel.name}
                    </div>
                    <div className="text-yellow-400 text-xs">
                      ⭐ {channel.rating}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
            阿布吉播放器
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
              {activationCode ? '驗證啟動碼' : '免費進入'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 播放器模式 */}
      {currentChannel ? (
        <div className="h-screen flex bg-black relative">
          {/* 主播放區域 */}
          <div className="flex-1 relative">
            <ModernPlayer
              channel={currentChannel}
              onPlayerStateChange={(state) => setPlayerState(prev => ({ ...prev, ...state }))}
            />
            
            {/* 推播訊息跑馬燈 */}
            {currentBroadcast && currentBroadcast.message_type === 'text' && (
              <div className="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg max-w-md overflow-hidden">
                <div className="marquee">
                  {currentBroadcast.content}
                </div>
              </div>
            )}
            
            {/* 推播圖示 */}
            {currentBroadcast && currentBroadcast.message_type === 'icon' && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/80 p-4 rounded-lg">
                <div className="text-white text-center">
                  {currentBroadcast.content}
                </div>
              </div>
            )}
            
            {/* 評分按鈕區域 */}
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-4">
              <button
                onClick={() => handleRating('like')}
                disabled={userRatingLoading}
                className="w-12 h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                👍
              </button>
              <button
                onClick={() => handleRating('dislike')}
                disabled={userRatingLoading}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
              >
                👎
              </button>
            </div>
            
            {/* 控制按鈕 */}
            <div className="absolute bottom-4 left-4 flex space-x-2">
              <button
                onClick={() => setCurrentChannel(null)}
                className="bg-black/80 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
              >
                返回首頁
              </button>
              <button
                onClick={() => setShowSidebar(true)}
                className="bg-black/80 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
              >
                選擇頻道
              </button>
              {userSession && userSession.user_level === 3 && (
                <button
                  onClick={() => router.push('/management')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  管理面板
                </button>
              )}
            </div>
          </div>
          
          {/* 側邊欄 */}
          {renderSidebar()}
        </div>
      ) : (
        /* 首頁模式 */
        <div className="p-4">
          <div className="max-w-7xl mx-auto">
            {/* 標題區域 */}
            <header className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">阿布吉播放器</h1>
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

            {/* 阿布吉節目單 */}
            <div className="glass p-6 rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">阿布吉節目單</h2>
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
                <div>
                  <p className="text-white/60 mb-4">點擊頻道開始觀看</p>
                  {renderChannelGrid()}
                </div>
              ) : (
                <div className="text-center py-12 text-white/60">
                  <p>暫無可用頻道</p>
                  <p className="text-sm mt-2">請載入自定義播放清單或稍後重試</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}