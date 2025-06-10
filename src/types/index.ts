export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  category?: string
  rating: number
  votes: {
    likes: number
    dislikes: number
  }
  created_at: string
  updated_at: string
}

export interface Playlist {
  id: string
  name: string
  url: string
  format: 'm3u' | 'm3u8' | 'json' | 'txt'
  user_id?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  activation_code?: string
  user_level: 1 | 2 | 3  // 1: 免費, 2: 一般, 3: 管理者
  activated_at?: string
  expires_at?: string
  created_at: string
}

export interface Notification {
  id: string
  content: string
  type: 'text' | 'image'
  target_levels: number[]
  is_global: boolean
  schedule_time?: string
  interval_seconds?: number
  is_active: boolean
  expires_at?: string
  image_url?: string
  created_by: string
  created_at: string
}

export interface ActivationCode {
  id: string
  code: string
  user_level: 1 | 2 | 3
  is_used: boolean
  used_by?: string
  used_at?: string
  created_at: string
}

export interface PlayerConfig {
  isLive: boolean
  hasAudio: boolean
  isMute: boolean
  stretch: boolean
  poster?: string
  bufferTime: number
  loadTimeOut: number
  loadTimeReplay: number
  MSE: boolean
  WCS: boolean
  WASM: boolean
  WASMSIMD: boolean
  gpuDecoder: boolean
  webGPU: boolean
  canvasRender: boolean
  debug: boolean
}

export interface UserStore {
  user: User | null
  isAuthenticated: boolean
  login: (activationCode?: string) => Promise<void>
  logout: () => void
}

export interface ChannelStore {
  channels: Channel[]
  currentChannel: Channel | null
  playlists: Playlist[]
  loading: boolean
  error: string | null
  
  loadChannels: () => Promise<void>
  addPlaylist: (url: string, format?: string) => Promise<void>
  rateChannel: (channelId: string, isLike: boolean) => Promise<void>
  deleteChannel: (channelId: string) => Promise<void>
  deleteChannelsBelowRating: (minRating: number) => Promise<void>
  setCurrentChannel: (channel: Channel) => void
}

export interface NotificationStore {
  notifications: Notification[]
  activeNotifications: Notification[]
  loading: boolean
  
  loadNotifications: () => Promise<void>
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>
  updateNotification: (id: string, updates: Partial<Notification>) => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export interface PlayerStore {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  currentTime: number
  duration: number
  
  play: (url: string) => void
  pause: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  seek: (time: number) => void
} 