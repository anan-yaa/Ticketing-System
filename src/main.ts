import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, ConsoleLogger } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';

class PristineConsoleLogger extends ConsoleLogger {
  private readonly suppressedContexts = [
    'InstanceLoader',
    'RoutesResolver',
    'RouterExplorer',
    'NestFactory',
  ];

  log(message: any, ...optionalParams: any[]) {
    const context = optionalParams[optionalParams.length - 1];
    if (typeof context === 'string' && this.suppressedContexts.includes(context)) {
      return;
    }
    super.log(message, ...optionalParams);
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new PristineConsoleLogger(),
  });
  app.useStaticAssets(join(process.cwd(), 'uploads/attachments'), { prefix: '/uploads/attachments' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({
    origin: true, // Reflects the request origin (allows all)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.listen(3000);
}
bootstrap();
