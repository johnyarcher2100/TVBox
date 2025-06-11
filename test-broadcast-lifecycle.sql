-- 測試推播生命週期管理
-- 這個腳本用於測試推播的自動清理功能

-- 清理現有測試推播
DELETE FROM notifications WHERE content LIKE '%測試%' OR content LIKE '%TEST%';

-- 插入各種類型的測試推播
INSERT INTO notifications (
  content, 
  type, 
  target_levels, 
  is_global, 
  schedule_time, 
  interval_seconds,
  repeat_interval_seconds,
  repeat_count,
  sent_count,
  is_active, 
  expires_at, 
  image_url, 
  created_by
) VALUES 

-- 1. 立即推播測試（應該播放一次後自動停用）
('TEST: 立即推播 - 播放後應自動停用', 'text', ARRAY[1, 2, 3], true, NULL, NULL, NULL, NULL, 0, true, NULL, NULL, '00000000-0000-0000-0000-000000000000'),

-- 2. 已過期推播測試（應該立即被清理）
('TEST: 已過期推播 - 應被立即清理', 'text', ARRAY[1, 2, 3], true, NULL, NULL, NULL, NULL, 0, true, NOW() - INTERVAL '1 hour', NULL, '00000000-0000-0000-0000-000000000000'),

-- 3. 重複推播測試（發送2次後應自動停用）
('TEST: 重複推播 - 發送2次後停用', 'text', ARRAY[1, 2, 3], true, NOW(), NULL, 10, 2, 0, true, NULL, NULL, '00000000-0000-0000-0000-000000000000'),

-- 4. 已完成的重複推播（sent_count >= repeat_count，應被清理）
('TEST: 已完成重複推播 - 應被清理', 'text', ARRAY[1, 2, 3], true, NOW() - INTERVAL '1 minute', NULL, 5, 3, 3, true, NULL, NULL, '00000000-0000-0000-0000-000000000000'),

-- 5. 間隔推播測試（每30秒一次，1小時後過期）
('TEST: 間隔推播 - 每30秒，1小時後過期', 'text', ARRAY[1, 2, 3], true, NULL, 30, NULL, NULL, 0, true, NOW() + INTERVAL '1 hour', NULL, '00000000-0000-0000-0000-000000000000'),

-- 6. 定時推播測試（1分鐘後播放一次）
('TEST: 定時推播 - 1分鐘後播放', 'text', ARRAY[1, 2, 3], true, NOW() + INTERVAL '1 minute', NULL, NULL, NULL, 0, true, NULL, NULL, '00000000-0000-0000-0000-000000000000');

-- 顯示插入的測試推播
SELECT 
  id,
  content,
  type,
  is_active,
  schedule_time,
  interval_seconds,
  repeat_interval_seconds,
  repeat_count,
  sent_count,
  expires_at,
  created_at,
  CASE 
    WHEN expires_at IS NOT NULL AND expires_at <= NOW() THEN '已過期'
    WHEN repeat_count IS NOT NULL AND sent_count >= repeat_count THEN '已完成'
    WHEN schedule_time IS NOT NULL AND schedule_time > NOW() THEN '等待中'
    ELSE '可播放'
  END as status
FROM notifications 
WHERE content LIKE '%TEST:%'
ORDER BY created_at DESC;

-- 說明各種推播類型的清理邏輯
/*
推播自動清理邏輯說明：

1. 立即推播：播放完成後立即停用（is_active = false）
2. 定時推播：到達指定時間播放完成後立即停用
3. 間隔推播：持續運行直到過期時間（expires_at）到達
4. 重複推播：發送次數達到設定值後自動停用
5. 過期推播：任何推播過期後都會被自動停用

測試步驟：
1. 執行此腳本插入測試推播
2. 觀察推播隊列的行為
3. 檢查推播播放完成後的狀態變化
4. 驗證自動清理功能是否正常工作
*/ 