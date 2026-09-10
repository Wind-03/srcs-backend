import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth/roles.decorator';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Liveness/health probe. */
  @Public()
  @Get('health')
  health() {
    return this.appService.health();
  }
}
