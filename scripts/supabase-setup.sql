-- Abuji IPTV Player - Supabase 專用資料庫設定腳本
-- 請在 Supabase SQL Editor 中執行此腳本

-- 1. 清理舊資料 (如果存在)
DROP TABLE IF EXISTS channel_ratings CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS activation_codes CASCADE;

-- 2. 創建啟動碼表
CREATE TABLE activation_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(8) UNIQUE NOT NULL,
    user_level INTEGER NOT NULL DEFAULT 1, -- 1: 免費, 2: 一般, 3: 管理者
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 year',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE NULL,
    used_by VARCHAR(255) NULL
);

-- 3. 創建用戶會話表
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    activation_code VARCHAR(8) REFERENCES activation_codes(code),
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
    rating INTEGER DEFAULT 50, -- 初始評分 50
    rating_count INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    total_dislikes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 創建評分記錄表
CREATE TABLE channel_ratings (
    id BIGSERIAL PRIMARY KEY,
    channel_id BIGINT REFERENCES channels(id) ON DELETE CASCADE,
    user_session_id VARCHAR(255) REFERENCES user_sessions(id),
    rating_type VARCHAR(10) CHECK (rating_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_session_id)
);

-- 6. 創建推播表
CREATE TABLE broadcasts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    broadcast_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image'
    target_level INTEGER DEFAULT 1, -- 目標用戶等級
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1, -- 優先級 1-5
    display_duration INTEGER DEFAULT 5000, -- 顯示時間（毫秒）
    image_url TEXT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days'
);

-- 7. 插入預設啟動碼
INSERT INTO activation_codes (code, user_level) VALUES
-- 管理者碼 (1-10)
('ADMIN001', 3), ('ADMIN002', 3), ('ADMIN003', 3), ('ADMIN004', 3), ('ADMIN005', 3),
('ADMIN006', 3), ('ADMIN007', 3), ('ADMIN008', 3), ('ADMIN009', 3), ('ADMIN010', 3);

-- 8. 插入一般用戶啟動碼 (範例)
INSERT INTO activation_codes (code, user_level) VALUES
('USER0011', 2), ('USER0012', 2), ('USER0013', 2), ('USER0014', 2), ('USER0015', 2),
('USER0016', 2), ('USER0017', 2), ('USER0018', 2), ('USER0019', 2), ('USER0020', 2),
('USER0021', 2), ('USER0022', 2), ('USER0023', 2), ('USER0024', 2), ('USER0025', 2),
('USER0026', 2), ('USER0027', 2), ('USER0028', 2), ('USER0029', 2), ('USER0030', 2);

-- 9. 批量生成剩餘用戶啟動碼
DO $$
DECLARE
    i INTEGER;
    new_code VARCHAR(8);
BEGIN
    -- 生成 USER0031 到 USER0500 的啟動碼
    FOR i IN 31..500 LOOP
        new_code := 'USER' || LPAD(i::TEXT, 4, '0');
        INSERT INTO activation_codes (code, user_level) 
        VALUES (new_code, 2)
        ON CONFLICT (code) DO NOTHING;
    END LOOP;
END $$;

-- 10. 創建更新頻道評分的函數
CREATE OR REPLACE FUNCTION update_channel_rating(
    p_channel_id BIGINT,
    p_user_session_id VARCHAR(255),
    p_rating_type VARCHAR(10)
)
RETURNS void AS $$
DECLARE
    old_rating_type VARCHAR(10);
    current_rating INTEGER;
    current_count INTEGER;
    new_rating INTEGER;
BEGIN
    -- 檢查是否已經評分過
    SELECT rating_type INTO old_rating_type 
    FROM channel_ratings 
    WHERE channel_id = p_channel_id AND user_session_id = p_user_session_id;
    
    -- 獲取目前評分和計數
    SELECT rating, rating_count INTO current_rating, current_count
    FROM channels WHERE id = p_channel_id;
    
    -- 如果之前沒有評分過
    IF old_rating_type IS NULL THEN
        -- 插入新評分
        INSERT INTO channel_ratings (channel_id, user_session_id, rating_type)
        VALUES (p_channel_id, p_user_session_id, p_rating_type);
        
        -- 更新頻道評分
        IF p_rating_type = 'like' THEN
            new_rating := LEAST(current_rating + 5, 9999);
            UPDATE channels SET 
                rating = new_rating,
                rating_count = current_count + 1,
                total_likes = total_likes + 1,
                updated_at = NOW()
            WHERE id = p_channel_id;
        ELSE
            new_rating := GREATEST(current_rating - 19, 1);
            UPDATE channels SET 
                rating = new_rating,
                rating_count = current_count + 1,
                total_dislikes = total_dislikes + 1,
                updated_at = NOW()
            WHERE id = p_channel_id;
            
            -- 如果評分低於 10，刪除頻道
            IF new_rating <= 10 THEN
                DELETE FROM channels WHERE id = p_channel_id;
            END IF;
        END IF;
    
    -- 如果之前評分過且不同
    ELSIF old_rating_type != p_rating_type THEN
        -- 更新評分記錄
        UPDATE channel_ratings 
        SET rating_type = p_rating_type, created_at = NOW()
        WHERE channel_id = p_channel_id AND user_session_id = p_user_session_id;
        
        -- 撤回舊評分並應用新評分
        IF old_rating_type = 'like' AND p_rating_type = 'dislike' THEN
            new_rating := GREATEST(current_rating - 5 - 19, 1);
            UPDATE channels SET 
                rating = new_rating,
                total_likes = total_likes - 1,
                total_dislikes = total_dislikes + 1,
                updated_at = NOW()
            WHERE id = p_channel_id;
        ELSIF old_rating_type = 'dislike' AND p_rating_type = 'like' THEN
            new_rating := LEAST(current_rating + 19 + 5, 9999);
            UPDATE channels SET 
                rating = new_rating,
                total_likes = total_likes + 1,
                total_dislikes = total_dislikes - 1,
                updated_at = NOW()
            WHERE id = p_channel_id;
        END IF;
        
        -- 檢查是否需要刪除頻道
        IF new_rating <= 10 THEN
            DELETE FROM channels WHERE id = p_channel_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. 創建索引以提高查詢效能
CREATE INDEX idx_activation_codes_code ON activation_codes(code);
CREATE INDEX idx_activation_codes_used ON activation_codes(is_used);
CREATE INDEX idx_user_sessions_code ON user_sessions(activation_code);
CREATE INDEX idx_channels_rating ON channels(rating DESC);
CREATE INDEX idx_channel_ratings_channel_user ON channel_ratings(channel_id, user_session_id);
CREATE INDEX idx_broadcasts_active ON broadcasts(is_active, target_level);
CREATE INDEX idx_broadcasts_expires ON broadcasts(expires_at);

-- 12. 啟用 Row Level Security
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- 13. 創建 RLS 政策 (寬鬆政策，適合開發環境)
CREATE POLICY "Allow all access to activation_codes" ON activation_codes
FOR ALL USING (true);

CREATE POLICY "Allow all access to user_sessions" ON user_sessions
FOR ALL USING (true);

CREATE POLICY "Allow all access to channels" ON channels
FOR ALL USING (true);

CREATE POLICY "Allow all access to channel_ratings" ON channel_ratings
FOR ALL USING (true);

CREATE POLICY "Allow all access to broadcasts" ON broadcasts
FOR ALL USING (true);

-- 14. 插入測試推播
INSERT INTO broadcasts (title, content, broadcast_type, target_level, created_by) VALUES
('歡迎使用 Abuji IPTV', '感謝您使用我們的服務！享受高品質的串流體驗。', 'text', 1, 'system'),
('系統維護通知', '系統將於深夜 02:00-04:00 進行維護升級，請提前安排觀看時間。', 'text', 2, 'system'),
('管理員專用通知', '新的管理功能已上線，請查看管理面板了解更多詳情。', 'text', 3, 'system');

-- 15. 創建視圖方便查詢
CREATE VIEW active_broadcasts AS
SELECT * FROM broadcasts 
WHERE is_active = true AND expires_at > NOW()
ORDER BY priority DESC, created_at DESC;

CREATE VIEW channel_stats AS
SELECT 
    id,
    name,
    rating,
    rating_count,
    total_likes,
    total_dislikes,
    CASE 
        WHEN rating_count > 0 THEN ROUND((total_likes::NUMERIC / rating_count) * 100, 2)
        ELSE 0 
    END as like_percentage,
    created_at,
    updated_at
FROM channels
ORDER BY rating DESC;

-- 完成提示
SELECT 
    'Abuji IPTV 資料庫設定完成！' as status,
    (SELECT COUNT(*) FROM activation_codes) as total_codes,
    (SELECT COUNT(*) FROM activation_codes WHERE user_level = 3) as admin_codes,
    (SELECT COUNT(*) FROM activation_codes WHERE user_level = 2) as user_codes;