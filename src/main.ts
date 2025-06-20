import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      process.env.CORS_CHROME_EXTENSION ||
        'chrome-extension://nmmhkkegccagdldgiimedpiccmgmieda',
    ],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Stepture API')
    .setDescription('API documentation for Stepture Backend')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const publicDir = join(__dirname, '..', 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir);
  }

  const swaggerPath = join(publicDir, 'swagger.json');
  writeFileSync(swaggerPath, JSON.stringify(document, null, 2));
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
