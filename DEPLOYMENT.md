# Abuji IPTV 播放器部署指南

## 快速部署步驟

### 1. 資料庫設定

1. **登入 Supabase**
   - 前往 [Supabase](https://supabase.com)
   - 使用提供的帳號登入
   - 選擇專案：mfutugsqbpwxdwfsnnhi

2. **執行資料庫設定**
   - 進入 SQL Editor
   - 複製 `scripts/setup-database.sql` 的內容
   - 執行 SQL 腳本建立所有表格和初始資料

3. **檢查資料庫**
   ```sql
   SELECT * FROM activation_codes WHERE user_level = 3 LIMIT 5;
   ```

### 2. GitHub 設定

1. **建立儲存庫**
   ```bash
   cd TVOBX3-1001
   git init
   git add .
   git commit -m "Initial commit: Abuji IPTV Player"
   ```

2. **推送到 GitHub**
   ```bash
   git remote add origin https://github.com/your-username/abuji-iptv.git
   git branch -M main
   git push -u origin main
   ```

### 3. Netlify 部署

1. **連接 GitHub**
   - 登入 [Netlify](https://netlify.com)
   - 點擊 "New site from Git"
   - 選擇您的 GitHub 儲存庫

2. **設定部署參數**
   - **Branch to deploy**: main
   - **Build command**: `npm run build`
   - **Publish directory**: `out`

3. **環境變數設定**
   在 Netlify 設定中添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mfutugsqbpwxdwfsnnhi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXR1Z3NxYnB3eGR3ZnNubmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjIxODgsImV4cCI6MjA2NDgzODE4OH0.lbM5tsuNjmJWKEjldSkdtm9VVysH-SvHqI650673MLc
   ```

4. **部署**
   - 點擊 "Deploy site"
   - 等待建置完成

### 4. 測試部署

1. **基本功能測試**
   - 訪問部署的網站
   - 測試啟動碼功能
   - 測試頻道載入
   - 測試播放功能

2. **管理功能測試**
   - 使用管理者啟動碼登入
   - 測試推播功能
   - 測試頻道管理

## 本地開發

### 安裝依賴
```bash
npm install
```

### 啟動開發服務器
```bash
npm run dev
```

### 建置生產版本
```bash
npm run build
```

## 啟動碼管理

### 獲取管理者啟動碼
```sql
SELECT code FROM activation_codes WHERE user_level = 3 AND is_used = false LIMIT 5;
```

### 獲取一般用戶啟動碼
```sql
SELECT code FROM activation_codes WHERE user_level = 2 AND is_used = false LIMIT 10;
```

### 檢查啟動碼使用狀況
```sql
SELECT 
  user_level,
  COUNT(*) as total,
  COUNT(CASE WHEN is_used = true THEN 1 END) as used,
  COUNT(CASE WHEN is_used = false THEN 1 END) as available
FROM activation_codes 
GROUP BY user_level;
```

## 常見問題

### Q: 部署後無法播放影片
**A**: 檢查 CORS 設定和代理服務是否正常工作

### Q: 啟動碼驗證失敗
**A**: 確認 Supabase 環境變數正確設定且資料庫表格已建立

### Q: 推播功能不工作
**A**: 檢查用戶等級和推播訊息的 target_level 設定

### Q: 評分功能異常
**A**: 確認 user_ratings 表格存在且 RLS 政策正確設定

## 進階設定

### 自定義域名
1. 在 Netlify 中設定自定義域名
2. 設定 DNS 記錄指向 Netlify

### SSL 憑證
Netlify 會自動提供 SSL 憑證

### 效能優化
- 啟用 Netlify CDN
- 設定適當的 Cache-Control headers
- 使用 Image Optimization

## 維護

### 定期清理
```sql
-- 清理過期的會話
DELETE FROM user_sessions WHERE expires_at < NOW();

-- 清理過期的推播訊息
DELETE FROM broadcast_messages WHERE expires_at < NOW();
```

### 備份資料
定期備份 Supabase 資料庫

### 監控
- 設定 Netlify 部署通知
- 監控應用程式錯誤
- 檢查播放器相容性

## 支援

如有部署問題，請檢查：
1. 網路連線
2. 瀏覽器相容性
3. Supabase 服務狀態
4. Netlify 建置日誌