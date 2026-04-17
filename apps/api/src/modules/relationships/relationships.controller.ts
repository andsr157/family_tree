import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { RelationshipsService } from './relationships.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Roles } from '@/core/auth/decorators/roles.decorator'
import { Ctx } from '@/common/decorator/ctx.decorator'
import {
  createRelationshipSchema,
  type CreateRelationshipDto,
} from './dto/create-relationship.dto'
import {
  updateRelationshipSchema,
  type UpdateRelationshipDto,
} from './dto/update-relationship.dto'
import {
  queryRelationshipSchema,
  type QueryRelationshipDto,
} from './dto/query-relationship.dto'
import type { ServiceContext } from '../../common/types'

@Controller()
export class RelationshipsController {
  constructor(private relationshipsService: RelationshipsService) {}

  @Get('persons/:personId/relationships')
  findAllByPerson(
    @Param('personId') personId: string,
    @Ctx() ctx: ServiceContext,
    @Query(new ZodValidationPipe(queryRelationshipSchema)) query: QueryRelationshipDto,
  ) {
    return this.relationshipsService.findAllByPerson(personId, ctx, query)
  }

  @Get('relationships/:id')
  findById(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.relationshipsService.findById(id, ctx)
  }

  @Post('relationships')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createRelationshipSchema)) dto: CreateRelationshipDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.relationshipsService.create(dto, ctx)
  }

  @Patch('relationships/:id')
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateRelationshipSchema)) dto: UpdateRelationshipDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.relationshipsService.update(id, dto, ctx)
  }

  @Delete('relationships/:id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.relationshipsService.softDelete(id, ctx)
  }
}
