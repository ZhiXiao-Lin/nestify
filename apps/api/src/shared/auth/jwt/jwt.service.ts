// ============================================================================
// JWT Service - Token generation and verification
// ============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtTokenHelper } from '@a3s-lab/security';
import { JwtPayload, TokenPair } from './jwt.types';

@Injectable()
export class JwtService {
    private readonly tokens = new JwtTokenHelper<JwtPayload>();
    private readonly accessTokenSecret: string;
    private readonly refreshTokenSecret: string;
    private readonly accessTokenExpiry: string;
    private readonly refreshTokenExpiry: string;

    constructor(private readonly configService: ConfigService) {
        this.accessTokenSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'default-access-secret';
        this.refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'default-refresh-secret';
        this.accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
        this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';
    }

    /**
     * Generate access token
     */
    generateAccessToken(payload: JwtPayload): string {
        return this.tokens.sign(payload, { secret: this.accessTokenSecret, expiresIn: this.accessTokenExpiry });
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(payload: JwtPayload): string {
        return this.tokens.sign(payload, { secret: this.refreshTokenSecret, expiresIn: this.refreshTokenExpiry });
    }

    /**
     * Generate both access and refresh tokens
     */
    generateTokenPair(payload: JwtPayload): TokenPair {
        return {
            accessToken: this.generateAccessToken(payload),
            refreshToken: this.generateRefreshToken(payload),
        };
    }

    /**
     * Verify access token
     */
    verifyAccessToken(token: string): JwtPayload {
        try {
            return this.tokens.verify(token, { secret: this.accessTokenSecret });
        } catch {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): JwtPayload {
        try {
            return this.tokens.verify(token, { secret: this.refreshTokenSecret });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    /**
     * Decode token without verification (for debugging)
     */
    decodeToken(token: string): JwtPayload | null {
        return this.tokens.decode(token);
    }

    /**
     * Check if token is about to expire (within 5 minutes)
     */
    isTokenExpiringSoon(token: string): boolean {
        return this.tokens.isExpiringSoon(token, 300);
    }
}
