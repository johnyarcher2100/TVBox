-- Abuji IPTV Player - 現行程式結構資料庫設定腳本
-- 根據 src/types/index.ts 和 src/utils/database.ts 設計
-- 適用於 Supabase 或 PostgreSQL

-- ======================================
-- 1. 清理舊資料表 (謹慎使用)
-- ======================================
DROP TABLE IF EXISTS user_ratings CASCADE;
DROP TABLE IF EXISTS broadcast_messages CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS activation_codes CASCADE;

-- ======================================
-- 2. 啟動碼表 (activation_codes)
-- ======================================
CREATE TABLE activation_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    code TEXT UNIQUE NOT NULL,
    user_level INTEGER NOT NULL CHECK (user_level IN (1, 2, 3)),
    is_used BOOLEAN DEFAULT FALSE,
    used_by TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 3. 用戶會話表 (user_sessions)
-- ======================================
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    activation_code TEXT,
    user_level INTEGER NOT NULL DEFAULT 1 CHECK (user_level IN (1, 2, 3)),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 4. 頻道表 (channels)
-- ======================================
CREATE TABLE channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    category TEXT,
    rating INTEGER DEFAULT 50 CHECK (rating >= 0 AND rating <= 9999),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 5. 播放清單表 (playlists)
-- ======================================
CREATE TABLE playlists (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    format TEXT CHECK (format IN ('m3u', 'm3u8', 'json', 'txt')),
    channels_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 6. 用戶評分表 (user_ratings)
-- ======================================
CREATE TABLE user_ratings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating TEXT CHECK (rating IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- ======================================
-- 7. 推播訊息表 (broadcast_messages)
-- ======================================
CREATE TABLE broadcast_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    content TEXT NOT NULL,
    target_level INTEGER CHECK (target_level IN (1, 2, 3)),
    message_type TEXT CHECK (message_type IN ('text', 'icon')) DEFAULT 'text',
    schedule_time TIMESTAMPTZ,
    interval_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 8. 建立索引以提高查詢效能
-- ======================================

-- 啟動碼表索引
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_used ON activation_codes(is_used);
CREATE INDEX idx_activation_codes_expires ON activation_codes(expires_at);

-- 用戶會話表索引
CREATE INDEX idx_user_sessions_code ON user_sessions(activation_code);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- 頻道表索引
CREATE INDEX idx_channels_rating ON channels(rating DESC);
CREATE INDEX idx_channels_category ON channels(category);
CREATE INDEX idx_channels_name ON channels(name);

-- 播放清單表索引
CREATE INDEX idx_playlists_format ON playlists(format);

-- 用戶評分表索引
CREATE INDEX idx_user_ratings_channel ON user_ratings(channel_id);
CREATE INDEX idx_user_ratings_user ON user_ratings(user_id);
CREATE INDEX idx_user_ratings_rating ON user_ratings(rating);

-- 推播訊息表索引
CREATE INDEX idx_broadcast_messages_active ON broadcast_messages(is_active, target_level);
CREATE INDEX idx_broadcast_messages_expires ON broadcast_messages(expires_at);

-- ======================================
-- 9. 建立 RLS (Row Level Security) 政策
-- ======================================

-- 啟用 RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_messages ENABLE ROW LEVEL SECURITY;

-- 允許所有用戶讀取頻道
CREATE POLICY "Allow public read on channels" ON channels
    FOR SELECT USING (true);

-- 允許所有用戶新增/更新頻道
CREATE POLICY "Allow public insert on channels" ON channels
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on channels" ON channels
    FOR UPDATE USING (true);

-- 允許所有用戶刪除低評分頻道
CREATE POLICY "Allow public delete on channels" ON channels
    FOR DELETE USING (true);

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
    FOR SELECT USING (is_active = true);

-- 允許所有用戶新增推播訊息
CREATE POLICY "Allow public insert on broadcast_messages" ON broadcast_messages
    FOR INSERT WITH CHECK (true);

-- 允許所有用戶讀取未使用的啟動碼
CREATE POLICY "Allow public read unused codes" ON activation_codes
    FOR SELECT USING (is_used = false);

-- 允許所有用戶更新啟動碼使用狀態
CREATE POLICY "Allow public update codes" ON activation_codes
    FOR UPDATE USING (true);

-- 允許所有用戶管理會話
CREATE POLICY "Allow public access on user_sessions" ON user_sessions
    FOR ALL USING (true);

-- ======================================
-- 10. 插入測試資料
-- ======================================

-- 插入管理者啟動碼 (10 個)
INSERT INTO activation_codes (code, user_level, expires_at) VALUES
('ADMIN001', 3, NOW() + INTERVAL '1 year'),
('ADMIN002', 3, NOW() + INTERVAL '1 year'),
('ADMIN003', 3, NOW() + INTERVAL '1 year'),
('ADMIN004', 3, NOW() + INTERVAL '1 year'),
('ADMIN005', 3, NOW() + INTERVAL '1 year'),
('ADMIN006', 3, NOW() + INTERVAL '1 year'),
('ADMIN007', 3, NOW() + INTERVAL '1 year'),
('ADMIN008', 3, NOW() + INTERVAL '1 year'),
('ADMIN009', 3, NOW() + INTERVAL '1 year'),
('ADMIN010', 3, NOW() + INTERVAL '1 year');

-- 插入一般用戶啟動碼 (30 個範例)
INSERT INTO activation_codes (code, user_level, expires_at) VALUES
('USER0011', 2, NOW() + INTERVAL '1 year'),
('USER0012', 2, NOW() + INTERVAL '1 year'),
('USER0013', 2, NOW() + INTERVAL '1 year'),
('USER0014', 2, NOW() + INTERVAL '1 year'),
('USER0015', 2, NOW() + INTERVAL '1 year'),
('USER0016', 2, NOW() + INTERVAL '1 year'),
('USER0017', 2, NOW() + INTERVAL '1 year'),
('USER0018', 2, NOW() + INTERVAL '1 year'),
('USER0019', 2, NOW() + INTERVAL '1 year'),
('USER0020', 2, NOW() + INTERVAL '1 year'),
('USER0021', 2, NOW() + INTERVAL '1 year'),
('USER0022', 2, NOW() + INTERVAL '1 year'),
('USER0023', 2, NOW() + INTERVAL '1 year'),
('USER0024', 2, NOW() + INTERVAL '1 year'),
('USER0025', 2, NOW() + INTERVAL '1 year'),
('USER0026', 2, NOW() + INTERVAL '1 year'),
('USER0027', 2, NOW() + INTERVAL '1 year'),
('USER0028', 2, NOW() + INTERVAL '1 year'),
('USER0029', 2, NOW() + INTERVAL '1 year'),
('USER0030', 2, NOW() + INTERVAL '1 year'),
('USER0031', 2, NOW() + INTERVAL '1 year'),
('USER0032', 2, NOW() + INTERVAL '1 year'),
('USER0033', 2, NOW() + INTERVAL '1 year'),
('USER0034', 2, NOW() + INTERVAL '1 year'),
('USER0035', 2, NOW() + INTERVAL '1 year'),
('USER0036', 2, NOW() + INTERVAL '1 year'),
('USER0037', 2, NOW() + INTERVAL '1 year'),
('USER0038', 2, NOW() + INTERVAL '1 year'),
('USER0039', 2, NOW() + INTERVAL '1 year'),
('USER0040', 2, NOW() + INTERVAL '1 year');

-- 插入測試推播訊息
INSERT INTO broadcast_messages (content, target_level, message_type, is_active, expires_at) VALUES
('歡迎使用 Abuji IPTV 播放器！享受高質量的串流體驗。', 1, 'text', true, NOW() + INTERVAL '30 days'),
('系統將於深夜進行維護升級，請提前做好準備。', 2, 'text', true, NOW() + INTERVAL '7 days'),
('管理員專用：新功能已上線，請查看管理面板了解詳情。', 3, 'text', true, NOW() + INTERVAL '30 days');

-- ======================================
-- 11. 創建視圖以便查詢
-- ======================================

-- 活躍推播訊息視圖
CREATE VIEW active_broadcasts AS
SELECT * FROM broadcast_messages 
WHERE is_active = true 
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY target_level DESC, created_at DESC;

-- 頻道統計視圖
CREATE VIEW channel_stats AS
SELECT 
    c.id,
    c.name,
    c.rating,
    c.category,
    COUNT(ur.id) as total_ratings,
    COUNT(CASE WHEN ur.rating = 'like' THEN 1 END) as likes,
    COUNT(CASE WHEN ur.rating = 'dislike' THEN 1 END) as dislikes
FROM channels c
LEFT JOIN user_ratings ur ON c.id = ur.channel_id
GROUP BY c.id, c.name, c.rating, c.category
ORDER BY c.rating DESC;

-- 啟動碼統計視圖
CREATE VIEW activation_code_stats AS
SELECT 
    user_level,
    COUNT(*) as total_codes,
    COUNT(CASE WHEN is_used = false THEN 1 END) as available_codes,
    COUNT(CASE WHEN is_used = true THEN 1 END) as used_codes
FROM activation_codes
GROUP BY user_level
ORDER BY user_level;

-- ======================================
-- 12. 完成提示
-- ======================================
SELECT 
    'Abuji IPTV 資料庫重建完成！' as status,
    (SELECT COUNT(*) FROM activation_codes) as total_activation_codes,
    (SELECT COUNT(*) FROM activation_codes WHERE user_level = 3) as admin_codes,
    (SELECT COUNT(*) FROM activation_codes WHERE user_level = 2) as user_codes,
    (SELECT COUNT(*) FROM broadcast_messages) as broadcast_messages; 