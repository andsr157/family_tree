import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { TenantMembersRepository } from './tenant-members.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { UpdateMemberRoleDto, UpdateMemberStatusDto } from './dto/tenant-members.dto'

@Injectable()
export class TenantMembersService {
  constructor(
    private membersRepo: TenantMembersRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  //  List members

  async findAll(ctx: ServiceContext) {
    return this.membersRepo.findAllByTenant(ctx.tenantId)
  }

  //  Update member role

  async updateRole(targetUserId: string, dto: UpdateMemberRoleDto, ctx: ServiceContext) {
    // Only owner can change member role
    if (ctx.userRole !== 'owner') {
      throw new ForbiddenException('Hanya owner yang bisa mengubah role anggota')
    }

    // Cannot change own role
    if (targetUserId === ctx.userId) {
      throw new BadRequestException('Tidak bisa mengubah role diri sendiri')
    }

    const target = await this.membersRepo.findOne(ctx.tenantId, targetUserId)
    if (!target) {
      throw new NotFoundException('Anggota tidak ditemukan')
    }

    // Cannot change another owner's role
    if (target.role === 'owner') {
      throw new ForbiddenException(
        'Cannot change owner role. Use transfer ownership feature.',
      )
    }

    return this.membersRepo.withTransaction(async (tx) => {
      const updated = await this.membersRepo.updateRole(
        ctx.tenantId,
        targetUserId,
        dto.role,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'tenant_member',
          entityId: updated.id,
        },
        tx,
      )

      return updated
    })
  }

  //  Suspend / unsuspend member

  async updateStatus(
    targetUserId: string,
    dto: UpdateMemberStatusDto,
    ctx: ServiceContext,
  ) {
    // Only owner can suspend
    if (ctx.userRole !== 'owner') {
      throw new ForbiddenException('Hanya owner yang bisa mengubah status anggota')
    }

    if (targetUserId === ctx.userId) {
      throw new BadRequestException('Cannot change own status')
    }

    const target = await this.membersRepo.findOne(ctx.tenantId, targetUserId)
    if (!target) {
      throw new NotFoundException('Member not found')
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot suspend another owner')
    }

    return this.membersRepo.withTransaction(async (tx) => {
      const updated = await this.membersRepo.updateStatus(
        ctx.tenantId,
        targetUserId,
        dto.status,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'tenant_member',
          entityId: updated.id,
        },
        tx,
      )

      return updated
    })
  }

  //  Remove member

  async removeMember(targetUserId: string, ctx: ServiceContext) {
    if (ctx.userRole !== 'owner') {
      throw new ForbiddenException('Only owner can remove members')
    }

    if (targetUserId === ctx.userId) {
      throw new BadRequestException(
        'Cannot remove yourself. Use the "Leave Family" feature.',
      )
    }

    const target = await this.membersRepo.findOne(ctx.tenantId, targetUserId)
    if (!target) {
      throw new NotFoundException('Member not found')
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('Cannot remove another owner')
    }

    return this.membersRepo.withTransaction(async (tx) => {
      const removed = await this.membersRepo.removeMember(
        ctx.tenantId,
        targetUserId,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'tenant_member',
          entityId: removed.id,
        },
        tx,
      )

      return removed
    })
  }

  //  Leave family (self-leave)

  async leaveFamily(ctx: ServiceContext) {
    // Owner cannot leave if still the only owner
    if (ctx.userRole === 'owner') {
      const ownerCount = await this.membersRepo.countOwners(ctx.tenantId)
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'You are the only owner. ' +
            'Transfer ownership to another member before leaving.',
        )
      }
    }

    const member = await this.membersRepo.findOne(ctx.tenantId, ctx.userId)
    if (!member) {
      throw new NotFoundException('You are not a member of this family')
    }

    return this.membersRepo.withTransaction(async (tx) => {
      const removed = await this.membersRepo.removeMember(
        ctx.tenantId,
        ctx.userId,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'tenant_member',
          entityId: removed.id,
        },
        tx,
      )

      return { message: 'Successfully left the family' }
    })
  }

  //  Transfer ownership

  async transferOwnership(targetUserId: string, ctx: ServiceContext) {
    if (ctx.userRole !== 'owner') {
      throw new ForbiddenException('Only owner can transfer ownership')
    }

    if (targetUserId === ctx.userId) {
      throw new BadRequestException('Cannot transfer to yourself')
    }

    const target = await this.membersRepo.findOne(ctx.tenantId, targetUserId)
    if (!target) {
      throw new NotFoundException('Member not found')
    }

    if (target.status !== 'active') {
      throw new BadRequestException('Target user must be active')
    }

    return this.membersRepo.withTransaction(async (tx) => {
      const newOwner = await this.membersRepo.transferOwnership(
        ctx.tenantId,
        ctx.userId,
        targetUserId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'tenant_member',
          entityId: newOwner.id,
        },
        tx,
      )

      return { message: 'Ownership transferred successfully', newOwner }
    })
  }
}
