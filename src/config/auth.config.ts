import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'default_insecure_jwt_access_secret_change_in_production',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default_insecure_jwt_refresh_secret_change_in_production',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  argon2MemoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '65536', 10),
  argon2TimeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
  argon2Parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@exanova.edu',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'Admin@ExaNova2026!',
}));
