import { Injectable } from '@nestjs/common';
import { InjectLogger } from '@nestify/logger';
import { Logger } from 'winston';

@Injectable()
export class AppService {
  constructor(
    @InjectLogger()
    public readonly logger: Logger,
  ) {}

  getHello(): string {
    this.logger.info('Hello World');
    return 'Hello World!';
  }
}
