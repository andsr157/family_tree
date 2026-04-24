import { Module } from '@nestjs/common'
import { TenantInvitationsController } from './tenant-invitations.controller'
import { TenantInvitationsService } from './tenant-invitations.service'
import { TenantInvitationsRepository } from './tenant-invitations.repository'

@Module({
  controllers: [TenantInvitationsController],
  providers: [TenantInvitationsService, TenantInvitationsRepository],
  exports: [TenantInvitationsService, TenantInvitationsRepository],
})
export class TenantInvitationsModule {}
