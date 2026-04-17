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
import { PersonsService } from './persons.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Roles } from '@/core/auth/decorators/roles.decorator'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createPersonSchema, type CreatePersonDto } from './dto/create-person.dto'
import { updatePersonSchema, type UpdatePersonDto } from './dto/update-person.dto'
import { queryPersonSchema, type QueryPersonDto } from './dto/query-person.dto'
import type { ServiceContext } from '@/common/types'

@Controller('persons')
export class PersonsController {
  constructor(private personsService: PersonsService) {}

  @Get()
  findAll(
    @Ctx() ctx: ServiceContext,
    @Query(new ZodValidationPipe(queryPersonSchema)) query: QueryPersonDto,
  ) {
    return this.personsService.findAll(ctx, query)
  }

  @Get(':id')
  findById(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.personsService.findById(id, ctx)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createPersonSchema))
    dto: CreatePersonDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.personsService.create(dto, ctx)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePersonSchema)) dto: UpdatePersonDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.personsService.update(id, dto, ctx)
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.personsService.softDelete(id, ctx)
  }
}
