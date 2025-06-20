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
    initializeUserSession,
    broadcastMessages,
    setBroadcastMessages
  } = useStore();
  
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activationCode, setActivationCode] = useState('');
  const [showActivation, setShowActivation] = useState(true);
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
  const [isClient, setIsClient] = useState(false);

  // 客戶端初始化
  useEffect(() => {
    setIsClient(true);
    initializeUserSession();
  }, [initializeUserSession]);

  useEffect(() => {
    loadAbujiChannels();
    if (userSession) {
      loadBroadcastMessages();
      const interval = setInterval(loadBroadcastMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [userSession]);
  
  // 檢查用戶會話並決定是否顯示啟動碼輸入
  useEffect(() => {
    if (!isClient) return; // 只在客戶端執行
    
    if (!userSession) {
      setShowActivation(true);
    } else {
      setShowActivation(false);
    }
  }, [userSession, isClient]);

  const loadAbujiChannels = async () => {
    try {
      setIsLoading(true);
      const savedChannels = await DatabaseOperations.getChannels();
      
      if (savedChannels.length > 0) {
        setChannels(savedChannels);
        console.log(`成功載入 ${savedChannels.length} 個已儲存的頻道`);
      } else {
        setChannels([]);
        console.log('暫無已儲存的頻道，請載入播放清單');
      }
    } catch (error) {
      console.error('載入頻道失敗:', error);
      setChannels([]);
      // 不在這裡顯示錯誤提示，避免打擾用戶體驗
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
              <div className="channel-icon bg-gray-600 flex items-center justify-center text-white text-sm sm:text-base font-bold">
                {channel.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="channel-name">{channel.name}</span>
            <div className="channel-rating">
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
        fixed left-0 top-0 h-full w-72 sm:w-80 z-50 transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        backdrop-blur-sm border-r border-white/20
      `} 
      style={{ backgroundColor: `rgba(0, 0, 0, ${sidebarTransparency / 100})` }}>
        <div className="h-full overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-white/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-semibold text-sm sm:text-base">頻道列表</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-white/60 hover:text-white text-lg sm:text-xl"
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
          
          <div className="p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelSelect(channel)}
                className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                  currentChannel?.id === channel.id
                    ? 'bg-blue-600/80'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      className="w-6 h-6 sm:w-8 sm:h-8 rounded object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-600 rounded flex items-center justify-center text-white text-xs">
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs sm:text-sm font-medium truncate">
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

  // 等待客戶端初始化
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="glass p-8 rounded-2xl">
          <div className="text-white text-center">載入中...</div>
        </div>
      </div>
    );
  }

  // 顯示系統初始化檢查
  if (showSetup) {
    return <InitialSetup />;
  }

  if (showActivation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
        <div className="glass max-w-md w-full mobile-section rounded-xl">
          <h1 className="mobile-title font-bold text-white text-center">
            阿布吉播放器
          </h1>
          <div className="space-y-3 sm:space-y-4">
            <input
              type="text"
              placeholder="請輸入啟動碼 (可選)"
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
              className="w-full mobile-input rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20"
            />
            <button
              onClick={handleActivationSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium mobile-button rounded-lg transition-colors"
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
              <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black/80 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg max-w-xs sm:max-w-md overflow-hidden">
                <div className="marquee text-xs sm:text-sm">
                  {currentBroadcast.content}
                </div>
              </div>
            )}
            
            {/* 推播圖示 */}
            {currentBroadcast && currentBroadcast.message_type === 'icon' && (
              <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/80 p-2 sm:p-4 rounded-lg">
                <div className="text-white text-center text-sm sm:text-base">
                  {currentBroadcast.content}
                </div>
              </div>
            )}
            
            {/* 評分按鈕區域 */}
            <div className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 space-y-2 sm:space-y-4">
              <button
                onClick={() => handleRating('like')}
                disabled={userRatingLoading}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors text-xs sm:text-base"
              >
                👍
              </button>
              <button
                onClick={() => handleRating('dislike')}
                disabled={userRatingLoading}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors text-xs sm:text-base"
              >
                👎
              </button>
            </div>
            
            {/* 控制按鈕 */}
            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => setCurrentChannel(null)}
                className="bg-black/80 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-black transition-colors text-xs sm:text-sm"
              >
                返回首頁
              </button>
              <button
                onClick={() => setShowSidebar(true)}
                className="bg-black/80 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-black transition-colors text-xs sm:text-sm"
              >
                選擇頻道
              </button>
              {userSession && userSession.user_level === 3 && (
                <button
                  onClick={() => router.push('/management')}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm"
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
        <div className="p-2 sm:p-4">
          <div className="max-w-7xl mx-auto">
            {/* 標題區域 */}
            <header className="text-center mobile-subtitle">
              <h1 className="mobile-title font-bold text-white">阿布吉播放器</h1>
              <p className="text-white/80 text-xs sm:text-base mb-2">最佳播放清單 • 多平台支援</p>
              <div className="text-xs sm:text-sm text-yellow-400">
                {userSession ? (
                  <>
                    用戶等級: {userSession.user_level} 
                    {userSession.user_level === 3 && (
                      <button
                        onClick={() => router.push('/management')}
                        className="ml-2 sm:ml-4 bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-white text-xs"
                      >
                        管理頁面
                      </button>
                    )}
                  </>
                ) : (
                  <span className="opacity-0">載入中...</span>
                )}
              </div>
            </header>

            {/* 自定義播放清單輸入 */}
            <div className="glass mobile-section rounded-xl">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">載入自定義播放清單</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <input
                  type="url"
                  placeholder="輸入播放清單 URL (支援 m3u, m3u8, json, txt)"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="flex-1 mobile-input rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20"
                />
                <button
                  onClick={handlePlaylistLoad}
                  disabled={isLoading || !playlistUrl.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium mobile-button rounded-lg transition-colors whitespace-nowrap"
                >
                  {isLoading ? '載入中...' : '載入播放'}
                </button>
              </div>
            </div>

            {/* 阿布吉節目單 */}
            <div className="glass mobile-section rounded-xl">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-white">阿布吉節目單</h2>
                <button
                  onClick={loadAbujiChannels}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white mobile-button rounded-lg transition-colors"
                >
                  {isLoading ? '載入中...' : '重新載入'}
                </button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-3 sm:mb-4"></div>
                  <p className="text-white/80 text-sm sm:text-base">載入頻道中...</p>
                </div>
              ) : channels.length > 0 ? (
                <div>
                  <p className="text-white/60 mb-2 sm:mb-4 text-xs sm:text-sm">點擊頻道開始觀看</p>
                  <div className="channel-container">
                    {renderChannelGrid()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12 text-white/60">
                  <p className="text-sm sm:text-base">暫無可用頻道</p>
                  <p className="text-xs sm:text-sm mt-2">請載入自定義播放清單或稍後重試</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}