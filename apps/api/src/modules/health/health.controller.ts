import { Controller, Get, Inject } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { Redis } from 'ioredis'
import { DATABASE } from '../../db/database.module'
import { REDIS } from '../../core/redis/redis.constants'
import { Public } from '../../core/auth/decorators/public.decorator'

interface HealthResult {
  status: 'ok' | 'degraded'
  services: {
    db: 'ok' | 'error'
    redis: 'ok' | 'error'
  }
}

@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE) private readonly db: any,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  async check(): Promise<HealthResult> {
    const result: HealthResult = {
      status: 'ok',
      services: { db: 'ok', redis: 'ok' },
    }

    await Promise.all([
      this.db.execute(sql`SELECT 1`).catch(() => {
        result.services.db = 'error'
        result.status = 'degraded'
      }),
      this.redis.ping().catch(() => {
        result.services.redis = 'error'
        result.status = 'degraded'
      }),
    ])

    return result
  }
}
