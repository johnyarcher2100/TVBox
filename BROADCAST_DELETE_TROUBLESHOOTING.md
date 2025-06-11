# 推播刪除問題故障排除

## 問題描述
推播清單顯示已刪除，但在 Supabase 中資料仍然存在，重新整理頁面後推播又出現了。

## 根本原因
**Row Level Security (RLS) 權限問題**：notifications 表缺少 DELETE 操作的政策，導致前端刪除請求被資料庫拒絕。

## 修復步驟

### 方法一：執行快速修復腳本（推薦）

1. 登入 Supabase Dashboard
2. 前往 SQL Editor
3. 執行 `quick-fix-notifications-delete.sql` 腳本

```sql
-- 快速修復 notifications 表刪除權限
CREATE POLICY "public_delete_notifications" 
ON notifications 
FOR DELETE 
USING (true);
```

### 方法二：執行完整 RLS 修復

執行 `fix-rls-policies.sql` 腳本，修復所有表的 RLS 政策。

### 方法三：臨時解決方案（不建議用於生產環境）

如果上述方法不行，可以暫時禁用 RLS：

```sql
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
```

## 驗證修復

1. 在 Supabase SQL Editor 中檢查政策：

```sql
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'DELETE' THEN '刪除權限已修復 ✅'
        ELSE cmd
    END as 狀態
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY cmd;
```

2. 在推播管理頁面測試刪除功能

## 調試資訊

開啟瀏覽器控制台可以看到詳細的刪除過程：

- `🗑️ 開始刪除推播，ID: xxx`
- `📡 發送刪除請求到 Supabase...`
- `📊 Supabase 刪除回應:` - 顯示錯誤或成功資訊

### 常見錯誤碼

- **42501**: 權限不足，需要執行修復腳本
- **PGRST204**: 記錄不存在，可能已被刪除
- **PGRST116**: 沒有找到匹配的記錄

## 預防措施

1. 確保所有必要的 RLS 政策都已創建
2. 定期檢查資料庫權限設定
3. 在開發環境中先測試權限變更

## 技術說明

### 問題的技術細節

1. **前端樂觀更新**: 為了用戶體驗，前端會立即從列表中移除項目
2. **資料庫操作失敗**: 由於 RLS 權限問題，實際的刪除操作失敗
3. **錯誤恢復**: 刪除失敗時，前端會將項目恢復到列表中
4. **重新載入時重現**: 重新整理頁面時，從資料庫重新載入，顯示未被刪除的記錄

### 修復原理

通過創建適當的 RLS DELETE 政策，允許應用程式刪除 notifications 表中的記錄：

```sql
CREATE POLICY "public_delete_notifications" 
ON notifications 
FOR DELETE 
USING (true);  -- 允許所有刪除操作
```

## 相關檔案

- `quick-fix-notifications-delete.sql` - 快速修復腳本
- `fix-rls-policies.sql` - 完整 RLS 修復腳本
- `src/pages/BroadcastManagePage.tsx` - 前端刪除邏輯
- `src/lib/supabase.ts` - 資料庫輔助函數 