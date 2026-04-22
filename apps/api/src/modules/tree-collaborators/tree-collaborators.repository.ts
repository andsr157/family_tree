import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { treeCollaborators } from '@/db/schema'
import { DATABASE } from '@/db/database.module'
import type {
  DatabaseClient,
  DatabaseTx,
  TransactionCallback,
} from '@/db/database.module'
import type { CollaboratorRole } from './dto/collaborator.dto'

@Injectable()
export class TreeCollaboratorsRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  async withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.db.transaction(callback)
  }

  async findByTree(treeId: string) {
    return this.db.query.treeCollaborators.findMany({
      where: and(
        eq(treeCollaborators.treeId, treeId),
        isNull(treeCollaborators.deletedAt),
      ),
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: (tc, { asc }) => [asc(tc.invitedAt)],
    })
  }

  async findOne(treeId: string, userId: string) {
    return this.db.query.treeCollaborators.findFirst({
      where: and(
        eq(treeCollaborators.treeId, treeId),
        eq(treeCollaborators.userId, userId),
        isNull(treeCollaborators.deletedAt),
      ),
    })
  }

  async findUserRole(treeId: string, userId: string): Promise<CollaboratorRole | null> {
    const collab = await this.db.query.treeCollaborators.findFirst({
      where: and(
        eq(treeCollaborators.treeId, treeId),
        eq(treeCollaborators.userId, userId),
        isNull(treeCollaborators.deletedAt),
      ),
      columns: { role: true },
    })
    return (collab?.role as CollaboratorRole) ?? null
  }

  async create(
    data: {
      treeId: string
      userId: string
      role: CollaboratorRole
      invitedBy: string
    },
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [collab] = await client
      .insert(treeCollaborators)
      .values({
        treeId: data.treeId,
        userId: data.userId,
        role: data.role,
        invitedBy: data.invitedBy,
        invitedAt: new Date(),
        acceptedAt: new Date(), // auto-accept for now; invitation flow can be added later
        createdBy: data.invitedBy,
      })
      .returning()
    return collab
  }

  async updateRole(
    treeId: string,
    userId: string,
    role: CollaboratorRole,
    updatedBy: string,
    tx?: DatabaseTx,
  ) {
    const client = this.getClient(tx)
    const [collab] = await client
      .update(treeCollaborators)
      .set({ role, updatedBy, updatedAt: new Date() })
      .where(
        and(
          eq(treeCollaborators.treeId, treeId),
          eq(treeCollaborators.userId, userId),
          isNull(treeCollaborators.deletedAt),
        ),
      )
      .returning()
    return collab
  }

  async remove(treeId: string, userId: string, deletedBy: string, tx?: DatabaseTx) {
    const client = this.getClient(tx)
    const [collab] = await client
      .update(treeCollaborators)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
        updatedBy: deletedBy,
      })
      .where(
        and(
          eq(treeCollaborators.treeId, treeId),
          eq(treeCollaborators.userId, userId),
          isNull(treeCollaborators.deletedAt),
        ),
      )
      .returning()
    return collab
  }

  private getClient(tx?: DatabaseTx) {
    return tx ?? this.db
  }
}
