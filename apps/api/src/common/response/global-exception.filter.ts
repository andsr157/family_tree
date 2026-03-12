import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import type { ApiResponse } from './api-response'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let errors: Record<string, string[]> | null = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const obj = exceptionResponse as Record<string, unknown>
        message = (obj.message as string) ?? exception.message
        if (obj.errors) {
          errors = obj.errors as Record<string, string[]>
        }
      }
    }

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      message,
      errors,
      timestamp: new Date().toISOString(),
    }

    res.status(status).json(body)
  }
}
