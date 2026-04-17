import { Module } from '@nestjs/common'
import { RelationshipsController } from './relationships.controller'
import { RelationshipsService } from './relationships.service'
import { RelationshipsRepository } from './relationships.repository'
import { PersonsModule } from '@/modules/persons/persons.module'

@Module({
  imports: [PersonsModule],
  controllers: [RelationshipsController],
  providers: [RelationshipsService, RelationshipsRepository],
  exports: [RelationshipsService, RelationshipsRepository],
})
export class RelationshipsModule {}
