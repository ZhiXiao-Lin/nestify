import { InjectableOptions } from '@nestjs/common';

export interface SeederDecorator {
    injectableOptions?: InjectableOptions;
}

export interface ISeeder {
    modelName: string;
    sort: number;
    seed(): Promise<void>;
}
