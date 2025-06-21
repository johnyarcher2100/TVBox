-- RLS (Row Level Security) 設定腳本
-- 這個腳本會設定所有表格的RLS政策，確保數據安全

-- ========================================
-- 1. 啟用所有表格的 RLS
-- ========================================

-- 頻道表格
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- 播放清單表格
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- 用戶評分表格
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- 推播訊息表格
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- 啟動碼表格
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;

-- 用戶會話表格
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 啟動碼使用歷史表格（如果存在）
CREATE TABLE IF NOT EXISTS activation_code_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE activation_code_usage ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. 頻道表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "頻道讀取政策" ON channels;
DROP POLICY IF EXISTS "頻道新增政策" ON channels;
DROP POLICY IF EXISTS "頻道更新政策" ON channels;
DROP POLICY IF EXISTS "頻道刪除政策" ON channels;

-- 允許所有人讀取頻道
CREATE POLICY "頻道讀取政策" ON channels
  FOR SELECT
  USING (true);

-- 允許所有人新增頻道
CREATE POLICY "頻道新增政策" ON channels
  FOR INSERT
  WITH CHECK (true);

-- 允許所有人更新頻道
CREATE POLICY "頻道更新政策" ON channels
  FOR UPDATE
  USING (true);

-- 允許所有人刪除頻道
CREATE POLICY "頻道刪除政策" ON channels
  FOR DELETE
  USING (true);

-- ========================================
-- 3. 播放清單表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "播放清單讀取政策" ON playlists;
DROP POLICY IF EXISTS "播放清單新增政策" ON playlists;
DROP POLICY IF EXISTS "播放清單更新政策" ON playlists;
DROP POLICY IF EXISTS "播放清單刪除政策" ON playlists;

-- 允許所有人操作播放清單
CREATE POLICY "播放清單讀取政策" ON playlists
  FOR SELECT
  USING (true);

CREATE POLICY "播放清單新增政策" ON playlists
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "播放清單更新政策" ON playlists
  FOR UPDATE
  USING (true);

CREATE POLICY "播放清單刪除政策" ON playlists
  FOR DELETE
  USING (true);

-- ========================================
-- 4. 用戶評分表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "用戶評分讀取政策" ON user_ratings;
DROP POLICY IF EXISTS "用戶評分新增政策" ON user_ratings;
DROP POLICY IF EXISTS "用戶評分更新政策" ON user_ratings;
DROP POLICY IF EXISTS "用戶評分刪除政策" ON user_ratings;

-- 允許所有人操作用戶評分
CREATE POLICY "用戶評分讀取政策" ON user_ratings
  FOR SELECT
  USING (true);

CREATE POLICY "用戶評分新增政策" ON user_ratings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "用戶評分更新政策" ON user_ratings
  FOR UPDATE
  USING (true);

CREATE POLICY "用戶評分刪除政策" ON user_ratings
  FOR DELETE
  USING (true);

-- ========================================
-- 5. 推播訊息表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "推播訊息讀取政策" ON broadcast_messages;
DROP POLICY IF EXISTS "推播訊息新增政策" ON broadcast_messages;
DROP POLICY IF EXISTS "推播訊息更新政策" ON broadcast_messages;
DROP POLICY IF EXISTS "推播訊息刪除政策" ON broadcast_messages;

-- 允許所有人讀取推播訊息
CREATE POLICY "推播訊息讀取政策" ON broadcast_messages
  FOR SELECT
  USING (true);

-- 允許所有人新增推播訊息
CREATE POLICY "推播訊息新增政策" ON broadcast_messages
  FOR INSERT
  WITH CHECK (true);

-- 允許所有人更新推播訊息
CREATE POLICY "推播訊息更新政策" ON broadcast_messages
  FOR UPDATE
  USING (true);

-- 允許所有人刪除推播訊息
CREATE POLICY "推播訊息刪除政策" ON broadcast_messages
  FOR DELETE
  USING (true);

-- ========================================
-- 6. 啟動碼表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "啟動碼讀取政策" ON activation_codes;
DROP POLICY IF EXISTS "啟動碼新增政策" ON activation_codes;
DROP POLICY IF EXISTS "啟動碼更新政策" ON activation_codes;
DROP POLICY IF EXISTS "啟動碼刪除政策" ON activation_codes;

-- 允許所有人操作啟動碼
CREATE POLICY "啟動碼讀取政策" ON activation_codes
  FOR SELECT
  USING (true);

CREATE POLICY "啟動碼新增政策" ON activation_codes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "啟動碼更新政策" ON activation_codes
  FOR UPDATE
  USING (true);

CREATE POLICY "啟動碼刪除政策" ON activation_codes
  FOR DELETE
  USING (true);

-- ========================================
-- 7. 用戶會話表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "用戶會話讀取政策" ON user_sessions;
DROP POLICY IF EXISTS "用戶會話新增政策" ON user_sessions;
DROP POLICY IF EXISTS "用戶會話更新政策" ON user_sessions;
DROP POLICY IF EXISTS "用戶會話刪除政策" ON user_sessions;

-- 允許所有人操作用戶會話
CREATE POLICY "用戶會話讀取政策" ON user_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "用戶會話新增政策" ON user_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "用戶會話更新政策" ON user_sessions
  FOR UPDATE
  USING (true);

CREATE POLICY "用戶會話刪除政策" ON user_sessions
  FOR DELETE
  USING (true);

-- ========================================
-- 8. 啟動碼使用歷史表格 RLS 政策
-- ========================================

-- 刪除現有政策（如果存在）
DROP POLICY IF EXISTS "啟動碼使用歷史讀取政策" ON activation_code_usage;
DROP POLICY IF EXISTS "啟動碼使用歷史新增政策" ON activation_code_usage;

-- 允許所有人讀取和新增啟動碼使用歷史
CREATE POLICY "啟動碼使用歷史讀取政策" ON activation_code_usage
  FOR SELECT
  USING (true);

CREATE POLICY "啟動碼使用歷史新增政策" ON activation_code_usage
  FOR INSERT
  WITH CHECK (true);

-- ========================================
-- 9. 檢查 RLS 狀態
-- ========================================

-- 顯示所有表格的 RLS 狀態
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'channels', 
    'playlists', 
    'user_ratings', 
    'broadcast_messages', 
    'activation_codes', 
    'user_sessions',
    'activation_code_usage'
  )
ORDER BY tablename;

-- 顯示所有表格的政策
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 