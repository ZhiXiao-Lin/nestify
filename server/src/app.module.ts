import { Module } from '@nestjs/common';
import { Seed } from './seed';
import { CommonModule } from './common/common.module';
import { ApiModule } from './api/api.module';
import { SSRModule } from './ssr/ssr.module';

@Module({
	imports: [ CommonModule, ApiModule, SSRModule ],
	providers: [ Seed ]
})
export class AppModule {}
