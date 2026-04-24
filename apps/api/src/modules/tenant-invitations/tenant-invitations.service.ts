import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { TenantInvitationsRepository } from './tenant-invitations.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateInvitationDto } from './dto/create-invitation'
import { formatCode } from '@/common/utils/invitation-code.utils'

@Injectable()
export class TenantInvitationsService {
  constructor(
    private invitationsRepo: TenantInvitationsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  // ─── List all active codes in tenant ─────────────────────────────────────

  async findAll(ctx: ServiceContext) {
    const invitations = await this.invitationsRepo.findAllByTenant(ctx.tenantId)

    // Format code for display (add dashes)
    return invitations.map((inv) => ({
      ...inv,
      codeFormatted: formatCode(inv.code),
      isExpired: inv.expiresAt ? new Date() > inv.expiresAt : false,
      isMaxedOut: inv.maxUses !== null ? inv.usedCount >= inv.maxUses : false,
    }))
  }

  // ─── Create new invitation code ───────────────────────────────────────────

  async create(dto: CreateInvitationDto, ctx: ServiceContext) {
    // Only owner and admin can create invitations
    if (ctx.userRole === 'member') {
      throw new ForbiddenException('Hanya owner atau admin yang bisa membuat undangan')
    }

    return this.invitationsRepo.withTransaction(async (tx) => {
      const invitation = await this.invitationsRepo.create(
        {
          ...dto,
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
        },
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'tenant_member',
          entityId: invitation.id,
        },
        tx,
      )

      return {
        ...invitation,
        // Return code in human-readable format
        codeFormatted: formatCode(invitation.code),
      }
    })
  }

  // ─── Deactivate invitation code ───────────────────────────────────────────

  async deactivate(id: string, ctx: ServiceContext) {
    if (ctx.userRole === 'member') {
      throw new ForbiddenException('Only owner or admin can deactivate invitations')
    }

    const invitation = await this.invitationsRepo.findById(id, ctx.tenantId)
    if (!invitation) {
      throw new NotFoundException('Invitation code not found')
    }

    return this.invitationsRepo.withTransaction(async (tx) => {
      const deactivated = await this.invitationsRepo.deactivate(id, ctx.tenantId, tx)

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'tenant_member',
          entityId: id,
        },
        tx,
      )

      return deactivated
    })
  }

  // ─── Validate code (public — for preview before join) ─────────────────────

  /**
   * Used by public endpoint to preview tenant info
   * before user decides to join.
   * Does not expose sensitive data.
   */
  async validateCode(normalizedCode: string) {
    const invitation = await this.invitationsRepo.findByCode(normalizedCode)

    if (!invitation) {
      return { valid: false, reason: 'Code not found or not active' }
    }

    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      return { valid: false, reason: 'Invitation code has expired' }
    }

    if (invitation.maxUses !== null && invitation.usedCount >= invitation.maxUses) {
      return { valid: false, reason: 'Invitation code has reached usage limit' }
    }

    // Return minimal info — do not expose tenant ID or sensitive details
    return {
      valid: true,
      role: invitation.role,
      label: invitation.label,
    }
  }
}
