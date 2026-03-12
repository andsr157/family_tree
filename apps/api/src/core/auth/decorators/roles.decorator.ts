import { SetMetadata } from '@nestjs/common'

export const ROLES_KEY = 'roles'

export const Roles = (role: 'owner' | 'admin' | 'member') => SetMetadata(ROLES_KEY, role)
