import { supabase } from '@/lib/supabase';

export class ActivationCodeManager {
  // 生成管理者啟動碼 (1-10)
  static async generateAdminCodes(): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 1; i <= 10; i++) {
      const code = this.generateRandomCode();
      codes.push(code);
      
      await supabase
        .from('activation_codes')
        .insert({
          code: code,
          user_level: 3,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return codes;
  }

  // 生成一般用戶啟動碼 (11-500)
  static async generateUserCodes(): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 11; i <= 500; i++) {
      const code = this.generateRandomCode();
      codes.push(code);
      
      await supabase
        .from('activation_codes')
        .insert({
          code: code,
          user_level: 2,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return codes;
  }

  // 生成8位隨機英數字碼
  private static generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 檢查啟動碼是否有效
  static async validateCode(code: string): Promise<{
    valid: boolean;
    userLevel?: number;
    expiresAt?: string;
  }> {
    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return { valid: false };
    }

    return {
      valid: true,
      userLevel: data.user_level,
      expiresAt: data.expires_at
    };
  }

  // 使用啟動碼
  static async useCode(code: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('activation_codes')
      .update({ 
        is_used: true, 
        used_by: userId 
      })
      .eq('code', code.toUpperCase());

    return !error;
  }

  // 獲取所有未使用的啟動碼統計
  static async getCodeStats(): Promise<{
    total: number;
    admin: number;
    user: number;
    used: number;
  }> {
    const { data, error } = await supabase
      .from('activation_codes')
      .select('user_level, is_used');

    if (error || !data) {
      return { total: 0, admin: 0, user: 0, used: 0 };
    }

    const stats = data.reduce((acc, code) => {
      acc.total++;
      if (code.is_used) {
        acc.used++;
      } else {
        if (code.user_level === 3) {
          acc.admin++;
        } else {
          acc.user++;
        }
      }
      return acc;
    }, { total: 0, admin: 0, user: 0, used: 0 });

    return stats;
  }
}