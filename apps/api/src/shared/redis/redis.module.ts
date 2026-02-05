import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedissonModule } from '@a3s-lab/redisson';

@Global()
@Module({
    imports: [
        RedissonModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    options: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                        password: configService.get('REDIS_PASSWORD'),
                        db: configService.get('REDIS_DB', 0),
                    },
                },
            }),
            inject: [ConfigService],
        }),
    ],
    exports: [RedissonModule],
})
export class RedisModule {}
