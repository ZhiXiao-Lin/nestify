import { DynamicModule, Module } from '@nestjs/common';
import { NOTIFICATION_OPTIONS } from './notification.constants';
import { NotificationModuleAsyncOptions, NotificationModuleOptions } from './notification.interfaces';
import { NotificationService } from './notification.service';

@Module({
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationModule {
    public static register(options: NotificationModuleOptions): DynamicModule {
        const providers = [
            {
                provide: NOTIFICATION_OPTIONS,
                useValue: options || {}
            }
        ];

        return {
            module: NotificationModule,
            providers,
            exports: providers
        };
    }

    public static registerAsync(options: NotificationModuleAsyncOptions): DynamicModule {
        const providers = [
            {
                provide: NOTIFICATION_OPTIONS,
                useFactory: options.useFactory,
                inject: options.inject || []
            }
        ];

        return {
            module: NotificationModule,
            imports: options.imports,
            providers,
            exports: providers
        };
    }
}
