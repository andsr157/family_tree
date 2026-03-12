import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'

type TenantRole = 'owner' | 'admin' | 'member'

const ROLE_HIERARCHY: Record<TenantRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<TenantRole>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRole) return true

    const { userRole } = context.switchToHttp().getRequest()

    const hasPermission = ROLE_HIERARCHY[userRole as TenantRole] >= ROLE_HIERARCHY[requiredRole]

    if (!hasPermission) {
      throw new ForbiddenException(`This action requires at least the '${requiredRole}' role`)
    }

    return true
  }
}
