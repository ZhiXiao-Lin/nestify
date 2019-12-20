export * from './bull.constants';
import { BullModuleAsyncOptions, BullModuleOptions } from './bull.interfaces';
import { BullModule } from './bull.module';

export function createBullModule(options: BullModuleOptions) {
    return BullModule.register(options);
}

export function createBullModuleAsync(options: BullModuleAsyncOptions) {
    return BullModule.registerAsync(options);
}