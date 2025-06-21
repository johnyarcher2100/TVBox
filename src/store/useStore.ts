import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Channel, UserSession, BroadcastMessage, PlaylistData } from '@/types';

interface AppState {
  // 用戶狀態
  userSession: UserSession | null;
  setUserSession: (session: UserSession | null) => void;
  initializeUserSession: () => void;
  logout: () => void;
  
  // 頻道相關
  channels: Channel[];
  currentChannel: Channel | null;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  updateChannelRating: (channelId: string, newRating: number) => void;
  deleteChannelsWithLowRating: () => void;
  
  // 播放清單
  playlists: PlaylistData[];
  setPlaylists: (playlists: PlaylistData[]) => void;
  addPlaylist: (playlist: PlaylistData) => void;
  
  // 推播訊息
  broadcastMessages: BroadcastMessage[];
  setBroadcastMessages: (messages: BroadcastMessage[]) => void;
  addBroadcastMessage: (message: BroadcastMessage) => void;
  
  // UI 狀態
  sidebarTransparency: number;
  setSidebarTransparency: (value: number) => void;
  showChannelList: boolean;
  setShowChannelList: (show: boolean) => void;
  
  // 播放器狀態
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  setPlayerState: (state: {
    isPlaying?: boolean;
    volume?: number;
    isMuted?: boolean;
  }) => void;
}

// 手動實作 localStorage 持久化
const persistUserSession = {
  getItem: (): UserSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem('abuji-user-session');
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  setItem: (session: UserSession | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem('abuji-user-session', JSON.stringify(session));
      } else {
        localStorage.removeItem('abuji-user-session');
      }
    } catch {
      // localStorage 操作失敗時靜默處理
    }
  }
};

export const useStore = create<AppState>((set, get) => ({
  // 初始狀態 - 確保服務器端和客戶端一致
  userSession: null,
  channels: [],
  currentChannel: null,
  playlists: [],
  broadcastMessages: [],
  sidebarTransparency: 80,
  showChannelList: true,
  isPlaying: false,
  volume: 100,
  isMuted: false,
  
  // 用戶狀態管理
  setUserSession: (session) => {
    set({ userSession: session });
    persistUserSession.setItem(session);
  },
  
  // 初始化用戶會話（僅在客戶端）
  initializeUserSession: () => {
    if (typeof window !== 'undefined') {
      const savedSession = persistUserSession.getItem();
      if (savedSession) {
        // 檢查會話是否過期
        const now = new Date().getTime();
        const expiresAt = savedSession.expires_at ? new Date(savedSession.expires_at).getTime() : now + 1000;
        
        if (expiresAt > now) {
          set({ userSession: savedSession });
        } else {
          // 會話已過期，清除
          persistUserSession.setItem(null);
        }
      }
    }
  },
  
  // 頻道管理
  setChannels: (channels) => set({ channels }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),
  updateChannelRating: (channelId, newRating) => set((state) => ({
    channels: state.channels.map(channel =>
      channel.id === channelId ? { ...channel, rating: newRating } : channel
    )
  })),
  
  // 播放清單管理
  setPlaylists: (playlists) => set({ playlists }),
  addPlaylist: (playlist) => set((state) => ({
    playlists: [...state.playlists, playlist]
  })),
  
  // 推播訊息管理
  setBroadcastMessages: (messages) => set({ broadcastMessages: messages }),
  addBroadcastMessage: (message) => set((state) => ({
    broadcastMessages: [...state.broadcastMessages, message]
  })),
  
  // UI 狀態管理
  setSidebarTransparency: (value) => set({ sidebarTransparency: value }),
  setShowChannelList: (show) => set({ showChannelList: show }),
  
  // 播放器狀態管理
  setPlayerState: (newState) => set((state) => ({
    ...state,
    ...newState
  })),
  
  // 登出功能
  logout: () => {
    persistUserSession.setItem(null);
    set({ 
      userSession: null, 
      channels: [], 
      currentChannel: null,
      broadcastMessages: []
    });
  },
  
  // 刪除低評分頻道（僅限等級2以上用戶）
  deleteChannelsWithLowRating: () => {
    const { userSession, channels } = get();
    if (userSession && userSession.user_level >= 2) {
      const filteredChannels = channels.filter(channel => channel.rating >= 51);
      set({ channels: filteredChannels });
    }
  }
}));