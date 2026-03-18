import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthRepository } from '../repositories/auth.repository'
import { SessionRepository } from '../repositories/session.repository'
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authRepo: AuthRepository,
    private sessionRepo: SessionRepository,
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

    const session = await this.sessionRepo.getSession(sessionId)
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid')
    }

    const user = await this.authRepo.findUserById(session.userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    // Sliding expiry
    await this.sessionRepo.refreshTTL(sessionId)

    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isPlatformAdmin: user.isPlatformAdmin,
      defaultFocalPersonId: user.defaultFocalPersonId,
      preferredZoomLevel: user.preferredZoomLevel,
    }

    request.sessionId = sessionId

    return true
  }
}
