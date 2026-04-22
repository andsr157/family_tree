import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsService } from './events.service'
import { EventsRepository } from './events.repository'
import { PersonsModule } from '@/modules/persons/persons.module'
import { RelationshipsModule } from '@/modules/relationships/relationships.module'

@Module({
  imports: [PersonsModule, RelationshipsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
