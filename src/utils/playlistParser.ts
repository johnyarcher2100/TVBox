import { Channel } from '@/types';
import { CORSHandler } from './corsHandler';
import { NetworkDiagnostics } from './networkDiagnostics';

export class PlaylistParser {
  // 增強的文本清理函數
  private static cleanText(text: string): string {
    return text
      // 處理HTML實體
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
      .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
      // 處理特殊分隔符
      .replace(/@@@/g, ' - ')
      // 移除方括號內容
      .replace(/\[.*?\]/g, '')
      .replace(/【.*?】/g, '')
      // 移除控制字符和不可見字符
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      // 處理亂碼字符 - 嘗試修復常見的編碼問題
      .replace(/[^\u0000-\u007F\u4e00-\u9fff\u3400-\u4dbf\u0100-\u017f\u0180-\u024f\u1e00-\u1eff]/g, '')
      // 處理重複的空白字符
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 嘗試修復編碼問題
  private static fixEncoding(text: string): string {
    try {
      // 如果文本包含大量亂碼，嘗試不同的處理方式
      const corruptedCharCount = (text.match(/[^\u0000-\u007F\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
      const totalChars = text.length;
      
      if (corruptedCharCount > totalChars * 0.3) {
        // 如果超過30%的字符是亂碼，嘗試替換為安全字符
        console.warn('檢測到大量亂碼字符，嘗試修復...');
        return text.replace(/[^\u0000-\u007F\u4e00-\u9fff\u3400-\u4dbf\s]/g, '?');
      }
      
      return text;
    } catch (error) {
      console.warn('編碼修復失敗:', error);
      return text;
    }
  }

  // 解析 M3U 播放清單
  static parseM3U(content: string): Channel[] {
    try {
      // 正規化換行符並清理內容
      const normalizedContent = content
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\0/g, ''); // 移除空字符
      
      const lines = normalizedContent
        .split('\n')
        .map(line => this.fixEncoding(line.trim()))
        .filter(line => line);
      
      const channels: Channel[] = [];
      let currentChannel: Partial<Channel> = {};
      
      console.log(`M3U 解析開始，共 ${lines.length} 行`);
      
      // 檢查是否為簡單格式（沒有#EXTINF標籤）
      const hasExtinf = lines.some(line => line.startsWith('#EXTINF:'));
      
      if (!hasExtinf) {
        console.log('檢測到簡單格式 M3U，使用簡化解析');
        return this.parseSimpleM3U(lines);
      }
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        try {
          if (line.startsWith('#EXTINF:')) {
            // 解析頻道資訊
            const info = line.substring(8);
            const commaIndex = info.lastIndexOf(','); // 使用 lastIndexOf 處理名稱中包含逗號的情況
            
            if (commaIndex !== -1) {
              const attributes = info.substring(0, commaIndex);
              let name = info.substring(commaIndex + 1).trim();
              
              // 使用增強的文本清理
              name = this.cleanText(name);
              
              // 如果清理後名稱為空或只有問號，生成預設名稱
              if (!name || name.replace(/\?/g, '').trim().length === 0) {
                name = `頻道 ${channels.length + 1}`;
              }
              
              // 如果名稱過長，截取前50個字符
              if (name.length > 50) {
                name = name.substring(0, 47) + '...';
              }
              
              currentChannel = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: name,
                rating: 50
              };
              
              // 解析 logo（使用更寬鬆的匹配）
              const logoMatch = attributes.match(/tvg-logo=["\']([^"\']+)["\']/i);
              if (logoMatch) {
                currentChannel.logo = logoMatch[1];
              }
              
              // 解析分類（使用更寬鬆的匹配）
              const groupMatch = attributes.match(/group-title=["\']([^"\']+)["\']/i);
              if (groupMatch) {
                let category = this.cleanText(groupMatch[1]);
                
                // 如果分類是亂碼，設為預設值
                if (!category || category.replace(/\?/g, '').trim().length === 0) {
                  category = '其他';
                }
                
                // 過濾不適當的分類名稱
                if (!this.isAppropriateCategory(category)) {
                  category = '其他';
                }
                currentChannel.category = category;
              }
              
              // 解析 tvg-name
              const tvgNameMatch = attributes.match(/tvg-name=["\']([^"\']+)["\']/i);
              if (tvgNameMatch && (!currentChannel.name || currentChannel.name.startsWith('頻道'))) {
                let tvgName = this.cleanText(tvgNameMatch[1]);
                
                if (tvgName && tvgName.replace(/\?/g, '').trim().length > 0) {
                  if (tvgName.length > 50) {
                    tvgName = tvgName.substring(0, 47) + '...';
                  }
                  currentChannel.name = tvgName;
                }
              }
            }
          } else if (line && !line.startsWith('#')) {
            // URL 行
            if (currentChannel && (currentChannel.name || Object.keys(currentChannel).length > 0)) {
              // 如果沒有名稱，創建一個基本名稱
              if (!currentChannel.name) {
                currentChannel.name = `頻道 ${channels.length + 1}`;
              }
              
              // 驗證 URL 格式
              if (this.isValidUrl(line)) {
                currentChannel.url = line;
                channels.push(currentChannel as Channel);
                console.log(`成功解析頻道: ${currentChannel.name}`);
              } else {
                console.warn(`跳過無效 URL: ${line.substring(0, 50)}...`);
              }
              
              currentChannel = {};
            }
          }
        } catch (lineError) {
          console.warn(`解析第 ${i + 1} 行時出錯:`, lineError);
          continue; // 跳過有問題的行，繼續解析
        }
      }
      
      console.log(`M3U 解析完成，成功解析 ${channels.length} 個頻道`);
      return channels;
      
    } catch (error) {
      console.error('M3U 解析失敗:', error);
      throw new Error(`M3U 解析失敗: ${error}`);
    }
  }

  // 解析簡單格式的 M3U（名稱,URL 格式）
  private static parseSimpleM3U(lines: string[]): Channel[] {
    const channels: Channel[] = [];
    let currentCategory = '其他';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      try {
        if (line.startsWith('#genre#')) {
          // 跳過 #genre# 標記行
          continue;
        } else if (line.includes(',http')) {
          // 格式：頻道名稱,URL
          const commaIndex = line.lastIndexOf(',http');
          if (commaIndex !== -1) {
            let name = line.substring(0, commaIndex).trim();
            const url = line.substring(commaIndex + 1).trim();
            
            // 清理頻道名稱
            name = this.cleanText(name);
            
            // 如果名稱為空或只有亂碼，生成預設名稱
            if (!name || name.replace(/\?/g, '').trim().length === 0) {
              name = `頻道 ${channels.length + 1}`;
            }
            
            // 驗證 URL
            if (this.isValidUrl(url)) {
              const channel: Channel = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: name,
                url: url,
                category: currentCategory,
                rating: 50
              };
              
              channels.push(channel);
              console.log(`簡單格式解析頻道: ${channel.name}`);
            } else {
              console.warn(`跳過無效 URL: ${url.substring(0, 50)}...`);
            }
          }
        } else if (line && !line.startsWith('#') && !line.startsWith('http')) {
          // 可能是分類名稱行
          const cleanedLine = this.cleanText(line);
          if (cleanedLine && cleanedLine.replace(/\?/g, '').trim().length > 0) {
            currentCategory = cleanedLine;
            console.log(`設定分類: ${currentCategory}`);
          }
        }
      } catch (lineError) {
        console.warn(`簡單格式解析第 ${i + 1} 行時出錯:`, lineError);
        continue;
      }
    }
    
    console.log(`簡單格式 M3U 解析完成，成功解析 ${channels.length} 個頻道`);
    return channels;
  }
  
  // 檢查分類是否適當
  private static isAppropriateCategory(category: string): boolean {
    const inappropriateTerms = [
      '成人', '限制', '18+', 'adult', 'xxx', 'porn', 
      '色情', '情色', '性爱', '黄色', '福利'
    ];
    
    const lowerCategory = category.toLowerCase();
    return !inappropriateTerms.some(term => lowerCategory.includes(term.toLowerCase()));
  }
  
  // 驗證URL格式
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  // 解析 JSON 播放清單
  static parseJSON(content: string): Channel[] {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return data.map((item, index) => ({
          id: item.id || (Date.now() + index).toString(),
          name: item.name || item.title || `頻道 ${index + 1}`,
          url: item.url || item.stream_url || '',
          logo: item.logo || item.icon || '',
          category: item.category || item.group || '',
          rating: item.rating || 50
        }));
      } else if (data.channels && Array.isArray(data.channels)) {
        return this.parseJSON(JSON.stringify(data.channels));
      }
    } catch (error) {
      console.error('JSON 解析失敗:', error);
    }
    
    return [];
  }

  // 解析純文字清單
  static parseTXT(content: string): Channel[] {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    return lines.map((url, index) => ({
      id: (Date.now() + index).toString(),
      name: `頻道 ${index + 1}`,
      url: url,
      rating: 50
    }));
  }

  // 自動檢測並解析播放清單
  static async parsePlaylist(url: string): Promise<Channel[]> {
    try {
      console.log('🚀 開始高級播放清單解析:', url);
      
      // 使用全面的網路診斷和修復
      const testResult = await NetworkDiagnostics.comprehensiveTest(url);
      const connectionDiag = await NetworkDiagnostics.diagnoseConnection();
      
      // 生成詳細診斷報告
      const report = NetworkDiagnostics.generateReport(testResult, connectionDiag);
      console.log(report);
      
      if (!testResult.success) {
        // 如果所有方法都失敗，顯示詳細的診斷報告
        throw new Error(`無法獲取播放清單\n\n${report}`);
      }
      
      const response = testResult.response!;
      console.log(`✅ 成功獲取，使用方法: ${testResult.method}`);
      console.log('回應狀態:', response.status, response.statusText);
      
      const content = await response.text();
      console.log('播放清單內容長度:', content.length);
      console.log('播放清單前200字符:', content.substring(0, 200));
      
      // 檢查內容是否有效
      if (!content || content.trim().length === 0) {
        throw new Error('播放清單內容為空');
      }
      
      let channels: Channel[] = [];
      
      // 根據內容或 URL 判斷格式
      if (url.includes('type=m3u') || url.includes('.m3u') || content.includes('#EXTM3U') || content.includes('#EXTINF')) {
        console.log('檢測到 M3U 格式');
        channels = this.parseM3U(content);
      } else if (url.includes('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
        console.log('檢測到 JSON 格式');
        channels = this.parseJSON(content);
      } else {
        console.log('使用純文字格式解析');
        channels = this.parseTXT(content);
      }
      
      console.log(`成功解析 ${channels.length} 個頻道`);
      
      if (channels.length === 0) {
        throw new Error(`播放清單解析完成但沒有找到有效頻道。\n內容格式: ${this.detectContentFormat(content)}\n內容片段: ${content.substring(0, 100)}...`);
      }
      
      return channels;
    } catch (error) {
      console.error('播放清單解析完整錯誤:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error(`網路連接失敗：無法訪問 ${url}\n請檢查：\n1. URL 是否正確\n2. 網路連接是否正常\n3. 伺服器是否允許跨域訪問`);
        } else if (error.message.includes('HTTP 404')) {
          throw new Error(`文件不存在 (404)：${url}\n請確認播放清單文件是否存在`);
        } else if (error.message.includes('HTTP 403')) {
          throw new Error(`訪問被拒絕 (403)：${url}\n該播放清單可能需要授權或不允許外部訪問`);
        } else if (error.message.includes('HTTP 500')) {
          throw new Error(`伺服器錯誤 (500)：${url}\n請稍後重試或聯繫播放清單提供者`);
        } else if (error.message.includes('所有獲取方法都失敗')) {
          throw new Error(`CORS 跨域問題：所有代理服務都無法訪問此資源\n${error.message}\n\n建議：\n1. 檢查 URL 是否正確\n2. 嘗試其他播放清單來源\n3. 確認播放清單伺服器支持跨域訪問`);
        } else {
          throw new Error(`解析錯誤: ${error.message}`);
        }
      }
      
      throw new Error(`未知錯誤：無法載入播放清單 ${url}`);
    }
  }
  
  // 檢測內容格式
  private static detectContentFormat(content: string): string {
    const sample = content.trim().substring(0, 200).toLowerCase();
    
    if (sample.includes('#extm3u') || sample.includes('#extinf')) {
      return 'M3U/M3U8';
    } else if (sample.startsWith('{') || sample.startsWith('[')) {
      return 'JSON';
    } else if (sample.includes('http://') || sample.includes('https://')) {
      return '純文字URL列表';
    } else {
      return `未知格式 (前100字符: ${sample.substring(0, 100)})`;
    }
  }
}