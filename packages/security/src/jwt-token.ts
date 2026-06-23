import * as jwt from 'jsonwebtoken';
import type { JwtPayload } from './jwt';

export interface JwtTokenSignOptions {
    secret: jwt.Secret;
    expiresIn?: string | number;
    signOptions?: Omit<jwt.SignOptions, 'expiresIn'>;
}

export interface JwtTokenVerifyOptions {
    secret: jwt.Secret;
    verifyOptions?: jwt.VerifyOptions;
}

export class JwtTokenHelper<TPayload extends object = JwtPayload> {
    sign(payload: TPayload, options: JwtTokenSignOptions): string {
        return jwt.sign(payload, options.secret, {
            ...options.signOptions,
            expiresIn: options.expiresIn as jwt.SignOptions['expiresIn'],
        });
    }

    verify(token: string, options: JwtTokenVerifyOptions): TPayload {
        return jwt.verify(token, options.secret, options.verifyOptions) as TPayload;
    }

    decode(token: string): (TPayload & JwtPayload) | null {
        const decoded = jwt.decode(token);
        if (typeof decoded !== 'object' || decoded === null) {
            return null;
        }
        return decoded as TPayload & JwtPayload;
    }

    isExpiringSoon(token: string, withinSeconds = 300): boolean {
        const decoded = this.decode(token);
        if (!decoded?.exp) {
            return true;
        }
        const threshold = Math.floor(Date.now() / 1000) + withinSeconds;
        return decoded.exp < threshold;
    }
}
