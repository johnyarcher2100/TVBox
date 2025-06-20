import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfutugsqbpwxdwfsnnhi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXR1Z3NxYnB3eGR3ZnNubmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjIxODgsImV4cCI6MjA2NDgzODE4OH0.lbM5tsuNjmJWKEjldSkdtm9VVysH-SvHqI650673MLc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 資料庫表格結構
export const tables = {
  channels: 'channels',
  playlists: 'playlists', 
  user_ratings: 'user_ratings',
  broadcast_messages: 'broadcast_messages',
  activation_codes: 'activation_codes',
  user_sessions: 'user_sessions'
} as const;

// 初始化資料庫表格的函數
export async function initializeDatabase() {
  // 頻道表格
  const { error: channelsError } = await supabase.rpc('create_channels_table');
  if (channelsError) console.warn('頻道表格可能已存在:', channelsError.message);
  
  // 播放清單表格
  const { error: playlistsError } = await supabase.rpc('create_playlists_table');
  if (playlistsError) console.warn('播放清單表格可能已存在:', playlistsError.message);
  
  // 用戶評分表格
  const { error: ratingsError } = await supabase.rpc('create_user_ratings_table');
  if (ratingsError) console.warn('評分表格可能已存在:', ratingsError.message);
}