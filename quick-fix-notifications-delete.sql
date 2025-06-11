-- 快速修復 notifications 表刪除權限問題
-- 執行此腳本解決「推播清單已刪除但 Supabase 資料仍存在」的問題

-- 1. 檢查當前 notifications 表的政策
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 2. 刪除可能存在的舊刪除政策
DROP POLICY IF EXISTS "public_delete_notifications" ON notifications;
DROP POLICY IF EXISTS "允許刪除通知" ON notifications;
DROP POLICY IF EXISTS "delete_notifications" ON notifications;

-- 3. 創建新的刪除政策 (允許所有刪除操作)
CREATE POLICY "public_delete_notifications" 
ON notifications 
FOR DELETE 
USING (true);

-- 4. 修正讀取政策 (之前限制只能讀取 is_active = true 的記錄)
DROP POLICY IF EXISTS "public_read_notifications" ON notifications;
CREATE POLICY "public_read_notifications" 
ON notifications 
FOR SELECT 
USING (true);

-- 5. 確保 INSERT 和 UPDATE 政策存在
DROP POLICY IF EXISTS "public_insert_notifications" ON notifications;
CREATE POLICY "public_insert_notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_notifications" ON notifications;
CREATE POLICY "public_update_notifications" 
ON notifications 
FOR UPDATE 
USING (true);

-- 6. 驗證所有政策已正確創建
SELECT 
    'notifications 表的當前政策:' as info,
    policyname,
    cmd as 操作類型,
    CASE 
        WHEN cmd = 'SELECT' THEN '讀取'
        WHEN cmd = 'INSERT' THEN '插入'
        WHEN cmd = 'UPDATE' THEN '更新'
        WHEN cmd = 'DELETE' THEN '刪除'
        ELSE cmd
    END as 中文說明
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd;

-- 7. 測試刪除權限 (可選 - 創建並立即刪除測試記錄)
/*
-- 取消註釋以下行來測試刪除功能
INSERT INTO notifications (content, type, target_levels, is_active, created_by) 
VALUES ('測試刪除權限', 'text', '{1}', false, '550e8400-e29b-41d4-a716-446655440000')
RETURNING id;

-- 使用返回的 ID 來測試刪除 (替換下面的 'TEST_ID')
-- DELETE FROM notifications WHERE content = '測試刪除權限';
*/ 