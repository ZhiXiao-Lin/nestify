import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController, AdminController } from './controllers';
import { AdminModel, UserModel } from './models';
import { AdminRepository, UserRepository } from './repositories';
import { AdminSeeder } from './seeders';
import { AdminService, UserService } from './services';

@Module({
    imports: [MongooseModule.forFeature([UserModel, AdminModel])],
    controllers: [UserController, AdminController],
    providers: [UserRepository, UserService, AdminRepository, AdminService, AdminSeeder],
    exports: [UserRepository, UserService, AdminRepository, AdminService, AdminSeeder]
})
export class UserModule {}
