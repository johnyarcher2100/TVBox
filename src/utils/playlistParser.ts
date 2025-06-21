import { Channel } from '@/types';
import { CORSHandler } from './corsHandler';

export class PlaylistParser {
  // 解析 M3U 播放清單
  static parseM3U(content: string): Channel[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const channels: Channel[] = [];
    
    let currentChannel: Partial<Channel> = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('#EXTINF:')) {
        // 解析頻道資訊
        const info = line.substring(8);
        const commaIndex = info.indexOf(',');
        
        if (commaIndex !== -1) {
          const attributes = info.substring(0, commaIndex);
          const name = info.substring(commaIndex + 1);
          
          currentChannel = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim() || `頻道 ${channels.length + 1}`,
            rating: 50 // 初始評分
          };
          
          // 解析 logo
          const logoMatch = attributes.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) {
            currentChannel.logo = logoMatch[1];
          }
          
          // 解析分類
          const groupMatch = attributes.match(/group-title="([^"]+)"/);
          if (groupMatch) {
            currentChannel.category = groupMatch[1];
          }
          
          // 解析 tvg-name
          const tvgNameMatch = attributes.match(/tvg-name="([^"]+)"/);
          if (tvgNameMatch && (!currentChannel.name || !currentChannel.name.trim())) {
            currentChannel.name = tvgNameMatch[1];
          }
        }
      } else if (line && !line.startsWith('#')) {
        // URL 行
        if (currentChannel.name || Object.keys(currentChannel).length === 0) {
          // 如果沒有 EXTINF 信息，創建一個基本頻道
          if (!currentChannel.name) {
            currentChannel = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: `頻道 ${channels.length + 1}`,
              rating: 50
            };
          }
          
          currentChannel.url = line;
          channels.push(currentChannel as Channel);
          currentChannel = {};
        }
      }
    }
    
    return channels;
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
      console.log('開始解析播放清單:', url);
      
      // 使用智能獲取方法
      const response = await CORSHandler.smartFetch(url);
      
      const content = await response.text();
      console.log('播放清單內容長度:', content.length);
      console.log('播放清單前100字符:', content.substring(0, 100));
      
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
        throw new Error('播放清單中沒有找到有效的頻道');
      }
      
      return channels;
    } catch (error) {
      console.error('播放清單解析失敗:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('網路連接失敗，請檢查 URL 是否可訪問');
        } else if (error.message.includes('HTTP 404')) {
          throw new Error('播放清單文件不存在 (404)');
        } else if (error.message.includes('HTTP 403')) {
          throw new Error('無權限訪問播放清單 (403)');
        } else if (error.message.includes('HTTP 500')) {
          throw new Error('伺服器錯誤 (500)');
        } else {
          throw new Error(`解析錯誤: ${error.message}`);
        }
      }
      
      throw new Error('無法載入播放清單');
    }
  }
}