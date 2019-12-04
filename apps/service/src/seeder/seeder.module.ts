import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';

@Module({
    providers: [SeederService],
    exports: [SeederService]
})
export class SeederModule {}
