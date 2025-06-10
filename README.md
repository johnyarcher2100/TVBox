# Abuji IPTV 播放器

一個功能完整的 IPTV 播放器，支援多種串流格式、用戶權限管理、頻道評分系統等功能。

## 功能特色

### 🎥 播放器功能
- **多格式支援**: 整合 EasyPlayer.js 與 HLS 即時串流協議
- **硬解碼/軟解碼**: 支援 MSE、WebCodec、WASM 等多種解碼方式
- **響應式設計**: 支援手機豎屏/橫屏及電腦瀏覽器自適應
- **無滑動界面**: 所有功能在單一頁面內完成，避免滑動操作

### 👥 用戶系統
- **三級權限管理**:
  - 管理者 (啟動碼 1-10): 完整功能 + 管理權限
  - 一般用戶 (啟動碼 11-500): 進階功能
  - 免費用戶: 基本播放功能
- **啟動碼系統**: 500組8碼英數字啟動碼，365天使用期限

### 📺 頻道管理
- **播放清單解析**: 支援 M3U/M3U8/JSON/TXT 格式
- **智能評分系統**:
  - 初始評分 50分
  - 按讚 +5分，按爛 -19分
  - 評分範圍 0-9999分
  - 低於10分自動刪除
- **最佳頻道庫**: 保留評分最高的500個頻道

### 🔔 推播系統
- **多層級推播**: 依用戶等級推送不同內容
- **跑馬燈訊息**: 頂部圓滑區塊滾動顯示
- **推播圖示**: 影片右側中間固定顯示
- **排程推播**: 支援指定時間和間隔頻率

### 🎨 界面設計
- **透明度控制**: 左側控制面板可調整透明度
- **網格佈局**: 頻道圖標自適應大小與數量
- **評分顯示**: 即時顯示頻道評分與排序

## 技術架構

- **前端**: React 18 + TypeScript + TailwindCSS
- **狀態管理**: Zustand
- **路由**: React Router v6
- **播放器**: EasyPlayer.js + HLS.js
- **後端**: Supabase (PostgreSQL)
- **圖示**: Lucide React
- **構建工具**: Vite

## 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 設定 Supabase 資料庫
1. 前往 [Supabase](https://supabase.com) 建立新專案
2. 在 SQL 編輯器中執行 `supabase-schema.sql` 腳本
3. 複製 URL 和 API Key 到 `src/lib/supabase.ts`

### 3. 啟動開發伺服器
```bash
npm run dev
```

應用程式將在 http://localhost:3000 啟動

### 4. 建立生產版本
```bash
npm run build
```

## 資料庫結構

### 主要資料表
- `channels`: 頻道資訊
- `playlists`: 播放清單
- `users`: 用戶資料
- `activation_codes`: 啟動碼
- `notifications`: 推播通知
- `channel_votes`: 頻道投票記錄

### 預設啟動碼
- 管理者: `ADMIN001` ~ `ADMIN010`
- 一般用戶: 資料庫自動生成490組隨機碼

## 使用說明

### 登入
1. 開啟應用程式
2. 選擇使用啟動碼登入或免費用戶登入
3. 管理者可使用 `ADMIN001` 等預設碼登入

### 添加頻道
1. 在首頁點擊「添加播放清單」
2. 輸入播放清單 URL
3. 選擇對應格式 (M3U/M3U8/JSON/TXT)
4. 系統自動解析並添加頻道

### 播放與評分
1. 點擊頻道圖標進入播放頁面
2. 使用左側控制面板切換頻道
3. 點擊「讚」或「爛」評分頻道
4. 系統自動排序和清理低分頻道

### 管理功能 (僅管理者)
1. 點擊頂部「管理」按鈕
2. 建立推播通知
3. 設定目標用戶群和推播時間

## 支援的播放清單格式

### M3U/M3U8 格式
```
#EXTM3U
#EXTINF:-1 tvg-logo="logo.png" group-title="新聞",頻道名稱
http://example.com/stream.m3u8
```

### JSON 格式
```json
[
  {
    "name": "頻道名稱",
    "url": "http://example.com/stream.m3u8",
    "logo": "logo.png",
    "category": "新聞"
  }
]
```

### TXT 格式
```
http://example.com/stream1.m3u8
http://example.com/stream2.m3u8
```

## 部署

### Vercel 部署
1. 連接 GitHub 儲存庫到 Vercel
2. 設定環境變數 (如需要)
3. 自動部署

### Nginx 部署
1. 執行 `npm run build`
2. 將 `dist` 目錄內容複製到 Nginx 網站根目錄
3. 設定 SPA 路由重寫規則

## 開發說明

### 專案結構
```
src/
├── components/     # 共用組件
├── pages/         # 頁面組件
├── stores/        # Zustand 狀態管理
├── lib/           # 工具函數和配置
├── types/         # TypeScript 類型定義
└── index.css      # 全域樣式
```

### 添加新功能
1. 在對應目錄建立組件或函數
2. 更新 TypeScript 類型定義
3. 測試功能完整性
4. 更新文件

## 常見問題

### Q: 播放器無法載入？
A: 確認 EasyPlayer.js 檔案已正確複製到 `public/js/` 目錄

### Q: 頻道無法播放？
A: 檢查串流 URL 是否有效，確認支援 CORS

### Q: 資料庫連接失敗？
A: 檢查 Supabase 配置是否正確，確認 API Key 有效

### Q: 啟動碼無效？
A: 確認啟動碼未過期且未被使用過

## 授權

本專案基於 MIT 授權條款發布。

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 聯絡資訊

如有問題或建議，請透過 GitHub Issues 聯絡我們。 