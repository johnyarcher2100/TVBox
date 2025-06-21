'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DatabaseOperations } from '@/utils/database';
import { testDatabaseConnection, supabase } from '@/lib/supabase';

export default function TestDatabasePage() {
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<string>('檢測中...');
  const [channelCount, setChannelCount] = useState<number>(0);
  const [activationCodeCount, setActivationCodeCount] = useState<number>(0);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [rlsStatus, setRlsStatus] = useState<any[]>([]);
  const [rlsPolicies, setRlsPolicies] = useState<any[]>([]);

  useEffect(() => {
    runDatabaseTests();
    checkRLSStatus();
  }, []);

  const runDatabaseTests = async () => {
    setTestResults([]);
    setTestResults(prev => [...prev, '🔄 開始資料庫測試...']);

    try {
      // 測試基本連接
      const isConnected = await testDatabaseConnection();
      if (isConnected) {
        setConnectionStatus('連接成功');
        setTestResults(prev => [...prev, '✅ 資料庫連接成功']);
      } else {
        setConnectionStatus('連接失敗');
        setTestResults(prev => [...prev, '❌ 資料庫連接失敗']);
        return;
      }

      // 測試頻道數量
      try {
        const channels = await DatabaseOperations.getChannels();
        setChannelCount(channels.length);
        setTestResults(prev => [...prev, `✅ 頻道表格測試成功: ${channels.length} 筆記錄`]);
      } catch (error) {
        setTestResults(prev => [...prev, `❌ 頻道表格測試失敗: ${(error as Error).message}`]);
      }

      // 測試啟動碼
      try {
        const { data: codes, error } = await supabase
          .from('activation_codes')
          .select('count');
        
        if (error) throw error;
        setActivationCodeCount(codes?.length || 0);
        setTestResults(prev => [...prev, `✅ 啟動碼表格測試成功: ${codes?.length || 0} 筆記錄`]);
      } catch (error) {
        setTestResults(prev => [...prev, `❌ 啟動碼表格測試失敗: ${(error as Error).message}`]);
      }

      // 測試用戶會話
      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('count')
          .limit(1);
        
        if (error) throw error;
        setTestResults(prev => [...prev, '✅ 用戶會話表格測試成功']);
      } catch (error) {
        setTestResults(prev => [...prev, `❌ 用戶會話表格測試失敗: ${(error as Error).message}`]);
      }

      // 測試推播訊息
      try {
        const messages = await DatabaseOperations.getBroadcastMessages(1);
        setTestResults(prev => [...prev, `✅ 推播訊息表格測試成功: ${messages.length} 筆記錄`]);
      } catch (error) {
        setTestResults(prev => [...prev, `❌ 推播訊息表格測試失敗: ${(error as Error).message}`]);
      }

    } catch (error) {
      setTestResults(prev => [...prev, `❌ 測試過程發生錯誤: ${(error as Error).message}`]);
    }
  };

  const checkRLSStatus = async () => {
    try {
      setTestResults(prev => [...prev, '🔄 檢查 RLS 狀態...']);

      // 檢查 RLS 是否啟用
      const { data: rlsData, error: rlsError } = await supabase
        .rpc('check_rls_status');

      if (rlsError) {
        setTestResults(prev => [...prev, `❌ RLS 狀態檢查失敗: ${rlsError.message}`]);
      } else {
        setRlsStatus(rlsData || []);
        setTestResults(prev => [...prev, '✅ RLS 狀態檢查成功']);
      }

      // 檢查 RLS 政策
      const { data: policiesData, error: policiesError } = await supabase
        .rpc('check_rls_policies');

      if (policiesError) {
        setTestResults(prev => [...prev, `❌ RLS 政策檢查失敗: ${policiesError.message}`]);
      } else {
        setRlsPolicies(policiesData || []);
        setTestResults(prev => [...prev, '✅ RLS 政策檢查成功']);
      }

    } catch (error) {
      setTestResults(prev => [...prev, `❌ RLS 檢查失敗: ${(error as Error).message}`]);
    }
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

  const executeRLSSetup = async () => {
    try {
      setTestResults(prev => [...prev, '🔄 執行 RLS 設定...']);
      
      // 這裡你需要手動在 Supabase 控制台執行 RLS 設定 SQL
      setTestResults(prev => [...prev, '⚠️ 請在 Supabase 控制台的 SQL Editor 中執行 scripts/rls-setup.sql']);
      setTestResults(prev => [...prev, '📝 或複製下方的 SQL 命令到 Supabase']);
      
    } catch (error) {
      setTestResults(prev => [...prev, `❌ RLS 設定失敗: ${(error as Error).message}`]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="glass p-8 rounded-2xl">
          <h1 className="text-3xl font-bold text-white mb-6">Supabase 資料庫 & RLS 測試</h1>
          
          {/* 連接狀態 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">RLS 表格</h3>
              <p className="text-lg font-bold text-green-400">{rlsStatus.length}</p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex flex-wrap gap-4 mb-8">
            <button
              onClick={runDatabaseTests}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔄 重新測試連接
            </button>
            
            <button
              onClick={checkRLSStatus}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🔒 檢查 RLS 狀態
            </button>
            
            <button
              onClick={handleAddTestChannel}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ➕ 新增測試頻道
            </button>

            <button
              onClick={executeRLSSetup}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ⚙️ RLS 設定說明
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              🏠 返回首頁
            </button>
          </div>

          {/* RLS 狀態顯示 */}
          {rlsStatus.length > 0 && (
            <div className="bg-white/5 p-6 rounded-lg mb-8">
              <h3 className="text-white font-semibold text-xl mb-4">🔒 RLS 狀態</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-white text-sm">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2">表格名稱</th>
                      <th className="text-left py-2">RLS 狀態</th>
                      <th className="text-left py-2">政策數量</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rlsStatus.map((table, index) => (
                      <tr key={index} className="border-b border-white/10">
                        <td className="py-2">{table.tablename}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            table.rls_enabled ? 'bg-green-600' : 'bg-red-600'
                          }`}>
                            {table.rls_enabled ? '✅ 已啟用' : '❌ 未啟用'}
                          </span>
                        </td>
                        <td className="py-2">
                          {rlsPolicies.filter(p => p.tablename === table.tablename).length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 測試結果 */}
          <div className="bg-black/30 p-6 rounded-lg">
            <h3 className="text-white font-semibold text-xl mb-4">📊 測試結果</h3>
            <div className="max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-white/90 text-sm mb-2 font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>

          {/* Supabase 配置顯示 */}
          <div className="mt-8 bg-white/5 p-6 rounded-lg">
            <h3 className="text-white font-semibold text-xl mb-4">⚙️ Supabase 配置</h3>
            <div className="text-white/80 text-sm space-y-2">
              <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
              <p><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}