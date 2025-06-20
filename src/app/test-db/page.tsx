'use client';

import React, { useState, useEffect } from 'react';
import { DatabaseOperations } from '@/utils/database';
import { supabase } from '@/lib/supabase';

export default function TestDatabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('檢查中...');
  const [channelCount, setChannelCount] = useState<number>(0);
  const [activationCodeCount, setActivationCodeCount] = useState<number>(0);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    runDatabaseTests();
  }, []);

  const runDatabaseTests = async () => {
    const results: string[] = [];
    
    try {
      // 測試基本連接
      results.push('🔍 開始資料庫連接測試...');
      
      // 測試 Supabase 連接
      const { data: connectionTest, error: connectionError } = await supabase
        .from('channels')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        results.push(`❌ Supabase 連接失敗: ${connectionError.message}`);
        setConnectionStatus('連接失敗');
      } else {
        results.push('✅ Supabase 連接成功');
        setConnectionStatus('連接成功');
      }

      // 測試頻道表
      try {
        const channels = await DatabaseOperations.getChannels();
        setChannelCount(channels.length);
        results.push(`✅ 頻道表測試成功，目前有 ${channels.length} 個頻道`);
      } catch (error) {
        results.push(`❌ 頻道表測試失敗: ${(error as Error).message}`);
      }

      // 測試啟動碼表
      try {
        const { data: codes, error } = await supabase
          .from('activation_codes')
          .select('count');
        
        if (error) {
          results.push(`❌ 啟動碼表測試失敗: ${error.message}`);
        } else {
          const { data: codeCount, error: countError } = await supabase
            .from('activation_codes')
            .select('*', { count: 'exact' });
          
          if (countError) {
            results.push(`❌ 啟動碼計數失敗: ${countError.message}`);
          } else {
            setActivationCodeCount(codeCount?.length || 0);
            results.push(`✅ 啟動碼表測試成功，目前有 ${codeCount?.length || 0} 個啟動碼`);
          }
        }
      } catch (error) {
        results.push(`❌ 啟動碼表測試失敗: ${(error as Error).message}`);
      }

      // 測試用戶會話表
      try {
        const { data: sessions, error } = await supabase
          .from('user_sessions')
          .select('*')
          .limit(1);
        
        if (error) {
          results.push(`❌ 用戶會話表測試失敗: ${error.message}`);
        } else {
          results.push('✅ 用戶會話表測試成功');
        }
      } catch (error) {
        results.push(`❌ 用戶會話表測試失敗: ${(error as Error).message}`);
      }

      results.push('🎯 資料庫測試完成');
      
    } catch (error) {
      results.push(`❌ 測試過程中發生錯誤: ${(error as Error).message}`);
      setConnectionStatus('測試失敗');
    }

    setTestResults(results);
  };

  const handleAddTestChannel = async () => {
    try {
      const testChannel = {
        id: Date.now().toString(),
        name: '測試頻道',
        url: 'https://example.com/test.m3u8',
        rating: 50,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await DatabaseOperations.saveChannels([testChannel]);
      setTestResults(prev => [...prev, '✅ 測試頻道新增成功']);
      runDatabaseTests(); // 重新測試
    } catch (error) {
      setTestResults(prev => [...prev, `❌ 測試頻道新增失敗: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-3xl font-bold text-white mb-6">資料庫連接測試</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">連接狀態</h3>
              <p className={`text-lg font-bold ${
                connectionStatus === '連接成功' ? 'text-green-400' : 
                connectionStatus === '連接失敗' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {connectionStatus}
              </p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">頻道數量</h3>
              <p className="text-lg font-bold text-blue-400">{channelCount}</p>
            </div>
            
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">啟動碼數量</h3>
              <p className="text-lg font-bold text-purple-400">{activationCodeCount}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex gap-4 mb-4">
              <button
                onClick={runDatabaseTests}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                重新測試
              </button>
              <button
                onClick={handleAddTestChannel}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                新增測試頻道
              </button>
              <a
                href="/"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                返回首頁
              </a>
            </div>
          </div>

          <div className="bg-black/50 p-4 rounded-lg">
            <h3 className="text-white font-semibold mb-4">測試結果</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-gray-300 font-mono text-sm">
                  {result}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}