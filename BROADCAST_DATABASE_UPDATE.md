# 推播功能資料庫更新說明

## 問題描述
在新增重複推播功能後，需要更新 Supabase 資料庫結構以支援新功能。如果沒有執行資料庫更新，會出現「推播操作失敗」的錯誤。

## 錯誤原因
新增的重複推播功能需要以下三個新欄位：
- `repeat_interval_seconds` - 重複間隔秒數
- `repeat_count` - 總發送次數  
- `sent_count` - 已發送次數

## 解決方案

### 方法一：執行 SQL 遷移腳本（推薦）

1. 登入你的 Supabase Dashboard
2. 前往 **SQL Editor**
3. 複製並執行 `add-repeat-notification-fields.sql` 檔案中的內容

### 方法二：手動新增欄位

在 Supabase SQL Editor 中執行以下 SQL：

```sql
-- 新增重複推播相關欄位
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS repeat_interval_seconds INTEGER,
ADD COLUMN IF NOT EXISTS repeat_count INTEGER,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0;

-- 新增約束
ALTER TABLE notifications 
ADD CONSTRAINT check_repeat_interval_positive 
CHECK (repeat_interval_seconds IS NULL OR repeat_interval_seconds > 0);

ALTER TABLE notifications 
ADD CONSTRAINT check_repeat_count_positive 
CHECK (repeat_count IS NULL OR repeat_count > 0);

ALTER TABLE notifications 
ADD CONSTRAINT check_sent_count_non_negative 
CHECK (sent_count >= 0);
```

### 方法三：暫時使用基本功能

如果暫時無法更新資料庫，目前的程式碼已經加入了相容性處理：

1. **立即推播** - 正常工作 ✅
2. **指定時間推播** - 正常工作 ✅  
3. **間隔推播** - 正常工作 ✅
4. **重複推播** - 會自動轉換為指定時間推播 ⚠️

## 驗證更新是否成功

更新完成後，可以在 Supabase Table Editor 中查看 `notifications` 表格，確認是否有新增的三個欄位。

## 注意事項

- 更新資料庫結構前建議先備份現有資料
- 更新完成後重新測試推播功能
- 如果遇到權限問題，請確認 Supabase RLS 策略設定

## 技術支援

如果仍有問題，請檢查：
1. Supabase 連線是否正常
2. 是否有足夠的資料庫權限
3. 瀏覽器開發者工具中的錯誤訊息 