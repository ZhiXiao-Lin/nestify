import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './controllers';
import { AdminModel, UserModel } from './models';
import { AdminRepository, UserRepository } from './repositories';
import { AdminService, UserService } from './services';

@Module({
    imports: [MongooseModule.forFeature([UserModel, AdminModel])],
    controllers: [UserController],
    providers: [UserRepository, UserService, AdminRepository, AdminService],
    exports: [UserRepository, UserService, AdminRepository, AdminService]
})
export class UserModule {}
