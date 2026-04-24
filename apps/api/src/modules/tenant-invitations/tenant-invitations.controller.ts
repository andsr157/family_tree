import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { TenantInvitationsService } from './tenant-invitations.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Ctx } from '@/common/decorator/ctx.decorator'
import { createInvitationSchema, type CreateInvitationDto } from './dto/create-invitation'
import type { ServiceContext } from '@/common/types'

@Controller('tenant/invitations')
export class TenantInvitationsController {
  constructor(private invitationsService: TenantInvitationsService) {}

  /**
   * GET /api/tenant/invitations
   * View all active invitation codes in this tenant.
   * Owner & admin only.
   */
  @Get()
  findAll(@Ctx() ctx: ServiceContext) {
    return this.invitationsService.findAll(ctx)
  }

  /**
   * POST /api/tenant/invitations
   * Create a new invitation code.
   * Owner & admin only.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createInvitationSchema)) dto: CreateInvitationDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.invitationsService.create(dto, ctx)
  }

  /**
   * DELETE /api/tenant/invitations/:id
   * Deactivate invitation code.
   * Owner & admin only.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id') id: string, @Ctx() ctx: ServiceContext) {
    return this.invitationsService.deactivate(id, ctx)
  }
}
