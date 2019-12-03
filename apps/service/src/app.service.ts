import {} from '@nestify/config';
import { IConfigService, ILoggerService } from '@nestify/core';
import { Injectable } from '@nestjs/common';
import { InjectConfig, InjectLogger } from './common';

@Injectable()
export class AppService {
    @InjectConfig()
    private readonly config: IConfigService;

    @InjectLogger()
    private readonly logger: ILoggerService;

    getHello(): string {
        this.logger.info('Hello World!', this.config.get('app.port'));

        return 'Hello World!';
    }
}
