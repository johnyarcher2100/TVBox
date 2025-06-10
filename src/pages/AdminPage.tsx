import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, Send, Clock, Users } from 'lucide-react'

interface NotificationForm {
  content: string
  type: 'text' | 'image'
  target_levels: number[]
  is_global: boolean
  schedule_time?: string
  interval_seconds?: number
  image_url?: string
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate()
  
  const [notifications, setNotifications] = useState<any[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingNotification, setEditingNotification] = useState<any>(null)
  
  const [form, setForm] = useState<NotificationForm>({
    content: '',
    type: 'text',
    target_levels: [1],
    is_global: true,
    schedule_time: '',
    interval_seconds: 30,
    image_url: ''
  })

  const resetForm = () => {
    setForm({
      content: '',
      type: 'text',
      target_levels: [1],
      is_global: true,
      schedule_time: '',
      interval_seconds: 30,
      image_url: ''
    })
    setEditingNotification(null)
    setShowCreateForm(false)
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">管理面板</h1>
              <p className="text-sm text-gray-400">推播通知管理</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            新增通知
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">管理功能開發中...</div>
          <p className="text-gray-500 text-sm">
            推播通知管理系統將在後續版本中完成
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminPage 