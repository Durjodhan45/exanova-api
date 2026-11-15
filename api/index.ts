import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { BRANDING } from '../src/common/constants/branding.constants.js';
import type { Request, Response } from 'express';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

const server = express();
let isAppInitialized = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(helmet());
  app.enableCors({
    origin: (origin, callback) => {
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
    .setTitle(`${BRANDING.APP_NAME} API`)
    .setDescription(
      `Backend REST API for ${BRANDING.APP_NAME} – ${BRANDING.TAGLINE}.\n\n` +
        `**Organization:** ${BRANDING.ORGANIZATION}\n\n` +
        `**Address:** ${BRANDING.ADDRESS}\n\n` +
        `**Developer:** ${BRANDING.DEVELOPER.NAME} (<${BRANDING.DEVELOPER.EMAIL}>)\n\n` +
        `**GitHub:** ${BRANDING.DEVELOPER.GITHUB}`,
    )
    .setVersion(BRANDING.VERSION)
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
    customSiteTitle: `${BRANDING.APP_NAME} API Documentation`,
    customCss: `
      .swagger-ui .topbar { background-color: ${BRANDING.COLORS.MIDNIGHT_NAVY}; }
      .swagger-ui .topbar-wrapper img { content: url('https://raw.githubusercontent.com/Durjodhan45/exanova-api/main/docs/logo.png'); height: 40px; }
      .swagger-ui .info hgroup.main a { color: ${BRANDING.COLORS.ROYAL_PURPLE}; }
      .swagger-ui .btn.authorize { background-color: ${BRANDING.COLORS.ROYAL_PURPLE}; color: #fff; border-color: ${BRANDING.COLORS.ROYAL_PURPLE}; }
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
