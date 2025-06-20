export class CORSHandler {
  private static proxyServices = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/'
  ];

  // 生成代理 URL
  static generateProxyUrl(originalUrl: string, proxyIndex = 0): string {
    const proxy = this.proxyServices[proxyIndex % this.proxyServices.length];
    return proxy + encodeURIComponent(originalUrl);
  }

  // Chrome 專用 XHR 配置
  static configureXHR(xhr: XMLHttpRequest): void {
    xhr.withCredentials = false;
    xhr.setRequestHeader('Accept', '*/*');
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    xhr.setRequestHeader('Pragma', 'no-cache');
  }

  // 測試 URL 可達性
  static async testUrlAccessibility(url: string): Promise<{
    accessible: boolean;
    finalUrl: string;
    method: string;
  }> {
    // 首先嘗試直接訪問
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      return {
        accessible: true,
        finalUrl: url,
        method: 'direct'
      };
    } catch (error) {
      // 嘗試代理服務
      for (let i = 0; i < this.proxyServices.length; i++) {
        try {
          const proxyUrl = this.generateProxyUrl(url, i);
          const response = await fetch(proxyUrl, { 
            method: 'HEAD',
            mode: 'cors'
          });
          if (response.ok) {
            return {
              accessible: true,
              finalUrl: proxyUrl,
              method: `proxy-${i}`
            };
          }
        } catch (proxyError) {
          continue;
        }
      }
    }
    
    return {
      accessible: false,
      finalUrl: url,
      method: 'none'
    };
  }

  // 嘗試所有可能的方法
  static async tryAllMethods(url: string): Promise<string[]> {
    const methods = ['direct'];
    
    // 添加所有代理方法
    for (let i = 0; i < this.proxyServices.length; i++) {
      methods.push(`proxy-${i}`);
    }
    
    return methods;
  }
}