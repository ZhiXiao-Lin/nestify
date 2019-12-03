import { Module } from '@nestjs/common';
import { UserModule } from './user';

@Module({
    imports: [UserModule]
})
export class BllModule {}
