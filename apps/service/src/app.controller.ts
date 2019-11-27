import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { InjectLogger } from './common';
import { ILoggerService } from '@nestify/logger';

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
