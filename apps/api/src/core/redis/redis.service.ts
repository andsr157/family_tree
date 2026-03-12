import { Inject, Injectable } from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS } from './redis.constants'

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS) private readonly client: Redis) {}

  async setSession(sessionId: string, data: object, ttlSeconds: number): Promise<void> {
    await this.client.set(`session:${sessionId}`, JSON.stringify(data), 'EX', ttlSeconds)
  }

  async getSession(sessionId: string): Promise<string | null> {
    return this.client.get(`session:${sessionId}`)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.del(`session:${sessionId}`)
  }

  async refreshSessionTTL(sessionId: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(`session:${sessionId}`, ttlSeconds)
  }

  async addUserSession(userId: string, sessionId: string): Promise<void> {
    await this.client.sadd(`user_sessions:${userId}`, sessionId)
  }

  async getUserSessions(userId: string): Promise<string[]> {
    return this.client.smembers(`user_sessions:${userId}`)
  }

  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    await this.client.srem(`user_sessions:${userId}`, sessionId)
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.getUserSessions(userId)
    if (sessionIds.length === 0) return

    const pipeline = this.client.pipeline()
    for (const sessionId of sessionIds) {
      pipeline.del(`session:${sessionId}`)
    }
    pipeline.del(`user_sessions:${userId}`)
    await pipeline.exec()
  }
}
