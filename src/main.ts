import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads/attachments'), { prefix: '/uploads/attachments' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors(); // Enable CORS for frontend connection
  await app.listen(3000);
}
bootstrap();
