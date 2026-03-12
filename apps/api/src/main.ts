import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from 'nestjs-pino'
import cookieParser from 'cookie-parser'
import { ResponseInterceptor } from './common/response/response.interceptor'
import { GlobalExceptionFilter } from './common/response/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.useLogger(app.get(Logger))
  app.use(cookieParser())
  app.setGlobalPrefix('api')

  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new GlobalExceptionFilter())

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap()
