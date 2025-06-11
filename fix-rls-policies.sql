-- 修正 RLS 策略腳本
-- 請在 Supabase SQL 編輯器中執行此腳本

-- 1. 先刪除現有的策略 (如果存在)
DROP POLICY IF EXISTS "允許讀取頻道" ON channels;
DROP POLICY IF EXISTS "允許讀取播放清單" ON playlists;
DROP POLICY IF EXISTS "允許讀取通知" ON notifications;
DROP POLICY IF EXISTS "允許插入用戶" ON users;
DROP POLICY IF EXISTS "允許插入頻道投票" ON channel_votes;
DROP POLICY IF EXISTS "允許更新頻道投票" ON channel_votes;
DROP POLICY IF EXISTS "允許更新頻道" ON channels;

-- 1.2 刪除可能存在的舊政策
DROP POLICY IF EXISTS "public_read_channels" ON channels;
DROP POLICY IF EXISTS "public_update_channels" ON channels;
DROP POLICY IF EXISTS "public_delete_channels" ON channels;
DROP POLICY IF EXISTS "public_read_playlists" ON playlists;
DROP POLICY IF EXISTS "public_insert_playlists" ON playlists;
DROP POLICY IF EXISTS "public_read_users" ON users;
DROP POLICY IF EXISTS "public_insert_users" ON users;
DROP POLICY IF EXISTS "public_update_users" ON users;
DROP POLICY IF EXISTS "public_read_activation_codes" ON activation_codes;
DROP POLICY IF EXISTS "public_update_activation_codes" ON activation_codes;
DROP POLICY IF EXISTS "public_read_notifications" ON notifications;
DROP POLICY IF EXISTS "public_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "public_update_notifications" ON notifications;
DROP POLICY IF EXISTS "public_delete_notifications" ON notifications;
DROP POLICY IF EXISTS "public_read_channel_votes" ON channel_votes;
DROP POLICY IF EXISTS "public_insert_channel_votes" ON channel_votes;
DROP POLICY IF EXISTS "public_update_channel_votes" ON channel_votes;

-- 2. 啟用 activation_codes 表的 RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 3. 創建新的寬鬆策略
-- 頻道相關策略
CREATE POLICY "public_read_channels" ON channels FOR SELECT USING (true);
CREATE POLICY "public_update_channels" ON channels FOR UPDATE USING (true);
CREATE POLICY "public_delete_channels" ON channels FOR DELETE USING (true);

-- 播放清單相關策略
CREATE POLICY "public_read_playlists" ON playlists FOR SELECT USING (true);
CREATE POLICY "public_insert_playlists" ON playlists FOR INSERT WITH CHECK (true);

-- 用戶相關策略
CREATE POLICY "public_read_users" ON users FOR SELECT USING (true);
CREATE POLICY "public_insert_users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_users" ON users FOR UPDATE USING (true);

-- 啟動碼相關策略
CREATE POLICY "public_read_activation_codes" ON activation_codes FOR SELECT USING (true);
CREATE POLICY "public_update_activation_codes" ON activation_codes FOR UPDATE USING (true);

-- 通知相關策略 (重要：添加缺少的刪除權限)
CREATE POLICY "public_read_notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "public_delete_notifications" ON notifications FOR DELETE USING (true);

-- 頻道投票相關策略
CREATE POLICY "public_read_channel_votes" ON channel_votes FOR SELECT USING (true);
CREATE POLICY "public_insert_channel_votes" ON channel_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_channel_votes" ON channel_votes FOR UPDATE USING (true);

-- 4. 驗證策略狀態
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('channels', 'playlists', 'users', 'activation_codes', 'notifications', 'channel_votes')
ORDER BY tablename, policyname;

-- 5. 如果仍有問題，可以暫時禁用 RLS (不建議在生產環境使用)
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY; 