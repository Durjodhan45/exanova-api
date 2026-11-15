import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator.js';
import { BRANDING } from '../../common/constants/branding.constants.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async checkHealth() {
    let dbStatus = 'down';
    let dbLatencyMs = 0;

    const start = Date.now();
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'up';
        dbLatencyMs = Date.now() - start;
      }
    } catch {
      dbStatus = 'down';
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      appName: BRANDING.appName,
      tagline: BRANDING.tagline,
      developer: BRANDING.developer,
      organization: BRANDING.organization,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
        memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
      },
      timestamp: new Date().toISOString(),
    };
  }
}
