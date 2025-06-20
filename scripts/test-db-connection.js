// 簡單測試 Supabase 連接
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mfutugsqbpwxdwfsnnhi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mdXR1Z3NxYnB3eGR3ZnNubmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyNjIxODgsImV4cCI6MjA2NDgzODE4OH0.lbM5tsuNjmJWKEjldSkdtm9VVysH-SvHqI650673MLc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔄 測試 Supabase 連接...');
    
    // 測試啟動碼表
    const { data: codes, error: codesError } = await supabase
      .from('activation_codes')
      .select('*')
      .limit(3);
    
    if (codesError) {
      console.error('❌ 啟動碼表查詢失敗:', codesError.message);
    } else {
      console.log('✅ 啟動碼表連接成功，找到', codes.length, '條記錄');
    }
    
    // 測試頻道表
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('*')
      .limit(3);
    
    if (channelsError) {
      console.error('❌ 頻道表查詢失敗:', channelsError.message);
    } else {
      console.log('✅ 頻道表連接成功，找到', channels.length, '條記錄');
    }
    
    console.log('🎉 資料庫連接測試完成！');
    
  } catch (error) {
    console.error('💥 連接測試失敗:', error.message);
  }
}

testConnection();