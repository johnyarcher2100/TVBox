import { supabase } from '@/lib/supabase';
import { Channel, UserRating, BroadcastMessage, ActivationCode, UserSession } from '@/types';

export class DatabaseOperations {
  // 頻道相關操作
  static async getChannels(): Promise<Channel[]> {
    try {
      console.log('正在從資料庫獲取頻道...');
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('rating', { ascending: false })
        .limit(3000);
      
      if (error) {
        console.error('資料庫查詢錯誤:', error);
        throw new Error(`資料庫查詢失敗: ${error.message}`);
      }
      
      console.log(`從資料庫獲取到 ${data?.length || 0} 個頻道`);
      return data || [];
    } catch (error) {
      console.error('getChannels 錯誤:', error);
      // 如果是資料庫連接問題，返回空陣列而不是拋出錯誤
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('connection')
      )) {
        console.log('資料庫連接失敗，返回空陣列');
        return [];
      }
      throw error;
    }
  }

  static async saveChannels(channels: Channel[]): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .upsert(channels);
    
    if (error) throw error;
  }

  static async updateChannelRating(channelId: string, newRating: number): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .update({ rating: newRating })
      .eq('id', channelId);
    
    if (error) throw error;
  }

  static async deleteChannelsWithLowRating(threshold = 51): Promise<void> {
    const { error } = await supabase
      .from('channels')
      .delete()
      .lt('rating', threshold);
    
    if (error) throw error;
  }

  static async getChannelCount(): Promise<number> {
    const { count, error } = await supabase
      .from('channels')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count || 0;
  }

  static async getChannelsByRating(minRating: number): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .gte('rating', minRating)
      .order('rating', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // 用戶評分操作
  static async getUserRating(channelId: string, userId: string): Promise<UserRating | null> {
    const { data, error } = await supabase
      .from('user_ratings')
      .select('*')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async saveUserRating(rating: Omit<UserRating, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('user_ratings')
      .upsert({
        ...rating,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }

  // 推播訊息操作
  static async getBroadcastMessages(userLevel: number): Promise<BroadcastMessage[]> {
    const { data, error } = await supabase
      .from('broadcast_messages')
      .select('*')
      .lte('target_level', userLevel)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    
    if (error) throw error;
    return data || [];
  }

  static async saveBroadcastMessage(message: Omit<BroadcastMessage, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('broadcast_messages')
      .insert({
        ...message,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }

  // 啟動碼操作
  static async validateActivationCode(code: string): Promise<ActivationCode | null> {
    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async useActivationCode(code: string, userId: string): Promise<void> {
    // 移除 is_used 標記，允許重複使用
    // 只記錄使用歷史，不限制使用次數
    const { error } = await supabase
      .from('activation_code_usage')
      .insert({
        code: code.toUpperCase(),
        user_id: userId,
        used_at: new Date().toISOString()
      });
    
    if (error) console.warn('記錄啟動碼使用歷史失敗:', error);
  }

  // 用戶會話操作
  static async saveUserSession(session: Omit<UserSession, 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('user_sessions')
      .upsert({
        ...session,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }

  static async getUserSession(sessionId: string): Promise<UserSession | null> {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}