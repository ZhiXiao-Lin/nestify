import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController, UserController } from './controllers';
import { AdminModel, UserModel } from './models';
import { UserNotifiable } from './notifiables';
import { AdminRepository, UserRepository } from './repositories';
import { AdminSeeder } from './seeders';
import { AdminService, UserService } from './services';

@Module({
    imports: [MongooseModule.forFeature([UserModel, AdminModel])],
    controllers: [UserController, AdminController],
    providers: [UserRepository, UserService, AdminRepository, AdminService, UserNotifiable, AdminSeeder],
    exports: [UserRepository, UserService, AdminRepository, AdminService, UserNotifiable, AdminSeeder]
})
export class UserModule {}
