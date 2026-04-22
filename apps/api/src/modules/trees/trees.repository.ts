import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { familyTrees, treeCollaborators } from '@/db/schema'
import { DATABASE } from '@/db/database.module'
import type {
  DatabaseClient,
  DatabaseTx,
  TransactionCallback,
} from '@/db/database.module'
import type { CreateFamilyTreeDto } from './dto/create-trees.dto'
import type { UpdateFamilyTreeDto } from './dto/update-trees.dto'
import type { QueryFamilyTreeDto } from './dto/query-trees.dto'

@Injectable()
export class FamilyTreesRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  // Find trees the user has access to (owns or collaborates on)
  async findManyForUser(userId: string, tenantId: string, query: QueryFamilyTreeDto) {
    const { page, pageSize } = query
    const offset = pageSize * (page - 1)

    return this.db.query.familyTrees.findMany({
      where: and(eq(familyTrees.tenantId, tenantId), isNull(familyTrees.deletedAt)),
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
      .where(and(eq(familyTrees.tenantId, tenantId), isNull(familyTrees.deletedAt)))
    return result[0]?.count ?? 0
  }

  async findById(id: string, tenantId: string) {
    return this.db.query.familyTrees.findFirst({
      where: and(
        eq(familyTrees.id, id),
        eq(familyTrees.tenantId, tenantId),
        isNull(familyTrees.deletedAt),
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
        and(
          eq(familyTrees.id, id),
          eq(familyTrees.tenantId, tenantId),
          isNull(familyTrees.deletedAt),
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
        and(
          eq(familyTrees.id, id),
          eq(familyTrees.tenantId, tenantId),
          isNull(familyTrees.deletedAt),
        ),
      )
      .returning()
    return tree
  }

  // Node position persistence (hybrid layout)
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
        and(
          eq(familyTrees.id, id),
          eq(familyTrees.tenantId, tenantId),
          isNull(familyTrees.deletedAt),
        ),
      )
      .returning()
    return tree
  }

  private getClient(tx?: DatabaseTx) {
    return tx ?? this.db
  }
}
