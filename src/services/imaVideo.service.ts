import { AI_CONFIG } from '@/config/ai.config'
import { ImaVideoClient } from './imaVideo.core'

export class ImaVideoService extends ImaVideoClient {
  constructor() {
    super({
      apiKey: import.meta.env.VITE_IMA_VIDEO_API_KEY || AI_CONFIG.apiKey,
      baseUrl: import.meta.env.VITE_IMA_VIDEO_BASE_URL || AI_CONFIG.baseUrl,
    })
  }
}

export const imaVideoService = new ImaVideoService()
export default ImaVideoService
