import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './db/database.module'
import { RedisModule } from './core/redis/redis.module'
import { AuthModule } from './core/auth/auth.module'
import { HealthModule } from './modules/health/health.module'
import { PersonsModule } from './modules/persons/persons.module'
import { RelationshipsModule } from './modules/relationships/relationships.module'
import { EventsModule } from './modules/events/events.module'
import { CitationsModule } from './modules/citations/citations.module'
import { SourcesModule } from './modules/sources/sources.module'
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module'
import { FamilyTreesModule } from './modules/trees/trees.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuditLogsModule,
    AuthModule,
    HealthModule,
    PersonsModule,
    RelationshipsModule,
    EventsModule,
    SourcesModule,
    CitationsModule,
    FamilyTreesModule,
  ],
})
export class AppModule {}
