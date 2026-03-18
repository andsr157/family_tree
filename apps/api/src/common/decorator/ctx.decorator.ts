import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { ServiceContext } from '../types'

export const Ctx = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ServiceContext => {
    const request = context.switchToHttp().getRequest()
    return {
      tenantId: request.tenantId,
      userId: request.user.id,
      userRole: request.userRole,
    }
  },
)
