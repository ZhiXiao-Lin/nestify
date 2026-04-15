// ============================================================================
// JWT Service - Token generation and verification
// ============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload, TokenPair } from './jwt.types';

@Injectable()
export class JwtService {
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
        return jwt.sign(payload as object, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry as jwt.SignOptions['expiresIn'],
        });
    }

    /**
     * Generate refresh token
     */
    generateRefreshToken(payload: JwtPayload): string {
        return jwt.sign(payload as object, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenExpiry as jwt.SignOptions['expiresIn'],
        });
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
            return jwt.verify(token, this.accessTokenSecret) as JwtPayload;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired access token');
        }
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken(token: string): JwtPayload {
        try {
            return jwt.verify(token, this.refreshTokenSecret) as JwtPayload;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }

    /**
     * Decode token without verification (for debugging)
     */
    decodeToken(token: string): JwtPayload | null {
        try {
            return jwt.decode(token) as JwtPayload;
        } catch {
            return null;
        }
    }

    /**
     * Check if token is about to expire (within 5 minutes)
     */
    isTokenExpiringSoon(token: string): boolean {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) {
            return true;
        }

        const fiveMinutesFromNow = Math.floor(Date.now() / 1000) + 300;
        return decoded.exp < fiveMinutesFromNow;
    }
}
