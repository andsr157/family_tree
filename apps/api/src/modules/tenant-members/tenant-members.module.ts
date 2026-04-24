import { Module } from '@nestjs/common'
import { TenantMembersController } from './tenant-members.controller'
import { TenantMembersService } from './tenant-members.service'
import { TenantMembersRepository } from './tenant-members.repository'
import { AuditLogsModule } from '@/modules/audit-logs/audit-logs.module'

@Module({
  imports: [AuditLogsModule],
  controllers: [TenantMembersController],
  providers: [TenantMembersService, TenantMembersRepository],
  exports: [TenantMembersService, TenantMembersRepository],
})
export class TenantMembersModule {}
