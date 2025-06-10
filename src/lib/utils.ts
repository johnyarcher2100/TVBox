import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 評分相關工具函數
export const ratingUtils = {
  // 獲取評分顏色類名
  getRatingColorClass: (rating: number): string => {
    if (rating >= 80) return 'bg-green-600'
    if (rating >= 60) return 'bg-yellow-600'
    if (rating >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  },

  // 獲取評分等級描述
  getRatingLevel: (rating: number): string => {
    if (rating >= 90) return '優秀'
    if (rating >= 80) return '良好'
    if (rating >= 60) return '普通'
    if (rating >= 40) return '較差'
    if (rating >= 20) return '很差'
    return '極差'
  },

  // 獲取評分圖標
  getRatingIcon: (rating: number): string => {
    if (rating >= 80) return '⭐'
    if (rating >= 60) return '👍'
    if (rating >= 40) return '👌'
    if (rating >= 20) return '👎'
    return '💩'
  },

  // 計算評分變化百分比
  calculateRatingChange: (oldRating: number, newRating: number): number => {
    if (oldRating === 0) return 0
    return ((newRating - oldRating) / oldRating) * 100
  },

  // 格式化投票統計
  formatVotes: (votes: { likes: number; dislikes: number }): string => {
    const total = votes.likes + votes.dislikes
    if (total === 0) return '暫無投票'
    
    const likePercent = Math.round((votes.likes / total) * 100)
    return `${likePercent}% 好評 (${votes.likes}👍 ${votes.dislikes}👎)`
  }
} 