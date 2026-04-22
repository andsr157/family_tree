import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { FamilyTreesRepository } from './trees.repository'
import { GraphRepository } from './graph.repository'
import { TreeCollaboratorsRepository } from '@/modules/tree-collaborators/tree-collaborators.repository'
import { PersonsRepository } from '@/modules/persons/persons.repository'
import { AuditLogsRepository } from '@/modules/audit-logs/audit-logs.repository'
import type { ServiceContext } from '@/common/types'
import type { CreateFamilyTreeDto } from './dto/create-trees.dto'
import type { UpdateFamilyTreeDto } from './dto/update-trees.dto'
import type { QueryFamilyTreeDto } from './dto/query-trees.dto'
import type { GraphQueryDto, GraphExpandDto } from './dto/query-graph.dto'

@Injectable()
export class FamilyTreesService {
  constructor(
    private familyTreesRepo: FamilyTreesRepository,
    private graphRepo: GraphRepository,
    private collaboratorsRepo: TreeCollaboratorsRepository,
    private personsRepo: PersonsRepository,
    private auditLogsRepo: AuditLogsRepository,
  ) {}

  async findAll(ctx: ServiceContext, query: QueryFamilyTreeDto) {
    const [items, totalItems] = await Promise.all([
      this.familyTreesRepo.findManyForUser(ctx.userId, ctx.tenantId, query),
      this.familyTreesRepo.countForUser(ctx.tenantId),
    ])

    const totalPages = Math.ceil(totalItems / query.pageSize)

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    }
  }

  async findById(id: string, ctx: ServiceContext) {
    const tree = await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner', 'editor', 'viewer'])
    return tree
  }

  async create(dto: CreateFamilyTreeDto, ctx: ServiceContext) {
    // Verify root person exists in this tenant
    const rootPerson = await this.personsRepo.findById(ctx.tenantId, dto.rootPersonId)
    if (!rootPerson) {
      throw new NotFoundException('Root person not found in this tenant')
    }

    // Verify defaultFocalPersonId if provided
    if (dto.defaultFocalPersonId) {
      const focalPerson = await this.personsRepo.findById(
        ctx.tenantId,
        dto.defaultFocalPersonId,
      )
      if (!focalPerson) {
        throw new NotFoundException('Default focal person not found in this tenant')
      }
    }

    return this.familyTreesRepo.withTransaction(async (tx) => {
      const tree = await this.familyTreesRepo.create(
        {
          ...dto,
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        },
        tx,
      )

      // Creator is automatically the owner collaborator
      await this.collaboratorsRepo.create(
        {
          treeId: tree.id,
          userId: ctx.userId,
          role: 'owner',
          invitedBy: ctx.userId,
        },
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'CREATE',
          entityType: 'family_tree',
          entityId: tree.id,
        },
        tx,
      )

      return tree
    })
  }

  async update(id: string, dto: UpdateFamilyTreeDto, ctx: ServiceContext) {
    await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner', 'editor'])

    // Verify defaultFocalPersonId if provided
    if (dto.defaultFocalPersonId) {
      const focalPerson = await this.personsRepo.findById(
        ctx.tenantId,
        dto.defaultFocalPersonId,
      )
      if (!focalPerson) {
        throw new NotFoundException('Default focal person not found in this tenant')
      }
    }

    return this.familyTreesRepo.withTransaction(async (tx) => {
      const updated = await this.familyTreesRepo.update(
        id,
        ctx.tenantId,
        { ...dto, updatedBy: ctx.userId },
        tx,
      )

      if (!updated) {
        throw new NotFoundException('Family tree not found or already deleted')
      }

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'UPDATE',
          entityType: 'family_tree',
          entityId: id,
        },
        tx,
      )

      return updated
    })
  }

  async softDelete(id: string, ctx: ServiceContext) {
    await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner'])

    return this.familyTreesRepo.withTransaction(async (tx) => {
      const deleted = await this.familyTreesRepo.softDelete(
        id,
        ctx.tenantId,
        ctx.userId,
        tx,
      )

      await this.auditLogsRepo.create(
        {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          action: 'DELETE',
          entityType: 'family_tree',
          entityId: id,
        },
        tx,
      )

      return deleted
    })
  }

  // Graph visualization

  async getGraph(id: string, dto: GraphQueryDto, ctx: ServiceContext) {
    const tree = await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner', 'editor', 'viewer'])

    // Use defaultFocalPersonId from tree if not specified, fallback to rootPersonId
    const focalPersonId =
      dto.focalPersonId ?? tree.defaultFocalPersonId ?? tree.rootPersonId

    // Verify focal person exists in tenant
    const focalPerson = await this.personsRepo.findById(ctx.tenantId, focalPersonId)
    if (!focalPerson) {
      throw new NotFoundException('Focal person not found')
    }

    return this.graphRepo.fetchGraph(focalPersonId, ctx.tenantId, dto.depth)
  }

  async expandGraph(id: string, dto: GraphExpandDto, ctx: ServiceContext) {
    await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner', 'editor', 'viewer'])

    const person = await this.personsRepo.findById(ctx.tenantId, dto.personId)
    if (!person) {
      throw new NotFoundException('Person not found')
    }

    if (dto.direction === 'ancestors') {
      return this.graphRepo.expandAncestors(dto.personId, ctx.tenantId, dto.currentDepth)
    } else {
      return this.graphRepo.expandDescendants(
        dto.personId,
        ctx.tenantId,
        dto.currentDepth,
      )
    }
  }

  // Node position (hybrid layout)

  async updateNodePositions(
    id: string,
    positions: Record<string, { x: number; y: number }>,
    ctx: ServiceContext,
  ) {
    const tree = await this.findTreeOrThrow(id, ctx.tenantId)
    await this.assertTreeAccess(id, ctx.userId, ['owner', 'editor'])

    return this.familyTreesRepo.updateNodePositions(
      id,
      ctx.tenantId,
      positions,
      tree.settings as Record<string, unknown>,
    )
  }

  private async findTreeOrThrow(id: string, tenantId: string) {
    const tree = await this.familyTreesRepo.findById(id, tenantId)
    if (!tree) {
      throw new NotFoundException('Family tree not found')
    }
    return tree
  }

  private async assertTreeAccess(treeId: string, userId: string, allowedRoles: string[]) {
    const role = await this.collaboratorsRepo.findUserRole(treeId, userId)
    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(
        `You do not have permission to perform this action on this family tree`,
      )
    }
    return role
  }
}
