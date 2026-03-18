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
import { CurrentUser } from '@/core/auth/decorators/current-user.decorator'
import { CurrentTenantId } from '@/core/auth/decorators/current-tenant.decorator'
import { CurrentUserRole } from '@/core/auth/decorators/current-tenant.decorator'
import { CreatePersonDto, createPersonSchema } from './dto/create-person.dto'
import { UpdatePersonDto, updatePersonSchema } from './dto/update-person.dto'
import { QueryPersonDto, queryPersonSchema } from './dto/query-person.dto'
import type { ServiceContext, TenantRole } from '@/common/types'
import type { RequestUser } from '@/core/auth/auth.types'

@Controller('persons')
export class PersonsController {
  constructor(private personsService: PersonsService) {}

  private buildCtx(
    tenantId: string,
    user: RequestUser,
    userRole: TenantRole,
  ): ServiceContext {
    return {
      tenantId,
      userId: user.id,
      userRole,
    }
  }

  @Get()
  findAll(
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: RequestUser,
    @CurrentUserRole() userRole: TenantRole,
    @Query(new ZodValidationPipe(queryPersonSchema)) query: QueryPersonDto,
  ) {
    const ctx = this.buildCtx(tenantId, user, userRole)
    return this.personsService.findAll(ctx, query)
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: RequestUser,
    @CurrentUserRole() userRole: TenantRole,
  ) {
    const ctx = this.buildCtx(tenantId, user, userRole)
    return this.personsService.findById(id, ctx)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createPersonSchema))
    dto: CreatePersonDto,
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: RequestUser,
    @CurrentUserRole() userRole: TenantRole,
  ) {
    const ctx = this.buildCtx(tenantId, user, userRole)
    return this.personsService.create(dto, ctx)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePersonSchema)) dto: UpdatePersonDto,
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: RequestUser,
    @CurrentUserRole() userRole: TenantRole,
  ) {
    const ctx = this.buildCtx(tenantId, user, userRole)
    return this.personsService.update(id, dto, ctx)
  }

  @Delete(':id')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  softDelete(
    @Param('id') id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUser() user: RequestUser,
    @CurrentUserRole() userRole: TenantRole,
  ) {
    const ctx = this.buildCtx(tenantId, user, userRole)
    return this.personsService.softDelete(id, ctx)
  }
}
