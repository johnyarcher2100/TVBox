-- 新增重複推播功能所需的欄位
-- 執行日期: 2025-01-15

-- 1. 新增重複推播相關欄位到 notifications 表
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS repeat_interval_seconds INTEGER,
ADD COLUMN IF NOT EXISTS repeat_count INTEGER,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;

-- 2. 新增檢查約束確保資料完整性
ALTER TABLE notifications 
ADD CONSTRAINT check_repeat_interval_positive 
CHECK (repeat_interval_seconds IS NULL OR repeat_interval_seconds > 0);

ALTER TABLE notifications 
ADD CONSTRAINT check_repeat_count_positive 
CHECK (repeat_count IS NULL OR repeat_count > 0);

ALTER TABLE notifications 
ADD CONSTRAINT check_sent_count_non_negative 
CHECK (sent_count >= 0);

-- 3. 新增複合檢查約束：如果是重複推播，必須同時設定 repeat_interval_seconds 和 repeat_count
ALTER TABLE notifications 
ADD CONSTRAINT check_repeat_fields_consistency 
CHECK (
    (repeat_interval_seconds IS NULL AND repeat_count IS NULL AND sent_count = 0)
    OR 
    (repeat_interval_seconds IS NOT NULL AND repeat_count IS NOT NULL AND sent_count IS NOT NULL)
);

-- 4. 新增索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_notifications_repeat_status 
ON notifications(repeat_interval_seconds, repeat_count, sent_count) 
WHERE repeat_interval_seconds IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_schedule_repeat 
ON notifications(schedule_time, repeat_interval_seconds, is_active) 
WHERE schedule_time IS NOT NULL AND repeat_interval_seconds IS NOT NULL;

-- 5. 新增評論說明
COMMENT ON COLUMN notifications.repeat_interval_seconds IS '重複推播間隔秒數，用於指定每次推播間隔時間';
COMMENT ON COLUMN notifications.repeat_count IS '重複推播總次數，用於限制推播發送次數';
COMMENT ON COLUMN notifications.sent_count IS '已發送次數，用於追蹤重複推播進度';

-- 6. 驗證現有資料
UPDATE notifications 
SET sent_count = 0 
WHERE sent_count IS NULL;

-- 7. 顯示更新結果
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('repeat_interval_seconds', 'repeat_count', 'sent_count')
ORDER BY column_name; 