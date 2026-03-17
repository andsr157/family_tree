import 'dotenv/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { seed, reset } from 'drizzle-seed'
import * as schema from './schema'

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  const db = drizzle({ client: pool })

  console.log('Resetting database...')
  await reset(db, schema)

  // password: 'password123' — bcrypt hash (cost 10)
  const PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

  console.log('Seeding base tables...')
  await seed(db, {
    tenants: schema.tenants,
    users: schema.users,
    persons: schema.persons,
    familyTrees: schema.familyTrees,
    events: schema.events,
  }).refine((f) => ({
    tenants: {
      count: 3,
      columns: {
        name: f.companyName(),
        slug: f.firstName(),
        description: f.loremIpsum(),
        logoUrl: f.default({ defaultValue: null }),
        createdBy: f.default({ defaultValue: null }),
        updatedBy: f.default({ defaultValue: null }),
        deletedAt: f.default({ defaultValue: null }),
        deletedBy: f.default({ defaultValue: null }),
      },
    },
    users: {
      count: 5,
      columns: {
        email: f.email(),
        password: f.default({ defaultValue: PASSWORD_HASH }),
        fullName: f.fullName(),
        avatarUrl: f.default({ defaultValue: null }),
        emailVerifiedAt: f.default({ defaultValue: null }),
        lastLoginAt: f.default({ defaultValue: null }),
        isPlatformAdmin: f.default({ defaultValue: false }),
        defaultFocalPersonId: f.default({ defaultValue: null }),
        preferredZoomLevel: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: 1 }) },
          { weight: 0.6, value: f.default({ defaultValue: 2 }) },
          { weight: 0.2, value: f.default({ defaultValue: 3 }) },
        ]),
        createdBy: f.default({ defaultValue: null }),
        updatedBy: f.default({ defaultValue: null }),
        deletedAt: f.default({ defaultValue: null }),
        deletedBy: f.default({ defaultValue: null }),
      },
    },
    persons: {
      count: 20,
      columns: {
        firstName: f.firstName(),
        lastName: f.lastName(),
        nickname: f.default({ defaultValue: null }),
        gender: f.weightedRandom([
          { weight: 0.48, value: f.default({ defaultValue: 'male' }) },
          { weight: 0.48, value: f.default({ defaultValue: 'female' }) },
          { weight: 0.04, value: f.default({ defaultValue: 'other' }) },
        ]),
        isAlive: f.weightedRandom([
          { weight: 0.8, value: f.default({ defaultValue: true }) },
          { weight: 0.2, value: f.default({ defaultValue: false }) },
        ]),
        bio: f.loremIpsum(),
        avatarUrl: f.default({ defaultValue: null }),
        isPrivate: f.default({ defaultValue: false }),
        linkedUserId: f.default({ defaultValue: null }),
        isClaimable: f.default({ defaultValue: false }),
        updatedBy: f.default({ defaultValue: null }),
        deletedAt: f.default({ defaultValue: null }),
        deletedBy: f.default({ defaultValue: null }),
      },
    },
    familyTrees: {
      count: 4,
      columns: {
        name: f.companyName(),
        description: f.loremIpsum(),
        visibility: f.weightedRandom([
          { weight: 0.5, value: f.default({ defaultValue: 'private' }) },
          { weight: 0.3, value: f.default({ defaultValue: 'family' }) },
          { weight: 0.2, value: f.default({ defaultValue: 'public' }) },
        ]),
        settings: f.default({ defaultValue: {} }),
        defaultFocalPersonId: f.default({ defaultValue: null }),
        updatedBy: f.default({ defaultValue: null }),
        deletedAt: f.default({ defaultValue: null }),
        deletedBy: f.default({ defaultValue: null }),
      },
    },
    events: {
      count: 30,
      columns: {
        relationshipId: f.default({ defaultValue: null }),
        type: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: 'birth' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'death' }) },
          { weight: 0.15, value: f.default({ defaultValue: 'marriage' }) },
          { weight: 0.05, value: f.default({ defaultValue: 'divorce' }) },
          { weight: 0.15, value: f.default({ defaultValue: 'residence' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'education' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'occupation' }) },
          { weight: 0.05, value: f.default({ defaultValue: 'religion' }) },
          { weight: 0.05, value: f.default({ defaultValue: 'burial' }) },
          { weight: 0.05, value: f.default({ defaultValue: 'other' }) },
        ]),
        date: f.date({ minDate: '1900-01-01', maxDate: '2025-12-31' }),
        dateText: f.default({ defaultValue: null }),
        dateQualifier: f.weightedRandom([
          { weight: 0.6, value: f.default({ defaultValue: 'exact' }) },
          { weight: 0.2, value: f.default({ defaultValue: 'about' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'before' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'after' }) },
        ]),
        place: f.city(),
        placeDetail: f.default({ defaultValue: null }),
        description: f.loremIpsum(),
        isPrimary: f.weightedRandom([
          { weight: 0.3, value: f.default({ defaultValue: true }) },
          { weight: 0.7, value: f.default({ defaultValue: false }) },
        ]),
        updatedBy: f.default({ defaultValue: null }),
        deletedAt: f.default({ defaultValue: null }),
        deletedBy: f.default({ defaultValue: null }),
      },
    },
  }))

  // Fetch generated IDs for manual junction table inserts
  const tenantRows = await db.select({ id: schema.tenants.id }).from(schema.tenants)
  const userRows = await db.select({ id: schema.users.id }).from(schema.users)
  const personRows = await db.select({ id: schema.persons.id }).from(schema.persons)
  const treeRows = await db.select({ id: schema.familyTrees.id }).from(schema.familyTrees)

  // Manual inserts guarantee unique (tenantId, userId) pairs
  console.log('Seeding tenant_members...')
  await db.insert(schema.tenantMembers).values([
    { tenantId: tenantRows[0].id, userId: userRows[0].id, role: 'owner', status: 'active' },
    { tenantId: tenantRows[0].id, userId: userRows[1].id, role: 'admin', status: 'active' },
    { tenantId: tenantRows[0].id, userId: userRows[2].id, role: 'member', status: 'active' },
    { tenantId: tenantRows[1].id, userId: userRows[0].id, role: 'owner', status: 'active' },
    { tenantId: tenantRows[1].id, userId: userRows[3].id, role: 'member', status: 'active' },
    { tenantId: tenantRows[2].id, userId: userRows[1].id, role: 'owner', status: 'active' },
    { tenantId: tenantRows[2].id, userId: userRows[4].id, role: 'admin', status: 'active' },
    { tenantId: tenantRows[2].id, userId: userRows[2].id, role: 'member', status: 'active' },
  ])

  // Manual inserts guarantee unique (treeId, userId) pairs
  console.log('Seeding tree_collaborators...')
  await db.insert(schema.treeCollaborators).values([
    { treeId: treeRows[0].id, userId: userRows[0].id, role: 'owner' },
    { treeId: treeRows[0].id, userId: userRows[1].id, role: 'editor' },
    { treeId: treeRows[1].id, userId: userRows[0].id, role: 'owner' },
    { treeId: treeRows[1].id, userId: userRows[2].id, role: 'viewer' },
    { treeId: treeRows[2].id, userId: userRows[1].id, role: 'owner' },
    { treeId: treeRows[2].id, userId: userRows[3].id, role: 'viewer' },
    { treeId: treeRows[3].id, userId: userRows[3].id, role: 'owner' },
    { treeId: treeRows[3].id, userId: userRows[4].id, role: 'editor' },
    { treeId: treeRows[3].id, userId: userRows[0].id, role: 'viewer' },
    { treeId: treeRows[2].id, userId: userRows[4].id, role: 'editor' },
  ])

  // Manual inserts guarantee non-self-referencing unique pairs
  console.log('Seeding relationships...')
  const relPairs: [number, number, 'parent-child' | 'couple'][] = [
    [0, 1, 'couple'],
    [0, 2, 'parent-child'],
    [0, 3, 'parent-child'],
    [1, 4, 'parent-child'],
    [1, 5, 'parent-child'],
    [2, 6, 'couple'],
    [3, 7, 'parent-child'],
    [4, 8, 'couple'],
    [5, 9, 'parent-child'],
    [6, 10, 'parent-child'],
    [7, 11, 'couple'],
    [8, 12, 'parent-child'],
    [9, 13, 'parent-child'],
    [10, 14, 'couple'],
    [11, 15, 'parent-child'],
  ]
  await db.insert(schema.relationships).values(
    relPairs.map(([i, j, type], idx) => ({
      tenantId: tenantRows[idx % tenantRows.length].id,
      person1Id: personRows[i].id,
      person2Id: personRows[j].id,
      type,
      confidence: 'confirmed' as const,
    })),
  )

  console.log('✅ Seeding complete!')
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
