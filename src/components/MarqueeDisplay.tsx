import React, { useState, useEffect } from 'react'
import { dbHelpers } from '@/lib/supabase'
import type { Notification, UserLevel } from '@/types'

interface MarqueeDisplayProps {
  userLevel: UserLevel
  className?: string
}

const MarqueeDisplay: React.FC<MarqueeDisplayProps> = ({ 
  userLevel, 
  className = '' 
}) => {
  const [messages, setMessages] = useState<Notification[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // 載入符合用戶等級的推播訊息
  const loadMessages = async () => {
    try {
      const data = await dbHelpers.getActiveTextNotifications(userLevel)
      setMessages(data)
    } catch (error) {
      console.error('載入推播訊息錯誤:', error)
    }
  }

  // 自動切換訊息
  useEffect(() => {
    if (messages.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length)
    }, 5000) // 每5秒切換一次

    return () => clearInterval(interval)
  }, [messages.length])

  // 定期重新載入訊息
  useEffect(() => {
    loadMessages()
    
    const interval = setInterval(loadMessages, 30000) // 每30秒檢查一次新訊息
    return () => clearInterval(interval)
  }, [userLevel])

  // 處理間隔推播
  useEffect(() => {
    const intervalMessages = messages.filter(msg => msg.interval_seconds)
    
    const intervals = intervalMessages.map(msg => {
      if (!msg.interval_seconds) return null
      
      return setInterval(() => {
        // 強制顯示該訊息
        const msgIndex = messages.findIndex(m => m.id === msg.id)
        if (msgIndex !== -1) {
          setCurrentIndex(msgIndex)
        }
      }, msg.interval_seconds * 1000)
    }).filter(Boolean)

    return () => {
      intervals.forEach(interval => {
        if (interval) clearInterval(interval)
      })
    }
  }, [messages])

  if (messages.length === 0) {
    return null
  }

  const currentMessage = messages[currentIndex]

  return (
    <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 overflow-hidden ${className}`}>
      <div className="marquee-container relative h-6">
        <div className="marquee-content absolute whitespace-nowrap animate-marquee">
          <span className="inline-flex items-center space-x-4">
            <span className="inline-flex items-center space-x-2">
              <span className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse"></span>
              <span className="font-medium">📢 推播訊息</span>
            </span>
            <span className="text-sm">
              {currentMessage?.content}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

export default MarqueeDisplay 