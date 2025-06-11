# 推播功能實現說明

## 功能概述

已成功實現完整的推播管理系統，包含以下核心功能：

### 1. 推播類型
- **文字跑馬燈推播**：在影片播放頁面頂部顯示滾動文字
- **圖示推播**：在影片右邊中間顯示圖片推播，可包含文字說明

### 2. 用戶等級區分
- **全域推播**：針對用戶等級 1, 2, 3 (所有用戶)
- **用戶推播**：針對用戶等級 1, 2 (免費和付費用戶)
- **免費用戶推播**：僅針對用戶等級 1 (免費用戶)

### 3. 時間控制
- **立即推播**：建立後立即顯示
- **定時推播**：指定特定時間推播
- **間隔推播**：設定間隔時間重複推播

### 4. 過期管理
- 支援設定推播過期時間
- 自動過濾已過期的推播
- 記錄推播使用狀態

## 實現的檔案

### 1. 資料庫結構
- `supabase-schema.sql` - 包含 `notifications` 表格定義
- `test-broadcast-data.sql` - 測試推播資料

### 2. 類型定義
- `src/types/index.ts` - 推播相關的 TypeScript 介面定義

### 3. 資料庫輔助函數
- `src/lib/supabase.ts` - 包含推播相關的資料庫操作函數

### 4. 推播顯示組件
- `src/components/MarqueeDisplay.tsx` - 文字跑馬燈組件
- `src/components/ImageNotification.tsx` - 圖示推播組件

### 5. 管理頁面
- `src/pages/BroadcastManagePage.tsx` - 推播管理介面
- `src/pages/AdminPage.tsx` - 管理員頁面 (添加推播管理入口)

### 6. 播放器整合
- `src/pages/PlayerPage.tsx` - 在播放器頁面整合推播顯示

### 7. 路由配置
- `src/App.tsx` - 添加推播管理頁面路由

### 8. 樣式
- `src/index.css` - 跑馬燈動畫和淡入效果

## 使用方式

### 管理員操作
1. 以管理員身份登入 (用戶等級 3)
2. 進入管理頁面 (`/admin`)
3. 點擊「推播管理」進入推播管理頁面 (`/broadcast`)
4. 可以：
   - 新增推播 (文字或圖示)
   - 設定推播目標 (全域/用戶/免費用戶)
   - 設定時間控制 (立即/定時/間隔)
   - 設定過期時間
   - 啟用/停用推播
   - 編輯或刪除推播

### 用戶體驗
1. 用戶在播放器頁面會看到：
   - 文字推播：頂部跑馬燈形式顯示
   - 圖示推播：右邊中間浮動顯示
2. 推播根據用戶等級自動過濾顯示
3. 間隔推播會按設定時間重複顯示
4. 圖示推播可手動關閉

## 資料庫表格結構

```sql
notifications (
  id UUID PRIMARY KEY,
  content TEXT NOT NULL,                    -- 推播內容
  type VARCHAR(10) CHECK (type IN ('text', 'image')), -- 推播類型
  target_levels INTEGER[],                  -- 目標用戶等級
  is_global BOOLEAN DEFAULT TRUE,           -- 是否為全域推播
  schedule_time TIMESTAMP WITH TIME ZONE,  -- 預定推播時間
  interval_seconds INTEGER,                 -- 間隔推播秒數
  is_active BOOLEAN DEFAULT TRUE,           -- 是否啟用
  expires_at TIMESTAMP WITH TIME ZONE,     -- 過期時間
  image_url TEXT,                          -- 圖片網址 (圖示推播用)
  created_by UUID NOT NULL,                -- 建立者
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## 功能特色

1. **響應式設計**：支援不同螢幕尺寸
2. **即時更新**：推播內容即時載入顯示
3. **權限控制**：只有管理員可以管理推播
4. **用戶等級過濾**：自動根據用戶等級顯示相應推播
5. **動畫效果**：流暢的跑馬燈動畫和淡入效果
6. **過期管理**：自動處理過期推播
7. **間隔推播**：支援重複推播功能
8. **圖片支援**：支援圖示推播顯示

## 測試資料

可以執行 `test-broadcast-data.sql` 來插入測試推播資料，包含：
- 全域文字推播
- 用戶等級文字推播
- 間隔推播
- 圖示推播
- 定時推播

所有功能已完整實現並可正常使用。 