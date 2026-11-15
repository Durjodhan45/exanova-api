import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'ExaNova',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
}));
