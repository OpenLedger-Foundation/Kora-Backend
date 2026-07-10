import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({ summary: 'Liveness probe — returns 200 if the server is running' })
  @Get()
  check() {
    return this.healthService.check();
  }

  @ApiOperation({ summary: 'Readiness probe — returns service dependency statuses' })
  @Get('ready')
  ready() {
    return this.healthService.ready();
  }
}
