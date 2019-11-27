import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectLogger } from './common';
import { ILoggerService } from '@nestify/logger';

@Controller()
export class AppController {

  @InjectLogger()
  private readonly logger: ILoggerService;

  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('user')
  getUser() {

    this.logger.info('new request');

    return [
      { id: 1, name: 'user1' },
      { id: 2, name: 'user2' },
      { id: 3, name: 'user3' },
    ];
  }
}
