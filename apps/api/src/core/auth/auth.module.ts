import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthRepository } from './repositories/auth.repository'
import { SessionRepository } from './repositories/session.repository'
import { SessionAuthGuard } from './guards/session-auth.guard'
import { TenantGuard } from './guards/tenant.guard'
import { RolesGuard } from './guards/roles.guard'

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SessionRepository,

    // PlatformAdminGuard not global, used manual via @UseGuards
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService, AuthRepository, SessionRepository],
})
export class AuthModule {}
