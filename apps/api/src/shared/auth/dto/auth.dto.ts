// ============================================================================
// Auth DTOs - Data Transfer Objects for authentication
// ============================================================================

import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Login DTO
 */
export class LoginDto {
    @IsEmail()
    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    email: string;

    @IsString()
    @MinLength(8)
    @ApiProperty({ description: 'User password', minLength: 8 })
    password: string;
}

/**
 * Register DTO
 */
export class RegisterDto {
    @IsEmail()
    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    email: string;

    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @ApiProperty({ description: 'Username', minLength: 3, maxLength: 30 })
    username: string;

    @IsString()
    @MinLength(8)
    @ApiProperty({ description: 'Password', minLength: 8 })
    password: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Display name' })
    displayName?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({ description: 'Organization name (for first user)' })
    organizationName?: string;
}

/**
 * Refresh Token DTO
 */
export class RefreshTokenDto {
    @IsString()
    @ApiProperty({ description: 'Refresh token' })
    refreshToken: string;
}

/**
 * Change Password DTO
 */
export class ChangePasswordDto {
    @IsString()
    @ApiProperty({ description: 'Current password' })
    currentPassword: string;

    @IsString()
    @MinLength(8)
    @ApiProperty({ description: 'New password', minLength: 8 })
    newPassword: string;
}

/**
 * Forgot Password DTO
 */
export class ForgotPasswordDto {
    @IsEmail()
    @ApiProperty({ description: 'User email' })
    email: string;
}

/**
 * Reset Password DTO
 */
export class ResetPasswordDto {
    @IsString()
    @ApiProperty({ description: 'Reset token' })
    resetToken: string;

    @IsString()
    @MinLength(8)
    @ApiProperty({ description: 'New password', minLength: 8 })
    newPassword: string;
}

/**
 * Verify Email DTO
 */
export class VerifyEmailDto {
    @IsString()
    @ApiProperty({ description: 'Verification token' })
    verifyToken: string;
}

/**
 * Token Response DTO
 */
export class TokenResponseDto {
    @ApiProperty({ description: 'Access token' })
    accessToken: string;

    @ApiProperty({ description: 'Refresh token' })
    refreshToken: string;

    @ApiProperty({ description: 'Token type', default: 'Bearer' })
    tokenType: string;

    @ApiProperty({ description: 'Expires in seconds' })
    expiresIn: number;
}

/**
 * User Response DTO (public info)
 */
export class UserResponseDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'Email' })
    email: string;

    @ApiProperty({ description: 'Username' })
    username: string;

    @ApiPropertyOptional({ description: 'Display name' })
    displayName?: string;

    @ApiProperty({ description: 'Roles' })
    roles: string[];
}
