import { Module } from '@nestjs/common'
import { EventsController } from './event.controller'
import { EventsService } from './event.service'
import { EventsRepository } from './event.repository'
import { PersonsModule } from '@/modules/persons/persons.module'
import { RelationshipsModule } from '@/modules/relationships/relationships.module'

@Module({
  imports: [PersonsModule, RelationshipsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
