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
import { SourcesService } from './sources.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Roles } from '@/core/auth/decorators/roles.decorator'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createSourceSchema, type CreateSourceDto } from './dto/create-source.dto'
import { updateSourceSchema, type UpdateSourceDto } from './dto/update-source.dto'
import { querySourceSchema, type QuerySourceDto } from './dto/query-source.dto'
import type { ServiceContext } from '@/common/types'

@Controller('sources')
export class SourcesController {
  constructor(private sourcesService: SourcesService) {}

  @Get()
  findAll(
    @Ctx() ctx: ServiceContext,
    @Query(new ZodValidationPipe(querySourceSchema)) query: QuerySourceDto,
  ) {
    return this.sourcesService.findAll(ctx, query)
  }

  @Get(':id')
  findById(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.sourcesService.findById(id, ctx)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createSourceSchema)) dto: CreateSourceDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.sourcesService.create(dto, ctx)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSourceSchema)) dto: UpdateSourceDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.sourcesService.update(id, dto, ctx)
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.sourcesService.softDelete(id, ctx)
  }
}
