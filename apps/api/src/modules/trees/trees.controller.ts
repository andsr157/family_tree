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
import { FamilyTreesService } from './trees.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createFamilyTreeSchema, type CreateFamilyTreeDto } from './dto/create-trees.dto'
import { updateFamilyTreeSchema, type UpdateFamilyTreeDto } from './dto/update-trees.dto'
import { queryFamilyTreeSchema, type QueryFamilyTreeDto } from './dto/query-trees.dto'
import { NodePositionsDto, nodePositionsSchema } from './dto/node-position.dto'
import {
  graphQuerySchema,
  graphExpandSchema,
  type GraphQueryDto,
  type GraphExpandDto,
} from './dto/query-graph.dto'
import type { ServiceContext } from '@/common/types'

@Controller('family-trees')
export class FamilyTreesController {
  constructor(private familyTreesService: FamilyTreesService) {}

  @Get()
  findAll(
    @Ctx() ctx: ServiceContext,
    @Query(new ZodValidationPipe(queryFamilyTreeSchema)) query: QueryFamilyTreeDto,
  ) {
    return this.familyTreesService.findAll(ctx, query)
  }

  @Get(':id')
  findById(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.familyTreesService.findById(id, ctx)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createFamilyTreeSchema)) dto: CreateFamilyTreeDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.familyTreesService.create(dto, ctx)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFamilyTreeSchema)) dto: UpdateFamilyTreeDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.familyTreesService.update(id, dto, ctx)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.familyTreesService.softDelete(id, ctx)
  }

  // Graph endpoints

  @Get(':id/graph')
  getGraph(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(graphQuerySchema)) query: GraphQueryDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.familyTreesService.getGraph(id, query, ctx)
  }

  @Get(':id/graph/expand')
  expandGraph(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(graphExpandSchema)) query: GraphExpandDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.familyTreesService.expandGraph(id, query, ctx)
  }

  @Patch(':id/node-positions')
  updateNodePositions(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(nodePositionsSchema)) body: NodePositionsDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.familyTreesService.updateNodePositions(id, body.positions, ctx)
  }
}
