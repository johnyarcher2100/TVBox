// 網路診斷和修復工具
export class NetworkDiagnostics {
  // 測試所有可能的獲取方法
  static async comprehensiveTest(url: string): Promise<{
    success: boolean;
    method?: string;
    response?: Response;
    errors: string[];
    diagnostics: string[];
  }> {
    const errors: string[] = [];
    const diagnostics: string[] = [];
    
    diagnostics.push(`開始全面測試 URL: ${url}`);
    diagnostics.push(`當前域名: ${window.location.origin}`);
    diagnostics.push(`目標域名: ${new URL(url).origin}`);
    
    // 方法1: 直接 fetch (cors)
    try {
      diagnostics.push('測試方法1: 直接 fetch (CORS)');
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Accept': 'text/plain, application/vnd.apple.mpegurl, audio/mpegurl, */*',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        diagnostics.push('✅ 直接 CORS 獲取成功');
        return { success: true, method: 'direct-cors', response, errors, diagnostics };
      } else {
        errors.push(`直接 CORS: HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      errors.push(`直接 CORS 失敗: ${error}`);
    }
    
    // 方法2: 無 CORS 模式
    try {
      diagnostics.push('測試方法2: No-CORS 模式');
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      // no-cors 模式無法讀取響應內容，但可以判斷是否成功
      if (response.type === 'opaque') {
        diagnostics.push('⚠️ No-CORS 模式響應為 opaque，無法讀取內容');
        errors.push('No-CORS: 無法讀取響應內容');
      }
    } catch (error) {
      errors.push(`No-CORS 失敗: ${error}`);
    }
    
    // 方法3: 使用多個 CORS 代理
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://corsproxy.io/?',
      'https://thingproxy.freeboard.io/fetch/',
      'https://proxy.cors.sh/',
      'https://cors.bridged.cc/',
      'https://yacdn.org/proxy/'
    ];
    
    for (let i = 0; i < proxies.length; i++) {
      try {
        const proxy = proxies[i];
        const proxyUrl = proxy + encodeURIComponent(url);
        diagnostics.push(`測試代理 ${i + 1}: ${proxy}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'text/plain, application/vnd.apple.mpegurl, audio/mpegurl, */*'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          diagnostics.push(`✅ 代理 ${i + 1} 成功`);
          return { success: true, method: `proxy-${i}`, response, errors, diagnostics };
        } else {
          errors.push(`代理 ${i + 1}: HTTP ${response.status}`);
        }
      } catch (error) {
        errors.push(`代理 ${i + 1} 失敗: ${error}`);
      }
    }
    
    // 方法4: 使用 XMLHttpRequest
    try {
      diagnostics.push('測試方法4: XMLHttpRequest');
      const response = await this.fetchWithXHR(url);
      diagnostics.push('✅ XMLHttpRequest 成功');
      return { success: true, method: 'xhr', response, errors, diagnostics };
    } catch (error) {
      errors.push(`XMLHttpRequest 失敗: ${error}`);
    }
    
    // 方法5: 嘗試不同的 URL 編碼
    if (url.match(/[\u4e00-\u9fff]/)) {
      diagnostics.push('檢測到中文字符，嘗試不同編碼方式');
      
      const encodings = [
        encodeURI(url),
        url.replace(/[\u4e00-\u9fff]/g, char => encodeURIComponent(char)),
        encodeURIComponent(url)
      ];
      
      for (let i = 0; i < encodings.length; i++) {
        try {
          const encodedUrl = encodings[i];
          diagnostics.push(`測試編碼 ${i + 1}: ${encodedUrl.substring(0, 50)}...`);
          
          const response = await fetch(encodedUrl, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
          });
          
          if (response.ok) {
            diagnostics.push(`✅ 編碼 ${i + 1} 成功`);
            return { success: true, method: `encoding-${i}`, response, errors, diagnostics };
          }
        } catch (error) {
          errors.push(`編碼 ${i + 1} 失敗: ${error}`);
        }
      }
    }
    
    diagnostics.push('❌ 所有方法都失敗');
    return { success: false, errors, diagnostics };
  }
  
  // 使用 XMLHttpRequest 的方法
  private static fetchWithXHR(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // 創建一個模擬的 Response 對象
          const response = new Response(xhr.responseText, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: new Headers()
          });
          resolve(response);
        } else {
          reject(new Error(`XHR HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };
      
      xhr.onerror = () => reject(new Error('XHR Network Error'));
      xhr.ontimeout = () => reject(new Error('XHR Timeout'));
      
      xhr.open('GET', url, true);
      xhr.timeout = 15000;
      xhr.setRequestHeader('Accept', 'text/plain, application/vnd.apple.mpegurl, audio/mpegurl, */*');
      
      try {
        xhr.send();
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 網路連接診斷
  static async diagnoseConnection(): Promise<{
    online: boolean;
    dns: boolean;
    cors: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    
    // 檢查基本網路連接
    const online = navigator.onLine;
    details.push(`網路狀態: ${online ? '在線' : '離線'}`);
    
    // 測試 DNS 解析
    let dns = false;
    try {
      await fetch('https://dns.google/resolve?name=google.com&type=A', {
        method: 'GET',
        mode: 'cors'
      });
      dns = true;
      details.push('DNS 解析: ✅ 正常');
    } catch {
      details.push('DNS 解析: ❌ 失敗');
    }
    
    // 測試 CORS 支持
    let cors = false;
    try {
      await fetch('https://httpbin.org/get', {
        method: 'GET',
        mode: 'cors'
      });
      cors = true;
      details.push('CORS 支持: ✅ 正常');
    } catch {
      details.push('CORS 支持: ❌ 受限');
    }
    
    return { online, dns, cors, details };
  }
  
  // 生成診斷報告
  static generateReport(testResult: any, connectionDiag: any): string {
    let report = '🔍 網路診斷報告\n\n';
    
    report += '📶 連接狀態:\n';
    connectionDiag.details.forEach((detail: string) => {
      report += `  ${detail}\n`;
    });
    
    report += '\n📋 測試結果:\n';
    if (testResult.success) {
      report += `  ✅ 成功使用方法: ${testResult.method}\n`;
    } else {
      report += '  ❌ 所有方法均失敗\n';
    }
    
    report += '\n🔧 診斷日誌:\n';
    testResult.diagnostics.forEach((log: string) => {
      report += `  ${log}\n`;
    });
    
    if (testResult.errors.length > 0) {
      report += '\n❌ 錯誤記錄:\n';
      testResult.errors.forEach((error: string) => {
        report += `  ${error}\n`;
      });
    }
    
    report += '\n💡 建議解決方案:\n';
    if (!connectionDiag.online) {
      report += '  1. 檢查網路連接\n';
    }
    if (!connectionDiag.dns) {
      report += '  2. 檢查 DNS 設置\n';
    }
    if (!connectionDiag.cors) {
      report += '  3. 使用 CORS 代理服務\n';
    }
    if (testResult.errors.some((e: string) => e.includes('certificate'))) {
      report += '  4. 檢查 SSL 憑證\n';
    }
    
    return report;
  }
} 