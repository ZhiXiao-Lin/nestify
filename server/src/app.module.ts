import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CommonModule } from './common/common.module';
import { ApiModule } from './api/api.module';
import { Seed } from './seed';

@Module({
	imports: [ CommonModule, ApiModule ],
	controllers: [ AppController ],
	providers: [ Seed ]
})
export class AppModule {}
