import { ILoggerService } from '@nestify/logger';
import { Injectable } from '@nestjs/common';
import { InjectLogger } from './common';

@Injectable()
export class AppService {

  @InjectLogger()
  private readonly logger: ILoggerService;

  getHello(): string {

    this.logger.info('Hello World!');

    return 'Hello World!';
  }
}
