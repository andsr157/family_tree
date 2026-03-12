import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { and, eq, isNull } from 'drizzle-orm'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { DATABASE } from '../../../db/database.module'
import { tenantMembers } from '../../../db/schema'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DATABASE) private db: NodePgDatabase,
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

    const [membership] = await this.db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.user_id, userId),
          eq(tenantMembers.tenant_id, tenantId),
          isNull(tenantMembers.deleted_at),
          eq(tenantMembers.status, 'active'),
        ),
      )
      .limit(1)

    if (!membership) {
      throw new ForbiddenException('You are not a member of this tenant')
    }

    request.tenantId = tenantId
    request.userRole = membership.role

    return true
  }
}
