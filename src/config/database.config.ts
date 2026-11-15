import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/exanova',
  ssl: process.env.DB_SSL === 'true',
  poolMax: parseInt(process.env.DB_POOL_MAX || '5', 10),
  synchronize: false, // Never enable in production
  logging: process.env.NODE_ENV === 'development',
}));
