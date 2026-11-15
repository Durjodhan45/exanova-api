import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ALL_ENTITIES } from './entities.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        const ssl = configService.get<boolean>('database.ssl');
        const poolMax = configService.get<number>('database.poolMax');
        const logging = configService.get<boolean>('database.logging');

        return {
          type: 'postgres',
          url,
          ssl: ssl ? { rejectUnauthorized: false } : false,
          entities: ALL_ENTITIES,
          synchronize: false, // Never enable in production
          logging,
          extra: {
            max: poolMax || 5,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
