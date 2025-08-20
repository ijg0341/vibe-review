import { createClient } from '@/lib/supabase/client'
import crypto from 'crypto'

export class ApiKeyManager {
  private supabase = createClient()
  
  /**
   * 사용자의 기본 API 키 조회 또는 생성
   */
  async getOrCreateDefaultApiKey(userId: string): Promise<{ key?: string; keyPrefix?: string; error?: string }> {
    try {
      // 기존 활성 API 키 조회
      const { data: existingKeys, error: fetchError } = await this.supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('name', 'Default CLI Key')
        .single()
      
      if (existingKeys && !fetchError) {
        // 이미 키가 있으면 prefix만 반환 (전체 키는 생성 시에만 보여줌)
        return { keyPrefix: existingKeys.key_prefix }
      }
      
      // 새 API 키 생성
      const apiKey = await this.generateApiKey()
      const keyHash = await this.hashApiKey(apiKey)
      const keyPrefix = apiKey.substring(0, 12)
      
      // DB에 저장
      const { data: newKey, error: createError } = await this.supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name: 'Default CLI Key',
          description: 'Automatically generated key for CLI usage',
          key_hash: keyHash,
          key_prefix: keyPrefix,
          is_active: true
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating API key:', createError)
        
        // 이미 존재하는 경우 (race condition) 다시 조회
        if (createError.code === '23505') { // unique violation
          const { data: existingKey } = await this.supabase
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .eq('name', 'Default CLI Key')
            .single()
          
          if (existingKey) {
            return { keyPrefix: existingKey.key_prefix }
          }
        }
        
        return { error: 'Failed to create API key' }
      }
      
      // 처음 생성된 키는 전체 반환 (한 번만 볼 수 있음)
      return { key: apiKey, keyPrefix: keyPrefix }
      
    } catch (error) {
      console.error('API key manager error:', error)
      return { error: 'An error occurred' }
    }
  }
  
  /**
   * API 키 생성
   */
  private async generateApiKey(): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto) {
      // 브라우저 환경
      const randomBytes = window.crypto.getRandomValues(new Uint8Array(32))
      const randomString = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      return `vibe_${randomString.substring(0, 32)}`
    } else {
      // Node.js 환경 (서버 사이드)
      const randomBytes = crypto.randomBytes(32)
      const randomString = randomBytes.toString('hex')
      return `vibe_${randomString.substring(0, 32)}`
    }
  }
  
  /**
   * API 키 해시 생성
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      // 브라우저 환경
      const encoder = new TextEncoder()
      const data = encoder.encode(apiKey)
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } else {
      // Node.js 환경
      return crypto.createHash('sha256').update(apiKey).digest('hex')
    }
  }
  
  /**
   * 사용자의 활성 API 키 조회
   */
  async getActiveApiKey(userId: string): Promise<{ keyPrefix?: string; name?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('key_prefix, name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        return { error: 'No active API key found' }
      }
      
      return { keyPrefix: data.key_prefix, name: data.name }
    } catch (error) {
      console.error('Error fetching API key:', error)
      return { error: 'Failed to fetch API key' }
    }
  }
}