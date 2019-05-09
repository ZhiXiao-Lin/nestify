import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { logger } from '../common/aspects/middlewares';
import { LoginController } from './controllers/login.controller';
import { UserController } from './controllers/user.controller';
import { UploadController } from './controllers/upload.controller';

@Module({
	controllers: [ UploadController, LoginController, UserController ]
})
export class ApiModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(logger).forRoutes('*');
	}
}
