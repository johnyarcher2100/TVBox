import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase 連線配置 - 已驗證正確
const supabaseUrl = 'https://mfutugsqbpwxdwfsnnhi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXR1Z3NxYnB3eGR3ZnNubmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjIxODgsImV4cCI6MjA2NDgzODE4OH0.lbM5tsuNjmJWKEjldSkdtm9VVysH-SvHqI650673MLc'

// 驗證連線字串
console.log('🔗 Supabase 配置:')
console.log(`📍 URL: ${supabaseUrl}`)
console.log(`🔑 Key: ${supabaseAnonKey.substring(0, 20)}...`)

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 資料庫表格名稱常數
export const TABLES = {
  CHANNELS: 'channels',
  PLAYLISTS: 'playlists',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  ACTIVATION_CODES: 'activation_codes',
  CHANNEL_VOTES: 'channel_votes'
} as const

// 資料庫輔助函數
export const dbHelpers = {
  // 頻道相關
  async getChannels() {
    try {
      const { data, error } = await supabase
        .from(TABLES.CHANNELS)
        .select('*')
        .order('rating', { ascending: false })
        .limit(500)
      
      if (error) {
        console.error('獲取頻道失敗:', error);
        throw error;
      }
      
      console.log(`成功獲取 ${data?.length || 0} 個頻道`);
      return data || [];
    } catch (error) {
      console.error('獲取頻道錯誤:', error);
      throw error;
    }
  },

  async addChannel(channel: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('準備添加頻道:', { 
        name: channel.name, 
        url: channel.url?.substring(0, 50) + '...', 
        category: channel.category 
      });
      
      const { data, error } = await supabase
        .from(TABLES.CHANNELS)
        .insert({
          name: channel.name,
          url: channel.url,
          logo: channel.logo || null,
          category: channel.category || null,
          rating: channel.rating || 50,
          votes: channel.votes || { likes: 0, dislikes: 0 }
        })
        .select()
        .single()
      
      if (error) {
        console.error('添加頻道失敗:', error);
        throw error;
      }
      
      console.log('成功添加頻道:', data?.name);
      return data;
    } catch (error) {
      console.error('添加頻道錯誤:', error);
      throw error;
    }
  },

  async updateChannelRating(channelId: string, newRating: number, votes: any) {
    const { data, error } = await supabase
      .from(TABLES.CHANNELS)
      .update({ 
        rating: newRating, 
        votes,
        updated_at: new Date().toISOString()
      })
      .eq('id', channelId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteChannel(channelId: string) {
    const { error } = await supabase
      .from(TABLES.CHANNELS)
      .delete()
      .eq('id', channelId)
    
    if (error) throw error
  },

  async deleteChannelsBelowRating(minRating: number) {
    const { error } = await supabase
      .from(TABLES.CHANNELS)
      .delete()
      .lt('rating', minRating)
    
    if (error) throw error
  },

  // 播放清單相關
  async getPlaylists() {
    const { data, error } = await supabase
      .from(TABLES.PLAYLISTS)
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async addPlaylist(playlist: Omit<any, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from(TABLES.PLAYLISTS)
      .insert(playlist)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 用戶相關
  async createUser(userData: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert(userData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserByActivationCode(code: string) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('activation_code', code)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // 啟動碼相關
  async getActivationCode(code: string) {
    const { data, error } = await supabase
      .from(TABLES.ACTIVATION_CODES)
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async markActivationCodeAsUsed(code: string, userId: string) {
    const { data, error } = await supabase
      .from(TABLES.ACTIVATION_CODES)
      .update({
        is_used: true,
        used_by: userId,
        used_at: new Date().toISOString()
      })
      .eq('code', code)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 通知相關
  async getNotifications() {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async createNotification(notification: Omit<any, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .insert(notification)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateNotification(id: string, updates: any) {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteNotification(id: string) {
    const { error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // 測試連線和權限
  async testConnection() {
    console.log('🔗 測試 Supabase 連線...')
    
    try {
      // 測試 1: 基本連線測試
      console.log('📡 測試基本連線...')
      const { error: healthError } = await supabase
        .from('channels')
        .select('count(*)')
        .limit(1)
      
      if (healthError) {
        console.error('❌ 基本連線失敗:', healthError)
        throw new Error(`連線錯誤: ${healthError.message}`)
      }
      
      console.log('✅ 基本連線成功')
      
      // 測試 2: 讀取權限
      console.log('📖 測試讀取權限...')
      const { data: channels, error: readError } = await supabase
        .from('channels')
        .select('*')
        .limit(5)
      
      if (readError) {
        console.error('❌ 讀取權限失敗:', readError)
        throw new Error(`讀取錯誤: ${readError.message}`)
      }
      
      console.log(`✅ 讀取權限正常，找到 ${channels?.length || 0} 個頻道`)
      
      // 測試 3: 插入權限
      console.log('✏️ 測試插入權限...')
      const testChannel = {
        name: 'TEST_CHANNEL_' + Date.now(),
        url: 'https://test.example.com/test.m3u8',
        category: 'test',
        rating: 50,
        votes: { likes: 0, dislikes: 0 }
      }
      
      const { data: insertData, error: insertError } = await supabase
        .from('channels')
        .insert(testChannel)
        .select()
        .single()
      
      if (insertError) {
        console.error('❌ 插入權限失敗:', insertError)
        throw new Error(`插入錯誤: ${insertError.message}`)
      }
      
      console.log('✅ 插入權限正常，測試頻道已創建:', insertData.name)
      
      // 測試 4: 刪除權限（清理測試資料）
      console.log('🗑️ 清理測試資料...')
      const { error: deleteError } = await supabase
        .from('channels')
        .delete()
        .eq('id', insertData.id)
      
      if (deleteError) {
        console.warn('⚠️ 刪除測試資料失敗:', deleteError)
      } else {
        console.log('✅ 測試資料已清理')
      }
      
      return {
        success: true,
        message: '所有測試通過！Supabase 連線和權限正常。',
        details: {
          connection: true,
          read: true,
          insert: true,
          delete: !deleteError
        }
      }
      
    } catch (error) {
      console.error('❌ Supabase 測試失敗:', error)
      return {
        success: false,
        message: (error as Error).message,
        details: null
      }
    }
  },

  // 用戶投票記錄相關
  async getUserVote(channelId: string, userId: string) {
    const { data, error } = await supabase
      .from(TABLES.CHANNEL_VOTES)
      .select('*')
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async addUserVote(channelId: string, userId: string, voteType: 'like' | 'dislike') {
    const { data, error } = await supabase
      .from(TABLES.CHANNEL_VOTES)
      .insert({
        channel_id: channelId,
        user_id: userId,
        vote_type: voteType
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateUserVote(channelId: string, userId: string, voteType: 'like' | 'dislike') {
    const { data, error } = await supabase
      .from(TABLES.CHANNEL_VOTES)
      .update({ vote_type: voteType })
      .eq('channel_id', channelId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
} 