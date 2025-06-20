'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { ModernPlayer } from '@/components/players/ModernPlayer';
import { RatingSystem } from '@/utils/ratingSystem';
import { DatabaseOperations } from '@/utils/database';
import { Channel, PlayerState, BroadcastMessage } from '@/types';

export default function PlayerPage() {
  const router = useRouter();
  const {
    currentChannel,
    channels,
    setCurrentChannel,
    sidebarTransparency,
    setSidebarTransparency,
    showChannelList,
    setShowChannelList,
    userSession,
    broadcastMessages,
    setBroadcastMessages
  } = useStore();

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
    if (!currentChannel) {
      router.push('/');
      return;
    }
    
    loadBroadcastMessages();
    const interval = setInterval(loadBroadcastMessages, 30000); // 每30秒檢查推播
    
    return () => clearInterval(interval);
  }, [currentChannel, userSession]);

  const loadBroadcastMessages = async () => {
    if (!userSession) return;
    
    try {
      const messages = await DatabaseOperations.getBroadcastMessages(userSession.user_level);
      setBroadcastMessages(messages);
      
      // 選擇當前要顯示的推播
      const activeMessage = messages.find(msg => msg.is_active);
      setCurrentBroadcast(activeMessage || null);
    } catch (error) {
      console.error('載入推播訊息失敗:', error);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel);
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
      
      // 更新本地頻道評分
      useStore.getState().updateChannelRating(currentChannel.id, newRating);
      
      if (newRating === 0) {
        // 頻道被刪除，返回首頁
        alert('頻道評分過低已被自動刪除');
        router.push('/');
      } else {
        alert(`評分成功！新評分: ${newRating}`);
      }
    } catch (error) {
      alert('評分失敗: ' + (error as Error).message);
    } finally {
      setUserRatingLoading(false);
    }
  };

  const renderChannelList = () => {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-4 border-b border-white/20">
          <h3 className="text-white font-semibold mb-2">頻道列表</h3>
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
    );
  };

  if (!currentChannel) {
    return <div>載入中...</div>;
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-black">
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
        <div 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 space-y-4"
          style={{ backgroundColor: `rgba(0, 0, 0, ${(100 - sidebarTransparency) / 100})` }}
        >
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
            onClick={() => router.push('/')}
            className="bg-black/80 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors"
          >
            返回首頁
          </button>
          <button
            onClick={() => setShowChannelList(!showChannelList)}
            className="bg-black/80 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors lg:hidden"
          >
            {showChannelList ? '隱藏' : '顯示'}頻道
          </button>
        </div>
      </div>
      
      {/* 側邊欄（頻道列表） */}
      <div className={`
        ${showChannelList ? 'block' : 'hidden'} lg:block
        lg:w-80 w-full lg:h-full h-1/3
        ${sidebarTransparency < 50 ? 'bg-black/90' : 'bg-black/60'}
        backdrop-blur-sm border-l border-white/20
      `}>
        {renderChannelList()}
      </div>
    </div>
  );
}