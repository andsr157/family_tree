import { z } from 'zod'

export const createFamilyTreeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  rootPersonId: z.string().uuid('rootPersonId must be a valid UUID'),
  defaultFocalPersonId: z
    .string()
    .uuid('defaultFocalPersonId must be a valid UUID')
    .optional()
    .nullable(),
  visibility: z.enum(['private', 'family', 'public']).default('private'),
  settings: z.record(z.unknown()).default({}),
})

export type CreateFamilyTreeDto = z.infer<typeof createFamilyTreeSchema>
