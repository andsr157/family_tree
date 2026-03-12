import { Controller, Post, Get, Body, Res, Req, HttpCode, HttpStatus } from '@nestjs/common'
import type { Response, Request } from 'express'
import { AuthService } from './auth.service'
import { Public } from './decorators/public.decorator'
import { CurrentUser } from './decorators/current-user.decorator'
import { CurrentTenantId } from './decorators/current-tenant.decorator'
import { registerTenantSchema, loginSchema } from './auth.schema'
import type { RegisterTenantInput, LoginInput } from './auth.schema'
import type { RequestUser } from './auth.types'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'

const SESSION_COOKIE_NAME = 'session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 * 1000 // 7 days

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    }
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
