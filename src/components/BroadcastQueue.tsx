import React, { useState, useEffect, useCallback } from 'react'
import { dbHelpers } from '@/lib/supabase'
import type { Notification, UserLevel } from '@/types'

interface BroadcastQueueProps {
  userLevel: UserLevel
  className?: string
}

const BroadcastQueue: React.FC<BroadcastQueueProps> = ({ 
  userLevel, 
  className = '' 
}) => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [queue, setQueue] = useState<Notification[]>([])

  // 載入排隊中的推播
  const loadQueuedNotifications = useCallback(async () => {
    try {
      const notifications = await dbHelpers.getQueuedNotifications(userLevel)
      
      // 建立推播隊列
      const now = new Date()
      const readyToSend = notifications.filter(notification => {
        // 立即推播
        if (!notification.schedule_time) return true
        
        // 指定時間推播
        const scheduleTime = new Date(notification.schedule_time)
        if (scheduleTime <= now) return true
        
        // 重複推播
        if (notification.repeat_interval_seconds && notification.repeat_count) {
          const sentCount = notification.sent_count || 0
          if (sentCount < notification.repeat_count) {
            const nextTime = new Date(scheduleTime.getTime() + (sentCount * notification.repeat_interval_seconds * 1000))
            return nextTime <= now
          }
        }
        
        return false
      })
      
      setQueue(readyToSend)
    } catch (error) {
      console.error('載入推播隊列失敗:', error)
    }
  }, [userLevel])

  // 處理推播隊列
  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0) return
    
    setIsProcessing(true)
    
    try {
      // 取出隊列中的第一個推播
      const nextNotification = queue[0]
      setCurrentNotification(nextNotification)
      
      console.log(`開始播放推播: ${nextNotification.content} (ID: ${nextNotification.id})`)
      
      // 顯示推播一段時間
      setTimeout(async () => {
        console.log(`推播播放完成: ${nextNotification.content} (ID: ${nextNotification.id})`)
        
        // 更新發送次數並處理推播生命週期
        const success = await dbHelpers.updateNotificationSentCount(nextNotification.id)
        
        if (success) {
          console.log(`推播狀態更新成功: ${nextNotification.id}`)
        } else {
          console.error(`推播狀態更新失敗: ${nextNotification.id}`)
        }
        
        // 從隊列中移除
        setQueue(prev => prev.slice(1))
        setCurrentNotification(null)
        setIsProcessing(false)
        
        // 重新載入隊列，獲取最新的推播狀態
        await loadQueuedNotifications()
      }, 5000) // 顯示 5 秒
      
    } catch (error) {
      console.error('處理推播隊列錯誤:', error)
      setIsProcessing(false)
    }
  }, [isProcessing, queue, loadQueuedNotifications])

  // 初始載入和定期檢查
  useEffect(() => {
    loadQueuedNotifications()
    
    // 每 30 秒檢查一次新的推播
    const interval = setInterval(loadQueuedNotifications, 30000)
    return () => clearInterval(interval)
  }, [loadQueuedNotifications])

  // 處理隊列
  useEffect(() => {
    if (!isProcessing && queue.length > 0) {
      // 延遲 1 秒再處理下一個推播，避免干擾
      const timeout = setTimeout(processQueue, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isProcessing, queue, processQueue])

  // 渲染當前推播
  if (!currentNotification) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {currentNotification.type === 'text' ? (
        // 文字跑馬燈
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs bg-blue-500 px-2 py-1 rounded">推播</span>
            <span className="text-xs opacity-75">
              {queue.length > 0 && `隊列：${queue.length}`}
            </span>
          </div>
          <div className="overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              {currentNotification.content}
            </div>
          </div>
        </div>
      ) : (
        // 圖示推播
        <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">推播</span>
            <span className="text-xs text-gray-500">
              {queue.length > 0 && `隊列：${queue.length}`}
            </span>
          </div>
          {currentNotification.image_url && (
            <img
              src={currentNotification.image_url}
              alt={currentNotification.content}
              className="w-full h-auto rounded mb-2"
              onError={() => setCurrentNotification(null)}
            />
          )}
          <p className="text-sm text-gray-800">{currentNotification.content}</p>
        </div>
      )}
      
      {/* 隊列指示器 */}
      {queue.length > 1 && (
        <div className="mt-2 text-xs text-center text-gray-500 bg-white bg-opacity-90 rounded px-2 py-1">
          還有 {queue.length - 1} 個推播等待中...
        </div>
      )}
    </div>
  )
}

export default BroadcastQueue 