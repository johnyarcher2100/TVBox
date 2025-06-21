// 快速測試工具 - 可在瀏覽器控制台中執行
export class QuickTest {
  // 快速測試播放清單URL
  static async testPlaylist(url: string) {
    console.log(`🔍 快速測試播放清單: ${url}`);
    
    // 測試基本連接
    try {
      console.log('1️⃣ 測試基本 fetch...');
      const response1 = await fetch(url);
      console.log(`✅ 基本 fetch 成功: ${response1.status}`);
      
      const content = await response1.text();
      console.log(`內容長度: ${content.length}`);
      console.log(`前100字符: ${content.substring(0, 100)}`);
      
      return { success: true, method: 'basic', content };
    } catch (error1) {
      console.log(`❌ 基本 fetch 失敗: ${error1}`);
    }
    
    // 測試 CORS 代理
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest='
    ];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`${i + 2}️⃣ 測試代理 ${i + 1}: ${proxies[i]}`);
        const proxyUrl = proxies[i] + encodeURIComponent(url);
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
          console.log(`✅ 代理 ${i + 1} 成功: ${response.status}`);
          const content = await response.text();
          console.log(`內容長度: ${content.length}`);
          return { success: true, method: `proxy-${i}`, content };
        }
      } catch (error) {
        console.log(`❌ 代理 ${i + 1} 失敗: ${error}`);
      }
    }
    
    return { success: false };
  }
  
  // 測試網路環境
  static async testEnvironment() {
    console.log('🌐 測試網路環境...');
    
    console.log(`瀏覽器: ${navigator.userAgent}`);
    console.log(`在線狀態: ${navigator.onLine}`);
    console.log(`當前域名: ${window.location.origin}`);
    
    // 測試基本網路連接
    try {
      await fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' });
      console.log('✅ 基本網路連接正常');
    } catch {
      console.log('❌ 基本網路連接異常');
    }
    
    // 測試 CORS
    try {
      await fetch('https://httpbin.org/get');
      console.log('✅ CORS 支持正常');
    } catch {
      console.log('❌ CORS 支持受限');
    }
  }
  
  // 測試所有播放清單
  static async testAllPlaylists() {
    const urls = [
      'https://iptv-org.github.io/iptv/index.m3u',
      'https://raw.githubusercontent.com/Guovin/iptv-api/gd/output/result.m3u',
      'https://files.catbox.moe/zyat7k.m3u',
      'https://files.catbox.moe/1mj29e.m3u',
      'https://files.catbox.moe/25aoli.txt'
    ];
    
    console.log('🚀 開始測試所有播放清單...');
    
    for (let i = 0; i < urls.length; i++) {
      console.log(`\n📺 測試播放清單 ${i + 1}/${urls.length}`);
      await this.testPlaylist(urls[i]);
      
      // 避免請求過於頻繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n✅ 所有測試完成');
  }
  
  // 測試亂碼M3U內容解析
  static async testCorruptedM3U() {
    console.log('🧪 測試亂碼 M3U 內容解析...');
    
    const testContent = `蝱煾,#genre#
撖啣鰵𧼮蝱,http://xn--elt51t.azip.dpdns.org:5008/litv-longturn14/index.m3u8
撖啣鰵𧼮蝱蝱,http://xn--elt51t.azip.dpdns.org:5008/of-4gtv-4gtv156/index.m3u8
撖啣瓷蝬枏蝱,http://xn--elt51t.azip.dpdns.org:5008/of-4gtv-4gtv158/index.m3u8
虾閬𡝗鰵,http://xn--elt51t.azip.dpdns.org:5008/of-4gtv-4gtv052/index.m3u8
蔣蝱,http://4gtv.livednow.dpdns.org/4gtv-4gtv049/index.m3u8`;

    try {
      const { PlaylistParser } = await import('./playlistParser');
      const channels = PlaylistParser.parseM3U(testContent);
      
      console.log('✅ 解析結果:');
      console.log(`- 成功解析 ${channels.length} 個頻道`);
      
      channels.forEach((channel, index) => {
        console.log(`${index + 1}. ${channel.name} (${channel.category || '無分類'})`);
        console.log(`   URL: ${channel.url}`);
      });
      
      return {
        success: true,
        channelCount: channels.length,
        channels: channels
      };
    } catch (error) {
      console.error('❌ 解析失敗:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知錯誤'
      };
    }
  }
}

// 將測試函數掛載到全域，方便在控制台直接使用
if (typeof window !== 'undefined') {
  (window as any).quickTest = QuickTest;
} 