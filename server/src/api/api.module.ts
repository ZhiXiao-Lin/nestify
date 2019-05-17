import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { logger } from '../common/aspects/middlewares';
import { LoginController } from './controllers/login.controller';
import { UserController } from './controllers/user.controller';
import { StorageController } from './controllers/storage.controller';
import { ContentController } from './controllers/content.controller';

@Module({
	controllers: [ StorageController, LoginController, UserController, ContentController ]
})
export class ApiModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(logger).forRoutes('*');
	}
}
