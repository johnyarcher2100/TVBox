export interface Channel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  category?: string;
  rating: number;
  created_at?: string;
  updated_at?: string;
}export interface PlaylistData {
  id: string;
  name: string;
  url: string;
  format: 'm3u' | 'm3u8' | 'json' | 'txt';
  channels_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserRating {
  id: string;
  channel_id: string;
  user_id: string;
  rating: 'like' | 'dislike';
  created_at: string;
}

export interface BroadcastMessage {
  id: string;
  content: string;
  target_level: 1 | 2 | 3;
  message_type: 'text' | 'icon';
  schedule_time?: string;
  interval_minutes?: number;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
}export interface ActivationCode {
  id: string;
  code: string;
  user_level: 1 | 2 | 3;
  is_used: boolean;
  used_by?: string;
  expires_at: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  activation_code?: string;
  user_level: 1 | 2 | 3;
  expires_at?: string;
  created_at: string;
}

export interface PlayerState {
  isPlaying: boolean;
  currentChannel: Channel | null;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  quality: string;
  playbackError?: string;
}

export interface CORSMethod {
  name: string;
  url: string;
  accessible: boolean;
  method: string;
}