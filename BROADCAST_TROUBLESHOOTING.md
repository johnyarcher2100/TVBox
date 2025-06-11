# 推播功能故障排除指南

## 常見錯誤解決方案

### 錯誤 1: "invalid input syntax for type uuid: 'admin'"

**問題描述**：
推播建立時出現 UUID 類型錯誤，顯示 `invalid input syntax for type uuid: "admin"`

**原因分析**：
- 資料庫中 `notifications` 表的 `created_by` 欄位需要 UUID 格式
- 程式碼嘗試傳入字串 "admin" 而非有效的 UUID

**解決方案**：

#### 方案 1: 執行管理員用戶建立腳本（推薦）
```sql
-- 執行 fix-admin-user.sql 檔案中的內容
-- 或手動執行以下 SQL：

INSERT INTO users (id, activation_code, user_level, activated_at, expires_at, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'ADMIN000',
    3,
    NOW(),
    '2099-12-31 23:59:59',
    NOW()
) ON CONFLICT (id) DO NOTHING;
```

#### 方案 2: 檢查自動修復功能
程式碼現在包含自動建立管理員用戶的功能：
- 重新載入推播管理頁面
- 系統會自動檢查並建立管理員用戶
- 如果仍有問題，請檢查瀏覽器控制台的錯誤訊息

#### 方案 3: 手動驗證資料庫
```sql
-- 檢查管理員用戶是否存在
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000000';

-- 檢查 notifications 表結構
\d notifications;
```

### 錯誤 2: 重複推播欄位不存在

**問題描述**：
建立重複推播時出現欄位不存在錯誤

**解決方案**：
確保已執行 `add-repeat-notification-fields.sql` 腳本：
```sql
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS repeat_interval_seconds INTEGER,
ADD COLUMN IF NOT EXISTS repeat_count INTEGER,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;
```

### 錯誤 3: 推播沒有顯示在播放器

**可能原因**：
1. 推播狀態為停用
2. 目標等級設定錯誤
3. 推播已過期
4. 播放器未正確載入推播

**檢查步驟**：
1. 確認推播狀態為「啟用中」
2. 檢查目標等級是否符合當前用戶等級
3. 確認過期時間設定
4. 使用測試推播功能驗證

## 測試推播功能

使用推播管理頁面的測試功能：
1. 點擊任何推播旁的綠色 📤 按鈕
2. 系統會立即發送一個 `[測試]` 開頭的推播
3. 檢查播放器是否收到測試推播

## 資料庫健康檢查

定期執行以下查詢來檢查系統狀態：

```sql
-- 檢查管理員用戶
SELECT 'Admin User' as type, count(*) as count 
FROM users WHERE id = '00000000-0000-0000-0000-000000000000';

-- 檢查推播數量
SELECT 'Active Broadcasts' as type, count(*) as count 
FROM notifications WHERE is_active = true;

-- 檢查重複推播進度
SELECT 
    content,
    sent_count,
    repeat_count,
    ROUND((sent_count::float / repeat_count) * 100, 2) as progress_percent
FROM notifications 
WHERE repeat_count IS NOT NULL AND repeat_count > 0;
```

## 聯繫支援

如果問題持續存在：
1. 記錄完整的錯誤訊息
2. 檢查瀏覽器控制台
3. 提供資料庫版本和結構資訊
4. 描述重現問題的具體步驟

## 版本兼容性

- 支援的推播類型：文字跑馬燈、圖示推播
- 支援的時間設定：立即、指定時間、間隔、重複
- 資料庫要求：PostgreSQL (Supabase)
- 瀏覽器要求：現代瀏覽器支援 ES6+ 