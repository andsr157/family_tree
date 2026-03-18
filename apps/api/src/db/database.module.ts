import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NodePgDatabase, drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export const DATABASE = Symbol('DATABASE')
export type DatabaseClient = NodePgDatabase<typeof schema>

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
        })
        return drizzle({ client: pool, schema, casing: 'snake_case' })
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
