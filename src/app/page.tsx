'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DatabaseOperations } from '@/utils/database';
import { PlaylistParser } from '@/utils/playlistParser';
import { InitialSetup } from '@/components/InitialSetup';
import { ModernPlayer } from '@/components/players/ModernPlayer';
import { RatingSystem } from '@/utils/ratingSystem';
import { testDatabaseConnection } from '@/lib/supabase';
import { Channel, PlayerState, BroadcastMessage } from '@/types';
import '@/utils/quickTest'; // 載入快速測試工具

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
    setBroadcastMessages,
    logout,
    deleteChannelsWithLowRating
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
  const [showRatingButtons, setShowRatingButtons] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<'testing' | 'connected' | 'failed' | null>(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [m3uTextInput, setM3uTextInput] = useState('');

  // 客戶端初始化
  useEffect(() => {
    setIsClient(true);
    initializeUserSession();
    
    // 測試資料庫連接
    testDatabaseConnection().then(isConnected => {
      setDbConnectionStatus(isConnected ? 'connected' : 'failed');
    });
  }, [initializeUserSession]);

  useEffect(() => {
    if (dbConnectionStatus === 'connected') {
      loadAbujiChannels();
    } else if (dbConnectionStatus === 'failed') {
      console.log('資料庫連接失敗，使用本地模式');
      setChannels([]);
      setIsLoading(false);
    }
    
    if (userSession && dbConnectionStatus === 'connected') {
      loadBroadcastMessages();
      const interval = setInterval(loadBroadcastMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [userSession, dbConnectionStatus]);
  
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
      console.log('開始載入頻道...');
      
      // 先嘗試從資料庫載入
      const savedChannels = await DatabaseOperations.getChannels();
      
      if (savedChannels.length > 0) {
        setChannels(savedChannels);
        console.log(`成功載入 ${savedChannels.length} 個已儲存的頻道`);
      } else {
        // 如果沒有儲存的頻道，設置為空陣列但不顯示錯誤
        setChannels([]);
        console.log('暫無已儲存的頻道，請載入播放清單');
      }
    } catch (error) {
      console.error('載入頻道失敗:', error);
      setChannels([]);
      
      // 添加錯誤提示給用戶
      if (error instanceof Error) {
        console.log('錯誤詳情:', error.message);
        // 如果是網路連接問題，提供友好的提示
        if (error.message.includes('fetch') || error.message.includes('network')) {
          alert('網路連接失敗，請檢查網路連接後重試');
        }
      }
    } finally {
      setIsLoading(false);
      console.log('載入頻道完成');
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
      console.log('開始載入播放清單:', playlistUrl);
      
      const parsedChannels = await PlaylistParser.parsePlaylist(playlistUrl);
      
      if (parsedChannels.length > 0) {
        // 本地狀態更新
        setChannels(parsedChannels);
        
        // 存儲到資料庫以供下次使用
        if (dbConnectionStatus === 'connected') {
          try {
            await DatabaseOperations.saveChannels(parsedChannels);
            console.log(`成功存儲 ${parsedChannels.length} 個頻道到資料庫`);
          } catch (dbError) {
            console.error('存儲頻道到資料庫失敗:', dbError);
            // 不影響主要功能，只記錄錯誤
          }
        }
        
        alert(`✅ 成功載入 ${parsedChannels.length} 個頻道！\n${dbConnectionStatus === 'connected' ? '頻道已保存到資料庫，下次可直接使用。' : '本地模式：頻道僅在當前會話中可用。'}`);
        
        // 清空輸入框
        setPlaylistUrl('');
      } else {
        alert('❌ 播放清單解析失敗或無有效頻道');
      }
    } catch (error) {
      console.error('播放清單載入失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      alert(`❌ 播放清單載入失敗：\n${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleM3uTextLoad = async () => {
    if (!m3uTextInput.trim()) return;
    
    try {
      setIsLoading(true);
      console.log('開始解析 M3U 文本內容');
      
      // 使用 PlaylistParser 的 parseM3U 方法直接解析文本
      const parsedChannels = PlaylistParser.parseM3U(m3uTextInput);
      
      if (parsedChannels.length > 0) {
        // 將新頻道添加到現有頻道中（而不是替換）
        const updatedChannels = [...channels, ...parsedChannels];
        setChannels(updatedChannels);
        
        // 存儲到資料庫
        if (dbConnectionStatus === 'connected') {
          try {
            await DatabaseOperations.saveChannels(updatedChannels);
            console.log(`成功存儲 ${updatedChannels.length} 個頻道到資料庫`);
          } catch (dbError) {
            console.error('存儲頻道到資料庫失敗:', dbError);
          }
        }
        
        alert(`✅ 成功添加 ${parsedChannels.length} 個頻道！\n總共: ${updatedChannels.length} 個頻道\n${dbConnectionStatus === 'connected' ? '頻道已保存到資料庫。' : '本地模式：頻道僅在當前會話中可用。'}`);
        
        // 清空輸入框
        setM3uTextInput('');
      } else {
        alert('❌ M3U 文本解析失敗或無有效頻道');
      }
    } catch (error) {
      console.error('M3U 文本解析失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      alert(`❌ M3U 文本解析失敗：\n${errorMessage}`);
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
        // 評分成功後自動收起評分按鈕
        setTimeout(() => {
          setShowRatingButtons(false);
        }, 2000);
      }
    } catch (error) {
      alert('評分失敗: ' + (error as Error).message);
    } finally {
      setUserRatingLoading(false);
    }
  };

  // 登出處理
  const handleLogout = () => {
    if (confirm('確定要登出嗎？')) {
      logout();
    }
  };

  // 刪除低評分頻道處理
  const handleDeleteLowRatingChannels = async () => {
    if (!userSession || userSession.user_level < 2) {
      alert('此功能僅限等級2以上用戶使用');
      return;
    }

    const lowRatingChannels = channels.filter(channel => channel.rating < 51);
    
    if (lowRatingChannels.length === 0) {
      alert('沒有找到評分低於51分的頻道');
      return;
    }

    if (confirm(`即將刪除 ${lowRatingChannels.length} 個評分低於51分的頻道，確定繼續嗎？`)) {
      try {
        setIsLoading(true);
        
        // 從資料庫刪除
        if (dbConnectionStatus === 'connected') {
          await DatabaseOperations.deleteChannelsWithLowRating(51);
        }
        
        // 本地狀態更新
        deleteChannelsWithLowRating();
        
        alert(`✅ 成功刪除 ${lowRatingChannels.length} 個低評分頻道`);
      } catch (error) {
        console.error('刪除低評分頻道失敗:', error);
        alert('❌ 刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 過濾頻道
  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(channelSearch.toLowerCase());
    const matchesCategory = selectedCategory === '' || channel.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 獲取所有分類
  const uniqueCategories = Array.from(new Set(channels.map(ch => ch.category).filter(Boolean)));

  const renderChannelGrid = () => {
    return (
      <div className="channel-grid">
        {filteredChannels.map((channel) => (
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
        fixed left-0 top-0 h-full w-40 sm:w-48 z-50 transform transition-transform duration-300 ease-in-out
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        backdrop-blur-sm border-r border-white/20
      `} 
      style={{ backgroundColor: `rgba(0, 0, 0, ${sidebarTransparency / 100})` }}>
        <div className="h-full overflow-y-auto">
          <div className="px-2 py-1.5 border-b border-white/20">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-medium text-sm">頻道列表</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-white/60 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            
            {/* 側邊欄搜索 */}
            <input
              type="text"
              placeholder="搜索頻道..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full mb-2 px-2 py-1 text-xs bg-white/10 text-white placeholder-white/60 border border-white/20 rounded"
            />
            
            <input
              type="range"
              min="20"
              max="100"
              value={sidebarTransparency}
              onChange={(e) => setSidebarTransparency(Number(e.target.value))}
              className="w-full mb-1"
            />
            <span className="text-xs text-white/60">透明度: {sidebarTransparency}%</span>
            
            {/* 頻道統計 */}
            <div className="text-xs text-white/60 mt-1">
              {filteredChannels.length}/{channels.length} 頻道
            </div>
          </div>
          
          <div className="p-1 space-y-1">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                onClick={() => handleChannelSelect(channel)}
                className={`px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  currentChannel?.id === channel.id
                    ? 'bg-blue-600/80'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      className="w-4 h-4 object-contain flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-4 h-4 bg-gray-600 rounded flex items-center justify-center text-white text-xs flex-shrink-0">
                      {channel.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate leading-tight">
                      {channel.name}
                    </div>
                    {channel.category && (
                      <div className="text-white/60 text-xs truncate leading-none">
                        {channel.category}
                      </div>
                    )}
                    <div className="text-yellow-400 text-xs leading-none">
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
    <div className="min-h-screen no-horizontal-scroll overflow-y-auto">
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
              <div className="absolute right-2 sm:right-4 top-1/4 transform -translate-y-1/2 bg-black/80 p-2 sm:p-4 rounded-lg">
                <div className="text-white text-center text-sm sm:text-base">
                  {currentBroadcast.content}
                </div>
              </div>
            )}
            
            {/* 控制按鈕與評分區域 - 重新設計為底部控制欄 */}
            <div className="absolute bottom-0 left-0 right-0 gradient-bg player-controls">
              {/* 控制面板 */}
              <div className="px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between">
                  {/* 左側：頻道信息 */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {currentChannel.logo && (
                      <img 
                        src={currentChannel.logo} 
                        alt={currentChannel.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg glass-enhanced p-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm sm:text-base truncate">
                        {currentChannel.name}
                      </div>
                      <div className="text-white/60 text-xs sm:text-sm">
                        {currentChannel.category || '正在直播'} • ⭐ {currentChannel.rating}
                      </div>
                    </div>
                  </div>

                  {/* 中間：主要控制按鈕 */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <button
                      onClick={() => setCurrentChannel(null)}
                      className="control-button flex items-center space-x-1 sm:space-x-2 glass-enhanced text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      <span className="hidden sm:inline">返回首頁</span>
                    </button>

                    <button
                      onClick={() => setShowSidebar(true)}
                      className="control-button flex items-center space-x-1 sm:space-x-2 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-sm text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium border border-blue-500/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <span className="hidden sm:inline">選擇頻道</span>
                    </button>

                    {userSession && userSession.user_level === 3 && (
                      <button
                        onClick={() => router.push('/management')}
                        className="control-button flex items-center space-x-1 sm:space-x-2 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-sm text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium border border-purple-500/50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden sm:inline">管理</span>
                      </button>
                    )}
                  </div>

                  {/* 右側：評分與額外功能 */}
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {/* 評分按鈕 */}
                    <div className="flex items-center space-x-1 glass-enhanced rounded-lg p-1">
                      <button
                        onClick={() => handleRating('like')}
                        disabled={userRatingLoading}
                        className="rating-button w-8 h-8 sm:w-9 sm:h-9 bg-green-600/80 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-md flex items-center justify-center text-sm disabled:cursor-not-allowed"
                        title="喜歡這個頻道"
                      >
                        👍
                      </button>
                      <button
                        onClick={() => handleRating('dislike')}
                        disabled={userRatingLoading}
                        className="rating-button w-8 h-8 sm:w-9 sm:h-9 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-600 text-white rounded-md flex items-center justify-center text-sm disabled:cursor-not-allowed"
                        title="不喜歡這個頻道"
                      >
                        👎
                      </button>
                    </div>

                    {/* 全螢幕切換按鈕 */}
                    <button
                      onClick={() => {
                        if (document.fullscreenElement) {
                          document.exitFullscreen();
                        } else {
                          document.documentElement.requestFullscreen();
                        }
                      }}
                      className="control-button w-8 h-8 sm:w-9 sm:h-9 glass-enhanced text-white rounded-lg flex items-center justify-center"
                      title="全螢幕切換"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 額外信息欄 */}
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>直播中</span>
                    </span>
                    {userSession && (
                      <span>用戶等級: {userSession.user_level}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span>總頻道: {channels.length}</span>
                    <span>阿布吉播放器 v1.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 側邊欄 */}
          {renderSidebar()}
        </div>
      ) : (
        /* 首頁模式 */
        <div className="p-2 sm:p-4 pb-20">
          <div className="max-w-7xl mx-auto w-full">
            {/* 標題區域 */}
            <header className="text-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">阿布吉播放器</h1>
              
              {/* 用戶信息與功能按鈕 - 簡化為單行 */}
              {userSession && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                  <span className="text-yellow-400">等級: {userSession.user_level}</span>
                  
                  {userSession.user_level >= 2 && (
                    <button
                      onClick={handleDeleteLowRatingChannels}
                      disabled={isLoading}
                      className="bg-red-500/80 hover:bg-red-600 disabled:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                      title="刪除低評分頻道"
                    >
                      🗑️
                    </button>
                  )}
                  
                  {userSession.user_level === 3 && (
                    <button
                      onClick={() => router.push('/management')}
                      className="bg-purple-500/80 hover:bg-purple-600 px-2 py-1 rounded text-white"
                      title="管理頁面"
                    >
                      ⚙️
                    </button>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="bg-gray-500/80 hover:bg-gray-600 px-2 py-1 rounded text-white transition-colors"
                    title="登出"
                  >
                    🚪
                  </button>
                </div>
              )}
            </header>

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
              
              {/* 搜索和篩選區域 */}
              {channels.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="搜索頻道名稱..."
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      className="flex-1 mobile-input rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20 text-sm"
                    />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm min-w-0 sm:min-w-[120px]"
                    >
                      <option value="">所有分類</option>
                      {uniqueCategories.map((category) => (
                        <option key={category} value={category} className="bg-gray-800">
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-white/60 text-xs">
                    顯示 {filteredChannels.length} / {channels.length} 個頻道
                  </div>
                </div>
              )}
              
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

            {/* 載入自定義播放清單 */}
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
              
              {/* 快速測試按鈕 */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
                <p className="text-white/60 text-xs sm:text-sm mb-2">快速測試:</p>
                <button
                  onClick={() => {
                    setPlaylistUrl('http://晓峰.azip.dpdns.org:5008/?type=m3u');
                    setTimeout(() => handlePlaylistLoad(), 100);
                  }}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors"
                >
                  測試曉峰的播放清單
                </button>
              </div>
            </div>

            {/* M3U 文本直接輸入 */}
            <div className="glass mobile-section rounded-xl">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">直接貼上 M3U 內容</h2>
              <p className="text-white/60 text-xs sm:text-sm mb-3">
                直接貼上 M3U 格式的內容，系統會自動解析並添加頻道到現有清單中
              </p>
              
              <div className="space-y-3">
                <textarea
                  placeholder="貼上 M3U 內容，例如：&#10;#EXTM3U&#10;#EXTINF:-1 tvg-name=&quot;CCTV1&quot; tvg-logo=&quot;logo.png&quot; group-title=&quot;央視頻道&quot;,CCTV-1&#10;http://example.com/stream.m3u8&#10;#EXTINF:-1 tvg-name=&quot;CCTV2&quot; group-title=&quot;央視頻道&quot;,CCTV-2&#10;http://example.com/stream2.m3u8"
                  value={m3uTextInput}
                  onChange={(e) => setM3uTextInput(e.target.value)}
                  className="w-full h-32 sm:h-40 mobile-input rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20 resize-none font-mono text-xs sm:text-sm"
                  style={{ lineHeight: '1.4' }}
                />
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="flex-1">
                    <div className="text-white/60 text-xs">
                      {m3uTextInput.trim() ? 
                        `已輸入 ${m3uTextInput.split('\n').length} 行內容` : 
                        '支援標準 M3U/M3U8 格式'
                      }
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setM3uTextInput('')}
                      disabled={isLoading || !m3uTextInput.trim()}
                      className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white px-3 py-2 rounded-lg text-xs sm:text-sm transition-colors"
                    >
                      清空
                    </button>
                    
                    <button
                      onClick={handleM3uTextLoad}
                      disabled={isLoading || !m3uTextInput.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors whitespace-nowrap"
                    >
                      {isLoading ? '解析中...' : '解析並添加'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* M3U 格式說明 */}
              <div className="mt-4 pt-4 border-t border-white/20">
                <details className="text-white/60 text-xs">
                  <summary className="cursor-pointer hover:text-white/80 font-medium mb-2">
                    📋 M3U 格式說明 (點擊展開)
                  </summary>
                  <div className="bg-black/30 p-3 rounded-lg space-y-2 font-mono">
                    <div className="text-yellow-400"># M3U 格式範例:</div>
                    <div className="text-green-400">#EXTM3U x-tvg-url="epg.xml"</div>
                    <div className="text-blue-400">#EXTINF:-1 tvg-name="頻道名" tvg-logo="圖標URL" group-title="分類",顯示名稱</div>
                    <div className="text-white">http://stream-url.com/channel.m3u8</div>
                    <div className="mt-2 text-white/60 text-xs">
                      • 每個頻道需要 #EXTINF 標籤和串流 URL<br/>
                      • tvg-name: 頻道識別名稱<br/>
                      • tvg-logo: 頻道圖標 URL<br/>
                      • group-title: 頻道分類<br/>
                      • 支援 HTTP/HTTPS 串流連結
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 狀態指示器 */}
      {!currentChannel && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-2 text-xs flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                dbConnectionStatus === 'connected' ? 'bg-green-500' : 
                dbConnectionStatus === 'failed' ? 'bg-red-500' : 
                'bg-yellow-500 animate-pulse'
              }`}></div>
              <span>
                {dbConnectionStatus === 'connected' ? '資料庫已連接' : 
                 dbConnectionStatus === 'failed' ? '資料庫連接失敗 (本地模式)' : 
                 '連接測試中...'}
              </span>
            </div>
            {channels.length > 0 && (
              <>
                <span>
                  總頻道: {channels.length}
                  {channelSearch || selectedCategory ? ` | 顯示: ${filteredChannels.length}` : ''}
                </span>
                {uniqueCategories.length > 0 && (
                  <span>分類: {uniqueCategories.length}</span>
                )}
              </>
            )}
          </div>
          <div className="text-white/60">
            阿布吉播放器 v1.0 (最大支援3000台)
          </div>
        </div>
      )}
    </div>
  );
}