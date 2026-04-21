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
import { CitationsService } from './citations.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createCitationSchema, type CreateCitationDto } from './dto/create-citation.dto'
import { updateCitationSchema, type UpdateCitationDto } from './dto/update-citation.dto'
import type { ServiceContext } from '@/common/types'
import type { EntityType } from './dto/create-citation.dto'
import { BadRequestException } from '@nestjs/common'

@Controller()
export class CitationsController {
  constructor(private citationsService: CitationsService) {}

  // GET /sources/:sourceId/citations
  @Get('sources/:sourceId/citations')
  findBySource(@Param('sourceId') sourceId: string, @Ctx() ctx: ServiceContext) {
    return this.citationsService.findBySource(sourceId, ctx)
  }

  // GET /persons/:entityId/citations
  // GET /events/:entityId/citations
  // GET /relationships/:entityId/citations
  @Get(':entityType(persons|events|relationships)/:entityId/citations')
  findByEntity(
    @Param('entityType') rawEntityType: string,
    @Param('entityId') entityId: string,
    @Ctx() ctx: ServiceContext,
  ) {
    // Map URL segment to entity_type value
    const entityTypeMap: Record<string, EntityType> = {
      persons: 'person',
      events: 'event',
      relationships: 'relationship',
    }

    const entityType = entityTypeMap[rawEntityType]
    if (!entityType) {
      throw new BadRequestException(`Unknown entity type: ${rawEntityType}`)
    }

    return this.citationsService.findByEntity(entityType, entityId, ctx)
  }

  @Post('citations')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createCitationSchema)) dto: CreateCitationDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.citationsService.create(dto, ctx)
  }

  @Patch('citations/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCitationSchema)) dto: UpdateCitationDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.citationsService.update(id, dto, ctx)
  }

  @Delete('citations/:id')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.citationsService.softDelete(id, ctx)
  }
}
