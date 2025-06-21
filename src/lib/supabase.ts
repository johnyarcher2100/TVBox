import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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

// 測試資料庫連接
export async function testDatabaseConnection() {
  try {
    console.log('測試資料庫連接...');
    const { data, error } = await supabase
      .from('channels')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('資料庫連接測試失敗:', error);
      return false;
    }
    
    console.log('資料庫連接測試成功');
    return true;
  } catch (error) {
    console.error('資料庫連接測試異常:', error);
    return false;
  }
}

// 初始化資料庫表格的函數
export async function initializeDatabase() {
  try {
    // 先測試連接
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      console.warn('資料庫連接失敗，跳過初始化');
      return false;
    }

    // 頻道表格
    const { error: channelsError } = await supabase.rpc('create_channels_table');
    if (channelsError) console.warn('頻道表格可能已存在:', channelsError.message);
    
    // 播放清單表格
    const { error: playlistsError } = await supabase.rpc('create_playlists_table');
    if (playlistsError) console.warn('播放清單表格可能已存在:', playlistsError.message);
    
    // 用戶評分表格
    const { error: ratingsError } = await supabase.rpc('create_user_ratings_table');
    if (ratingsError) console.warn('評分表格可能已存在:', ratingsError.message);
    
    return true;
  } catch (error) {
    console.error('資料庫初始化失敗:', error);
    return false;
  }
}