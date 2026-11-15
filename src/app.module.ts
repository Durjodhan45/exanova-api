import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { authConfig } from './config/auth.config.js';
import { validateEnvironment } from './config/validation.config.js';
import { DatabaseModule } from './database/database.module.js';

// Feature Modules
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DepartmentsModule } from './modules/departments/departments.module.js';
import { CoursesModule } from './modules/courses/courses.module.js';
import { SemestersModule } from './modules/semesters/semesters.module.js';
import { SubjectsModule } from './modules/subjects/subjects.module.js';
import { AcademicSessionsModule } from './modules/academic-sessions/academic-sessions.module.js';
import { FacultyModule } from './modules/faculty/faculty.module.js';
import { StudentsModule } from './modules/students/students.module.js';
import { ExaminationsModule } from './modules/examinations/examinations.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { QuestionBanksModule } from './modules/question-banks/question-banks.module.js';
import { QuestionImportsModule } from './modules/question-imports/question-imports.module.js';
import { ExamAttemptsModule } from './modules/exam-attempts/exam-attempts.module.js';
import { EvaluationsModule } from './modules/evaluations/evaluations.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { ResultsModule } from './modules/results/results.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { HealthModule } from './modules/health/health.module.js';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    DatabaseModule,
    AuditLogsModule,
    NotificationsModule,
    UsersModule,
    AuthModule,
    DepartmentsModule,
    CoursesModule,
    SemestersModule,
    SubjectsModule,
    AcademicSessionsModule,
    FacultyModule,
    StudentsModule,
    ExaminationsModule,
    QuestionsModule,
    QuestionBanksModule,
    QuestionImportsModule,
    ExamAttemptsModule,
    EvaluationsModule,
    FeedbackModule,
    ResultsModule,
    ReportsModule,
    DashboardModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
