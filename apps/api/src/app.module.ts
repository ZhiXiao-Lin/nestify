import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderModule } from './modules/order/order.module';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        DatabaseModule,
        RedisModule,
        OrderModule,
    ],
})
export class AppModule {}
