'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDatabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [activationCodes, setActivationCodes] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      setError('');

      // 測試基本連接
      const { data, error: connectionError } = await supabase
        .from('activation_codes')
        .select('*')
        .limit(5);

      if (connectionError) {
        throw new Error(`連接失敗: ${connectionError.message}`);
      }

      // 設定成功狀態
      setConnectionStatus('connected');
      setActivationCodes(data || []);

    } catch (err) {
      console.error('資料庫測試失敗:', err);
      setError((err as Error).message);
      setConnectionStatus('error');
    }
  };

  const testQuery = async () => {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('user_level', 3)
        .limit(3);

      if (error) throw error;

      alert(`找到 ${data?.length || 0} 個管理者啟動碼`);
    } catch (err) {
      alert('查詢失敗: ' + (err as Error).message);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass p-6 rounded-2xl">
          <h1 className="text-2xl font-bold text-white mb-6">
            Supabase 資料庫連接測試
          </h1>

          {/* 連接狀態 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">連接狀態</h2>
            <div className={`flex items-center space-x-2 ${
              connectionStatus === 'connected' ? 'text-green-400' :
              connectionStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              <span>
                {connectionStatus === 'checking' && '⏳'}
                {connectionStatus === 'connected' && '✅'}
                {connectionStatus === 'error' && '❌'}
              </span>
              <span>
                {connectionStatus === 'checking' && '檢查中...'}
                {connectionStatus === 'connected' && '連接成功'}
                {connectionStatus === 'error' && '連接失敗'}
              </span>
            </div>
            
            {error && (
              <div className="mt-3 p-3 bg-red-500/20 text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          {/* 資料庫資訊 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-3">資料庫資訊</h2>
            <div className="text-white/80 text-sm space-y-1">
              <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
              <p>匿名金鑰: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
            </div>
          </div>

          {/* 啟動碼樣本 */}
          {activationCodes.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">
                啟動碼樣本 ({activationCodes.length} 個)
              </h2>
              <div className="space-y-2">
                {activationCodes.map((code, index) => (
                  <div key={index} className="flex justify-between items-center bg-white/5 p-3 rounded-lg text-sm">
                    <span className="text-white font-mono">{code.code}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      code.user_level === 3 ? 'bg-purple-600' :
                      code.user_level === 2 ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      等級 {code.user_level}
                    </span>
                    <span className={`text-xs ${code.is_used ? 'text-red-400' : 'text-green-400'}`}>
                      {code.is_used ? '已使用' : '未使用'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 測試按鈕 */}
          <div className="flex space-x-4">
            <button
              onClick={testConnection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              重新測試連接
            </button>
            
            <button
              onClick={testQuery}
              disabled={connectionStatus !== 'connected'}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              測試查詢
            </button>
            
            <a
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              返回首頁
            </a>
          </div>

          {/* 設定指南 */}
          <div className="mt-8 p-4 bg-blue-500/20 rounded-lg">
            <h3 className="text-white font-semibold mb-2">🚀 快速設定步驟</h3>
            <div className="text-white/80 text-sm space-y-2">
              <p>1. 前往 Supabase Dashboard: <a href="https://mfutugsqbpwxdwfsnnhi.supabase.co" target="_blank" className="text-blue-400 underline">點此前往</a></p>
              <p>2. 點選左側選單 「SQL Editor」</p>
              <p>3. 建立新查詢，複製 scripts/database-setup.sql 內容並執行</p>
              <p>4. 執行完成後，回到此頁面重新測試連接</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}