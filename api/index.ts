import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';

import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BRANDING } from '../src/common/constants/branding.constants.js';
import type { Request, Response } from 'express';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter.js';

const server = express();
let isAppInitialized = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(helmet());
  app.enableCors({
    origin: (origin: any, callback: any) => {
      const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle(`${BRANDING.appName} API`)
    .setDescription(
      `Backend REST API for ${BRANDING.appName} – ${BRANDING.tagline}.\n\n` +
        `**Organization:** ${BRANDING.organization}\n\n` +
        `**Address:** ${BRANDING.address}\n\n` +
        `**Developer:** ${BRANDING.developer} (<${BRANDING.email}>)\n\n` +
        `**GitHub:** ${BRANDING.github}`,
    )
    .setVersion(BRANDING.version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: `${BRANDING.appName} API Documentation`,
    customCss: `
      .swagger-ui .topbar { background-color: ${BRANDING.colors.midnightNavy}; }
      .swagger-ui .topbar-wrapper img { content: url('https://raw.githubusercontent.com/Durjodhan45/exanova-api/main/docs/logo.png'); height: 40px; }
      .swagger-ui .info hgroup.main a { color: ${BRANDING.colors.royalPurple}; }
      .swagger-ui .btn.authorize { background-color: ${BRANDING.colors.royalPurple}; color: #fff; border-color: ${BRANDING.colors.royalPurple}; }
    `,
  });

  await app.init();
  isAppInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  if (!isAppInitialized) {
    await bootstrap();
  }
  server(req, res);
}
