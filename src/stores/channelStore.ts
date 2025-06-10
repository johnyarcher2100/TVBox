import { create } from 'zustand'
import { dbHelpers } from '@/lib/supabase'
import type { Channel, Playlist, ChannelStore } from '@/types'

export const useChannelStore = create<ChannelStore>((set, get) => ({
  channels: [],
  currentChannel: null,
  playlists: [],
  loading: false,
  error: null,

  loadChannels: async () => {
    set({ loading: true, error: null })
    try {
      const channels = await dbHelpers.getChannels()
      set({ channels: channels as Channel[], loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  addPlaylist: async (url: string, format?: string) => {
    set({ loading: true, error: null })
    try {
      // 自動辨識格式
      const detectedFormat = format || detectPlaylistFormat(url)
      
      const playlistData = {
        name: `播放清單 ${new Date().toLocaleString()}`,
        url,
        format: detectedFormat
      }
      
      await dbHelpers.addPlaylist(playlistData)
      const playlists = await dbHelpers.getPlaylists()
      
      set({ playlists: playlists as Playlist[] })
      
      // 解析播放清單並添加頻道
      await parsePlaylist(url, detectedFormat)
      
      // 重新載入所有頻道以更新顯示
      const channels = await dbHelpers.getChannels()
      set({ channels: channels as Channel[], loading: false })
      
      console.log(`播放清單添加完成，共載入 ${channels.length} 個頻道`)
      
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error // 重新拋出錯誤以便 UI 能捕獲
    }
  },

  rateChannel: async (channelId: string, isLike: boolean) => {
    try {
      const { channels } = get()
      const channel = channels.find(c => c.id === channelId)
      
      if (!channel) {
        throw new Error('找不到指定的頻道')
      }
      
      // 檢查評分是否已達極限
      if (!isLike && channel.rating <= 0) {
        throw new Error('該頻道評分已經是最低分，無法再降低')
      }
      
      if (isLike && channel.rating >= 9999) {
        throw new Error('該頻道評分已經是最高分，無法再提高')
      }
      
      const newVotes = { ...channel.votes }
      let newRating = channel.rating
      
      if (isLike) {
        newVotes.likes += 1
        newRating += 5
      } else {
        newVotes.dislikes += 1
        newRating -= 19
      }
      
      // 確保評分範圍
      newRating = Math.max(0, Math.min(9999, newRating))
      
      // 更新資料庫
      try {
        await dbHelpers.updateChannelRating(channelId, newRating, newVotes)
      } catch (dbError) {
        console.error('資料庫更新失敗:', dbError)
        throw new Error(`評分保存失敗：${(dbError as Error).message}`)
      }
      
      // 更新本地狀態
      const updatedChannels = channels.map(c => 
        c.id === channelId 
          ? { ...c, rating: newRating, votes: newVotes }
          : c
      ).sort((a, b) => b.rating - a.rating) // 自動排序
      
      set({ channels: updatedChannels })
      
      // 如果是當前播放的頻道，也更新 currentChannel
      const { currentChannel } = get()
      if (currentChannel && currentChannel.id === channelId) {
        set({ currentChannel: { ...currentChannel, rating: newRating, votes: newVotes } })
      }
      
      console.log(`頻道 "${channel.name}" 評分更新成功：${channel.rating} → ${newRating}`)
      
      // 自動刪除評分過低的頻道（但不在評分過程中立即刪除，避免用戶困惑）
      if (newRating < 10) {
        console.log(`頻道 "${channel.name}" 評分過低 (${newRating}分)，將在後台清理時移除`)
      }
      
    } catch (error) {
      console.error('評分失敗:', error)
      set({ error: (error as Error).message })
      throw error // 重新拋出錯誤以便 UI 能捕獲
    }
  },

  deleteChannel: async (channelId: string) => {
    try {
      await dbHelpers.deleteChannel(channelId)
      const { channels } = get()
      const updatedChannels = channels.filter(c => c.id !== channelId)
      set({ channels: updatedChannels })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteChannelsBelowRating: async (minRating: number = 51) => {
    try {
      await dbHelpers.deleteChannelsBelowRating(minRating)
      const { channels } = get()
      const updatedChannels = channels.filter(c => c.rating >= minRating)
      set({ channels: updatedChannels })
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  setCurrentChannel: (channel: Channel) => {
    set({ currentChannel: channel })
  }
}))

// 自動辨識播放清單格式
function detectPlaylistFormat(url: string): string {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('.m3u8') || urlLower.includes('.m3u')) {
    return 'm3u8'
  } else if (urlLower.includes('.json')) {
    return 'json'
  } else if (urlLower.includes('.txt')) {
    return 'txt'
  } else {
    // 預設為 M3U 格式
    return 'm3u8'
  }
}

// 播放清單解析函數
async function parsePlaylist(url: string, format: string) {
  try {
    console.log(`開始解析播放清單: ${url} (格式: ${format})`)

    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors.eu.org/',
    ]

    let content = ''
    let lastError: Error | null = null

    // 1. 嘗試直接獲取
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Direct fetch failed with status: ${response.status}`)
      content = await response.text()
      console.log('Direct fetch successful.')
    } catch (error) {
      lastError = error as Error
      console.warn(`Direct fetch failed: ${lastError.message}. Trying proxies...`)

      // 2. 如果直接獲取失敗，嘗試使用代理
      for (const proxy of proxies) {
        const proxyUrl = `${proxy}${encodeURIComponent(url)}`
        try {
          console.log(`Trying proxy: ${proxy}`)
          const response = await fetch(proxyUrl)
          if (!response.ok) throw new Error(`Proxy fetch failed with status: ${response.status}`)
          content = await response.text()
          console.log(`Proxy fetch successful: ${proxy}`)
          lastError = null // 成功後清除錯誤
          break
        } catch (proxyError) {
          lastError = proxyError as Error
          console.warn(`Proxy ${proxy} failed: ${lastError.message}`)
        }
      }
    }

    if (lastError) {
      console.error('All fetch attempts failed.', lastError)
      throw new Error(`無法載入播放清單，請檢查 URL 或網路連線。最終錯誤：${lastError.message}`)
    }

    if (!content) {
      throw new Error('無法獲取播放清單內容，檔案可能為空。')
    }

    let channels: Omit<Channel, 'id' | 'created_at' | 'updated_at'>[] = []

    switch (format.toLowerCase()) {
      case 'm3u':
      case 'm3u8':
        channels = parseM3U(content)
        break
      case 'json':
        channels = parseJSON(content)
        break
      case 'txt':
        channels = parseTXT(content)
        break
      default:
        throw new Error(`不支援的格式: ${format}`)
    }

    if (channels.length === 0) {
      throw new Error('播放清單中沒有找到有效的頻道，請檢查播放清單格式或內容。')
    }

    console.log(`解析出 ${channels.length} 個頻道，開始添加到資料庫...`)

    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    for (const channel of channels) {
      try {
        if (!channel.name || !channel.url || !channel.url.startsWith('http')) {
          console.warn('Skipping invalid channel:', channel)
          failCount++
          continue
        }
        await dbHelpers.addChannel(channel)
        successCount++
      } catch (e) {
        failCount++
        errors.push((e as Error).message)
      }
    }

    console.log(`頻道添加處理完成。成功: ${successCount}, 失敗: ${failCount}`)
    if (failCount > 0 && successCount === 0) {
      console.error('添加頻道失敗:', errors)
      throw new Error(`無法添加任何頻道，請檢查頻道格式。`)
    }

  } catch (error) {
    console.error('解析或添加播放清單時發生錯誤:', error)
    throw error
  }
}

// M3U 格式解析
function parseM3U(content: string): Omit<Channel, 'id' | 'created_at' | 'updated_at'>[] {
  const channels: Omit<Channel, 'id' | 'created_at' | 'updated_at'>[] = []
  const lines = content.split(/\r?\n/)

  let currentChannel: Partial<Omit<Channel, 'id' | 'created_at' | 'updated_at'>> = {}

  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      const info = line.split(',')
      const name = info[1] ? info[1].trim() : '未知頻道'
      
      currentChannel = { name }

      const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
      if (tvgLogoMatch) currentChannel.logo = tvgLogoMatch[1];

      const groupTitleMatch = line.match(/group-title="([^"]*)"/);
      if (groupTitleMatch) currentChannel.category = groupTitleMatch[1];

    } else if (line.trim() && !line.startsWith('#')) {
      currentChannel.url = line.trim()
      if (currentChannel.name && currentChannel.url) {
        channels.push({
          name: currentChannel.name,
          url: currentChannel.url,
          logo: currentChannel.logo || '',
          category: currentChannel.category || '未分類',
          rating: 50,
          votes: { likes: 0, dislikes: 0 }
        })
      }
      currentChannel = {}
    }
  }
  return channels
}

// JSON 格式解析
function parseJSON(content: string): Omit<Channel, 'id' | 'created_at' | 'updated_at'>[] {
  try {
    const data = JSON.parse(content)
    const source = Array.isArray(data) ? data : (data.channels && Array.isArray(data.channels)) ? data.channels : []
    
    return source.map((item: any) => ({
      name: item.name || '未知頻道',
      url: item.url,
      logo: item.logo || '',
      category: item.category || item.group || '未分類',
      rating: item.rating || 50,
      votes: item.votes || { likes: 0, dislikes: 0 }
    })).filter((c: any) => c.url)

  } catch (error) {
    console.error('JSON 解析失敗:', error)
    return []
  }
}

// TXT 格式解析
function parseTXT(content: string): Omit<Channel, 'id' | 'created_at' | 'updated_at'>[] {
  return content.split(/\r?\n/).reduce((acc: Omit<Channel, 'id' | 'created_at' | 'updated_at'>[], line) => {
    if (line.trim()) {
      const parts = line.split(',')
      if (parts.length >= 2 && parts[1].trim().startsWith('http')) {
        acc.push({
          name: parts[0].trim(),
          url: parts[1].trim(),
          logo: '',
          category: '未分類',
          rating: 50,
          votes: { likes: 0, dislikes: 0 }
        })
      }
    }
    return acc
  }, [])
} 