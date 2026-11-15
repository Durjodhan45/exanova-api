import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ALL_ENTITIES } from './entities.js';
import { InitialMigration1700000000000 } from './migrations/1700000000000-InitialMigration.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/exanova',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ALL_ENTITIES,
  migrations: [InitialMigration1700000000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  },
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
