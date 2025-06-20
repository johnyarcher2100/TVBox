import { Channel } from '@/types';

export class PlaylistParser {
  // 解析 M3U 播放清單
  static parseM3U(content: string): Channel[] {
    const lines = content.split('\n').map(line => line.trim());
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
            name: name.trim(),
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
        }
      } else if (line && !line.startsWith('#') && currentChannel.name) {
        // URL 行
        currentChannel.url = line;
        channels.push(currentChannel as Channel);
        currentChannel = {};
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
      const response = await fetch(url);
      const content = await response.text();
      
      // 根據內容或 URL 判斷格式
      if (url.includes('.m3u') || content.includes('#EXTM3U')) {
        return this.parseM3U(content);
      } else if (url.includes('.json') || content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return this.parseJSON(content);
      } else {
        return this.parseTXT(content);
      }
    } catch (error) {
      console.error('播放清單解析失敗:', error);
      throw new Error('無法載入播放清單');
    }
  }
}