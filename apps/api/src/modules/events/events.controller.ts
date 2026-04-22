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
import { EventsService } from './events.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Roles } from '@/core/auth/decorators/roles.decorator'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createEventSchema, type CreateEventDto } from './dto/create-event.dto'
import { updateEventSchema, type UpdateEventDto } from './dto/update-event.dto'
import { queryEventSchema, type QueryEventDto } from './dto/query-event.dto'
import type { ServiceContext } from '@/common/types'

@Controller()
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get('persons/:personId/events')
  findAllByPerson(
    @Param('personId') personId: string,
    @Ctx() ctx: ServiceContext,
    @Query(new ZodValidationPipe(queryEventSchema)) query: QueryEventDto,
  ) {
    return this.eventsService.findAllByPerson(personId, ctx, query)
  }

  @Get('events/:id')
  findById(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.eventsService.findById(id, ctx)
  }

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createEventSchema)) dto: CreateEventDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.eventsService.create(dto, ctx)
  }

  @Patch('events/:id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateEventSchema)) dto: UpdateEventDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.eventsService.update(id, dto, ctx)
  }

  @Delete('events/:id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.eventsService.softDelete(id, ctx)
  }
}
