import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { TenantMembersService } from './tenant-members.service'
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe'
import { Ctx } from '@/common/decorator/ctx.decorator'
import {
  updateMemberRoleSchema,
  updateMemberStatusSchema,
  type UpdateMemberRoleDto,
  type UpdateMemberStatusDto,
} from './dto/tenant-member.dto'
import type { ServiceContext } from '@/common/types'

@Controller('tenant/members')
export class TenantMembersController {
  constructor(private membersService: TenantMembersService) {}

  /**
   * GET /api/tenant/members
   * List all members in this tenant.
   * Owner & admin only.
   */
  @Get()
  findAll(@Ctx() ctx: ServiceContext) {
    return this.membersService.findAll(ctx)
  }

  /**
   * PATCH /api/tenant/members/:userId/role
   * Update a member's role (admin <-> member).
   * Owner only. Cannot change own role or owner role.
   */
  @Patch(':userId/role')
  updateRole(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) dto: UpdateMemberRoleDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.membersService.updateRole(userId, dto, ctx)
  }

  /**
   * PATCH /api/tenant/members/:userId/status
   * Suspend or reactivate a member.
   * Owner only. Cannot change own status or owner status.
   */
  @Patch(':userId/status')
  updateStatus(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(updateMemberStatusSchema)) dto: UpdateMemberStatusDto,
    @Ctx() ctx: ServiceContext,
  ) {
    return this.membersService.updateStatus(userId, dto, ctx)
  }

  /**
   * DELETE /api/tenant/members/:userId
   * Remove a member from the tenant.
   * Owner only. Cannot remove self or another owner.
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  removeMember(@Param('userId') userId: string, @Ctx() ctx: ServiceContext) {
    return this.membersService.removeMember(userId, ctx)
  }

  /**
   * POST /api/tenant/members/leave
   * Leave the tenant (self-removal).
   * Any member. Owner cannot leave if they are the only owner.
   */
  @Post('leave')
  @HttpCode(HttpStatus.OK)
  leaveFamily(@Ctx() ctx: ServiceContext) {
    return this.membersService.leaveFamily(ctx)
  }

  /**
   * POST /api/tenant/members/:userId/transfer
   * Transfer ownership to another member.
   * Owner only. Target must be active.
   */
  @Post(':userId/transfer')
  @HttpCode(HttpStatus.OK)
  transferOwnership(@Param('userId') userId: string, @Ctx() ctx: ServiceContext) {
    return this.membersService.transferOwnership(userId, ctx)
  }
}
