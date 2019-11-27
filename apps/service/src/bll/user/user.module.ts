import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserModel } from './user.model';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
    imports: [MongooseModule.forFeature([UserModel])],
    controllers: [UserController],
    providers: [UserRepository, UserService],
    exports: [UserRepository, UserService]
})
export class UserModule {}
