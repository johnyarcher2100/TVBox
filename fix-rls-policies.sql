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

-- 2. 啟用 activation_codes 表的 RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 3. 創建新的寬鬆策略
-- 頻道相關策略
CREATE POLICY "public_read_channels" ON channels FOR SELECT USING (true);
CREATE POLICY "public_update_channels" ON channels FOR UPDATE USING (true);

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

-- 通知相關策略
CREATE POLICY "public_read_notifications" ON notifications FOR SELECT USING (is_active = true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE USING (true);

-- 頻道投票相關策略
CREATE POLICY "public_read_channel_votes" ON channel_votes FOR SELECT USING (true);
CREATE POLICY "public_insert_channel_votes" ON channel_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_channel_votes" ON channel_votes FOR UPDATE USING (true);

-- 4. 暫時禁用 RLS 以測試登入功能 (可選)
-- 如果仍有問題，可以暫時禁用 RLS
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE activation_codes DISABLE ROW LEVEL SECURITY; 