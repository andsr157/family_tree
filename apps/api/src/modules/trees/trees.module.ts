import { Module } from '@nestjs/common'
import { FamilyTreesController } from './trees.controller'
import { FamilyTreesService } from './trees.service'
import { FamilyTreesRepository } from './trees.repository'
import { GraphRepository } from './graph.repository'
import { PersonsModule } from '@/modules/persons/persons.module'
import { TreeCollaboratorsModule } from '@/modules/tree-collaborators/tree-collaborators.modules'

@Module({
  imports: [PersonsModule, TreeCollaboratorsModule],
  controllers: [FamilyTreesController],
  providers: [FamilyTreesService, FamilyTreesRepository, GraphRepository],
  exports: [FamilyTreesService, FamilyTreesRepository],
})
export class FamilyTreesModule {}
