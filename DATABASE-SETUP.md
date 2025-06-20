# Abuji IPTV 資料庫設定指南

## 🚀 快速設定

您的 Supabase 專案已經配置完成！請按照以下步驟設定資料庫：

### 1. 前往 Supabase Dashboard
- 開啟：https://mfutugsqbpwxdwfsnnhi.supabase.co
- 使用您的 Supabase 帳號登入

### 2. 執行資料庫腳本
1. 在 Supabase Dashboard 中點選左側選單的 **SQL Editor**
2. 點選 **New query** 建立新查詢
3. 將 `scripts/database-setup.sql` 中的所有內容複製並貼上
4. 點選 **Run** 執行腳本

### 3. 驗證設定
執行完成後，您應該會看到以下表格：
- `activation_codes` - 啟動碼表
- `user_sessions` - 用戶會話表  
- `channels` - 頻道表
- `channel_ratings` - 評分記錄表
- `broadcasts` - 推播表

### 4. 測試連接
重新啟動開發服務器：
```bash
npm run dev
```

## 🔑 預設啟動碼

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

## 🎯 功能說明

### 用戶等級系統
- **等級 1 (免費用戶)**：基本播放功能
- **等級 2 (一般用戶)**：完整播放功能 + 評分
- **等級 3 (管理者)**：所有功能 + 管理面板

### 評分系統
- 初始評分：50 分
- 按讚：+5 分 (最高 9999 分)
- 按爛：-19 分 (最低 1 分)
- 自動刪除：評分低於 10 分的頻道

### 推播系統
- 支援文字和圖片推播
- 分級推播：可針對不同用戶等級
- 自動過期管理

## 🔧 故障排除

### 連接問題
如果遇到連接問題，請檢查：
1. `.env.local` 檔案中的連接資訊是否正確
2. Supabase 專案是否已啟用
3. 資料庫腳本是否完全執行

### RLS 政策
資料庫已啟用 Row Level Security，確保資料安全性。

## 📱 測試應用

設定完成後，您可以：
1. 使用管理者啟動碼登入測試管理功能
2. 載入播放清單測試播放功能
3. 測試評分和推播系統

---

## 🎬 開始使用

現在您可以開始使用 Abuji IPTV 播放器了！

- **首頁**：http://localhost:3000
- **管理頁面**：http://localhost:3000/management (需管理者權限)
- **播放頁面**：選擇頻道後自動跳轉