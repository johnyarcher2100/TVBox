import { create } from 'zustand';
import { Channel, UserSession, BroadcastMessage, PlaylistData } from '@/types';

interface AppState {
  // 用戶狀態
  userSession: UserSession | null;
  setUserSession: (session: UserSession | null) => void;
  
  // 頻道相關
  channels: Channel[];
  currentChannel: Channel | null;
  setChannels: (channels: Channel[]) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  updateChannelRating: (channelId: string, newRating: number) => void;
  
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

export const useStore = create<AppState>((set, get) => ({
  // 初始狀態
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
  setUserSession: (session) => set({ userSession: session }),
  
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
  }))
}));