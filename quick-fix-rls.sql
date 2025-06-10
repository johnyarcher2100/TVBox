-- 快速修復 RLS 問題
-- 請在 Supabase SQL 編輯器中執行此腳本

-- 暫時禁用 users 和 activation_codes 表的 RLS
-- 這樣可以立即解決登入問題
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes DISABLE ROW LEVEL SECURITY;

-- 如果需要重新啟用 RLS，請使用：
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 快速修復 RLS 策略 - 修復語法錯誤

-- 先刪除可能存在的策略
DROP POLICY IF EXISTS "public_insert_channels" ON channels;
DROP POLICY IF EXISTS "public_delete_channels" ON channels;
DROP POLICY IF EXISTS "public_read_channels" ON channels;
DROP POLICY IF EXISTS "public_update_channels" ON channels;

-- 重新創建頻道策略
CREATE POLICY "public_read_channels" ON channels FOR SELECT USING (true);
CREATE POLICY "public_insert_channels" ON channels FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_channels" ON channels FOR UPDATE USING (true);
CREATE POLICY "public_delete_channels" ON channels FOR DELETE USING (true);

-- 先刪除可能存在的播放清單策略
DROP POLICY IF EXISTS "public_read_playlists" ON playlists;
DROP POLICY IF EXISTS "public_insert_playlists" ON playlists;
DROP POLICY IF EXISTS "public_update_playlists" ON playlists;
DROP POLICY IF EXISTS "public_delete_playlists" ON playlists;

-- 重新創建播放清單策略
CREATE POLICY "public_read_playlists" ON playlists FOR SELECT USING (true);
CREATE POLICY "public_insert_playlists" ON playlists FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_playlists" ON playlists FOR UPDATE USING (true);
CREATE POLICY "public_delete_playlists" ON playlists FOR DELETE USING (true); 