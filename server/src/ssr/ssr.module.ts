import { Module } from '@nestjs/common';
import { CommonService } from './services/common.service';
import { IndexController } from './controllers/index.controller';

@Module({
	controllers: [ IndexController ],
	providers: [ CommonService ]
})
export class SSRModule {}
