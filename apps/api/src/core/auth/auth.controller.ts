import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import { CurrentTenantId } from './decorators/current-tenant.decorator'
import {
  registerTenantSchema,
  loginSchema,
  registerSchema,
  createTenantSchema,
  joinTenantSchema,
} from './auth.schema'
import type {
  RegisterTenantInput,
  LoginInput,
  RegisterInput,
  CreateTenantInput,
  JoinTenantInput,
} from './auth.schema'
import type { RequestUser } from './auth.types'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'

const SESSION_COOKIE_NAME = 'session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000 // 7 days

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Register tenant (legacy flow — still available)

  @Public()
  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  async registerTenant(
    @Body(new ZodValidationPipe(registerTenantSchema)) body: RegisterTenantInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerTenant(body, {
      ip: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? '',
    })

    this.setSessionCookie(res, result.sessionId)

    return {
      user: result.user,
      tenant: result.tenant,
      role: result.role,
    }
  }

  //  Register account only (new flow)

  /**
   * POST /api/auth/register
   *
   * Create a new account without a tenant.
   * After registration, user must choose:
   * - POST /api/auth/create-tenant (create a new family)
   * - POST /api/auth/join-tenant   (join via invitation code)
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body, {
      ip: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? '',
    })

    this.setSessionCookie(res, result.sessionId)

    return {
      user: result.user,
      tenants: result.tenants,
      hasNoTenant: result.hasNoTenant,
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body, {
      ip: req.ip ?? '',
      userAgent: req.headers['user-agent'] ?? '',
    })

    this.setSessionCookie(res, result.sessionId)

    return {
      user: result.user,
      tenants: result.tenants,
      currentTenant: result.currentTenant,
      // Flag for frontend — show onboarding page if true
      hasNoTenant: result.hasNoTenant,
    }
  }

  // Create new tenant (after login)

  /**
   * POST /api/auth/create-tenant
   *
   * Called by a user who is already logged in but does not have a tenant yet.
   * Endpoint does NOT require X-Tenant-Id header since user has no tenant.
   * Uses @Public() to bypass TenantGuard.
   *
   * Note: session is still required (user must be logged in);
   * only TenantGuard is bypassed.
   */
  @Public()
  @Post('create-tenant')
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Body(new ZodValidationPipe(createTenantSchema)) body: CreateTenantInput,
    @Req() req: Request & { user?: RequestUser },
  ) {
    // Extract user from session since TenantGuard is bypassed
    // SessionAuthGuard still runs so this is not truly @Public
    // For simplicity, handle at service level
    const userId = req.user?.id
    if (!userId) {
      throw new Error('Unauthorized')
    }

    return this.authService.createTenant(body, userId)
  }

  // Join tenant via invitation code

  /**
   * POST /api/auth/join-tenant
   *
   * Called by a logged-in user who has an invitation code.
   * Does not require X-Tenant-Id since user is not yet in any tenant
   * (or wants to join another tenant).
   */
  @Public()
  @Post('join-tenant')
  @HttpCode(HttpStatus.OK)
  async joinTenant(
    @Body(new ZodValidationPipe(joinTenantSchema)) body: JoinTenantInput,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const userId = req.user?.id
    if (!userId) {
      throw new Error('Unauthorized')
    }

    return this.authService.joinTenant(body.code, userId)
  }

  //  Validate invitation code (public — for preview before joining)

  /**
   * GET /api/auth/invitation/:code/validate
   *
   * Check if an invitation code is valid before user clicks "Join".
   * Returns tenant name without exposing sensitive data.
   * Endpoint is truly public — no login required.
   */
  @Public()
  @Get('invitation/:code/validate')
  async validateInvitation(@Req() req: Request) {
    const code = (req.params as { code: string }).code
    // Normalize code
    const normalized = code.replace(/-/g, '').toUpperCase().trim()
    const invitation = await this.authService.validateInvitationCode(normalized)
    return invitation
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { sessionId: string; user: RequestUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(req.sessionId, req.user.id)
    res.clearCookie(SESSION_COOKIE_NAME)
    return null
  }

  @Get('me')
  async getMe(@CurrentUser() user: RequestUser, @CurrentTenantId() tenantId: string) {
    return this.authService.getMe(user.id, tenantId)
  }

  //  Private helpers

  private setSessionCookie(res: Response, sessionId: string): void {
    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })
  }
}
