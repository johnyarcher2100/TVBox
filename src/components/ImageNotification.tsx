import React, { useState, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import type { Notification, UserLevel } from '@/types'
import { X } from 'lucide-react'

interface ImageNotificationProps {
  userLevel: UserLevel
  className?: string
}

const ImageNotification: React.FC<ImageNotificationProps> = ({ 
  userLevel, 
  className = '' 
}) => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  // 載入符合用戶等級的圖示推播
  const loadImageNotifications = async () => {
    try {
      const data = await dbHelpers.getActiveImageNotifications(userLevel)

      if (data.length > 0) {
        setCurrentNotification(data[0])
        setIsVisible(true)
      } else {
        setCurrentNotification(null)
        setIsVisible(false)
      }
    } catch (error) {
      console.error('載入圖示推播錯誤:', error)
    }
  }

  // 定期重新載入圖示推播
  useEffect(() => {
    loadImageNotifications()
    
    const interval = setInterval(loadImageNotifications, 30000) // 每30秒檢查一次
    return () => clearInterval(interval)
  }, [userLevel])

  // 處理預定時間推播
  useEffect(() => {
    if (!currentNotification?.schedule_time) return

    const scheduleTime = new Date(currentNotification.schedule_time)
    const now = new Date()
    
    if (scheduleTime > now) {
      const timeout = setTimeout(() => {
        setIsVisible(true)
      }, scheduleTime.getTime() - now.getTime())

      return () => clearTimeout(timeout)
    }
  }, [currentNotification])

  // 處理間隔推播
  useEffect(() => {
    if (!currentNotification?.interval_seconds) return

    const interval = setInterval(() => {
      setIsVisible(true)
      
      // 顯示一段時間後自動隱藏
      setTimeout(() => {
        setIsVisible(false)
      }, 10000) // 顯示10秒
    }, currentNotification.interval_seconds * 1000)

    return () => clearInterval(interval)
  }, [currentNotification])

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!currentNotification || !isVisible || !currentNotification.image_url) {
    return null
  }

  return (
    <div className={`fixed right-4 top-1/2 transform -translate-y-1/2 z-50 ${className}`}>
      <div className="relative bg-white rounded-lg shadow-2xl p-2 max-w-xs animate-fadeIn">
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center"
          aria-label="關閉推播"
        >
          <X size={12} />
        </button>

        {/* 推播圖片 */}
        <div className="relative">
          <img
            src={currentNotification.image_url}
            alt={currentNotification.content}
            className="w-full h-auto rounded-md"
            onError={() => {
              console.error('推播圖片載入失敗:', currentNotification.image_url)
              setIsVisible(false)
            }}
          />
          
          {/* 圖片上的文字內容 */}
          {currentNotification.content && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 rounded-b-md">
              {currentNotification.content}
            </div>
          )}
        </div>

        {/* 推播標示 */}
        <div className="absolute -bottom-1 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
          推播
        </div>
      </div>
    </div>
  )
}

export default ImageNotification 