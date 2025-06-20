'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Channel, PlayerState } from '@/types';

interface SimpleTestPlayerProps {
  channel: Channel;
  onPlayerStateChange: (state: Partial<PlayerState>) => void;
}

export const SimpleTestPlayer: React.FC<SimpleTestPlayerProps> = ({
  channel,
  onPlayerStateChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    if (channel && videoRef.current) {
      testPlayback();
    }
  }, [channel]);

  const testPlayback = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults([]);

    const results: string[] = [];
    
    try {
      // 測試 1: 直接播放
      results.push('開始測試直接播放...');
      setTestResults([...results]);
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // 基本配置
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        // 測試不同的src設定方式
        try {
          video.src = channel.url;
          results.push('✓ 直接設定 src 成功');
          
          const loadPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              results.push('✗ 載入超時');
              resolve(false);
            }, 10000);
            
            video.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              results.push('✓ metadata 載入成功');
              resolve(true);
            }, { once: true });
            
            video.addEventListener('error', (e) => {
              clearTimeout(timeout);
              const error = video.error;
              results.push(`✗ 載入錯誤: ${error?.code} - ${error?.message}`);
              resolve(false);
            }, { once: true });
            
            video.load();
          });
          
          const loaded = await loadPromise;
          setTestResults([...results]);
          
          if (loaded) {
            try {
              await video.play();
              results.push('✓ 播放成功！');
              onPlayerStateChange({ isPlaying: true, playbackError: undefined });
              setTestResults([...results]);
              setIsLoading(false);
              return;
            } catch (playError) {
              results.push(`✗ 播放失敗: ${playError}`);
            }
          }
        } catch (srcError) {
          results.push(`✗ 設定 src 失敗: ${srcError}`);
        }
        
        // 測試 2: 嘗試不同的 crossOrigin 設定
        results.push('\n嘗試不同的 CORS 設定...');
        const corsSettings = ['anonymous', 'use-credentials', ''];
        
        for (const corsSetting of corsSettings) {
          try {
            video.crossOrigin = corsSetting;
            video.src = channel.url;
            results.push(`測試 crossOrigin: "${corsSetting}"`);
            
            const testPromise = new Promise<boolean>((resolve) => {
              const timeout = setTimeout(() => {
                resolve(false);
              }, 5000);
              
              video.addEventListener('loadedmetadata', () => {
                clearTimeout(timeout);
                results.push(`✓ CORS "${corsSetting}" 成功`);
                resolve(true);
              }, { once: true });
              
              video.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve(false);
              }, { once: true });
              
              video.load();
            });
            
            const success = await testPromise;
            setTestResults([...results]);
            
            if (success) {
              try {
                await video.play();
                results.push('✓ 播放成功！');
                onPlayerStateChange({ isPlaying: true, playbackError: undefined });
                setTestResults([...results]);
                setIsLoading(false);
                return;
              } catch (e) {
                results.push(`播放嘗試失敗: ${e}`);
              }
            }
          } catch (e) {
            results.push(`CORS "${corsSetting}" 測試失敗: ${e}`);
          }
        }
        
        // 測試 3: 檢查 URL 格式
        results.push('\n分析 URL 格式...');
        results.push(`URL: ${channel.url}`);
        results.push(`協議: ${new URL(channel.url).protocol}`);
        results.push(`主機: ${new URL(channel.url).hostname}`);
        
        const isM3U8 = channel.url.includes('.m3u8') || channel.url.includes('m3u8');
        const isFLV = channel.url.includes('.flv') || channel.url.includes('flv');
        const isMP4 = channel.url.includes('.mp4') || channel.url.includes('mp4');
        
        results.push(`格式檢測: M3U8=${isM3U8}, FLV=${isFLV}, MP4=${isMP4}`);
        
        // 測試結束
        results.push('\n所有測試完成，播放失敗');
        setError(`無法播放 ${channel.name}`);
        onPlayerStateChange({ playbackError: '播放測試失敗' });
      }
    } catch (err) {
      results.push(`嚴重錯誤: ${err}`);
      setError(`測試過程發生錯誤: ${err}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const handleRetry = () => {
    testPlayback();
  };

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        playsInline
        onPlay={() => onPlayerStateChange({ isPlaying: true })}
        onPause={() => onPlayerStateChange({ isPlaying: false })}
      />
      
      {(isLoading || error) && (
        <div className="absolute inset-0 bg-black/90 text-white p-4 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold mb-4">
              {isLoading ? '播放測試進行中...' : '播放測試結果'}
            </h3>
            
            <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className={`
                  ${result.startsWith('✓') ? 'text-green-400' : 
                    result.startsWith('✗') ? 'text-red-400' : 
                    result.startsWith('\n') ? 'text-yellow-400 mt-2' : 
                    'text-gray-300'}
                `}>
                  {result}
                </div>
              ))}
              
              {isLoading && (
                <div className="text-blue-400 animate-pulse">
                  測試進行中...
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  重新測試
                </button>
                
                <div className="text-sm opacity-75">
                  <p>建議解決方案：</p>
                  <ul className="list-disc ml-4 mt-2">
                    <li>檢查網路連接</li>
                    <li>確認 URL 是否有效</li>
                    <li>嘗試使用 Firefox 瀏覽器</li>
                    <li>使用 VLC 等外部播放器</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTestPlayer; 