-- 修正管理員用戶和 notifications 表的 created_by 欄位問題
-- 執行此腳本來解決 "invalid input syntax for type uuid: admin" 錯誤

-- 1. 建立一個管理員用戶記錄（如果不存在）
INSERT INTO users (id, activation_code, user_level, activated_at, expires_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',  -- 固定的管理員 UUID
    'ADMIN000',                              -- 管理員啟動碼
    3,                                       -- 最高等級
    NOW(),                                   -- 立即啟動
    '2099-12-31 23:59:59',                  -- 永不過期
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. 確保管理員啟動碼存在
INSERT INTO activation_codes (code, user_level, is_used, used_by, used_at, created_at)
VALUES (
    'ADMIN000',
    3,
    TRUE,
    '00000000-0000-0000-0000-000000000000',
    NOW(),
    NOW()
) ON CONFLICT (code) DO NOTHING;

-- 3. 修正現有 notifications 中可能存在的錯誤 created_by 值
-- 注意：這個步驟可能會失敗，如果沒有錯誤的記錄就跳過
-- UPDATE notifications 
-- SET created_by = '00000000-0000-0000-0000-000000000000'
-- WHERE created_by IS NULL OR created_by::text = 'admin';

-- 4. 驗證管理員用戶是否建立成功
SELECT 
    'Admin user created successfully' as status,
    id,
    activation_code,
    user_level,
    activated_at
FROM users 
WHERE id = '00000000-0000-0000-0000-000000000000';

COMMENT ON SCRIPT IS '修正推播管理的管理員用戶問題 - 解決 UUID 類型錯誤'; 