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

  console.log('Seeding tenants...')
  await seed(db, { tenants: schema.tenants }).refine((f) => ({
    tenants: {
      count: 3,
      columns: {
        name: f.companyName(),
        slug: f.firstName(),
        description: f.loremIpsum(),
        logo_url: f.default({ defaultValue: null }),
        created_by: f.default({ defaultValue: null }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding users...')
  // password: 'password123' — bcrypt hash (cost 10)
  const PASSWORD_HASH = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
  await seed(db, { users: schema.users }).refine((f) => ({
    users: {
      count: 5,
      columns: {
        email: f.email(),
        password: f.default({ defaultValue: PASSWORD_HASH }),
        full_name: f.fullName(),
        avatar_url: f.default({ defaultValue: null }),
        email_verified_at: f.default({ defaultValue: null }),
        last_login_at: f.default({ defaultValue: null }),
        default_focal_person_id: f.default({ defaultValue: null }),
        preferred_zoom_level: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: 1 }) },
          { weight: 0.6, value: f.default({ defaultValue: 2 }) },
          { weight: 0.2, value: f.default({ defaultValue: 3 }) },
        ]),
        created_by: f.default({ defaultValue: null }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding tenant_members...')
  await seed(db, { tenantMembers: schema.tenantMembers }).refine((f) => ({
    tenantMembers: {
      count: 8,
      columns: {
        role: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: 'owner' }) },
          { weight: 0.3, value: f.default({ defaultValue: 'admin' }) },
          { weight: 0.5, value: f.default({ defaultValue: 'member' }) },
        ]),
        invited_by: f.default({ defaultValue: null }),
        joined_at: f.date({ minDate: '2024-01-01', maxDate: '2025-12-31' }),
        status: f.weightedRandom([
          { weight: 0.8, value: f.default({ defaultValue: 'active' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'suspended' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'left' }) },
        ]),
        created_by: f.default({ defaultValue: null }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding persons...')
  await seed(db, { persons: schema.persons }).refine((f) => ({
    persons: {
      count: 20,
      columns: {
        first_name: f.firstName(),
        last_name: f.lastName(),
        nickname: f.default({ defaultValue: null }),
        gender: f.weightedRandom([
          { weight: 0.48, value: f.default({ defaultValue: 'male' }) },
          { weight: 0.48, value: f.default({ defaultValue: 'female' }) },
          { weight: 0.04, value: f.default({ defaultValue: 'other' }) },
        ]),
        is_alive: f.weightedRandom([
          { weight: 0.8, value: f.default({ defaultValue: true }) },
          { weight: 0.2, value: f.default({ defaultValue: false }) },
        ]),
        bio: f.loremIpsum(),
        avatar_url: f.default({ defaultValue: null }),
        is_private: f.default({ defaultValue: false }),
        linked_user_id: f.default({ defaultValue: null }),
        is_claimable: f.default({ defaultValue: false }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding family_trees...')
  await seed(db, { familyTrees: schema.familyTrees }).refine((f) => ({
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
        default_focal_person_id: f.default({ defaultValue: null }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding tree_collaborators...')
  await seed(db, { treeCollaborators: schema.treeCollaborators }).refine((f) => ({
    treeCollaborators: {
      count: 10,
      columns: {
        role: f.weightedRandom([
          { weight: 0.2, value: f.default({ defaultValue: 'owner' }) },
          { weight: 0.3, value: f.default({ defaultValue: 'editor' }) },
          { weight: 0.5, value: f.default({ defaultValue: 'viewer' }) },
        ]),
        invited_by: f.default({ defaultValue: null }),
        accepted_at: f.date({ minDate: '2024-01-01', maxDate: '2025-12-31' }),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding relationships...')
  await seed(db, { relationships: schema.relationships }).refine((f) => ({
    relationships: {
      count: 15,
      columns: {
        type: f.weightedRandom([
          { weight: 0.5, value: f.default({ defaultValue: 'parent-child' }) },
          { weight: 0.5, value: f.default({ defaultValue: 'couple' }) },
        ]),
        subtype: f.default({ defaultValue: null }),
        start_date: f.date({ minDate: '1950-01-01', maxDate: '2010-01-01' }),
        end_date: f.default({ defaultValue: null }),
        order: f.default({ defaultValue: 1 }),
        notes: f.default({ defaultValue: null }),
        confidence: f.weightedRandom([
          { weight: 0.7, value: f.default({ defaultValue: 'confirmed' }) },
          { weight: 0.15, value: f.default({ defaultValue: 'probable' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'estimated' }) },
          { weight: 0.05, value: f.default({ defaultValue: 'disputed' }) },
        ]),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('Seeding events...')
  await seed(db, { events: schema.events }).refine((f) => ({
    events: {
      count: 30,
      columns: {
        relationship_id: f.default({ defaultValue: null }),
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
        date_text: f.default({ defaultValue: null }),
        date_qualifier: f.weightedRandom([
          { weight: 0.6, value: f.default({ defaultValue: 'exact' }) },
          { weight: 0.2, value: f.default({ defaultValue: 'about' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'before' }) },
          { weight: 0.1, value: f.default({ defaultValue: 'after' }) },
        ]),
        place: f.city(),
        place_detail: f.default({ defaultValue: null }),
        description: f.loremIpsum(),
        is_primary: f.weightedRandom([
          { weight: 0.3, value: f.default({ defaultValue: true }) },
          { weight: 0.7, value: f.default({ defaultValue: false }) },
        ]),
        updated_by: f.default({ defaultValue: null }),
        deleted_at: f.default({ defaultValue: null }),
        deleted_by: f.default({ defaultValue: null }),
      },
    },
  }))

  console.log('✅ Seeding complete!')
  await pool.end()
}

main().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
