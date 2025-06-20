'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DatabaseOperations } from '@/utils/database';
import { RatingSystem } from '@/utils/ratingSystem';
import { BroadcastMessage } from '@/types';

export default function ManagementPage() {
  const router = useRouter();
  const { userSession, broadcastMessages, setBroadcastMessages } = useStore();
  
  const [newBroadcast, setNewBroadcast] = useState<Partial<BroadcastMessage>>({
    content: '',
    target_level: 1,
    message_type: 'text',
    is_active: true
  });
  
  const [channelStats, setChannelStats] = useState({
    total: 0,
    highRated: 0,
    lowRated: 0,
    averageRating: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 檢查用戶權限
    if (!userSession || userSession.user_level !== 3) {
      router.push('/');
      return;
    }
    
    loadData();
  }, [userSession]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // 載入推播訊息
      const messages = await DatabaseOperations.getBroadcastMessages(3);
      setBroadcastMessages(messages);
      
      // 載入頻道統計
      const stats = await RatingSystem.getChannelStats();
      setChannelStats(stats);
      
    } catch (error) {
      console.error('載入資料失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBroadcast = async () => {
    if (!newBroadcast.content?.trim()) {
      alert('請輸入推播內容');
      return;
    }
    
    try {
      await DatabaseOperations.saveBroadcastMessage({
        content: newBroadcast.content,
        target_level: newBroadcast.target_level || 1,
        message_type: newBroadcast.message_type || 'text',
        is_active: true,
        schedule_time: newBroadcast.schedule_time,
        interval_minutes: newBroadcast.interval_minutes,
        expires_at: newBroadcast.expires_at
      });
      
      alert('推播訊息已建立');
      setNewBroadcast({
        content: '',
        target_level: 1,
        message_type: 'text',
        is_active: true
      });
      
      loadData();
    } catch (error) {
      alert('建立推播失敗: ' + (error as Error).message);
    }
  };

  const handleDeleteLowRatingChannels = async () => {
    const confirmed = confirm('確定要刪除所有評分低於51分的頻道嗎？');
    if (!confirmed) return;
    
    try {
      const deletedCount = await RatingSystem.deleteLowRatingChannels();
      alert(`已刪除 ${deletedCount} 個低評分頻道`);
      loadData();
    } catch (error) {
      alert('刪除失敗: ' + (error as Error).message);
    }
  };

  if (!userSession || userSession.user_level !== 3) {
    return <div>無權限訪問</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="max-w-6xl mx-auto">
        {/* 標題區域 */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">管理中心</h1>
          <p className="text-white/80">推播管理 • 頻道管理</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            返回首頁
          </button>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* 推播管理 */}
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">推播管理</h2>
            
            {/* 建立新推播 */}
            <div className="space-y-4 mb-6">
              <textarea
                placeholder="推播內容"
                value={newBroadcast.content}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, content: e.target.value }))}
                className="w-full h-20 px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20 resize-none"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={newBroadcast.target_level}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, target_level: Number(e.target.value) as 1 | 2 | 3 }))}
                  className="px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20"
                >
                  <option value={1}>免費用戶 (等級1)</option>
                  <option value={2}>一般用戶 (等級1-2)</option>
                  <option value={3}>所有用戶 (等級1-3)</option>
                </select>
                
                <select
                  value={newBroadcast.message_type}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, message_type: e.target.value as 'text' | 'icon' }))}
                  className="px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20"
                >
                  <option value="text">文字跑馬燈</option>
                  <option value="icon">圖示顯示</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="datetime-local"
                  placeholder="排程時間 (可選)"
                  value={newBroadcast.schedule_time || ''}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, schedule_time: e.target.value }))}
                  className="px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20"
                />
                
                <input
                  type="number"
                  placeholder="間隔頻度 (分鐘)"
                  value={newBroadcast.interval_minutes || ''}
                  onChange={(e) => setNewBroadcast(prev => ({ ...prev, interval_minutes: Number(e.target.value) }))}
                  className="px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/60 border border-white/20"
                />
              </div>
              
              <input
                type="datetime-local"
                placeholder="過期時間 (可選)"
                value={newBroadcast.expires_at || ''}
                onChange={(e) => setNewBroadcast(prev => ({ ...prev, expires_at: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20"
              />
              
              <button
                onClick={handleCreateBroadcast}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                建立推播
              </button>
            </div>
            
            {/* 現有推播列表 */}
            <div className="space-y-3">
              <h3 className="text-lg text-white font-medium">現有推播</h3>
              {broadcastMessages.length > 0 ? (
                broadcastMessages.map((message) => (
                  <div key={message.id} className="bg-white/10 p-4 rounded-lg">
                    <div className="text-white font-medium mb-2">{message.content}</div>
                    <div className="text-sm text-white/60 space-y-1">
                      <div>目標等級: {message.target_level}</div>
                      <div>類型: {message.message_type === 'text' ? '文字' : '圖示'}</div>
                      <div>狀態: {message.is_active ? '啟用' : '停用'}</div>
                      {message.expires_at && (
                        <div>過期時間: {new Date(message.expires_at).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-white/60 text-center py-4">暫無推播訊息</div>
              )}
            </div>
          </div>

          {/* 頻道管理 */}
          <div className="glass p-6 rounded-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">頻道管理</h2>
            
            {/* 頻道統計 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/10 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">{channelStats.total}</div>
                <div className="text-sm text-white/60">總頻道數</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-400">{channelStats.highRated}</div>
                <div className="text-sm text-white/60">高評分頻道</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-400">{channelStats.lowRated}</div>
                <div className="text-sm text-white/60">低評分頻道</div>
              </div>
              <div className="bg-white/10 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">{channelStats.averageRating.toFixed(1)}</div>
                <div className="text-sm text-white/60">平均評分</div>
              </div>
            </div>
            
            {/* 管理操作 */}
            <div className="space-y-4">
              <button
                onClick={handleDeleteLowRatingChannels}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
              >
                一鍵刪除低評分頻道 (&lt; 51分)
              </button>
              
              <button
                onClick={loadData}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? '載入中...' : '重新載入資料'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}