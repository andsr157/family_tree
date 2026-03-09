import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { LoggerModule } from 'nestjs-pino'
import { DatabaseModule } from './db/database.module'
import { RedisModule } from './redis/redis.module'
import { HealthModule } from './health/health.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    HealthModule,
    // Module fitur ditambahkan di sini saat Sprint 1 mulai
  ],
})
export class AppModule {}
