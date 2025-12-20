import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './app/shared/interceptor/all-exceptions.filter';

const serverPort = process.env.SERVER_PORT || 3000;
const serverPath = process.env.SERVER_PATH || `http://localhost:${serverPort}`;

export function getSwaggerConfig() {
  // const npmPackage = require('./../package.json');

  return new DocumentBuilder().setTitle('Misa').addServer(serverPath).setDescription('sdk api').setVersion('0.0.1').build();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const documentFactory = () => SwaggerModule.createDocument(app, getSwaggerConfig());
  SwaggerModule.setup('doc', app, documentFactory);

  await app.listen(3000);
}

bootstrap();
