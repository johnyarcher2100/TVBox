import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProxyErrorLog {
  timestamp: string;
  message: string;
  source: string;
  details?: string;
}

export const TroubleshootPage: React.FC = () => {
  const [logs, setLogs] = useState<ProxyErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch('/api/proxy-errors?limit=5');
      if (!res.ok) throw new Error('API 請求失敗');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>問題排查 / Proxy 錯誤日誌</CardTitle>
          <div className="flex gap-2 mt-2">
            <Button onClick={fetchLogs} disabled={isLoading}>
              {isLoading ? '載入中...' : '手動刷新'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hasError && (
            <div className="text-red-500 mb-4">無法取得錯誤日誌，請稍後再試。</div>
          )}
          {logs.length === 0 && !isLoading && !hasError && (
            <div className="text-gray-500">目前沒有錯誤日誌。</div>
          )}
          <ul className="space-y-4">
            {logs.map((log, idx) => (
              <li key={idx} className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-gray-600">{new Date(log.timestamp).toLocaleString()}</span>
                  <span className="text-xs text-gray-400">{log.source}</span>
                </div>
                <Separator className="my-2" />
                <div className="font-semibold text-red-600">{log.message}</div>
                {log.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-blue-600">顯示詳細內容</summary>
                    <pre className="whitespace-pre-wrap text-xs mt-1 bg-gray-100 p-2 rounded">{log.details}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TroubleshootPage; 