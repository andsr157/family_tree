import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest()

    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Access restricted to platform administrators')
    }

    return true
  }
}
