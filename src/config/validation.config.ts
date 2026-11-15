import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'ExaNova';

  @IsString()
  @IsOptional()
  DATABASE_URL: string = 'postgresql://postgres:postgres@localhost:5432/exanova';

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET: string = 'default_insecure_jwt_access_secret_change_in_production';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'default_insecure_jwt_refresh_secret_change_in_production';
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Environment validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
