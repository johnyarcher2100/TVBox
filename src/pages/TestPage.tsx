import React, { useState } from 'react'
import { SuperEnhancedPlayer } from '@/components/SuperEnhancedPlayer'

const TestPage: React.FC = () => {
  const [testChannels] = useState([
    {
      id: '1',
      name: 'HLS 測試頻道',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      logo: '',
      category: 'test',
      rating: 85,
      votes: { likes: 10, dislikes: 2 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2', 
      name: 'YouTube 直播測試',
      url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      logo: '',
      category: 'youtube',
      rating: 90,
      votes: { likes: 15, dislikes: 1 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      name: 'MP4 測試頻道',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      logo: '',
      category: 'test',
      rating: 75,
      votes: { likes: 8, dislikes: 3 },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ])

  const [currentChannel, setCurrentChannel] = useState(testChannels[0])
  const [playerError, setPlayerError] = useState<string | null>(null)

  const handleSnapshot = (imageData: string) => {
    console.log('截圖完成:', imageData.substring(0, 50) + '...')
  }

  return (
    <div className="h-screen bg-gray-900 flex">
      {/* 左側頻道選擇 */}
      <div className="w-80 bg-gray-800 p-4 overflow-y-auto">
        <h2 className="text-white font-bold mb-4">測試頻道</h2>
        <div className="space-y-2">
          {testChannels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentChannel.id === channel.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-medium">{channel.name}</div>
              <div className="text-sm opacity-75">{channel.category}</div>
              <div className="text-xs opacity-50">評分: {channel.rating}</div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-white font-medium mb-2">支援格式</h3>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• HLS (m3u8) ✅</li>
            <li>• MP4 ✅</li>
            <li>• FLV ✅</li>
            <li>• WebM ✅</li>
            <li>• YouTube ✅</li>
            <li>• RTMP ✅</li>
            <li>• WebSocket ✅</li>
          </ul>
        </div>
      </div>

      {/* 右側播放器 */}
      <div className="flex-1 relative">
        <SuperEnhancedPlayer
          channel={currentChannel}
          onError={(error) => {
            setPlayerError(error)
            console.error('播放器錯誤:', error)
          }}
          onPlayerReady={() => {
            console.log('播放器就緒')
          }}
        />

        {/* 頻道信息覆蓋層 */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-60 text-white p-3 rounded-lg">
          <h3 className="font-bold">{currentChannel.name}</h3>
          <p className="text-sm opacity-75">{currentChannel.category}</p>
          <p className="text-xs opacity-50">評分: ⭐ {currentChannel.rating}</p>
        </div>
      </div>
    </div>
  )
}

export default TestPage 