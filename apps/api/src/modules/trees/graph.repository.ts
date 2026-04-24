import { Injectable, Inject } from '@nestjs/common'
import { and, eq, isNull, inArray, notInArray, sql } from 'drizzle-orm'
import { DATABASE } from '@/db/database.module'
import type { DatabaseClient } from '@/db/database.module'
import { relationships } from '@/db/schema'
import type { GraphNode, GraphEdge, GraphResponse } from './dto/query-graph.dto'

interface RawPersonRow {
  id: string
  first_name: string
  last_name: string | null
  nickname: string | null
  gender: string
  is_alive: boolean
  avatar_url: string | null
  is_linked_to_user: boolean
  is_claimable: boolean
  is_private: boolean
  generation: number
  depth: number
  [key: string]: unknown
}

interface RawRelationshipRow {
  id: string
  person1_id: string
  person2_id: string
  type: string
  subtype: string | null
  confidence: string
  [key: string]: unknown
}

@Injectable()
export class GraphRepository {
  constructor(@Inject(DATABASE) private db: DatabaseClient) {}

  // Main graph fetch: focal person + N generations up & down
  async fetchGraph(
    focalPersonId: string,
    tenantId: string,
    depth: number,
  ): Promise<GraphResponse> {
    console.log('🚀 fetchGraph START', { focalPersonId, tenantId, depth })

    let ancestors: Awaited<ReturnType<typeof this.fetchAncestors>>
    let descendants: Awaited<ReturnType<typeof this.fetchDescendants>>

    try {
      ;[ancestors, descendants] = await Promise.all([
        this.fetchAncestors(focalPersonId, tenantId, depth),
        this.fetchDescendants(focalPersonId, tenantId, depth),
      ])
    } catch (err) {
      console.error('❌ fetchAncestors/fetchDescendants threw:', err)
      throw err
    }

    console.log('📦 ancestors', ancestors.persons.length)
    console.log('📦 descendants', descendants.persons.length)

    const personMap = new Map<string, RawPersonRow>()
    const focalPerson =
      ancestors.persons.find((p) => p.id === focalPersonId) ??
      descendants.persons.find((p) => p.id === focalPersonId)

    if (focalPerson) {
      personMap.set(focalPerson.id, { ...focalPerson, generation: 0 })
    }
    for (const p of ancestors.persons) {
      if (!personMap.has(p.id)) personMap.set(p.id, p)
    }
    for (const p of descendants.persons) {
      if (!personMap.has(p.id)) personMap.set(p.id, p)
    }

    const edgeMap = new Map<string, RawRelationshipRow>()
    for (const e of [...ancestors.relationships, ...descendants.relationships]) {
      edgeMap.set(e.id, e)
    }

    const ancestorPersonIds = new Set(ancestors.persons.map((p) => p.id))
    const descendantPersonIds = new Set(descendants.persons.map((p) => p.id))

    let hasMoreAncestorsMap = new Map<string, boolean>()
    let hasMoreDescendantsMap = new Map<string, boolean>()

    try {
      if (ancestorPersonIds.size > 0) {
        hasMoreAncestorsMap = await this.checkHasMoreAncestors(
          Array.from(ancestorPersonIds),
          tenantId,
          depth,
          ancestors.persons,
        )
      }
      if (descendantPersonIds.size > 0) {
        hasMoreDescendantsMap = await this.checkHasMoreDescendants(
          Array.from(descendantPersonIds),
          tenantId,
          depth,
          descendants.persons,
        )
      }
    } catch (err) {
      console.error('❌ checkHasMore threw:', err)
      throw err
    }

    let nodes: GraphNode[]
    let edges: GraphEdge[]
    try {
      nodes = Array.from(personMap.values()).map((p) =>
        this.toGraphNode(p, hasMoreAncestorsMap, hasMoreDescendantsMap),
      )
      edges = Array.from(edgeMap.values()).map((r) => this.toGraphEdge(r))
    } catch (err) {
      console.error('❌ toGraphNode/toGraphEdge threw:', err)
      throw err
    }

    console.log('✅ FINAL', { nodes: nodes.length, edges: edges.length })

    return {
      nodes,
      edges,
      focalPersonId,
      totalNodes: nodes.length,
    }
  }

  // Expand one level - for async expand/collapse
  async expandAncestors(
    personId: string,
    tenantId: string,
    currentDepth: number,
  ): Promise<GraphResponse> {
    const result = await this.fetchAncestors(personId, tenantId, currentDepth + 1)

    // Filter — only return the NEW generation (currentDepth + 1)
    const newPersons = result.persons.filter((p) => p.generation === currentDepth + 1)
    const newPersonIds = new Set(newPersons.map((p) => p.id))

    const relevantRelationships = result.relationships.filter(
      (r) => newPersonIds.has(r.person1_id) || newPersonIds.has(r.person2_id),
    )

    const hasMoreMap = await this.checkHasMoreAncestors(
      newPersons.map((p) => p.id),
      tenantId,
      currentDepth + 1,
      newPersons,
    )

    const nodes: GraphNode[] = newPersons.map((p) =>
      this.toGraphNode(p, hasMoreMap, new Map()),
    )

    const edges: GraphEdge[] = relevantRelationships.map((r) => this.toGraphEdge(r))

    return { nodes, edges, focalPersonId: personId, totalNodes: nodes.length }
  }

  async expandDescendants(
    personId: string,
    tenantId: string,
    currentDepth: number,
  ): Promise<GraphResponse> {
    const result = await this.fetchDescendants(personId, tenantId, currentDepth + 1)

    // Filter — only return the NEW generation
    const newPersons = result.persons.filter(
      (p) => Math.abs(p.generation) === currentDepth + 1,
    )
    const newPersonIds = new Set(newPersons.map((p) => p.id))

    const relevantRelationships = result.relationships.filter(
      (r) => newPersonIds.has(r.person1_id) || newPersonIds.has(r.person2_id),
    )

    const hasMoreMap = await this.checkHasMoreDescendants(
      newPersons.map((p) => p.id),
      tenantId,
      currentDepth + 1,
      newPersons,
    )

    const nodes: GraphNode[] = newPersons.map((p) =>
      this.toGraphNode(p, new Map(), hasMoreMap),
    )

    const edges: GraphEdge[] = relevantRelationships.map((r) => this.toGraphEdge(r))

    return { nodes, edges, focalPersonId: personId, totalNodes: nodes.length }
  }

  // Recursive CTE: fetch ancestors
  private async fetchAncestors(
    focalPersonId: string,
    tenantId: string,
    depth: number,
  ): Promise<{ persons: RawPersonRow[]; relationships: RawRelationshipRow[] }> {
    // Recursive CTE: traverse parent-child relationships upward
    const personsResult = await this.db.execute<RawPersonRow>(sql`
      WITH RECURSIVE ancestor_tree AS (
        -- Base case: focal person at generation 0
        SELECT
          p.id,
          p.first_name,
          p.last_name,
          p.nickname,
          p.gender,
          p.is_alive,
          p.avatar_url,
          p.linked_user_id IS NOT NULL AS is_linked_to_user,
          p.is_claimable,
          p.is_private,
          0 AS generation,
          0 AS depth
        FROM persons p
        WHERE p.id = ${focalPersonId}
          AND p.tenant_id = ${tenantId}
          AND p.deleted_at IS NULL

        UNION ALL

        -- Recursive case: find parents (person1 is parent of person2)
        SELECT
          parent.id,
          parent.first_name,
          parent.last_name,
          parent.nickname,
          parent.gender,
          parent.is_alive,
          parent.avatar_url,
          parent.linked_user_id IS NOT NULL AS is_linked_to_user,
          parent.is_claimable,
          parent.is_private,
          at.generation + 1 AS generation,
          at.depth + 1 AS depth
        FROM persons parent
        INNER JOIN relationships r
          ON r.person1_id = parent.id
          AND r.type = 'parent-child'
          AND r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
        INNER JOIN ancestor_tree at
          ON at.id = r.person2_id
        WHERE parent.deleted_at IS NULL
          AND at.depth < ${depth}
      )
      SELECT DISTINCT ON (id) * FROM ancestor_tree
      ORDER BY id, generation DESC
    `)

    // Also fetch spouses/partners of ancestors for complete context
    const personIds = personsResult.rows.map((p) => p.id)

    if (personIds.length === 0) {
      return { persons: [], relationships: [] }
    }

    const relationshipsResult = await this.db.execute<RawRelationshipRow>(sql`
      SELECT DISTINCT
        r.id,
        r.person1_id,
        r.person2_id,
        r.type,
        r.subtype,
        r.confidence
      FROM relationships r
      WHERE r.tenant_id = ${tenantId}
        AND r.deleted_at IS NULL
        AND (
          r.person1_id = ANY(${sql.raw(`ARRAY[${personIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          OR r.person2_id = ANY(${sql.raw(`ARRAY[${personIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
        )
    `)

    // Fetch couple partners of ancestors to show on tree
    const couplePartnerIds = new Set<string>()
    for (const rel of relationshipsResult.rows) {
      if (rel.type === 'couple') {
        if (!personIds.includes(rel.person1_id)) couplePartnerIds.add(rel.person1_id)
        if (!personIds.includes(rel.person2_id)) couplePartnerIds.add(rel.person2_id)
      }
    }

    let allPersons = personsResult.rows

    if (couplePartnerIds.size > 0) {
      let partnersResult: { rows: RawPersonRow[] }
      try {
        const partnerIdsList = Array.from(couplePartnerIds)
          .map((id) => `'${id}'`)
          .join(',')
        partnersResult = await this.db.execute<RawPersonRow>(
          sql.raw(`
          SELECT
            p.id,
            p.first_name,
            p.last_name,
            p.nickname,
            p.gender,
            p.is_alive,
            p.avatar_url,
            p.linked_user_id IS NOT NULL AS is_linked_to_user,
            p.is_claimable,
            p.is_private,
            (
              SELECT at2.generation FROM (
                SELECT DISTINCT ON (id) id, generation
                FROM (
                  WITH RECURSIVE ancestor_tree2 AS (
                    SELECT p2.id, 0 AS generation, 0 AS depth
                    FROM persons p2
                    WHERE p2.id = '${focalPersonId}'
                    AND p2.tenant_id = '${tenantId}'
                    AND p2.deleted_at IS NULL
                    UNION ALL
                    SELECT parent2.id, at2.generation + 1, at2.depth + 1
                    FROM persons parent2
                    INNER JOIN relationships r2 ON r2.person1_id = parent2.id AND r2.type = 'parent-child' AND r2.tenant_id = '${tenantId}' AND r2.deleted_at IS NULL
                    INNER JOIN ancestor_tree2 at2 ON at2.id = r2.person2_id
                    WHERE parent2.deleted_at IS NULL AND at2.depth < ${depth}
                  )
                  SELECT * FROM ancestor_tree2
                ) at2_inner
                ORDER BY id, generation DESC
              ) at2
              WHERE at2.id = (
                SELECT CASE
                  WHEN r3.person1_id = p.id THEN r3.person2_id
                  ELSE r3.person1_id
                END
                FROM relationships r3
                WHERE (r3.person1_id = p.id OR r3.person2_id = p.id)
                  AND r3.type = 'couple'
                  AND r3.tenant_id = '${tenantId}'
                  AND r3.deleted_at IS NULL
                LIMIT 1
              )
            ) AS generation,
            0 AS depth
          FROM persons p
          WHERE p.id = ANY(ARRAY[${partnerIdsList}]::uuid[])
            AND p.deleted_at IS NULL
        `),
        )
        allPersons = [...allPersons, ...partnersResult.rows]
      } catch (err) {
        console.error('❌ partnersResult query failed:', err)
        throw err
      }
    }

    return { persons: allPersons, relationships: relationshipsResult.rows }
  }

  // Recursive CTE: fetch descendants
  private async fetchDescendants(
    focalPersonId: string,
    tenantId: string,
    depth: number,
  ): Promise<{ persons: RawPersonRow[]; relationships: RawRelationshipRow[] }> {
    const personsResult = await this.db.execute<RawPersonRow>(sql`
      WITH RECURSIVE descendant_tree AS (
        -- Base case: focal person at generation 0
        SELECT
          p.id,
          p.first_name,
          p.last_name,
          p.nickname,
          p.gender,
          p.is_alive,
          p.avatar_url,
          p.linked_user_id IS NOT NULL AS is_linked_to_user,
          p.is_claimable,
          p.is_private,
          0 AS generation,
          0 AS depth
        FROM persons p
        WHERE p.id = ${focalPersonId}
          AND p.tenant_id = ${tenantId}
          AND p.deleted_at IS NULL

        UNION ALL

        -- Recursive case: find children (person2 is child of person1)
        SELECT
          child.id,
          child.first_name,
          child.last_name,
          child.nickname,
          child.gender,
          child.is_alive,
          child.avatar_url,
          child.linked_user_id IS NOT NULL AS is_linked_to_user,
          child.is_claimable,
          child.is_private,
          dt.generation - 1 AS generation,
          dt.depth + 1 AS depth
        FROM persons child
        INNER JOIN relationships r
          ON r.person2_id = child.id
          AND r.type = 'parent-child'
          AND r.tenant_id = ${tenantId}
          AND r.deleted_at IS NULL
        INNER JOIN descendant_tree dt
          ON dt.id = r.person1_id
        WHERE child.deleted_at IS NULL
          AND dt.depth < ${depth}
      )
      SELECT DISTINCT ON (id) * FROM descendant_tree
      ORDER BY id, generation ASC
    `)

    const personIds = personsResult.rows.map((p) => p.id)

    if (personIds.length === 0) {
      return { persons: [], relationships: [] }
    }

    const relationshipsResult = await this.db.execute<RawRelationshipRow>(sql`
      SELECT DISTINCT
        r.id,
        r.person1_id,
        r.person2_id,
        r.type,
        r.subtype,
        r.confidence
      FROM relationships r
      WHERE r.tenant_id = ${tenantId}
        AND r.deleted_at IS NULL
        AND (
          r.person1_id = ANY(${sql.raw(`ARRAY[${personIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
          OR r.person2_id = ANY(${sql.raw(`ARRAY[${personIds.map((id) => `'${id}'`).join(',')}]::uuid[]`)})
        )
    `)

    return { persons: personsResult.rows, relationships: relationshipsResult.rows }
  }

  // Check if there are more levels beyond current fetch
  private async checkHasMoreAncestors(
    personIds: string[],
    tenantId: string,
    depth: number,
    persons: RawPersonRow[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>()
    if (personIds.length === 0) return result

    // ambil generasi terdalam (ancestor biasanya positif)
    const maxGen = Math.max(...persons.map((p) => p.generation ?? 0))
    const deepestPersons = persons.filter((p) => p.generation === maxGen)

    if (deepestPersons.length === 0) return result

    const deepestIds = deepestPersons.map((p) => p.id)

    const rows = await this.db
      .selectDistinct({
        person2Id: relationships.person2Id,
      })
      .from(relationships)
      .where(
        and(
          eq(relationships.type, 'parent-child'),
          eq(relationships.tenantId, tenantId),
          isNull(relationships.deletedAt),
          inArray(relationships.person2Id, deepestIds),
          notInArray(relationships.person1Id, personIds),
        ),
      )

    const hasMoreSet = new Set(rows.map((r) => r.person2Id))

    for (const p of persons) {
      result.set(p.id, hasMoreSet.has(p.id))
    }

    return result
  }

  private async checkHasMoreDescendants(
    personIds: string[],
    tenantId: string,
    depth: number,
    persons: RawPersonRow[],
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>()
    if (personIds.length === 0) return result

    // descendant biasanya negatif (atau paling kecil)
    const minGen = Math.min(...persons.map((p) => p.generation ?? 0))
    const deepestPersons = persons.filter((p) => p.generation === minGen)

    if (deepestPersons.length === 0) return result

    const deepestIds = deepestPersons.map((p) => p.id)

    const rows = await this.db
      .selectDistinct({
        person1Id: relationships.person1Id,
      })
      .from(relationships)
      .where(
        and(
          eq(relationships.type, 'parent-child'),
          eq(relationships.tenantId, tenantId),
          isNull(relationships.deletedAt),
          inArray(relationships.person1Id, deepestIds),
          notInArray(relationships.person2Id, personIds),
        ),
      )

    const hasMoreSet = new Set(rows.map((r) => r.person1Id))

    for (const p of persons) {
      result.set(p.id, hasMoreSet.has(p.id))
    }

    return result
  }

  // Mappers
  private toGraphNode(
    p: RawPersonRow,
    hasMoreAncestorsMap: Map<string, boolean>,
    hasMoreDescendantsMap: Map<string, boolean>,
  ): GraphNode {
    return {
      id: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      nickname: p.nickname,
      gender: p.gender,
      isAlive: p.is_alive,
      avatarUrl: p.avatar_url,
      generation: p.generation,
      hasMoreAncestors: hasMoreAncestorsMap.get(p.id) ?? false,
      hasMoreDescendants: hasMoreDescendantsMap.get(p.id) ?? false,
      isLinkedToUser: p.is_linked_to_user,
      isClaimable: p.is_claimable,
      isPrivate: p.is_private,
    }
  }

  private toGraphEdge(r: RawRelationshipRow): GraphEdge {
    return {
      id: r.id,
      source: r.person1_id,
      target: r.person2_id,
      type: r.type as 'parent-child' | 'couple',
      subtype: r.subtype,
      confidence: r.confidence,
    }
  }
}
