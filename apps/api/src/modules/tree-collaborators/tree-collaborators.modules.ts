import { Module } from '@nestjs/common'
import { TreeCollaboratorsController } from './tree-collaborators.controller'
import { TreeCollaboratorsService } from './tree-collaborators.service'
import { TreeCollaboratorsRepository } from './tree-collaborators.repository'
import { FamilyTreesRepository } from '@/modules/trees/trees.repository'

@Module({
  controllers: [TreeCollaboratorsController],
  providers: [
    TreeCollaboratorsService,
    TreeCollaboratorsRepository,
    FamilyTreesRepository, // for the tree existence check
  ],
  exports: [TreeCollaboratorsService, TreeCollaboratorsRepository],
})
export class TreeCollaboratorsModule {}
