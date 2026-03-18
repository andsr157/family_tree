import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { AuthRepository } from '../repositories/auth.repository'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authRepo: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()

    const tenantId = request.headers['x-tenant-id']
    if (!tenantId) {
      throw new BadRequestException('Header X-Tenant-Id is required')
    }

    const userId = request.user?.id
    if (!userId) return false

    const membership = await this.authRepo.findMembership(userId, tenantId)

    if (!membership) {
      throw new ForbiddenException('You are not a member of this tenant')
    }

    request.tenantId = tenantId
    request.userRole = membership.role

    return true
  }
}
