import { z } from 'zod'

export type RelationshipType = 'couple' | 'parent-child'

const VALID_SUBTYPES: Record<RelationshipType, string[]> = {
  couple: ['married', 'partnered', 'divorced', 'separated'],
  'parent-child': ['biological', 'adopted', 'step', 'foster'],
}

export const createRelationshipSchema = z
  .object({
    person1Id: z.string().uuid('person1Id must be a valid UUID'),
    person2Id: z.string().uuid('person2Id must be a valid UUID'),
    type: z.enum(['couple', 'parent-child']),
    subtype: z.string().max(20).optional().nullable(),
    startDate: z.string().date().optional().nullable(),
    endDate: z.string().date().optional().nullable(),
    order: z.number().int().min(1).max(10).default(1),
    notes: z.string().max(2000).optional().nullable(),
    confidence: z
      .enum(['confirmed', 'probable', 'estimated', 'disputed'])
      .default('confirmed'),
  })
  .superRefine((data, ctx) => {
    if (data.person1Id === data.person2Id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['person2Id'],
        message: 'person1Id and person2Id must not be the same',
      })
    }

    if (data.subtype) {
      const valid = VALID_SUBTYPES[data.type]
      if (!valid.includes(data.subtype)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subtype'],
          message: `Invalid subtype for type "${data.type}". Must be: ${valid.join(', ')}`,
        })
      }
    }

    if (data.type === 'parent-child' && data.order > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['order'],
        message: 'Field order is only applicable for type couple',
      })
    }

    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'endDate must not be before startDate',
        })
      }
    }
  })

export type CreateRelationshipDto = z.infer<typeof createRelationshipSchema>
