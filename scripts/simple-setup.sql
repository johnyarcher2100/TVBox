-- Abuji IPTV Player - 簡化版 Supabase 設定腳本
-- 去除所有可能造成權限或語法問題的複雜功能

-- 1. 清理舊資料
DROP TABLE IF EXISTS channel_ratings CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS activation_codes CASCADE;

-- 2. 創建啟動碼表
CREATE TABLE activation_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    user_level INTEGER NOT NULL DEFAULT 1,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 year',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE NULL,
    used_by VARCHAR(255) NULL
);

-- 3. 創建用戶會話表
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    activation_code VARCHAR(8),
    user_level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 year',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 創建頻道表
CREATE TABLE channels (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    group_title VARCHAR(255),
    rating INTEGER DEFAULT 50,
    rating_count INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_dislikes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 創建評分記錄表
CREATE TABLE channel_ratings (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT,
    user_session_id VARCHAR(255),
    rating_type VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 創建推播表
CREATE TABLE broadcasts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    broadcast_type VARCHAR(20) DEFAULT 'text',
    target_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    display_duration INTEGER DEFAULT 5000,
    image_url TEXT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- 7. 插入管理者啟動碼
INSERT INTO activation_codes (code, user_level) VALUES
('ADMIN001', 3), ('ADMIN002', 3), ('ADMIN003', 3), ('ADMIN004', 3), ('ADMIN005', 3),
('ADMIN006', 3), ('ADMIN007', 3), ('ADMIN008', 3), ('ADMIN009', 3), ('ADMIN010', 3);

-- 8. 插入用戶啟動碼
INSERT INTO activation_codes (code, user_level) VALUES
('USER0011', 2), ('USER0012', 2), ('USER0013', 2), ('USER0014', 2), ('USER0015', 2),
('USER0016', 2), ('USER0017', 2), ('USER0018', 2), ('USER0019', 2), ('USER0020', 2),
('USER0021', 2), ('USER0022', 2), ('USER0023', 2), ('USER0024', 2), ('USER0025', 2);

-- 9. 插入更多用戶啟動碼 (分批插入以避免問題)
INSERT INTO activation_codes (code, user_level) VALUES
('USER0026', 2), ('USER0027', 2), ('USER0028', 2), ('USER0029', 2), ('USER0030', 2),
('USER0031', 2), ('USER0032', 2), ('USER0033', 2), ('USER0034', 2), ('USER0035', 2),
('USER0036', 2), ('USER0037', 2), ('USER0038', 2), ('USER0039', 2), ('USER0040', 2),
('USER0041', 2), ('USER0042', 2), ('USER0043', 2), ('USER0044', 2), ('USER0045', 2),
('USER0046', 2), ('USER0047', 2), ('USER0048', 2), ('USER0049', 2), ('USER0050', 2);

-- 10. 基本索引
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_user_sessions_code ON user_sessions(activation_code);
CREATE INDEX idx_channels_rating ON channels(rating DESC);
CREATE INDEX idx_broadcasts_active ON broadcasts(is_active);

-- 11. 插入測試推播
INSERT INTO broadcasts (title, content, target_level, created_by) VALUES
('歡迎使用 Abuji IPTV', '感謝您使用我們的服務！', 1, 'system'),
('系統通知', '系統運行正常', 2, 'system'),
('管理員通知', '管理功能已啟用', 3, 'system');

-- 12. 啟用基本 RLS
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- 13. 寬鬆的 RLS 政策 (開發環境)
CREATE POLICY "allow_all_activation_codes" ON activation_codes FOR ALL USING (true);
CREATE POLICY "allow_all_user_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "allow_all_channels" ON channels FOR ALL USING (true);
CREATE POLICY "allow_all_channel_ratings" ON channel_ratings FOR ALL USING (true);
CREATE POLICY "allow_all_broadcasts" ON broadcasts FOR ALL USING (true);

-- 完成
SELECT 'Abuji IPTV 簡化設定完成！' as message;