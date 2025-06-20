import { supabase } from '@/lib/supabase';
import { Channel, UserRating, BroadcastMessage, ActivationCode, UserSession } from '@/types';

export class DatabaseOperations {
  // 頻道相關操作
  static async getChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('rating', { ascending: false })
      .limit(500);
    
    if (error) throw error;
    return data || [];
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
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async useActivationCode(code: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('activation_codes')
      .update({ 
        is_used: true, 
        used_by: userId 
      })
      .eq('code', code.toUpperCase());
    
    if (error) throw error;
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