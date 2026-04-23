import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { BaseRepository } from '@/common/base/base.repository'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient, DatabaseTx } from '@/db/database.module'
import { familyTrees, treeCollaborators } from '@/db/schema'
import type { CreateFamilyTreeDto } from './dto/create-trees.dto'
import type { UpdateFamilyTreeDto } from './dto/update-trees.dto'
import type { QueryFamilyTreeDto } from './dto/query-trees.dto'

@Injectable()
export class FamilyTreesRepository extends BaseRepository {
  constructor(@Inject(DATABASE) protected override readonly db: DatabaseClient) {
    super(db)
  }

  async findManyForUser(userId: string, tenantId: string, query: QueryFamilyTreeDto) {
    const { page, pageSize } = query
    const offset = pageSize * (page - 1)

    return this.db.query.familyTrees.findMany({
      where: this.buildScopedWhere(familyTrees.tenantId, tenantId, familyTrees.deletedAt),
      limit: pageSize,
      offset,
      orderBy: (ft, { desc }) => [desc(ft.createdAt)],
      with: {
        rootPerson: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        collaborators: {
          where: and(
            eq(treeCollaborators.userId, userId),
            isNull(treeCollaborators.deletedAt),
          ),
          columns: { role: true },
          limit: 1,
        },
      },
    })
  }

  async countForUser(tenantId: string) {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(familyTrees)
      .where(this.buildScopedWhere(familyTrees.tenantId, tenantId, familyTrees.deletedAt))
    return result[0]?.count ?? 0
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.familyTrees.findFirst({
      where: this.buildScopedWhere(
        familyTrees.tenantId,
        tenantId,
        familyTrees.deletedAt,
        eq(familyTrees.id, id),
      ),
      with: {
        rootPerson: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            gender: true,
          },
        },
        collaborators: {
          where: isNull(treeCollaborators.deletedAt),
          with: {
            user: {
              columns: {
                id: true,
                fullName: true,
                avatarUrl: true,
                email: true,
              },
            },
          },
        },
      },
    })
  }

  async create(
    data: CreateFamilyTreeDto & {
      tenantId: string
      createdBy: string
      updatedBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [tree] = await client
      .insert(familyTrees)
      .values({ ...data, updatedAt: new Date() })
      .returning()
    return tree
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateFamilyTreeDto & { updatedBy: string },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [tree] = await client
      .update(familyTrees)
      .set({ ...data, updatedAt: new Date() })
      .where(
        this.buildScopedWhere(
          familyTrees.tenantId,
          tenantId,
          familyTrees.deletedAt,
          eq(familyTrees.id, id),
        ),
      )
      .returning()
    return tree
  }

  async softDelete(id: string, tenantId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [tree] = await client
      .update(familyTrees)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(
        this.buildScopedWhere(
          familyTrees.tenantId,
          tenantId,
          familyTrees.deletedAt,
          eq(familyTrees.id, id),
        ),
      )
      .returning()
    return tree
  }

  async updateNodePositions(
    id: string,
    tenantId: string,
    positions: Record<string, { x: number; y: number }>,
    currentSettings: Record<string, unknown>,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [tree] = await client
      .update(familyTrees)
      .set({
        settings: {
          ...currentSettings,
          nodePositions: positions,
        },
        updatedAt: new Date(),
      })
      .where(
        this.buildScopedWhere(
          familyTrees.tenantId,
          tenantId,
          familyTrees.deletedAt,
          eq(familyTrees.id, id),
        ),
      )
      .returning()
    return tree
  }
}
