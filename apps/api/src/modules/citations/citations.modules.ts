import { Module } from '@nestjs/common'
import { CitationsController } from './citations.controller'
import { CitationsService } from './citations.service'
import { CitationsRepository } from './citations.repository'
import { SourcesModule } from '../sources/sources.module'
import { PersonsModule } from '@/modules/persons/persons.module'
import { EventsModule } from '@/modules/events/event.module'
import { RelationshipsModule } from '@/modules/relationships/relationships.module'

@Module({
  imports: [SourcesModule, PersonsModule, EventsModule, RelationshipsModule],
  controllers: [CitationsController],
  providers: [CitationsService, CitationsRepository],
  exports: [CitationsService, CitationsRepository],
})
export class CitationsModule {}
