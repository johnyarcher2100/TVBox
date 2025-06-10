import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbHelpers } from '@/lib/supabase'
import type { User, UserStore } from '@/types'

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (activationCode?: string) => {
        try {
          if (activationCode) {
            // 檢查啟動碼是否有效
            const codeData = await dbHelpers.getActivationCode(activationCode)
            
            if (!codeData) {
              throw new Error('無效的啟動碼')
            }

            // 檢查是否已有使用此啟動碼的用戶
            const existingUser = await dbHelpers.getUserByActivationCode(activationCode)
            
            if (existingUser) {
              // 用戶已存在，直接登入
              const now = new Date()
              const expiresAt = new Date(existingUser.expires_at || '')
              
              if (existingUser.expires_at && expiresAt < now) {
                throw new Error('啟動碼已過期')
              }
              
              set({ 
                user: existingUser as User, 
                isAuthenticated: true 
              })
              return
            }

            // 創建新用戶
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 365) // 365天有效期

            const userData = {
              activation_code: activationCode,
              user_level: codeData.user_level,
              activated_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString()
            }

            const newUser = await dbHelpers.createUser(userData)
            
            // 標記啟動碼為已使用
            await dbHelpers.markActivationCodeAsUsed(activationCode, newUser.id)

            set({ 
              user: newUser as User, 
              isAuthenticated: true 
            })
          } else {
            // 免費用戶登入
            const userData = {
              user_level: 1 as const,
              activated_at: new Date().toISOString(),
              expires_at: null
            }

            const newUser = await dbHelpers.createUser(userData)
            
            set({ 
              user: newUser as User, 
              isAuthenticated: true 
            })
          }
        } catch (error) {
          console.error('登入失敗:', error)
          throw error
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      }
    }),
    {
      name: 'abuji-user-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
) 