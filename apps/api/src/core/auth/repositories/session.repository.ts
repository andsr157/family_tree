// core/auth/repositories/session.repository.ts
import { Injectable } from '@nestjs/common'
import { randomBytes } from 'crypto'
import { RedisService } from '../../redis/redis.service'
import type { SessionData } from '../auth.types'

const SESSION_TTL = 60 * 60 * 24 * 7

@Injectable()
export class SessionRepository {
  constructor(private redis: RedisService) {}

  async createSession(
    userId: string,
    meta: { ip: string; userAgent: string },
  ): Promise<string> {
    const sessionId = randomBytes(32).toString('hex')

    const sessionData: SessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      deviceInfo: {
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    }

    await this.redis.setSession(sessionId, sessionData, SESSION_TTL)
    await this.redis.addUserSession(userId, sessionId)

    return sessionId
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const raw = await this.redis.getSession(sessionId)
    if (!raw) return null
    return JSON.parse(raw) as SessionData
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await this.redis.deleteSession(sessionId)
    await this.redis.removeUserSession(userId, sessionId)
  }

  async refreshTTL(sessionId: string): Promise<void> {
    await this.redis.refreshSessionTTL(sessionId, SESSION_TTL)
  }

  async deleteAllSessions(userId: string): Promise<void> {
    await this.redis.deleteAllUserSessions(userId)
  }
}
