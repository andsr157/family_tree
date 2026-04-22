import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { TreeCollaboratorsService } from './tree-collaborators.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Ctx } from '@/common/decorator/ctx.decorator'
import {
  inviteCollaboratorSchema,
  updateCollaboratorSchema,
  type InviteCollaboratorDto,
  type UpdateCollaboratorDto,
} from './dto/collaborator.dto'
import type { ServiceContext } from '@/common/types'

@Controller('family-trees/:treeId/collaborators')
export class TreeCollaboratorsController {
  constructor(private treeCollaboratorsService: TreeCollaboratorsService) {}

  @Get()
  findByTree(@Param('treeId') treeId: string, @Ctx() ctx: ServiceContext) {
    return this.treeCollaboratorsService.findByTree(treeId, ctx)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  invite(
    @Param('treeId') treeId: string,
    @Body(new ZodValidationPipe(inviteCollaboratorSchema)) dto: InviteCollaboratorDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.treeCollaboratorsService.invite(treeId, dto, ctx)
  }

  @Patch(':userId')
  updateRole(
    @Param('treeId') treeId: string,
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(updateCollaboratorSchema)) dto: UpdateCollaboratorDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.treeCollaboratorsService.updateRole(treeId, targetUserId, dto, ctx)
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('treeId') treeId: string,
    @Param('userId') targetUserId: string,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.treeCollaboratorsService.remove(treeId, targetUserId, ctx)
  }
}
