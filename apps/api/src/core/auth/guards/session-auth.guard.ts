import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, isNull } from 'drizzle-orm'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { RedisService } from '../../redis/redis.service'
import { DATABASE } from '../../../db/database.module'
import { users } from '../../../db/schema'
import type { SessionData } from '../auth.types'

const SESSION_TTL = 60 * 60 * 24 * 7 // 7 hari

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: RedisService,
    @Inject(DATABASE) private db: NodePgDatabase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()

    const sessionId = request.cookies?.['session']
    if (!sessionId) {
      throw new UnauthorizedException('Session not found')
    }

    const raw = await this.redis.getSession(sessionId)
    if (!raw) {
      throw new UnauthorizedException('Session expired or invalid')
    }

    const session: SessionData = JSON.parse(raw)

    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), isNull(users.deleted_at)))
      .limit(1)

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Sliding expiry
    await this.redis.refreshSessionTTL(sessionId, SESSION_TTL)

    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      isPlatformAdmin: user.is_platform_admin,
      defaultFocalPersonId: user.default_focal_person_id,
      preferredZoomLevel: user.preferred_zoom_level,
    }

    request.sessionId = sessionId

    return true
  }
}
