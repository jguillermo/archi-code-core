import { NestFactory } from '@nestjs/core';
import { SwaggerDocumentOptions, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule } from './app/app.module';
import { getSwaggerConfig } from './main';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function buildOpenApiSpec() {
  console.log('⚡ Iniciando MongoDB en memoria...');
  const mongoMemoryServer = await MongoMemoryServer.create({
    instance: {
      port: 27018,
    },
  });
  const uri = new URL(mongoMemoryServer.getUri());
  console.log(`🚀 MongoDB en memoria iniciado en ${uri.host}`);
  process.env.MONGO_HOST = `mongodb://${uri.host}/atsp-api`;

  const app = await NestFactory.create(AppModule);

  const documentOptions: SwaggerDocumentOptions = {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  };

  const document = SwaggerModule.createDocument(app, getSwaggerConfig(), documentOptions);

  fs.writeFileSync('./api-doc.json', JSON.stringify(document, null, 4));
  await mongoMemoryServer.stop();
  process.exit(0);
}

buildOpenApiSpec();
