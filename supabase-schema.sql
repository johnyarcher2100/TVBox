-- Abuji IPTV 播放器資料庫結構

-- 1. 頻道表
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    logo TEXT,
    category VARCHAR(100),
    rating INTEGER DEFAULT 50 CHECK (rating >= 0 AND rating <= 9999),
    votes JSONB DEFAULT '{"likes": 0, "dislikes": 0}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 播放清單表
CREATE TABLE IF NOT EXISTS playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    format VARCHAR(10) CHECK (format IN ('m3u', 'm3u8', 'json', 'txt')),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 用戶表
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activation_code VARCHAR(8),
    user_level INTEGER DEFAULT 1 CHECK (user_level IN (1, 2, 3)),
    activated_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 啟動碼表
CREATE TABLE IF NOT EXISTS activation_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    user_level INTEGER CHECK (user_level IN (1, 2, 3)),
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(id),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    type VARCHAR(10) CHECK (type IN ('text', 'image')),
    target_levels INTEGER[] DEFAULT ARRAY[1, 2, 3],
    is_global BOOLEAN DEFAULT TRUE,
    schedule_time TIMESTAMP WITH TIME ZONE,
    interval_seconds INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    image_url TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 頻道投票表
CREATE TABLE IF NOT EXISTS channel_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    vote_type VARCHAR(10) CHECK (vote_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_channels_rating ON channels(rating DESC);
CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
CREATE INDEX IF NOT EXISTS idx_users_activation_code ON users(activation_code);
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON activation_codes(code);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_votes_channel ON channel_votes(channel_id);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入範例啟動碼 (1-10 為管理者，11-500 為一般用戶)
INSERT INTO activation_codes (code, user_level) VALUES 
-- 管理者啟動碼 (1-10)
('ADMIN001', 3),
('ADMIN002', 3),
('ADMIN003', 3),
('ADMIN004', 3),
('ADMIN005', 3),
('ADMIN006', 3),
('ADMIN007', 3),
('ADMIN008', 3),
('ADMIN009', 3),
('ADMIN010', 3);

-- 生成一般用戶啟動碼 (11-500)
DO $$
DECLARE
    i INTEGER;
    code_str VARCHAR(8);
BEGIN
    FOR i IN 11..500 LOOP
        -- 生成隨機 8 位英數字啟動碼
        code_str := UPPER(
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4) || 
            SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4)
        );
        
        INSERT INTO activation_codes (code, user_level) 
        VALUES (code_str, 2);
    END LOOP;
END $$;

-- 插入範例頻道
INSERT INTO channels (name, url, logo, category, rating, votes) VALUES 
('範例頻道 1', 'https://example.com/stream1.m3u8', 'https://example.com/logo1.png', '新聞', 75, '{"likes": 5, "dislikes": 0}'),
('範例頻道 2', 'https://example.com/stream2.m3u8', 'https://example.com/logo2.png', '娛樂', 68, '{"likes": 3, "dislikes": 1}'),
('範例頻道 3', 'https://example.com/stream3.m3u8', 'https://example.com/logo3.png', '體育', 82, '{"likes": 7, "dislikes": 0}');

-- 啟用行級安全 (RLS)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_votes ENABLE ROW LEVEL SECURITY;

-- 設定寬鬆的 RLS 策略以允許基本功能運作
-- 頻道相關策略
CREATE POLICY "public_read_channels" ON channels FOR SELECT USING (true);
CREATE POLICY "public_insert_channels" ON channels FOR INSERT WITH CHECK (true);
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

-- 通知相關策略
CREATE POLICY "public_read_notifications" ON notifications FOR SELECT USING (is_active = true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE USING (true);

-- 頻道投票相關策略
CREATE POLICY "public_read_channel_votes" ON channel_votes FOR SELECT USING (true);
CREATE POLICY "public_insert_channel_votes" ON channel_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_channel_votes" ON channel_votes FOR UPDATE USING (true);

COMMENT ON TABLE channels IS '頻道資訊表';
COMMENT ON TABLE playlists IS '播放清單表';
COMMENT ON TABLE users IS '用戶表';
COMMENT ON TABLE activation_codes IS '啟動碼表';
COMMENT ON TABLE notifications IS '推播通知表';
COMMENT ON TABLE channel_votes IS '頻道投票表'; 