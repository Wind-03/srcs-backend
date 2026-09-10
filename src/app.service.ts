import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'srcs-server',
      timestamp: new Date().toISOString(),
    };
  }
}
