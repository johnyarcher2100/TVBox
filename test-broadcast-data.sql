-- 測試推播資料
-- 清理現有推播資料
DELETE FROM notifications;

-- 插入測試推播資料
INSERT INTO notifications (
  content, 
  type, 
  target_levels, 
  is_global, 
  schedule_time, 
  interval_seconds, 
  is_active, 
  expires_at, 
  image_url, 
  created_by
) VALUES 

-- 文字跑馬燈推播 - 全域推播
('🎉 歡迎使用 Abuji IPTV 播放器！享受高品質的影音體驗', 'text', ARRAY[1, 2, 3], true, NULL, NULL, true, NULL, NULL, 'admin'),

-- 文字跑馬燈推播 - 用戶推播
('💎 升級到付費會員即可享受更多頻道和高畫質播放', 'text', ARRAY[1, 2], false, NULL, 30, true, NULL, NULL, 'admin'),

-- 文字跑馬燈推播 - 免費用戶推播
('🆓 免費用戶每日可觀看 2 小時，歡迎升級享受無限制觀看', 'text', ARRAY[1], false, NULL, 60, true, NULL, NULL, 'admin'),

-- 圖示推播 - 全域推播
('新年優惠活動開始！', 'image', ARRAY[1, 2, 3], true, NULL, NULL, true, NOW() + INTERVAL '7 days', 'https://via.placeholder.com/300x200/FF6B35/FFFFFF?text=新年優惠', 'admin'),

-- 圖示推播 - 用戶推播
('付費會員專屬活動', 'image', ARRAY[1, 2], false, NULL, 120, true, NOW() + INTERVAL '3 days', 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=會員專屬', 'admin'),

-- 定時推播 - 明天中午 12:00
('⏰ 定時推播測試：這是一個定時在明天中午推播的訊息', 'text', ARRAY[1, 2, 3], true, NOW() + INTERVAL '1 day' + TIME '12:00:00', NULL, true, NULL, NULL, 'admin'),

-- 間隔推播 - 每 45 秒推播一次
('🔄 間隔推播測試：此訊息每 45 秒推播一次', 'text', ARRAY[1, 2, 3], true, NULL, 45, true, NOW() + INTERVAL '1 hour', NULL, 'admin');

-- 顯示插入的推播資料
SELECT 
  id,
  content,
  type,
  target_levels,
  is_global,
  schedule_time,
  interval_seconds,
  is_active,
  expires_at,
  created_at
FROM notifications 
ORDER BY created_at DESC; 