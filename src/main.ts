import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { BRANDING } from './common/constants/branding.constants.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // 1. Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Body Parser Request Limits (Supports in-memory Word/Excel parsing)
  const maxLimit = process.env.UPLOAD_MAX_SIZE ? `${parseInt(process.env.UPLOAD_MAX_SIZE) / 1024 / 1024}mb` : '10mb';
  app.use(json({ limit: maxLimit }));
  app.use(urlencoded({ extended: true, limit: maxLimit }));

  // 3. CORS Configuration
  app.enableCors({
    origin: [
      'https://exanova.vercel.app',
      'https://exanova.vercel.app/',
      'http://localhost:3000',
      'http://localhost:3000/',
      'http://localhost:5173',
      'http://localhost:5173/',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // 4. Global API Prefix & URI Versioning (/api/v1/...)
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 6. Global Exception Filter & Interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // 7. Swagger API Documentation (/api/docs)
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle(`${BRANDING.appName} – Examination & Assessment System API`)
      .setDescription(
        `### ${BRANDING.tagline}\n\n` +
          `**Organization:** ${BRANDING.organization}\n\n` +
          `**Developer:** [${BRANDING.developer}](${BRANDING.github}) (${BRANDING.email})\n\n` +
          `**Address:** ${BRANDING.address}\n\n` +
          `---\n\n` +
          `### Key Capabilities\n` +
          `- **Role-Based Access Control:** Dedicated access paths for Admin, Faculty, and Students.\n` +
          `- **Zero File Storage Architecture:** Word (.docx) and Excel (.xlsx) papers parsed directly in-memory and staged in PostgreSQL.\n` +
          `- **Authoritative Test UUID:** Authoritative UUID persistent examination tracking across questions, attempts, answers, and results.\n` +
          `- **Configurable Negative Marking Engine:** Decimal-accurate scoring supporting NONE, FIXED, FRACTION, and CUSTOM modes.\n` +
          `- **Server-Side Authoritative Timer:** Tamper-proof examination scheduling and automatic submission.\n` +
          `- **Dynamic Reporting:** On-the-fly streaming of PDF scorecards and Excel master performance sheets.\n\n` +
          `---\n\n` +
          `*All versioned endpoints are prefixed with \`/api/v1\`.*`,
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Input your JWT access token here',
        },
        'bearer',
      )
      .addTag('Authentication', 'Authentication, JWT tokens, session lifecycle, and password management')
      .addTag('Admin - Users', 'System user management, role assignment, and account status controls')
      .addTag('Academic - Departments', 'Department management and configurations')
      .addTag('Academic - Courses', 'Course definitions and degree programmes')
      .addTag('Academic - Semesters', 'Semester management per course')
      .addTag('Academic - Subjects', 'Course subjects and credit management')
      .addTag('Academic - Sessions', 'Academic sessions and active term controls')
      .addTag('Faculty Management', 'Faculty profiles, subject allocations, and permissions')
      .addTag('Student Management', 'Student profiles and bulk enrollment')
      .addTag('Examinations', 'Examination lifecycle, Test UUID creation, scheduling, and publication')
      .addTag('Question Management', 'MCQ and Descriptive question authoring and ordering')
      .addTag('Question Imports (Word & Excel)', 'Zero-storage in-memory DOCX/XLSX parser and PostgreSQL staging')
      .addTag('Student - Examination Engine', 'Live exam engine, server timer, navigation, and autosave')
      .addTag('Descriptive Evaluation', 'Faculty manual grading and feedback workflow')
      .addTag('Results Management', 'Result calculation, ranking, release, and scorecard retrieval')
      .addTag('Reports & Exports', 'Dynamic Excel and PDF reports generated in-memory')
      .addTag('Dashboard', 'Admin, Faculty, and Student statistical analytics')
      .addTag('Notifications', 'System alerts and examination updates')
      .addTag('Health', 'System uptime and database connectivity probe')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: `${BRANDING.appName} API Documentation`,
      customCss: `
        .topbar-wrapper img { content: url('https://raw.githubusercontent.com/Durjodhan45/exanova/main/logo.png'); height: 40px; }
        .swagger-ui .topbar { background-color: #101B3F; border-bottom: 3px solid #6246EA; }
        .swagger-ui .btn.authorize { background-color: #6246EA; color: #FFFFFF; border-color: #6246EA; }
      `,
    });
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port);
  console.log(`ExaNova Backend running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger Documentation available on: http://localhost:${port}/api/docs`);
}

bootstrap();
