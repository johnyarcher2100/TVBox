# Abuji IPTV 播放器

一個功能完整的 IPTV 播放器，支援多種串流協議和平台，專為解決 CORS 限制而設計。

## 功能特色

### 🎥 多格式播放支援
- **協議支援**: HTTP、HTTP-FLV、HLS（m3u8）、WS、WEBRTC、FMP4
- **編碼支援**: H.264、H.265、AAC、G711A、Mp3
- **解碼方式**: MSE、WASM、WebCodec 硬解碼/軟解碼

### 🌐 跨平台相容
- **瀏覽器**: Chrome (專用優化)、Firefox、Safari、Edge
- **平台**: Windows、Linux、Android、iOS
- **設備**: 手機、平板、電腦全支援

### 🔧 Chrome 專用 CORS 解決方案
- 自動檢測 Chrome 瀏覽器
- 多層級 CORS 繞過策略
- 多代理服務輪換
- 智能重試機制

### 📺 用戶介面
- **響應式設計**: 自適應手機/電腦螢幕
- **無滑動設計**: 所有功能在單頁面內完成
- **透明度調整**: 側邊欄透明度可調
- **評分系統**: 讚/爛評分，自動排序頻道

### 👥 用戶等級系統
- **等級 1**: 免費用戶
- **等級 2**: 一般用戶 (啟動碼 11-500)
- **等級 3**: 管理者 (啟動碼 1-10)

### 📢 推播系統
- 跑馬燈文字推播
- 圖示推播顯示
- 分級推播 (針對不同用戶等級)
- 排程推播功能

## 技術架構

### 前端技術棧
- **框架**: Next.js 14 (App Router)
- **樣式**: TailwindCSS
- **狀態管理**: Zustand
- **語言**: TypeScript

### 播放器技術
- **HLS.js**: HLS 串流播放
- **FLV.js**: FLV 格式支援
- **原生 Video**: 基礎播放功能

### 後端服務
- **資料庫**: Supabase
- **部署**: Netlify (靜態部署)

## 安裝與部署

### 本地開發

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **啟動開發服務器**
   ```bash
   npm run dev
   ```

3. **訪問應用**
   ```
   http://localhost:3000
   ```

### Netlify 部署

1. **建置專案**
   ```bash
   npm run build
   ```

2. **部署設定**
   - Build command: `npm run build`
   - Publish directory: `out`
   - Node version: 18+

3. **環境變數設定**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mfutugsqbpwxdwfsnnhi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### GitHub 自動部署

1. **推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **連接 Netlify**
   - 在 Netlify 中連接 GitHub 儲存庫
   - 設定自動部署觸發

## 資料庫設定

### Supabase 表格結構

需要建立以下表格：

```sql
-- 頻道表格
CREATE TABLE channels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  category TEXT,
  rating INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 播放清單表格
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  format TEXT CHECK (format IN ('m3u', 'm3u8', 'json', 'txt')),
  channels_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 用戶評分表格
CREATE TABLE user_ratings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT REFERENCES channels(id),
  user_id TEXT NOT NULL,
  rating TEXT CHECK (rating IN ('like', 'dislike')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

-- 推播訊息表格
CREATE TABLE broadcast_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  target_level INTEGER CHECK (target_level IN (1, 2, 3)),
  message_type TEXT CHECK (message_type IN ('text', 'icon')),
  schedule_time TIMESTAMP,
  interval_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 啟動碼表格
CREATE TABLE activation_codes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_level INTEGER CHECK (user_level IN (1, 2, 3)),
  is_used BOOLEAN DEFAULT false,
  used_by TEXT,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '365 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用戶會話表格
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  activation_code TEXT,
  user_level INTEGER CHECK (user_level IN (1, 2, 3)) DEFAULT 1,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 生成啟動碼

```sql
-- 生成管理者啟動碼 (1-10)
INSERT INTO activation_codes (code, user_level) 
SELECT 
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) as code,
  3 as user_level
FROM generate_series(1, 10);

-- 生成一般用戶啟動碼 (11-500)
INSERT INTO activation_codes (code, user_level) 
SELECT 
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) as code,
  2 as user_level
FROM generate_series(11, 500);
```

## 使用說明

### 基本操作

1. **啟動應用**: 首次使用可輸入啟動碼或以免費用戶身份繼續
2. **載入頻道**: 從 Abuji 節目單選擇或載入自定義播放清單
3. **播放頻道**: 點擊頻道圖標開始播放
4. **評分**: 在播放頁面點擊讚/爛按鈕為頻道評分
5. **管理**: 管理者可進入管理頁面設定推播和管理頻道

### 播放清單格式

支援以下格式：

- **M3U/M3U8**: 標準 IPTV 播放清單
- **JSON**: 自定義 JSON 格式
- **TXT**: 純 URL 清單

### CORS 問題解決

應用會自動檢測瀏覽器並採用最佳播放策略：
- Chrome: 使用專用 CORS 繞過播放器
- 其他瀏覽器: 使用標準播放器

## 貢獻指南

歡迎提交 Issue 和 Pull Request 來改善這個專案。

## 授權

此專案採用 MIT 授權條款。