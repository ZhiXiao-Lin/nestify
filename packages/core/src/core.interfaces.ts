import { DynamicModule } from '@nestjs/common';

export interface INestifyModule {
    register: () => DynamicModule;
    registerAsync?: () => DynamicModule;
}
