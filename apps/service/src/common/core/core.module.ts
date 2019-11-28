import { Module } from '@nestjs/common';
import { CoreExplorer } from './core.explorer';

@Module({
    providers: [CoreExplorer]
})
export class CoreModule {}
