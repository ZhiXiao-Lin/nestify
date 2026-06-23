// ============================================================================
// Serializer Examples
// ============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Example: User Entity
 */
interface UserEntity {
    id: string;
    email: string;
    username: string;
    displayName?: string;
    avatar?: string;
    status: 'active' | 'inactive' | 'suspended';
    passwordHash?: string;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Example: User DTO for response
 */
class UserDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'Email address' })
    email: string;

    @ApiProperty({ description: 'Username' })
    username: string;

    @ApiPropertyOptional({ description: 'Display name' })
    displayName?: string;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    avatar?: string;

    @ApiProperty({ description: 'Account status' })
    status: string;

    @ApiProperty({ description: 'Organization ID' })
    organizationId: string;

    @ApiProperty({ description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    updatedAt: Date;
}

/**
 * Example: Create User DTO
 */
class CreateUserDto {
    @ApiProperty({ description: 'Email address' })
    email: string;

    @ApiProperty({ description: 'Username' })
    username: string;

    @ApiPropertyOptional({ description: 'Display name' })
    displayName?: string;

    @ApiProperty({ description: 'Initial password' })
    password: string;
}

/**
 * Example: Update User DTO
 */
class UpdateUserDto {
    @ApiPropertyOptional({ description: 'Display name' })
    displayName?: string;

    @ApiPropertyOptional({ description: 'Avatar URL' })
    avatar?: string;
}

// ============================================================================
// User Serializer Implementation - Functional Approach (Recommended)
// ============================================================================

/**
 * Convert User entity to UserDto
 */
function userToDto(user: UserEntity): UserDto {
    return {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        status: user.status,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

/**
 * Convert User entity to CreateUserDto (excludes sensitive fields)
 */
function userToCreateDto(user: UserEntity): CreateUserDto {
    return {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        password: '', // Never expose password hash
    };
}

/**
 * Convert list of User entities to UserDto[]
 */
function userListToDto(users: UserEntity[]): UserDto[] {
    return users.map(userToDto);
}

// ============================================================================
// User Serializer Implementation - Class-based Approach
// ============================================================================

import { Serializer } from './serializer';

class UserSerializer extends Serializer<UserEntity, UserDto> {
    protected static _instance: UserSerializer;

    static get instance(): UserSerializer {
        return this._instance || (this._instance = new UserSerializer());
    }

    toDto(user: UserEntity): UserDto {
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            status: user.status,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}

class CreateUserSerializer extends Serializer<UserEntity, CreateUserDto> {
    protected static _instance: CreateUserSerializer;

    static get instance(): CreateUserSerializer {
        return this._instance || (this._instance = new CreateUserSerializer());
    }

    toDto(user: UserEntity): CreateUserDto {
        return {
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            password: '', // Never expose password hash
        };
    }
}

// Usage in Service
// class UserService {
//   findAll(): UserDto[] {
//     const users = await this.userRepository.findAll();
//     return users.map(userToDto);
//     // Or: return UserSerializer.instance.toDtoList(users);
//   }
//
//   findOne(id: string): UserDto {
//     const user = await this.userRepository.findById(id);
//     return userToDto(user);
//     // Or: return UserSerializer.instance.toDto(user);
//   }
//
//   create(dto: CreateUserDto): UserDto {
//     const user = this.userRepository.create(dto);
//     return userToCreateDto(user);
//     // Or: return CreateUserSerializer.instance.toDto(user);
//   }
// }

export {
    UserDto,
    CreateUserDto,
    UpdateUserDto,
    userToDto,
    userToCreateDto,
    userListToDto,
    UserSerializer,
    CreateUserSerializer,
};
