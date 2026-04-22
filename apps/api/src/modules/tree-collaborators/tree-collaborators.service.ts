import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { TreeCollaboratorsRepository } from './tree-collaborators.repository'
import { FamilyTreesRepository } from '@/modules/trees/trees.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { InviteCollaboratorDto, UpdateCollaboratorDto } from './dto/collaborator.dto'

@Injectable()
export class TreeCollaboratorsService {
  constructor(
    private collaboratorsRepo: TreeCollaboratorsRepository,
    private familyTreesRepo: FamilyTreesRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findByTree(treeId: string, ctx: ServiceContext) {
    await this.assertTreeExists(treeId, ctx.tenantId)
    await this.assertTreeAccess(treeId, ctx.userId, ['owner', 'editor', 'viewer'])
    return this.collaboratorsRepo.findByTree(treeId)
  }

  async invite(treeId: string, dto: InviteCollaboratorDto, ctx: ServiceContext) {
    await this.assertTreeExists(treeId, ctx.tenantId)
    await this.assertTreeAccess(treeId, ctx.userId, ['owner'])

    // Check if user is already a collaborator
    const existing = await this.collaboratorsRepo.findOne(treeId, dto.userId)
    if (existing) {
      throw new ConflictException('User is already a collaborator on this tree')
    }

    return this.collaboratorsRepo.withTransaction(async (tx) => {
      const collab = await this.collaboratorsRepo.create(
        {
          treeId,
          userId: dto.userId,
          role: dto.role,
          invitedBy: ctx.userId,
        },
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'tree_collaborator',
          entityId: collab.id,
        },
        tx,
      )

      return collab
    })
  }

  async updateRole(
    treeId: string,
    targetUserId: string,
    dto: UpdateCollaboratorDto,
    ctx: ServiceContext,
  ) {
    await this.assertTreeExists(treeId, ctx.tenantId)
    await this.assertTreeAccess(treeId, ctx.userId, ['owner'])

    // Cannot change own role
    if (targetUserId === ctx.userId) {
      throw new BadRequestException('You cannot change your own role')
    }

    // Cannot change the role of another owner
    const targetRole = await this.collaboratorsRepo.findUserRole(treeId, targetUserId)
    if (!targetRole) {
      throw new NotFoundException('Collaborator not found on this tree')
    }
    if (targetRole === 'owner') {
      throw new ForbiddenException('Cannot change the role of another owner')
    }

    return this.collaboratorsRepo.withTransaction(async (tx) => {
      const updated = await this.collaboratorsRepo.updateRole(
        treeId,
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
          entityType: 'tree_collaborator',
          entityId: updated.id,
        },
        tx,
      )

      return updated
    })
  }

  async remove(treeId: string, targetUserId: string, ctx: ServiceContext) {
    await this.assertTreeExists(treeId, ctx.tenantId)

    const requesterRole = await this.collaboratorsRepo.findUserRole(treeId, ctx.userId)
    const targetRole = await this.collaboratorsRepo.findUserRole(treeId, targetUserId)

    if (!targetRole) {
      throw new NotFoundException('Collaborator not found on this tree')
    }

    // User can remove themselves (leave tree) unless they are the only owner
    const isSelf = targetUserId === ctx.userId

    if (isSelf) {
      if (targetRole === 'owner') {
        // Check if there are other owners
        const allCollaborators = await this.collaboratorsRepo.findByTree(treeId)
        const otherOwners = allCollaborators.filter(
          (c) => c.role === 'owner' && c.userId !== ctx.userId,
        )
        if (otherOwners.length === 0) {
          throw new BadRequestException(
            'You are the only owner. Transfer ownership before leaving, or delete the tree.',
          )
        }
      }
    } else {
      // Removing someone else requires owner role
      if (requesterRole !== 'owner') {
        throw new ForbiddenException('Only owners can remove other collaborators')
      }
      // Cannot remove another owner
      if (targetRole === 'owner') {
        throw new ForbiddenException('Cannot remove another owner from the tree')
      }
    }

    return this.collaboratorsRepo.withTransaction(async (tx) => {
      const removed = await this.collaboratorsRepo.remove(
        treeId,
        targetUserId,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'tree_collaborator',
          entityId: removed.id,
        },
        tx,
      )

      return removed
    })
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async assertTreeExists(treeId: string, tenantId: string) {
    const tree = await this.familyTreesRepo.findById(treeId, tenantId)
    if (!tree) throw new NotFoundException('Family tree not found')
    return tree
  }

  private async assertTreeAccess(treeId: string, userId: string, allowedRoles: string[]) {
    const role = await this.collaboratorsRepo.findUserRole(treeId, userId)
    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action on this family tree',
      )
    }
    return role
  }
}
