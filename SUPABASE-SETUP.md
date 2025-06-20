# 🚀 Supabase 資料庫快速設定指南

## 問題解決

**錯誤**: `permission denied to set parameter "app.jwt_secret"`  
**解決**: 使用專為 Supabase 優化的設定腳本 ✅

## 📋 設定步驟

### 1️⃣ 前往 Supabase Dashboard
開啟：https://mfutugsqbpwxdwfsnnhi.supabase.co

### 2️⃣ 執行資料庫腳本
1. 點選左側選單的 **「SQL Editor」**
2. 點選 **「New query」** 建立新查詢
3. 複製 `scripts/supabase-setup.sql` 中的**全部內容**
4. 貼上並點選 **「Run」** 執行腳本

### 3️⃣ 驗證設定成功
執行完成後，您應該會看到：
```
status: "Abuji IPTV 資料庫設定完成！"
total_codes: 500
admin_codes: 10  
user_codes: 490
```

## ✅ 設定完成確認

### 檢查資料表
在 Supabase 左側選單點選 **「Table Editor」**，應該看到：
- `activation_codes` - 啟動碼表 (500 筆)
- `user_sessions` - 用戶會話表
- `channels` - 頻道表
- `channel_ratings` - 評分記錄表
- `broadcasts` - 推播表 (3 筆測試資料)

### 測試連接
前往：http://localhost:3001/test-db
應該顯示「連接成功」✅

## 🔑 可用啟動碼

### 管理者啟動碼 (等級 3)
```
ADMIN001, ADMIN002, ADMIN003, ADMIN004, ADMIN005
ADMIN006, ADMIN007, ADMIN008, ADMIN009, ADMIN010
```

### 一般用戶啟動碼 (等級 2)  
```
USER0011 到 USER0500 (共 490 組)
範例：USER0011, USER0012, USER0013...
```

## 🎯 立即測試

1. **開啟應用**: http://localhost:3001
2. **使用啟動碼**: 輸入 `ADMIN001`
3. **測試載入播放清單**: 輸入任何 m3u8 URL
4. **進入管理頁面**: 以管理者身份登入後可見

## 📱 功能確認

設定完成後，您可以測試：
- ✅ 啟動碼登入 (免費/一般/管理者)
- ✅ 播放清單解析和載入
- ✅ 頻道評分系統 (按讚+5分, 按爛-19分)
- ✅ 推播訊息顯示
- ✅ 管理者功能 (頻道管理、推播管理)

## 🛠️ 故障排除

### 如果仍有權限錯誤
1. 確認使用 `supabase-setup.sql` 而非 `database-setup.sql`
2. 確認已完整複製所有內容
3. 檢查 Supabase 專案是否已啟用

### 如果連接測試失敗
1. 檢查 `.env.local` 中的連接資訊
2. 確認網路連線正常
3. 重新啟動開發服務器

---

## 🎬 完成！

資料庫設定完成後，您的 Abuji IPTV 播放器就完全可用了！

**主頁**: http://localhost:3001  
**測試頁**: http://localhost:3001/test-db