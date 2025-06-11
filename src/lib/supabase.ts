import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { UserLevel } from '@/types'

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

  async getNotificationsByUserLevel(userLevel: number) {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('is_active', true)
      .contains('target_levels', [userLevel])
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data?.filter(notification => {
      // 雙重檢查過期時間
      if (!notification.expires_at) return true
      return new Date(notification.expires_at) > new Date()
    }) || []
  },

  async getActiveTextNotifications(userLevel: number) {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('type', 'text')
      .eq('is_active', true)
      .contains('target_levels', [userLevel])
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data?.filter(notification => {
      if (!notification.expires_at) return true
      return new Date(notification.expires_at) > new Date()
    }) || []
  },

  async getActiveImageNotifications(userLevel: number) {
    const { data, error } = await supabase
      .from(TABLES.NOTIFICATIONS)
      .select('*')
      .eq('type', 'image')
      .eq('is_active', true)
      .contains('target_levels', [userLevel])
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1) // 圖示推播一次只顯示一個
    
    if (error) throw error
    return data?.filter(notification => {
      if (!notification.expires_at) return true
      return new Date(notification.expires_at) > new Date()
    }) || []
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

  async markNotificationAsExpired(id: string) {
    try {
      const { error } = await supabase
        .from(TABLES.NOTIFICATIONS)
        .update({ 
          is_active: false,
          expires_at: new Date().toISOString()
        })
        .eq('id', id)
      
      if (error) {
        console.error('標記推播為過期失敗:', error)
        throw error
      }
      
      console.log(`推播已標記為過期: ${id}`)
    } catch (error) {
      console.error('標記推播為過期錯誤:', error)
    }
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

  // 推播隊列管理
  async getQueuedNotifications(userLevel: UserLevel) {
    try {
      const now = new Date().toISOString()
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)
        .contains('target_levels', [userLevel])
        .or(`schedule_time.lte.${now},schedule_time.is.null`)
        .or(`expires_at.gt.${now},expires_at.is.null`)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('獲取排隊推播失敗:', error)
        return []
      }

      // 進一步過濾有效的推播
      const validNotifications = (data || []).filter(notification => {
        // 檢查是否已過期
        if (notification.expires_at) {
          const expiresAt = new Date(notification.expires_at)
          if (expiresAt <= new Date()) {
            console.log(`推播已過期，自動停用: ${notification.content} (ID: ${notification.id})`)
            // 異步停用過期推播
            this.markNotificationAsExpired(notification.id)
            return false
          }
        }

        // 檢查重複推播是否已完成
        if (notification.repeat_count && notification.repeat_interval_seconds) {
          const sentCount = notification.sent_count || 0
          if (sentCount >= notification.repeat_count) {
            console.log(`重複推播已完成，自動停用: ${notification.content} (ID: ${notification.id})`)
            // 異步停用已完成的重複推播
            this.updateNotification(notification.id, { is_active: false })
            return false
          }
        }

        return true
      })

      console.log(`獲取到 ${validNotifications.length} 個有效推播，用戶等級: ${userLevel}`)
      return validNotifications
    } catch (error) {
      console.error('獲取排隊推播錯誤:', error)
      return []
    }
  },

  async updateNotificationSentCount(id: string) {
    try {
      // 先獲取當前推播的完整資訊
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('獲取推播資訊失敗:', fetchError)
        return false
      }

      const newSentCount = (notification.sent_count || 0) + 1
      
      // 判斷推播是否應該停用
      let shouldDeactivate = false
      
      if (notification.repeat_count && notification.repeat_interval_seconds) {
        // 重複推播：當發送次數達到設定次數時停用
        shouldDeactivate = newSentCount >= notification.repeat_count
      } else if (notification.interval_seconds) {
        // 間隔推播：當過期時間到了才停用，否則繼續
        if (notification.expires_at) {
          const now = new Date()
          const expiresAt = new Date(notification.expires_at)
          shouldDeactivate = now >= expiresAt
        }
        // 沒有過期時間的間隔推播持續運行
      } else {
        // 一次性推播（立即推播、定時推播）：播放完成後立即停用
        shouldDeactivate = true
      }

      // 更新發送次數和狀態
      const { error } = await supabase
        .from('notifications')
        .update({
          sent_count: newSentCount,
          is_active: !shouldDeactivate
        })
        .eq('id', id)

      if (error) {
        console.error('更新推播發送次數失敗:', error)
        return false
      }

      // 記錄推播完成狀態
      if (shouldDeactivate) {
        console.log(`推播已完成並停用: ${notification.content} (ID: ${id})`)
      } else {
        console.log(`推播已發送，繼續運行: ${notification.content} (ID: ${id}), 發送次數: ${newSentCount}`)
      }

      return true
    } catch (error) {
      console.error('更新推播發送次數錯誤:', error)
      return false
    }
  },

  async getNextScheduledNotification(id: string) {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error || !notification) {
        return null
      }

      // 如果是重複推播，計算下次推播時間
      if (notification.repeat_interval_seconds && notification.repeat_count) {
        const currentSentCount = notification.sent_count || 0
        if (currentSentCount < notification.repeat_count) {
          const startTime = new Date(notification.schedule_time)
          const nextTime = new Date(startTime.getTime() + (currentSentCount * notification.repeat_interval_seconds * 1000))
          
          return {
            ...notification,
            next_scheduled_time: nextTime.toISOString()
          }
        }
      }

      return notification
    } catch (error) {
      console.error('獲取下次排程推播錯誤:', error)
      return null
    }
  },

  // 資料庫結構檢查
  async checkNotificationTableStructure() {
    try {
      const { error } = await supabase
        .from('notifications')
        .select('repeat_interval_seconds, repeat_count, sent_count')
        .limit(1)

      if (error) {
        console.log('新推播欄位不存在:', error.message)
        return {
          hasNewFields: false,
          error: error.message
        }
      }

      return {
        hasNewFields: true,
        error: null
      }
    } catch (error) {
      console.error('檢查資料庫結構失敗:', error)
      return {
        hasNewFields: false,
        error: (error as Error).message
      }
    }
  }
} 