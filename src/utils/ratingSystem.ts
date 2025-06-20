import { DatabaseOperations } from './database';
import { Channel } from '@/types';

export class RatingSystem {
  private static readonly INITIAL_RATING = 50;
  private static readonly LIKE_POINTS = 5;
  private static readonly DISLIKE_POINTS = -19;
  private static readonly MAX_RATING = 9999;
  private static readonly MIN_RATING = 10;
  private static readonly AUTO_DELETE_THRESHOLD = 10;
  private static readonly LOW_RATING_THRESHOLD = 51;

  // 處理用戶評分
  static async handleUserRating(
    channelId: string, 
    userId: string, 
    ratingType: 'like' | 'dislike'
  ): Promise<number> {
    try {
      // 檢查用戶是否已經評分過
      const existingRating = await DatabaseOperations.getUserRating(channelId, userId);
      
      if (existingRating && existingRating.rating === ratingType) {
        throw new Error('您已經對此頻道進行過評分');
      }

      // 獲取當前頻道資訊
      const channels = await DatabaseOperations.getChannels();
      const channel = channels.find(c => c.id === channelId);
      
      if (!channel) {
        throw new Error('頻道不存在');
      }

      let newRating = channel.rating;

      // 如果之前有相反的評分，先撤銷
      if (existingRating) {
        if (existingRating.rating === 'like') {
          newRating -= this.LIKE_POINTS;
        } else {
          newRating -= this.DISLIKE_POINTS; // 實際上是加分，因為 DISLIKE_POINTS 是負數
        }
      }

      // 應用新評分
      if (ratingType === 'like') {
        newRating += this.LIKE_POINTS;
      } else {
        newRating += this.DISLIKE_POINTS;
      }

      // 確保評分在有效範圍內
      newRating = Math.max(0, Math.min(this.MAX_RATING, newRating));

      // 保存用戶評分
      await DatabaseOperations.saveUserRating({
        channel_id: channelId,
        user_id: userId,
        rating: ratingType
      });

      // 更新頻道評分
      await DatabaseOperations.updateChannelRating(channelId, newRating);

      // 如果評分過低，自動刪除
      if (newRating < this.AUTO_DELETE_THRESHOLD) {
        await this.deleteChannel(channelId);
        return 0; // 表示頻道已被刪除
      }

      return newRating;
    } catch (error) {
      console.error('評分處理失敗:', error);
      throw error;
    }
  }

  // 一鍵刪除低評分頻道
  static async deleteLowRatingChannels(threshold = this.LOW_RATING_THRESHOLD): Promise<number> {
    try {
      const channels = await DatabaseOperations.getChannels();
      const lowRatingChannels = channels.filter(channel => channel.rating < threshold);
      const deleteCount = lowRatingChannels.length;

      await DatabaseOperations.deleteChannelsWithLowRating(threshold);
      
      return deleteCount;
    } catch (error) {
      console.error('刪除低評分頻道失敗:', error);
      throw error;
    }
  }

  // 刪除單個頻道
  private static async deleteChannel(channelId: string): Promise<void> {
    // 這裡應該呼叫刪除頻道的 API，暫時先標記為已實現
    console.log(`自動刪除低評分頻道: ${channelId}`);
  }

  // 獲取頻道統計資訊
  static async getChannelStats(): Promise<{
    total: number;
    highRated: number;
    lowRated: number;
    averageRating: number;
  }> {
    try {
      const channels = await DatabaseOperations.getChannels();
      
      const total = channels.length;
      const highRated = channels.filter(c => c.rating >= 80).length;
      const lowRated = channels.filter(c => c.rating < this.LOW_RATING_THRESHOLD).length;
      const averageRating = total > 0 
        ? channels.reduce((sum, c) => sum + c.rating, 0) / total 
        : 0;

      return {
        total,
        highRated,
        lowRated,
        averageRating: Math.round(averageRating * 100) / 100
      };
    } catch (error) {
      console.error('獲取頻道統計失敗:', error);
      throw error;
    }
  }

  // 根據評分排序頻道
  static sortChannelsByRating(channels: Channel[], descending = true): Channel[] {
    return [...channels].sort((a, b) => {
      return descending ? b.rating - a.rating : a.rating - b.rating;
    });
  }

  // 獲取推薦頻道（高評分）
  static getRecommendedChannels(channels: Channel[], limit = 20): Channel[] {
    return this.sortChannelsByRating(channels)
      .filter(channel => channel.rating >= 70)
      .slice(0, limit);
  }
}