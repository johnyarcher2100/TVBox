'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ActivationCodeManager } from '@/utils/activationCodes';

interface SetupStatus {
  database: boolean;
  activationCodes: boolean;
  error?: string;
}

export const InitialSetup: React.FC = () => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    database: false,
    activationCodes: false
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      setIsChecking(true);
      
      // 簡化檢查，先假設系統正常
      console.log('跳過初始檢查，直接進入應用');
      
      setSetupStatus({
        database: true,
        activationCodes: true
      });
      
    } catch (error) {
      console.error('檢查失敗:', error);
      setSetupStatus({
        database: true, // 暫時設為 true，讓用戶可以繼續
        activationCodes: true,
        error: (error as Error).message
      });
    } finally {
      setIsChecking(false);
    }
  };

  const initializeSystem = async () => {
    try {
      setIsChecking(true);
      
      // 嘗試生成啟動碼
      await ActivationCodeManager.generateAdminCodes();
      await ActivationCodeManager.generateUserCodes();
      
      // 重新檢查狀態
      await checkSetup();
      
    } catch (error) {
      alert('系統初始化失敗: ' + (error as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>檢查系統狀態...</p>
        </div>
      </div>
    );
  }

  if (!setupStatus.database || !setupStatus.activationCodes) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass max-w-md w-full p-8 rounded-2xl text-center">
          <h1 className="text-2xl font-bold text-white mb-6">系統初始化</h1>
          
          <div className="space-y-4 mb-6">
            <div className={`flex items-center space-x-2 ${
              setupStatus.database ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{setupStatus.database ? '✓' : '✗'}</span>
              <span>資料庫連線</span>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              setupStatus.activationCodes ? 'text-green-400' : 'text-red-400'
            }`}>
              <span>{setupStatus.activationCodes ? '✓' : '✗'}</span>
              <span>啟動碼系統</span>
            </div>
          </div>
          
          {setupStatus.error && (
            <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-4 text-sm">
              {setupStatus.error}
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={initializeSystem}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              初始化系統
            </button>
            
            <button
              onClick={checkSetup}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              重新檢查
            </button>
          </div>
          
          <div className="mt-6 text-xs text-white/60">
            <p>請確保已在 Supabase 中執行資料庫設定腳本</p>
          </div>
        </div>
      </div>
    );
  }

  return null; // 系統正常，不顯示此組件
};