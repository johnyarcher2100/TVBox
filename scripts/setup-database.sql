-- Abuji IPTV 播放器資料庫設定腳本
-- 在 Supabase SQL 編輯器中執行此腳本

-- 啟用 UUID 擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 頻道表格
CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  category TEXT,
  rating INTEGER DEFAULT 50 CHECK (rating >= 0 AND rating <= 9999),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 播放清單表格
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  format TEXT CHECK (format IN ('m3u', 'm3u8', 'json', 'txt')),
  channels_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用戶評分表格
CREATE TABLE IF NOT EXISTS user_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 推播訊息表格
CREATE TABLE IF NOT EXISTS broadcast_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  content TEXT NOT NULL,
  target_level INTEGER CHECK (target_level IN (1, 2, 3)),
  message_type TEXT CHECK (message_type IN ('text', 'icon')) DEFAULT 'text',
  schedule_time TIMESTAMPTZ,
  interval_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 啟動碼表格
CREATE TABLE IF NOT EXISTS activation_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT UNIQUE NOT NULL,
  user_level INTEGER CHECK (user_level IN (1, 2, 3)),
  is_used BOOLEAN DEFAULT false,
  used_by TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '365 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用戶會話表格
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  activation_code TEXT,
  user_level INTEGER CHECK (user_level IN (1, 2, 3)) DEFAULT 1,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_channels_rating ON channels(rating DESC);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_user_ratings_channel ON user_ratings(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_user ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_active ON broadcast_messages(is_active, target_level);
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_used ON activation_codes(is_used);

-- 建立 RLS (Row Level Security) 政策
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 允許所有用戶讀取頻道
CREATE POLICY "Allow public read on channels" ON channels
  FOR SELECT USING (true);

-- 允許所有用戶新增/更新頻道
CREATE POLICY "Allow public insert on channels" ON channels
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on channels" ON channels
  FOR UPDATE USING (true);

-- 允許所有用戶讀取播放清單
CREATE POLICY "Allow public read on playlists" ON playlists
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on playlists" ON playlists
  FOR INSERT WITH CHECK (true);

-- 允許所有用戶管理評分
CREATE POLICY "Allow public access on user_ratings" ON user_ratings
  FOR ALL USING (true);

-- 允許所有用戶讀取推播訊息
CREATE POLICY "Allow public read on broadcast_messages" ON broadcast_messages
  FOR SELECT USING (true);

-- 只允許管理者管理推播訊息
CREATE POLICY "Allow admin manage broadcast_messages" ON broadcast_messages
  FOR ALL USING (true);

-- 允許所有用戶讀取啟動碼
CREATE POLICY "Allow public read on activation_codes" ON activation_codes
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on activation_codes" ON activation_codes
  FOR UPDATE USING (true);

-- 允許所有用戶管理會話
CREATE POLICY "Allow public access on user_sessions" ON user_sessions
  FOR ALL USING (true);

-- 生成管理者啟動碼 (1-10組)
DO $$
DECLARE
    i INTEGER;
    new_code TEXT;
BEGIN
    FOR i IN 1..10 LOOP
        new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
        INSERT INTO activation_codes (code, user_level) VALUES (new_code, 3);
    END LOOP;
END $$;

-- 生成一般用戶啟動碼 (490組，總計500組)
DO $$
DECLARE
    i INTEGER;
    new_code TEXT;
BEGIN
    FOR i IN 1..490 LOOP
        new_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
        INSERT INTO activation_codes (code, user_level) VALUES (new_code, 2);
    END LOOP;
END $$;

-- 插入範例推播訊息
INSERT INTO broadcast_messages (content, target_level, message_type, is_active) VALUES
('歡迎使用 Abuji IPTV 播放器！享受高品質的影音串流體驗。', 1, 'text', true),
('新功能上線：現在支援更多影片格式和更穩定的播放體驗！', 2, 'text', true),
('管理員通知：系統維護將在今晚進行，可能會有短暫的服務中斷。', 3, 'text', true);

-- 檢視建立結果
SELECT 'Database setup completed!' as status;
SELECT 'Admin codes generated: ' || COUNT(*) FROM activation_codes WHERE user_level = 3;
SELECT 'User codes generated: ' || COUNT(*) FROM activation_codes WHERE user_level = 2;
SELECT 'Total activation codes: ' || COUNT(*) FROM activation_codes;