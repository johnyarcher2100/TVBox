export class CORSHandler {
  private static proxyServices = [
    // 主要代理服務（優先級較高）
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
    
    // 附加代理服務
    'https://crossorigin.me/',
    'https://cors.bridged.cc/',
    'https://yacdn.org/proxy/',
    'https://api.allorigins.win/get?url=',
    'https://cors-proxy.htmldriven.com/?url=',
    
    // 特殊格式代理
    'https://proxy.cors.sh/',
    'https://cors.eu.org/'
  ];

  // 生成代理 URL
  static generateProxyUrl(originalUrl: string, proxyIndex = 0): string {
    const proxy = this.proxyServices[proxyIndex % this.proxyServices.length];
    
    // 特殊處理某些代理服務的格式
    if (proxy.includes('allorigins.win/get')) {
      const encodedUrl = encodeURIComponent(originalUrl);
      return `${proxy}${encodedUrl}&callback=`;
    }
    
    return proxy + encodeURIComponent(originalUrl);
  }

  // Chrome 專用 XHR 配置
  static configureXHR(xhr: XMLHttpRequest): void {
    xhr.withCredentials = false;
    xhr.timeout = 30000; // 30秒超時
    
    // 設置請求頭
    try {
      xhr.setRequestHeader('Accept', '*/*');
      xhr.setRequestHeader('Cache-Control', 'no-cache');
      xhr.setRequestHeader('Pragma', 'no-cache');
      xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (compatible; IPTV-Player)');
    } catch (e) {
      console.warn('設置請求頭失敗:', e);
    }
  }

  // 高級 URL 可達性測試
  static async testUrlAccessibility(url: string): Promise<{
    accessible: boolean;
    finalUrl: string;
    method: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    // 首先嘗試直接訪問（使用多種方法）
    const directMethods = [
      { mode: 'no-cors', method: 'HEAD' },
      { mode: 'cors', method: 'GET' },
      { mode: 'no-cors', method: 'GET' }
    ];
    
    for (const config of directMethods) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          method: config.method,
          mode: config.mode as RequestMode,
          signal: controller.signal,
          cache: 'no-cache',
          redirect: 'follow'
        });
        
        clearTimeout(timeoutId);
        
        // 對於 no-cors 模式，我們無法檢查狀態
        if (config.mode === 'no-cors' || response.ok) {
          return {
            accessible: true,
            finalUrl: url,
            method: `direct-${config.method.toLowerCase()}-${config.mode}`,
            responseTime: Date.now() - startTime
          };
        }
      } catch (error) {
        console.debug(`直接訪問失敗 (${config.method}/${config.mode}):`, error);
      }
    }
    
    // 嘗試代理服務
    for (let i = 0; i < this.proxyServices.length; i++) {
      try {
        const proxyUrl = this.generateProxyUrl(url, i);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(proxyUrl, {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return {
            accessible: true,
            finalUrl: proxyUrl,
            method: `proxy-${i}`,
            responseTime: Date.now() - startTime
          };
        }
      } catch (proxyError) {
        console.debug(`代理 ${i} 失敗:`, proxyError);
        continue;
      }
    }
    
    return {
      accessible: false,
      finalUrl: url,
      method: 'none',
      responseTime: Date.now() - startTime
    };
  }

  // 智能代理選擇
  static async findBestProxy(url: string): Promise<{ proxyUrl: string; index: number; responseTime: number } | null> {
    const testPromises = this.proxyServices.map(async (proxy, index) => {
      const startTime = Date.now();
      try {
        const proxyUrl = this.generateProxyUrl(url, index);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(proxyUrl, {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          return { proxyUrl, index, responseTime };
        }
      } catch (error) {
        // 忽略錯誤，繼續測試其他代理
      }
      return null;
    });
    
    const results = await Promise.allSettled(testPromises);
    const validResults = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .sort((a, b) => a.responseTime - b.responseTime);
    
    return validResults.length > 0 ? validResults[0] : null;
  }

  // 嘗試所有可能的方法
  static async tryAllMethods(url: string): Promise<string[]> {
    const methods = [
      'direct-head-no-cors',
      'direct-get-cors', 
      'direct-get-no-cors'
    ];
    
    // 添加所有代理方法
    for (let i = 0; i < this.proxyServices.length; i++) {
      methods.push(`proxy-${i}`);
    }
    
    return methods;
  }

  // Chrome 專用視頻元素配置
  static configureVideoElement(video: HTMLVideoElement): void {
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true; // Chrome 需要靜音才能自動播放
    
    // 設置緩衝策略
    if ('setSourceBuffer' in video) {
      try {
        (video as any).setSourceBuffer({
          mode: 'sequence',
          timestampOffset: 0
        });
      } catch (e) {
        console.debug('無法設置 SourceBuffer');
      }
    }
  }
}