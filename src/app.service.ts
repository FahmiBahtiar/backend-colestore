import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  /** Returns health check status */
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
