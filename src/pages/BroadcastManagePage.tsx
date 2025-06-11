import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Notification, NotificationForm, BroadcastType } from '@/types'
import { BROADCAST_TARGETS } from '@/types'
import { 
  Plus, 
  Send, 
  Clock, 
  Repeat, 
  Image, 
  MessageSquare, 
  Users,
  Calendar,
  Archive,
  Trash2,
  Eye,
  EyeOff,
  Edit3
} from 'lucide-react'

// 管理員用戶 UUID
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000'

const BroadcastManagePage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState<NotificationForm>({
    content: '',
    type: 'text',
    broadcast_type: 'global',
    schedule_type: 'immediate'
  })

  // 載入推播清單
  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('載入推播清單失敗:', error)
        return
      }

      setNotifications(data || [])
    } catch (error) {
      console.error('載入推播清單錯誤:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 確保管理員用戶存在
  const ensureAdminUser = async () => {
    try {
      // 檢查管理員用戶是否存在
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', ADMIN_USER_ID)
        .single()

      if (!existingUser) {
        // 建立管理員用戶
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: ADMIN_USER_ID,
            activation_code: 'ADMIN000',
            user_level: 3,
            activated_at: new Date().toISOString(),
            expires_at: '2099-12-31T23:59:59Z'
          })

        if (userError && !userError.message.includes('duplicate key')) {
          console.error('建立管理員用戶失敗:', userError)
        }
      }
    } catch (error) {
      console.error('檢查管理員用戶時發生錯誤:', error)
    }
  }

  useEffect(() => {
    ensureAdminUser()
    loadNotifications()
    
    // 定期清理已完成的推播
    const cleanupInterval = setInterval(cleanupCompletedNotifications, 60000) // 每分鐘檢查一次
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // 清理已完成的推播
  const cleanupCompletedNotifications = async () => {
    try {
      const now = new Date()
      
      // 獲取所有推播
      const { data: allNotifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_active', true)

      if (error) {
        console.error('獲取推播清單失敗:', error)
        return
      }

      let cleanupCount = 0
      
      for (const notification of allNotifications || []) {
        let shouldCleanup = false
        
        // 檢查是否過期
        if (notification.expires_at) {
          const expiresAt = new Date(notification.expires_at)
          if (expiresAt <= now) {
            shouldCleanup = true
          }
        }
        
        // 檢查重複推播是否已完成
        if (notification.repeat_count && notification.repeat_interval_seconds) {
          const sentCount = notification.sent_count || 0
          if (sentCount >= notification.repeat_count) {
            shouldCleanup = true
          }
        }
        
        // 清理已完成的推播
        if (shouldCleanup) {
          await supabase
            .from('notifications')
            .update({ is_active: false })
            .eq('id', notification.id)
          
          cleanupCount++
          console.log(`自動清理已完成推播: ${notification.content} (ID: ${notification.id})`)
        }
      }
      
      if (cleanupCount > 0) {
        console.log(`自動清理完成，共清理 ${cleanupCount} 個推播`)
        // 重新載入推播列表
        await loadNotifications()
      }
    } catch (error) {
      console.error('自動清理推播錯誤:', error)
    }
  }

  // 重置表單
  const resetForm = () => {
    setFormData({
      content: '',
      type: 'text',
      broadcast_type: 'global',
      schedule_type: 'immediate'
    })
    setEditingNotification(null)
    setShowForm(false)
  }

  // 提交推播
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.content.trim()) {
      alert('請輸入推播內容')
      return
    }

    // 驗證重複推播設定
    if (formData.schedule_type === 'repeat') {
      if (!formData.schedule_time) {
        alert('請設定開始時間')
        return
      }
      
      if (!formData.repeat_interval_seconds || formData.repeat_interval_seconds < 10 || formData.repeat_interval_seconds > 86400) {
        alert('請設定有效的間隔時間（10秒-24小時）')
        return
      }
      
      if (!formData.repeat_count || formData.repeat_count < 1 || formData.repeat_count > 100) {
        alert('請設定有效的發送次數（1-100次）')
        return
      }
      
      // 檢查開始時間不能是過去時間
      const startTime = new Date(formData.schedule_time)
      const now = new Date()
      if (startTime <= now) {
        alert('開始時間必須是未來時間')
        return
      }
      
      // 計算總時長，防止設定過長的推播計劃
      const totalDuration = (formData.repeat_count - 1) * formData.repeat_interval_seconds
      const maxDuration = 7 * 24 * 60 * 60 // 7天
      if (totalDuration > maxDuration) {
        alert('推播計劃總時長不能超過7天，請調整間隔時間或發送次數')
        return
      }
    }

    try {
      setIsLoading(true)

      const notificationData: any = {
        content: formData.content.trim(),
        type: formData.type,
        target_levels: BROADCAST_TARGETS[formData.broadcast_type],
        is_global: formData.broadcast_type === 'global',
        schedule_time: ['scheduled', 'repeat'].includes(formData.schedule_type) ? formData.schedule_time : null,
        interval_seconds: formData.schedule_type === 'interval' ? formData.interval_seconds : null,
        expires_at: formData.expires_at || null,
        image_url: formData.type === 'image' ? formData.image_url : null,
        is_active: true,
        created_by: ADMIN_USER_ID
      }

      // 添加重複推播相關欄位
      if (formData.schedule_type === 'repeat') {
        notificationData.repeat_interval_seconds = formData.repeat_interval_seconds
        notificationData.repeat_count = formData.repeat_count
        notificationData.sent_count = 0
      }

      let result
      if (editingNotification) {
        // 更新現有推播
        result = await supabase
          .from('notifications')
          .update(notificationData)
          .eq('id', editingNotification.id)
          .select()
          .single()
      } else {
        // 建立新推播
        result = await supabase
          .from('notifications')
          .insert(notificationData)
          .select()
          .single()
      }

      if (result.error) {
        console.error('推播操作失敗:', result.error)
        
        // 檢查是否為資料庫欄位問題
        if (result.error.message?.includes('column') && result.error.message?.includes('does not exist')) {
          alert('推播操作失敗：資料庫結構需要更新。請執行資料庫遷移腳本 add-repeat-notification-fields.sql')
        } else {
          alert(`推播操作失敗：${result.error.message || '未知錯誤'}`)
        }
        return
      }

      alert(editingNotification ? '推播更新成功！' : '推播建立成功！')
      resetForm()
      loadNotifications()
    } catch (error) {
      console.error('推播操作錯誤:', error)
      alert('推播操作錯誤')
    } finally {
      setIsLoading(false)
    }
  }

  // 批量刪除推播
  const deleteSelectedNotifications = async () => {
    if (selectedIds.size === 0) {
      alert('請先選擇要刪除的推播')
      return
    }

    if (!confirm(`確定要刪除所選的 ${selectedIds.size} 個推播嗎？此操作無法復原。`)) return

    try {
      setIsLoading(true)
      
      // 獲取要刪除的推播資料（用於錯誤恢復）
      const deletedNotifications = notifications.filter(n => selectedIds.has(n.id))
      
      // 立即從本地狀態移除所選項目
      setNotifications(prev => prev.filter(notification => !selectedIds.has(notification.id)))
      
      // 批量從 Supabase 刪除記錄
      console.log(`📡 發送批量刪除請求到 Supabase，IDs:`, Array.from(selectedIds))
      const { error, data } = await supabase
        .from('notifications')
        .delete()
        .in('id', Array.from(selectedIds))
        .select()

      console.log(`📊 Supabase 批量刪除回應:`, { error, data, affectedRows: data?.length || 0 })

      if (error) {
        console.error('❌ 批量刪除推播失敗:', error)
        console.error('錯誤詳情:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // 如果刪除失敗，恢復項目到列表中
        setNotifications(prev => {
          const newList = [...prev, ...deletedNotifications]
          return newList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        })
        
        // 提供更詳細的錯誤訊息
        let errorMessage = `批量刪除推播失敗: ${error.message}`
        if (error.code === '42501') {
          errorMessage += '\n\n⚠️ 權限不足：請執行 quick-fix-notifications-delete.sql 腳本修復刪除權限'
        }
        
        alert(errorMessage)
        return
      }

      // 檢查實際刪除的記錄數量
      const actualDeletedCount = data?.length || 0
      if (actualDeletedCount !== selectedIds.size) {
        console.warn(`⚠️ 警告：預期刪除 ${selectedIds.size} 個，實際刪除 ${actualDeletedCount} 個`)
        alert(`警告：預期刪除 ${selectedIds.size} 個推播，實際刪除 ${actualDeletedCount} 個`)
      } else {
        console.log('✅ 批量刪除推播成功，刪除數量:', actualDeletedCount)
        alert(`成功刪除 ${actualDeletedCount} 個推播！`)
      }
      
      // 清空選擇
      setSelectedIds(new Set())
      
    } catch (error: any) {
      console.error('批量刪除推播錯誤:', error)
      
      // 發生錯誤時重新載入列表以確保資料一致性
      await loadNotifications()
      alert(`批量刪除推播錯誤: ${error.message || '未知錯誤'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 切換單個項目的選擇狀態
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)))
    }
  }

  // 切換推播狀態
  const toggleNotificationStatus = async (id: string, currentStatus: boolean) => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) {
        console.error('更新推播狀態失敗:', error)
        alert(`更新推播狀態失敗: ${error.message}`)
        return
      }

      // 立即更新本地狀態
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, is_active: !currentStatus }
            : notification
        )
      )

      alert(`推播已${!currentStatus ? '啟用' : '停用'}！`)
    } catch (error: any) {
      console.error('切換推播狀態錯誤:', error)
      alert(`切換推播狀態錯誤: ${error.message || '未知錯誤'}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 刪除推播
  const deleteNotification = async (id: string) => {
    if (!confirm('確定要刪除這個推播嗎？此操作無法復原。')) return

    try {
      setIsLoading(true)
      
      console.log(`🗑️ 開始刪除推播，ID: ${id}`)
      
      // 立即從本地狀態移除該項目，提供即時的 UI 反饋
      const deletedNotification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(notification => notification.id !== id))
      
      // 從 Supabase 刪除記錄
      console.log(`📡 發送刪除請求到 Supabase...`)
      const { error, data } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .select()

      console.log(`📊 Supabase 刪除回應:`, { error, data, affectedRows: data?.length || 0 })

      if (error) {
        console.error('❌ 刪除推播失敗:', error)
        console.error('錯誤詳情:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        // 如果刪除失敗，恢復項目到列表中
        if (deletedNotification) {
          setNotifications(prev => {
            const newList = [...prev, deletedNotification]
            return newList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          })
        }
        
        // 提供更詳細的錯誤訊息
        let errorMessage = `刪除推播失敗: ${error.message}`
        if (error.code === '42501') {
          errorMessage += '\n\n⚠️ 權限不足：請執行 quick-fix-notifications-delete.sql 腳本修復刪除權限'
        } else if (error.code === 'PGRST204') {
          errorMessage += '\n\n⚠️ 記錄不存在：該推播可能已被其他用戶刪除'
        }
        
        alert(errorMessage)
        return
      }

      // 檢查是否真的刪除了記錄
      if (!data || data.length === 0) {
        console.warn('⚠️ 警告：刪除操作沒有返回被刪除的記錄，可能記錄已不存在')
        alert('警告：該推播可能已被刪除或不存在')
      } else {
        console.log('✅ 推播刪除成功，ID:', id, '刪除記錄:', data)
        alert('推播刪除成功！')
      }
      
    } catch (error: any) {
      console.error('❌ 刪除推播錯誤:', error)
      
      // 發生錯誤時重新載入列表以確保資料一致性
      console.log('🔄 重新載入推播列表以確保資料一致性...')
      await loadNotifications()
      alert(`刪除推播錯誤: ${error.message || '未知錯誤'}\n\n請檢查控制台獲取更多詳情`)
    } finally {
      setIsLoading(false)
    }
  }

  // 編輯推播
  const editNotification = (notification: Notification) => {
    setEditingNotification(notification)
    
    // 判斷推播類型
    let scheduleType: 'immediate' | 'scheduled' | 'interval' | 'repeat' = 'immediate'
    if (notification.repeat_interval_seconds && notification.repeat_count) {
      scheduleType = 'repeat'
    } else if (notification.schedule_time) {
      scheduleType = 'scheduled'
    } else if (notification.interval_seconds) {
      scheduleType = 'interval'
    }
    
    setFormData({
      content: notification.content,
      type: notification.type as 'text' | 'image',
      broadcast_type: notification.is_global ? 'global' : 
                     notification.target_levels.includes(2) ? 'user' : 'free',
      schedule_type: scheduleType,
      schedule_time: notification.schedule_time || undefined,
      interval_seconds: notification.interval_seconds || undefined,
      repeat_interval_seconds: notification.repeat_interval_seconds || undefined,
      repeat_count: notification.repeat_count || undefined,
      expires_at: notification.expires_at || undefined,
      image_url: notification.image_url || undefined
    })
    setShowForm(true)
  }

  // 測試推播功能
  const testBroadcast = async (notification: Notification) => {
    try {
      // 創建一個測試推播，立即發送
      const testData = {
        content: `[測試] ${notification.content}`,
        type: notification.type,
        target_levels: notification.target_levels,
        is_global: notification.is_global,
        schedule_time: null,
        interval_seconds: null,
        repeat_interval_seconds: null,
        repeat_count: null,
        sent_count: null,
        expires_at: null,
        image_url: notification.image_url,
        is_active: true,
        created_by: ADMIN_USER_ID
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(testData)
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log('✅ 測試推播創建成功:', data)
      alert('測試推播發送成功！請檢查播放器是否收到推播。')
      
      // 重新載入推播清單，顯示新的測試推播
      await loadNotifications()
    } catch (error: any) {
      console.error('測試推播失敗:', error)
      alert('測試推播失敗: ' + error.message)
    }
  }

  // 獲取推播類型標籤
  const getBroadcastTypeLabel = (notification: Notification) => {
    if (notification.is_global) return '全域推播'
    if (notification.target_levels.includes(2)) return '用戶推播'
    return '免費用戶推播'
  }

  // 獲取推播類型顏色
  const getBroadcastTypeColor = (notification: Notification) => {
    if (notification.is_global) return 'bg-purple-100 text-purple-800'
    if (notification.target_levels.includes(2)) return 'bg-blue-100 text-blue-800'
    return 'bg-green-100 text-green-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">推播管理</h1>
          <p className="text-gray-600">管理系統推播訊息，支援文字跑馬燈和圖示推播</p>
        </div>

        {/* 功能按鈕 */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            新增推播
          </button>
          
          <button
            onClick={loadNotifications}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            重新整理
          </button>

          <button
            onClick={cleanupCompletedNotifications}
            disabled={isLoading}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Archive size={20} />
            清理已完成
          </button>

          {notifications.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2"
              >
                {selectedIds.size === notifications.length ? '取消全選' : '全選'}
              </button>

              {selectedIds.size > 0 && (
                <button
                  onClick={deleteSelectedNotifications}
                  disabled={isLoading}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={20} />
                  刪除所選 ({selectedIds.size})
                </button>
              )}
            </>
          )}
        </div>

        {/* 推播表單 */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto text-black">
              <h2 className="text-xl font-bold mb-4 text-black">
                {editingNotification ? '編輯推播' : '新增推播'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 推播類型 */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    推播類型
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer text-black">
                      <input
                        type="radio"
                        name="type"
                        value="text"
                        checked={formData.type === 'text'}
                        onChange={(e) => setFormData({...formData, type: e.target.value as 'text' | 'image'})}
                        className="text-blue-600"
                      />
                      <MessageSquare size={16} />
                      <span>文字跑馬燈</span>
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer text-black">
                      <input
                        type="radio"
                        name="type"
                        value="image"
                        checked={formData.type === 'image'}
                        onChange={(e) => setFormData({...formData, type: e.target.value as 'text' | 'image'})}
                        className="text-blue-600"
                      />
                      <Image size={16} />
                      <span>圖示推播</span>
                    </label>
                  </div>
                </div>

                {/* 推播目標 */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    推播目標
                  </label>
                  <select
                    value={formData.broadcast_type}
                    onChange={(e) => setFormData({...formData, broadcast_type: e.target.value as BroadcastType})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  >
                    <option value="global">全域推播 (等級 1, 2, 3)</option>
                    <option value="user">用戶推播 (等級 1, 2)</option>
                    <option value="free">免費用戶推播 (等級 1)</option>
                  </select>
                </div>

                {/* 推播內容 */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    推播內容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="輸入推播內容..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    rows={3}
                    required
                  />
                </div>

                {/* 圖片網址 (僅圖示推播) */}
                {formData.type === 'image' && (
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      圖片網址
                    </label>
                    <input
                      type="url"
                      value={formData.image_url || ''}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="https://example.com/image.jpg"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    />
                  </div>
                )}

                {/* 時間設定 */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    時間設定
                  </label>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-2 cursor-pointer text-black">
                      <input
                        type="radio"
                        name="schedule_type"
                        value="immediate"
                        checked={formData.schedule_type === 'immediate'}
                        onChange={(e) => setFormData({...formData, schedule_type: e.target.value as any})}
                        className="text-blue-600"
                      />
                      <Send size={16} />
                      <span>立即推播</span>
                    </label>

                    <label className="flex items-center space-x-2 cursor-pointer text-black">
                      <input
                        type="radio"
                        name="schedule_type"
                        value="scheduled"
                        checked={formData.schedule_type === 'scheduled'}
                        onChange={(e) => setFormData({...formData, schedule_type: e.target.value as any})}
                        className="text-blue-600"
                      />
                      <Clock size={16} />
                      <span>指定時間推播</span>
                    </label>

                    {formData.schedule_type === 'scheduled' && (
                      <div className="ml-6 bg-gray-50 p-3 rounded-lg">
                        <label className="block text-sm text-black mb-2">推播時間</label>
                        <input
                          type="datetime-local"
                          value={formData.schedule_time || ''}
                          onChange={(e) => setFormData({...formData, schedule_time: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg text-black"
                        />
                      </div>
                    )}

                    <label className="flex items-center space-x-2 cursor-pointer text-black">
                      <input
                        type="radio"
                        name="schedule_type"
                        value="repeat"
                        checked={formData.schedule_type === 'repeat'}
                        onChange={(e) => setFormData({...formData, schedule_type: e.target.value as any})}
                        className="text-blue-600"
                      />
                      <Repeat size={16} />
                      <span>重複推播</span>
                    </label>

                    {formData.schedule_type === 'repeat' && (
                      <div className="ml-6 bg-gray-50 p-3 rounded-lg space-y-3">
                        <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 mb-3">
                          <strong>重複推播說明：</strong>將在指定時間開始，按設定間隔重複推播指定次數後自動停止
                        </div>
                        
                        <div>
                          <label className="block text-sm text-black mb-2">開始時間</label>
                          <input
                            type="datetime-local"
                            value={formData.schedule_time || ''}
                            onChange={(e) => setFormData({...formData, schedule_time: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-black"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm text-black mb-2">間隔時間 (秒)</label>
                          <input
                            type="number"
                            min="10"
                            max="86400"
                            value={formData.repeat_interval_seconds || ''}
                            onChange={(e) => setFormData({...formData, repeat_interval_seconds: parseInt(e.target.value)})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-black"
                            placeholder="10-86400 秒 (10秒-24小時)"
                            required
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            建議值：60(每分鐘)、300(每5分鐘)、3600(每小時)
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-black mb-2">總發送次數 (限制次數)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.repeat_count || ''}
                            onChange={(e) => setFormData({...formData, repeat_count: parseInt(e.target.value)})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-black"
                            placeholder="1-100 次 (發送完成後自動停止)"
                            required
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            推播將在發送完指定次數後自動停止，不會無限重複
                          </div>
                        </div>
                        
                        {formData.schedule_time && formData.repeat_interval_seconds && formData.repeat_count && (
                          <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-700">
                            <strong>預估時程：</strong>
                            從 {new Date(formData.schedule_time).toLocaleString()} 開始，
                            每 {formData.repeat_interval_seconds} 秒推播一次，
                            總共推播 {formData.repeat_count} 次，
                            預計 {Math.ceil((formData.repeat_count - 1) * formData.repeat_interval_seconds / 60)} 分鐘內完成
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 過期時間 */}
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    過期時間 (選填)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at || ''}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>

                {/* 按鈕 */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-black bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '處理中...' : (editingNotification ? '更新' : '建立')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 推播清單 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">推播清單</h3>
            {notifications.length > 0 && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>總計 {notifications.length} 個推播</span>
                {selectedIds.size > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    已選擇 {selectedIds.size} 個
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">載入中...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暫無推播資料</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-6 hover:bg-gray-50 transition-colors ${selectedIds.has(notification.id) ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* 複選框 */}
                      <input
                        type="checkbox"
                        checked={selectedIds.has(notification.id)}
                        onChange={() => toggleSelection(notification.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      
                      <div className="flex-1">
                        {/* 推播資訊 */}
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBroadcastTypeColor(notification)}`}>
                            {getBroadcastTypeLabel(notification)}
                          </span>
                          
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            notification.type === 'text' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {notification.type === 'text' ? '文字跑馬燈' : '圖示推播'}
                          </span>

                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            notification.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {notification.is_active ? '啟用中' : '已停用'}
                          </span>

                          {notification.expires_at && new Date(notification.expires_at) < new Date() && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              已過期
                            </span>
                          )}
                        </div>

                        {/* 推播內容 */}
                        <p className="text-gray-900 mb-2">{notification.content}</p>

                        {/* 推播設定 */}
                        <div className="text-sm text-gray-500 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Users size={14} />
                              <span>目標等級: {notification.target_levels.join(', ')}</span>
                            </span>
                            
                            <span className="flex items-center space-x-1">
                              <Calendar size={14} />
                              <span>{new Date(notification.created_at).toLocaleString()}</span>
                            </span>
                          </div>

                          {notification.schedule_time && (
                            <div className="flex items-center space-x-1">
                              <Clock size={14} />
                              <span>預定時間: {new Date(notification.schedule_time).toLocaleString()}</span>
                            </div>
                          )}

                          {notification.interval_seconds && (
                            <div className="flex items-center space-x-1">
                              <Repeat size={14} />
                              <span>間隔: {notification.interval_seconds} 秒</span>
                            </div>
                          )}

                          {notification.expires_at && (
                            <div className="flex items-center space-x-1">
                              <Archive size={14} />
                              <span>過期時間: {new Date(notification.expires_at).toLocaleString()}</span>
                            </div>
                          )}

                          {/* 重複推播進度顯示 */}
                          {notification.repeat_count && notification.repeat_interval_seconds && (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Repeat size={14} />
                                <span>
                                  重複推播進度: {notification.sent_count || 0} / {notification.repeat_count} 
                                  (間隔 {notification.repeat_interval_seconds} 秒)
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  (notification.sent_count || 0) >= notification.repeat_count 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {(notification.sent_count || 0) >= notification.repeat_count ? '已完成' : '進行中'}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      (notification.sent_count || 0) >= notification.repeat_count 
                                        ? 'bg-green-600' 
                                        : 'bg-blue-600'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, ((notification.sent_count || 0) / notification.repeat_count) * 100)}%` 
                                    }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500 min-w-[3rem]">
                                  {Math.round(((notification.sent_count || 0) / notification.repeat_count) * 100)}%
                                </span>
                              </div>
                              {(notification.sent_count || 0) < notification.repeat_count && notification.schedule_time && (
                                <div className="text-xs text-gray-500">
                                  下次推播: {
                                    new Date(
                                      new Date(notification.schedule_time).getTime() + 
                                      (notification.sent_count || 0) * notification.repeat_interval_seconds * 1000
                                    ).toLocaleString()
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => testBroadcast(notification)}
                        disabled={isLoading}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="測試推播"
                      >
                        <Send size={16} />
                      </button>

                      <button
                        onClick={() => editNotification(notification)}
                        disabled={isLoading}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="編輯"
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        onClick={() => toggleNotificationStatus(notification.id, notification.is_active)}
                        disabled={isLoading}
                        className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          notification.is_active 
                            ? 'text-orange-600 hover:bg-orange-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={notification.is_active ? '停用' : '啟用'}
                      >
                        {notification.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>

                      <button
                        onClick={() => deleteNotification(notification.id)}
                        disabled={isLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="刪除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BroadcastManagePage 